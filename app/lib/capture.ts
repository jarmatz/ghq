import { Square, Board, Player } from "./game-objects";
import { Vector, isOnGrid, invertPlayer, deVectorize, scanBoard } from "./game-helpers";
import { setEngagements } from "./engagement";

// returns an array of ID strings
// checks if an infantry piece that moved to a square can capture any surrounding units
// engagements must be set first!!!
export function checkActiveCaptures(source: Square, board: Board): string[] {
    // set engagements using lastMoved parameter
    board = setEngagements(board, source);
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
// infantry must be captures first, then engagements reset, then artillery captured
export function executePassiveCaptures(activePlayer: Player, board: Board): Board {
    board = setEngagements(board);
    // PHASE 1: INFANTRY CAPTURES
    let captureSquares: Square[] = [];
    const infantrySquares: Square[] = [] = scanBoard(square => square.piece?.player === invertPlayer(activePlayer)
                                                    && square.piece?.type === 'infantry', board);

    for (let infantrySquare of infantrySquares) {
        // check for bombardment capture
        if (infantrySquare.bombardment === 'both' || infantrySquare.bombardment === activePlayer) {
            captureSquares.push(infantrySquare);
        }
        // check for infantry capture
        const vectors: Vector[] = [{row: 0, column: 1}, {row: 1, column: 0}, {row: 0, column: -1}, {row: -1, column: 0}];
        for (let vector of vectors) {
            if (isOnGrid(infantrySquare.row + vector.row, infantrySquare.column + vector.column)) {
                const opposition: Square = board[infantrySquare.row + vector.row][infantrySquare.column + vector.column];
                // check if the opposition square has infantry that is not yet engaged
                // check that the source infantrySquare enemy is engaged
                // remember, the opposition here is the active player, the source is the enemy up for capture
                if (infantrySquare.piece!.engaged && opposition.piece && opposition.piece.type === 'infantry' && !opposition.piece.engaged) {
                    // we could use a set, but whatever, this is easy too:
                    if (!captureSquares.includes(infantrySquare)) {
                        captureSquares.push(infantrySquare);
                        break; // we don't need to do more in the vector loop
                    }
                }
            }
        }
    }
    // EXECUTE ALL INFANTRY CAPTURES
    for (let captureSquare of captureSquares) {
        if (captureSquare.piece) {
            captureSquare.piece === null;
        }
    }

    // PHASE 2: ARTILLERY CAPTURES
    // begin by resetting engagements and capture squares
    board = setEngagements(board);
    captureSquares = [];
    const artillerySquares: Square[] = scanBoard(square => square.piece?.player === invertPlayer(activePlayer)
                                                && square.piece?.type === 'artillery', board);

    for (let artillerySquare of artillerySquares) {
        const vectors: Vector[] = [{row: 0, column: 1}, {row: 1, column: 0}, {row: 0, column: -1}, {row: -1, column: 0}];
        for (let vector of vectors) {
            if (isOnGrid(artillerySquare.row + vector.row, artillerySquare.column + vector.column)) {
                const opposition: Square = board[artillerySquare.row + vector.row][artillerySquare.column + vector.column];
                // check if the opposition square has infantry that is not yet engaged
                if (opposition.piece && opposition.piece.type === 'infantry' && !opposition.piece.engaged) {
                    // we can't be directly in front of the artillery
                    const angle: number = deVectorize(vector);
                    if (artillerySquare.piece!.rotation === angle && !captureSquares.includes(artillerySquare)) {
                        captureSquares.push(artillerySquare);
                        break; // we don't need to do more in the vector loop
                    }
                }
            }
        }
    }
    // now we execute artillery captures
    for (let captureSquare of captureSquares) {
        if (captureSquare.piece) {
            captureSquare.piece === null;
        }
    }
    return board; 
}