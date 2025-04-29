import { Square, Board, Game } from '@/app/lib/game-objects';
import { invertPlayer, scanBoard, setBombardments } from '@/app/lib/game-helpers';
import { executePassiveCaptures } from './capture';

export function upkeep(game: Game): Game {
    game.board = setBombardments(game.board);
    game = checkPlayerSwap(game);
    game = victoryCheck(game);
    return game;
}

// changes the active player when appropriate
export function checkPlayerSwap(game: Game) : Game {
    if (game.actionsLeft === 0) {
        game.actionsLeft = 3;
        game.activePlayer = invertPlayer(game.activePlayer);
        game = executePassiveCaptures(game.activePlayer, game);
        game.board = refreshPieces(game.board);
    }
    return game;
}

// refreshes the depletion status on all pieces
export function refreshPieces(board: Board): Board {
    const allPieces: Square[] = scanBoard(square => square.piece !== null, board);
    for (let square of allPieces) {
        if (square.piece) {
            square.piece.depleted = false;
        }
    }
    return board;
}

// checks for a victory condition
// NOTE: it returns the game object with the winner status set, if appropriate
// the front-end rendering then processes the victory UI
export function victoryCheck(game: Game): Game {

    const hqSquares: Square[] = scanBoard(square => square.piece?.type === 'hq', game.board);
    const hqPlayers: string[] = hqSquares.map(square => square.piece!.player);

    if (!hqPlayers.includes('red')) {
        game.winner = 'blue';
    }
    else if (!hqPlayers.includes('blue')) {
        game.winner = 'red';
    }
    // specialty victory
    if (game.hqVictory) {
        for (let hqSquare of hqSquares) {
            if (hqSquare.piece!.player === 'red' && hqSquare.row === 7) {
                game.winner = 'red';
            }
            else if (hqSquare.piece!.player === 'blue' && hqSquare.row === 0) {
                game.winner = 'blue';
            }
        }
    }
    if (game.winner !== '') {
        game.board = refreshPieces(game.board);
    }
    return game;
}