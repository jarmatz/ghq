import { Server } from 'socket.io';
import { instanceToPlain } from 'class-transformer';
// my imports:
import { Game, GameAction, Board, Piece, Square } from './game-objects';
import { checkMoves } from './game-helpers';
import pool from './db';
import gameCache from './game-cache';
import { getGame } from './server-helpers';


export async function updateGame(gameLobby: string, action: GameAction, io: Server) {

    const game = await getGame(gameLobby);
    if (!game) {
        console.error('GameAction attempted, but specified game not found');
        return;
    }
    // if our move is validated, execute, broadcast, and set database
    if (validate(action, game)) {
        // execute the move and get the result
        const updatedGame = execute(action, game);
        // set the gamecache
        gameCache.set(gameLobby, updatedGame);
        // set the db value
        
        // broadcast the update to the game lobby
        io.to(`${gameLobby}`).emit('update', { message: 'updated game', game: instanceToPlain(updatedGame)});
    }
    else {
        // broadcast the original game state, unexecuted, so we can revert it
        io.to(`${gameLobby}`).emit('update', { message: 'reverted game', game: instanceToPlain(game)});
    }

}

export function validate(action: GameAction, game: Game): boolean {

    switch (action.type) {
        case 'move': {
            // we should have a piece and a target
            if (!action.piece || !action.target) {
                return false;
            }
            // ###################################
            // TO ADD: CHECK GAME STATUS
            // ACTIVE PLAYER AND REMAINING ACTIONS
            // ###################################
            const potentialMoves: Square[] = checkMoves(action.piece, game.board);
            // because we are potentially using different references, we can't compare our action.target to our board directly
            // so we will rely on string IDs
            const potentialIDs: string[] = potentialMoves.map(square => square.getID())
            if (potentialIDs.includes(action.target.getID())) {
                return true;
            }
        }
    }
    return false;
}

export function execute(action: GameAction, game: Game): Game {
    
    switch (action.type) {

        case 'move': {
            // safety check
            if (!action.piece || !action.target) {
                console.error('tried to execute an invalid GameAction: move')
                return game;
            }
            // get our target and source rows/columns for the move
            const target: {row: number, column: number} = { row: action.target.row, column: action.target.column }
            const source: {row: number, column: number} = { row: action.piece.row, column: action.piece.column }
            // copy the piece to a clone at the new location, maintaining rotation
            game.board[target.row][target.column].piece = new Piece(action.piece.name, target.row, target.column);
            game.board[target.row][target.column].piece!.rotation = action.piece.rotation;
            // clear the old location
            game.board[source.row][source.column].piece = null;
            // TO DO: DECREMENT ACTIONS(?) UNLESS IT'S ARTILLERY
            // NOT SURE HOW TO HANDLE THAT
            // ############################
            return game;
        }
    }

    return game;
}