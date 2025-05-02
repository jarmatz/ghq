import { Server } from 'socket.io';
import { instanceToPlain, plainToInstance } from 'class-transformer';
// my imports:
import { Game, GameAction, Board, Log, Player, Square } from './game-objects';
import { checkMoves, checkPlacements, invertPlayer } from './game-helpers';
import { upkeep } from './upkeep';
import gameCache from './game-cache';
import { getGame, updateDatabase } from './server-helpers';
import { setEngagements } from './engagement';
import { checkActiveCaptures, checkPassiveCaptures } from './capture';
import { snapshotBoard, logifyAction } from './log';


export async function updateGame(gameLobby: string, action: GameAction, io: Server) {

    let game = await getGame(gameLobby);
    if (!game) {
        console.error('GameAction attempted, but specified game not found');
        return;
    }
    
    game = plainToInstance(Game, game);
    action = plainToInstance(GameAction, action);

    let message: string = 'reverted game';
    // we use a proxygame to validate, so we don't override our original game data with a null return
    let proxyGame = plainToInstance(Game, game);
    // checking validate here RUNS the command will set proxyGame to NULL if it doesn't validate
    if (validate(action, proxyGame)) {
        game = proxyGame;
        gameCache.set(gameLobby, game);
        await updateDatabase(game);
        message = 'updated game';
    }
    io.to(gameLobby).emit('update', { message: message, game: instanceToPlain(game) });
}

export function validate(action: GameAction, game: Game): Game | null {

    // make sure our action came in formatted correctly
    let player: Player = '';
    if ((!action.piece && !action.reserve) || (action.piece && action.reserve)) {
        return null;
    }
    // get our player
    else if (action.reserve) {
        player = action.reserve.player;
    }
    else if (action.piece) {
        player = action.piece.player;
    }

    // make sure we have the right player
    if (player !== game.activePlayer || game.actionsLeft < 1) {
        return null;
    }
    // initialize a snapshot
    let snapshot: Board = snapshotBoard(game);

    switch (action.type) {
        case 'move': {
            if (!action.piece || !action.source || !action.target || action.rotation === null) {
                return null;
            }
            // the piece should really be where it says it is!
            if (action.piece.name !== game.board[action.source.row][action.source.column].piece?.name) {
                return null;
            }
            // check that the moves are kosher:
            const potentialMoves: string[] = checkMoves(action.piece, game.board);
            if (!potentialMoves.includes(action.target.getID())) {
                return null;
            }
            // if we made it this far, we execute the action
            const target: Square = game.board[action.target.row][action.target.column];
            const source: Square = game.board[action.piece.row][action.piece.column];
            // load a clone into the target, using rotation passed in by action
            target.load(action.piece.name);
            target.piece!.rotation = action.rotation;
            // clear the source square
            source.unload();
            // snapshot here before captures
            snapshot = snapshotBoard(game);
            // check for captures, remember our "target" square is doing the captures
            if (action.capture !== null) {
                // some cleanup to help
                const captured: Square = game.board[action.capture.row][action.capture.column];
                if (checkActiveCaptures(target, game.board).includes(captured.getID())) {
                    // capture it!
                    captured.unload();
                }
            }
            target.piece!.depleted = true;
            game.board = setEngagements(game.board);
            break;
        }
        case 'place': {
            if (!action.reserve || !action.target || action.rotation === null) {
                return null;
            }
            // check that we actually have an available reserve
            if (player === 'blue') {
                if (game.trays.blue[action.reserve.position].count === 0) {
                    return null;
                }
                // otherwise decrement
                else {
                    game.trays.blue[action.reserve.position].count--;
                }
            }
            else if (player === 'red') {
                if (game.trays.red[action.reserve.position].count === 0) {
                    return null;
                }
                // otherwise decrement
                else {
                    game.trays.red[action.reserve.position].count--;
                }
            }
            // check that we can place it in the specified square
            const potentialMoves: string[] = checkPlacements(player, game.board);
            if (!potentialMoves.includes(action.target.getID())) {
                return null;
            }
            // if we made it here, the move is kosher
            // we've already decremented, so just place the piece
            const target: Square = game.board[action.target.row][action.target.column];
            target.load(action.reserve.name);
            target.piece!.rotation = action.rotation;
            // snapshot here, before captures
            snapshot = snapshotBoard(game);
            // check for captures, remember our "target" square is doing the captures
            if (action.capture !== null) {
                // some cleanup to help
                const captured: Square = game.board[action.capture.row][action.capture.column];
                if (checkActiveCaptures(target, game.board).includes(captured.getID())) {
                    // capture it!
                    captured.unload();
                }
            }
            target.piece!.depleted = true;
            game.board = setEngagements(game.board);
            break;
        }
        // rare case of stationary capture
        case 'capture': {
            if (!action.source || !action.capture) {
                return null;
            }
            const captured: Square = game.board[action.capture.row][action.capture.column];
            const source: Square = game.board[action.source.row][action.source.column];
            // snapshot before captures
            snapshot = snapshotBoard(game);
            if (checkActiveCaptures(source, game.board).includes(captured.getID())) {
                captured.unload();
                game.board = setEngagements(game.board);
            }
            else {
                return null;
            }
            source.piece!.depleted = true;
            game.board = setEngagements(game.board);
            break;
        }
        case 'rotate': {
            if (!action.source || !action.piece || action.rotation === null) {
                return null;
            }
            const source: Square = game.board[action.source.row][action.source.column];
            // check that the piece is where it says it is
            if (!source.piece || action.piece.name !== source.piece.name) {
                return null;
            }
            if (action.piece.type !== 'artillery') {
                return null;
            }
            source.piece.rotation = action.rotation;
            // snapshot after rotation
            snapshot = snapshotBoard(game);
            source.piece.depleted = true;
            break;
        }
        case 'endTurn': {
            // we should already have player information from above
            // it's already been validated
            // this used to do the game.actionsLeft = 1 below, but we now handle it with the endTurnFlag to handle hanging premoves
            // i'll leave this block here for future availability
            // game.actionsLeft = 1;
            break;
        }
    }
    // this sets us up to decrement to 0
    if (action.endTurnFlag) {
        game.actionsLeft = 1;
    }
    // still important to dispatch an "endTurn" case for this reason:
    if (action.type !== 'endTurn') {
        game.log.unshift(logifyAction(action, snapshot));
    }
    game.actionsLeft--;
    
    // after we decrement, but before we actually execute upkeep
    // we check if we have to log upkeep
    if (game.actionsLeft < 1) {
        const nextPlayer = invertPlayer(player);
        const passiveCaptureIDs: string[] = checkPassiveCaptures(nextPlayer, game);
        
        if (passiveCaptureIDs.length > 0) {
            let text: string = `${nextPlayer} captured ${passiveCaptureIDs.length} enemy units at the start of their turn.`
            text = text[0].toUpperCase() + text.slice(1);

            // note that "locks/depleteds" may render incorrectly for now
            snapshot = snapshotBoard(game);

            const upkeepLog: Log = new Log(text, snapshot, [], passiveCaptureIDs);
            game.log.unshift(upkeepLog);
        }
    }

    game = upkeep(game);
    return game;
}