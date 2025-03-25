import { Server } from 'socket.io';
import { instanceToPlain, plainToInstance } from 'class-transformer';
// my imports:
import { Game, GameAction, Board, Piece, Square } from './game-objects';
import { checkMoves } from './game-helpers';
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

    switch (action.type) {
        case 'move': {
            // we should have a piece and a target square
            if (!action.piece || !action.target) {
                return false;
            }
            // ###################################
            // TO ADD: CHECK GAME STATUS
            // ACTIVE PLAYER AND REMAINING ACTIONS
            // ###################################
            const potentialMoves: string[] = checkMoves(action.piece, game.board);
            // because we are potentially using different references, we can't compare our action.target to our board directly
            // so we will rely on string IDs
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
    }
    game = upkeep(game);
    return game;
}