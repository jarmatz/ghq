import { Piece, Square, Board } from './game-objects'
import { scanBoard, Vector, isOnGrid, deVectorize } from './game-helpers';
import { sourceMapsEnabled } from 'process';

class PotentialEngagement {
    public source: Square;
    public targets: Square[];
    public count: number;

    constructor(source: Square, targets: Square[]) {
        this.source = source;
        this.targets = targets;
        this.count = targets.length;
    }
}

// takes the board, sets engagements, and returns a new board with pieces engaged and rotations set
export function setEngagements(board: Board): Board {

    const potentialEngagements: PotentialEngagement[] = checkEngagements(board);
    // iterate over the potential counts, starting at 1 going to max 4 (because )
    for (let count = 1; count <= 4; count++) {
        // now we iterate over the engagements array
        for (let potentialEngagement of potentialEngagements) {
            // we only want ones that match the count we're on and are not already engaged
            if (potentialEngagement.count === count && potentialEngagement.source.piece!.engaged === false) {
                // iterate through the targets
                for (let target of potentialEngagement.targets) {
                    // if we find a target that's not engaged
                    if (target.piece!.engaged === false) {
                        // set both pieces to engaged
                        potentialEngagement.source.piece!.engaged = true;
                        target.piece!.engaged = true;
                        // debug
                        console.log(`engaged ${potentialEngagement.source.getID()} to ${target.getID()}`);
                        // update their rotations
                        // begin by getting the difference vector
                        let diffVector: Vector = {
                            row: target.row - potentialEngagement.source.row,
                            column: target.column - potentialEngagement.source.column
                        };
                        let sourceAngle: number = deVectorize(diffVector);
                        // set the rotations
                        potentialEngagement.source.piece!.rotation = sourceAngle;
                        target.piece!.rotation = (sourceAngle + 180) % 360;
                    }
                }
            }
        }
    }
    return board;
}

// takes as input the board, scans it, and returns an array of potential engagement objects but does not yet set them
export function checkEngagements(board: Board): PotentialEngagement[] {

    board = wipeEngagements(board);
    // we are going to build and return an array of potential engagements
    const potentialEngagements: PotentialEngagement[] = [];
    // first, we want to get only the squares with infantry in them
    const infantrySquares: Square[] = [];
    infantrySquares.push(...scanBoard(square => square.piece?.type === 'infantry', board));

    // now we iterate over the infantry squares
    for (let source of infantrySquares) {
        // we are going to scan the cardinal directions around each square for opposing infantry
        const vectors: Vector[] = [{row: 0, column: 1}, {row: 1, column: 0}, {row: 0, column: -1}, {row: -1, column: 0}];
        const targets: Square[] = [];
        for (let vector of vectors) {
            // safety check that the target square is on board
            if (isOnGrid(source.row + vector.row, source.column + vector.column)) {
                // get the target square
                const target = board[source.row + vector.row][source.column + vector.column];
                // check if it has an opposing infantry
                if (target.piece?.type === 'infantry' && target.piece.player !== source.piece?.player) {
                    // add it to the potential engagements
                    targets.push(target);
                }
            }
        }
        // if we have any targets, create a potential engagement
        if (targets.length > 0) {
            potentialEngagements.push(new PotentialEngagement(source, targets));
        }
    };
    return potentialEngagements;
}

function wipeEngagements(board: Board): Board {
    // wipe the engagements
    for (let row of board) {
        for (let square of row) {
            if (square.piece) {
                square.piece.engaged = false;
                if (square.piece.type === 'infantry') {
                    if (square.piece.player === 'blue') {
                        square.piece.rotation = 0;
                    }
                    else {
                        square.piece.rotation = 180;
                    }
                }
            }
        }
    }
    return board;
}