import { Server } from 'socket.io';
import { instanceToPlain, plainToInstance } from 'class-transformer';
// my imports:
import { Game, GameAction, Board, Piece, Player, Square } from './game-objects';
import { checkMoves, checkPlacements } from './game-helpers';
import { upkeep } from './ui-helpers';
import gameCache from './game-cache';
import { getGame, updateDatabase } from './server-helpers';
import { setEngagements } from './engagement';
import { checkActiveCaptures } from './capture';


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
    // ###################################
    // TO ADD: CHECK GAME STATUS
    // ACTIVE PLAYER AND REMAINING ACTIONS
    // ###################################
    switch (action.type) {
        case 'move': {
            if (!action.piece || !action.source || !action.target || action.rotation === null) {
                return null;
            }
            // the piece should really be where it says it is!
            if (action.piece.name !== game.board[action.source.row][action.source.column].piece?.name) {
                console.log('2');
                return null;
            }
            // check that the moves are kosher:
            const potentialMoves: string[] = checkMoves(action.piece, game.board);
            if (!potentialMoves.includes(action.target.getID())) {
                console.log('3');
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
            // check for captures, remember our "target" square is doing the captures
            if (action.capture !== null) {
                // some cleanup to help
                const captured: Square = game.board[action.capture.row][action.capture.column];
                if (checkActiveCaptures(target, game.board).includes(captured.getID())) {
                    // capture it!
                    captured.unload();
                }
            }
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
            // check for captures, remember our "target" square is doing the captures
            if (action.capture !== null) {
                // some cleanup to help
                const captured: Square = game.board[action.capture.row][action.capture.column];
                if (checkActiveCaptures(target, game.board).includes(captured.getID())) {
                    // capture it!
                    captured.unload();
                }
            }
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
            if (checkActiveCaptures(source, game.board).includes(captured.getID())) {
                captured.unload();
                game.board = setEngagements(game.board);
            }
            else {
                return null;
            }
            break;
        }
        case 'rotate': {
            if (!action.source || !action.piece || action.rotation === null) {
                return null;
            }
            // check that the piece is where it says it is
            if (action.piece.name !== game.board[action.source.row][action.source.column].piece?.name) {
                return null;
            }
            if (action.piece.type !== 'artillery') {
                return null;
            }
            game.board[action.source.row][action.source.column].piece!.rotation = action.rotation;
            break;
        }
    }
    game = upkeep(game);
    return game;
}

export function execute(action: GameAction, game: Game): Game {

    const unalteredGame: Game = game;
    
    switch (action.type) {
        case 'move': {
            // safety check
            if (!action.piece || !action.target) {
                console.error('tried to execute an invalid GameAction: move')
                return unalteredGame;
            }
            // get our target and source rows/columns for the move
            const target: Square = game.board[action.target.row][action.target.column];
            const source: Square = game.board[action.piece.row][action.piece.column];
            // load a clone into the target, maintaining rotation
            target.load(action.piece.name);
            // safety check to make IDE happy
            if (!target.piece) {
                console.error('tried to load a piece into target square, but it was undefined');
                return unalteredGame;
            }
            target.piece.rotation = action.piece.rotation;
            // clear the source square
            source.unload();
            // TO DO: DECREMENT ACTIONS(?) UNLESS IT'S ARTILLERY
            // NOT SURE HOW TO HANDLE THAT
            // ############################
        }
        case 'place': {
            // safety check
            if (!action.reserve || !action.target) {
                console.error('tried to execute an invalid GameAction: place');
                return unalteredGame;
            }
            const target: Square = game.board[action.target.row][action.target.column];
        }
    }
    game = upkeep(game);
    return game;
}