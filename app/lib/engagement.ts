import { Piece, Square, Board } from './game-objects'
import { scanBoard, Vector, isOnGrid, deVectorize, invertPlayer } from './game-helpers';
import { sourceMapsEnabled } from 'process';
import e from 'express';

// this stores a source square (and by definition the piece it contains) plus...
// ... an array of target squares that are adjacent to it in cardinal directions plus...
// ... the count of those engagements, which are later used to sort it in an array 
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

// engages a single piece to the enemy it moved next to
// because we prevent infantry from moving into "double opposed" spaces, the sequencing is always kosher
// it will always move only next to one opposing infantry
// if it is already engaged, we instead reset all engagements
export function engage(source: Square, board: Board): Board {
    if (source.piece === null) {
        return board;
    }
    const vectors: Vector[] = [{row: 0, column: 1}, {row: 1, column: 0}, {row: 0, column: -1}, {row: -1, column: 0}];
    // if the piece is not engaged, check for engagements
    let count: number = 0;
    for (let vector of vectors) {
        if (isOnGrid(source.row + vector.row, source.column + vector.column)) {
            const target: Square = board[source.row + vector.row][source.column + vector.column];
            if (target.piece?.type === 'infantry' && target.piece?.player === invertPlayer(source.piece.player) && !target.piece.engaged) {
                console.log('engaged actively');
                source.piece.engaged = true;
                target.piece.engaged = true;
                const sourceAngle: number = deVectorize(vector);
                const targetAngle: number = (sourceAngle + 180) % 360;
                source.piece.rotation = sourceAngle;
                target.piece.rotation = targetAngle;
                count++;
                break;
            }
        }
    }
    // if count is 0, we found no engagements, so it may be a disengage
    console.log(board[source.row][source.column].piece!.engaged);
    return board;
}

// takes the board, sets engagements, and returns a new board with pieces engaged and rotations set
// this begins by asking for an array of potential engagements returned by checkEngagements
// then it iterates through the array by each potentialengagement's "count"
// the algo works by setting all pieces with only one engagement first, then two... up to max (4)
export function setEngagements(board: Board): Board {

    const potentialEngagements: PotentialEngagement[] = checkEngagements(board);
    // iterate over the potential counts, starting at 1 going to max 4 (because cardinals)
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
                        // begin by getting the difference vector between their squares
                        let diffVector: Vector = {
                            row: target.row - potentialEngagement.source.row,
                            column: target.column - potentialEngagement.source.column
                        };
                        let sourceAngle: number = deVectorize(diffVector);
                        // set the rotations so the pieces point at each other
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
                    // add it to the potential targets array
                    targets.push(target);
                }
            }
        }
        // if we found any targets, create a potential engagement object
        if (targets.length > 0) {
            potentialEngagements.push(new PotentialEngagement(source, targets));
        }
    };
    return potentialEngagements;
}

function wipeEngagements(board: Board): Board {
    // wipe the engagements
    // and reset piece rotations to default
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