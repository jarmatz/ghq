import { Square, Board, Player } from "./game-objects";
import { Vector, isOnGrid, invertPlayer, deVectorize, scanBoard } from "./game-helpers";
import { setEngagements } from "./engagement";
import { act } from "react";

// returns an array of ID strings
// checks if an infantry piece that moved to a square can capture any surrounding units
// engagements must be set first!!!
export function checkActiveCaptures(source: Square, board: Board): string[] {
    board = setEngagements(board);
    let potentialCaptures: Square[] = [];
    // only unengaged infantry can capture
    if (!source.piece || source.piece.type !== 'infantry' || source.piece.engaged) {
        return [];
    }
    const vectors: Vector[] = [{row: 0, column: 1}, {row: 1, column: 0}, {row: 0, column: -1}, {row: -1, column: 0}];
    for (let vector of vectors) {
        if (isOnGrid(source.row + vector.row, source.column + vector.column)) {
            // get the target square
            const target = board[source.row + vector.row][source.column + vector.column];
            // check if it has an opposing piece
            if (target.piece && target.piece.player === invertPlayer(source.piece.player) ) {
                // if it's infantry and engaged, it's a capture
                if (target.piece.type === 'infantry' && target.piece.engaged) {
                    potentialCaptures.push(target);
                }
                // if it's artillery, we can't be directly in front
                if (target.piece.type === 'artillery') {
                    let sourceAngle: number = deVectorize(vector);
                    let targetAngle: number = (sourceAngle + 180) % 360;
                    if (targetAngle !== target.piece.rotation) {
                        potentialCaptures.push(target);
                    }
                }
            }
        }
    }
    return potentialCaptures.map((square) => square.getID());
}

// engagements must be set first!!
export function executePassiveCaptures(activePlayer: Player, board: Board): Board {
    board = setEngagements(board);
    const captureSquares: Square[] = [];

    // these are all squares with enemy pieces
    const enemySquares: Square[] = scanBoard(square => square.piece?.player === invertPlayer(activePlayer), board);

    for (let enemySquare of enemySquares) {
        if (enemySquare.piece?.type === 'infantry') {
            // check bombardment
            if (enemySquare.bombardment === 'both' || enemySquare.bombardment === activePlayer) {
            captureSquares.push(enemySquare);
            }
        }
        // check for infantry capture
        const vectors: Vector[] = [{row: 0, column: 1}, {row: 1, column: 0}, {row: 0, column: -1}, {row: -1, column: 0}];
        for (let vector of vectors) {
            if (isOnGrid(enemySquare.row + vector.row, enemySquare.column + vector.column)) {
                // get the target square
                const target = board[enemySquare.row + vector.row][enemySquare.column + vector.column];
                // check if it has an opposing infantry that is not engaged
                if (target.piece && target.piece.type === 'infantry' && !target.piece.engaged) {
                    // if the enemy is infantry, we capture
                    if (enemySquare.piece?.type === 'infantry') {
                        captureSquares.push(enemySquare);
                        break; // no need to check other vectors for this square
                    }
                    // but if it's artillery, we need to check which way it's facing
                    if (enemySquare.piece?.type === 'artillery') {
                        // here the artillery is the source angle
                        const angle: number = deVectorize(vector);
                        if (enemySquare.piece?.rotation !== angle) {
                            captureSquares.push(enemySquare);
                            break;
                        }
                    }
                }
            }
        }
    }
    // now we execute all the captures
    for (let captureSquare of captureSquares) {
        if (captureSquare.piece) {
            captureSquare.piece === null;
        }
    }
    return board; 
}