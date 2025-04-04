import { Server } from 'socket.io';
import { instanceToPlain, plainToInstance } from 'class-transformer';
// my imports:
import { Game, GameAction, Board, Piece, Player, Square } from './game-objects';
import { checkMoves, checkPlacements } from './game-helpers';
import { upkeep } from './ui-helpers';
import gameCache from './game-cache';
import { getGame, updateDatabase } from './server-helpers';


export async function updateGame(gameLobby: string, action: GameAction, io: Server) {

    let game = await getGame(gameLobby);
    if (!game) {
        console.error('GameAction attempted, but specified game not found');
        return;
    }
    // re hydrate
    game = plainToInstance(Game, game);
    action = plainToInstance(GameAction, action);
    // if our move is validated, execute it, update database, and broadcast to clients
    if (validate(action, game)) {
        // execute the move and get the result
        const updatedGame = execute(action, game);
        // set the gamecache
        gameCache.set(gameLobby, updatedGame);
        // set the db value
        await updateDatabase(game);
        // broadcast the update to the game lobby
        io.to(gameLobby).emit('update', { message: 'updated game', game: instanceToPlain(updatedGame)});
    }
    else {
        // broadcast the original game state, unexecuted, so we can revert it
        io.to(gameLobby).emit('update', { message: 'reverted game', game: instanceToPlain(game)});
    }
}

export function validate(action: GameAction, game: Game): boolean {

    // make sure our action came in formatted correctly
    let player: Player = '';
    if ((!action.piece && !action.reserve) || (action.piece && action.reserve)) {
        return false;
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
            // we should have a piece and source/target squares
            if (!action.piece || !action.source || !action.target) {
                return false;
            }
            // the piece should really be where it says it is!
            if (action.piece.name !== game.board[action.source.row][action.source.column].piece?.name) {
                return false;
            }
            // check that the moves are kosher:
            const potentialMoves: string[] = checkMoves(action.piece, game.board);
            if (potentialMoves.includes(action.target.getID())) {
                return true;
            }
        }
        case 'place': {
            // we should have a reserve and a target square
            if (!action.reserve || !action.target) {
                return false;
            }
            // check that we actually have an available reserve
            if (player === 'blue') {
                if (game.trays.blue[action.reserve.position].count === 0) {
                    return false;
                }
            }
            else if (player === 'red') {
                if (game.trays.red[action.reserve.position].count === 0) {
                    return false;
                }
            }
            // check that we can place it in the specified square
            const potentialMoves: string[] = checkPlacements(player, game.board);
            if (potentialMoves.includes(action.target.getID())) {
                return true;
            }
        }
    }
    return false;
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