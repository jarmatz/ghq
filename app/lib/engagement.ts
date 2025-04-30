import { Piece, Square, Board, Game } from './game-objects'
import { scanBoard, Vector, isOnGrid, deVectorize, invertPlayer, parseID, defaultRotation } from './game-helpers';

// this stores a source square (and by definition the piece it contains) plus...
// ... an array of target squares that are adjacent to it in cardinal directions plus...
// ... the count of those engagements, which are later used to iterate over in setEngagements
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
// this begins by asking for an array of potential engagements returned by checkEngagements
// then it iterates through the array by each potentialengagement's "count"
// the algo works by setting all pieces with only one engagement first, then two... up to max (4)
export function setEngagements(board: Board, lastMoved?: Square): Board {
    let lastMovedID: string;
    // if it's undefined we just set it to a garbage string
    // this way it'll never match when we perform conditional checks on the ID
    if (lastMoved === undefined) {
        lastMovedID = 'zz';
    }
    else {
        lastMovedID = lastMoved.getID();
    }

    const potentialEngagements: PotentialEngagement[] = checkEngagements(board);

    // we want to move the lastMoved to the very end of the potentialEngagements array (if it's there in first place)
    // this will delay its processing to the end of its cohort (by which I mean all potential engagements sources with same potential engagement count)
    // let's only do this computation if we have to:
    if (lastMoved !== undefined) {
        let lastMovedIndex: number = potentialEngagements.findIndex(potentialEngagement => potentialEngagement.source.getID() === lastMovedID);
        // no matches returns -1 from findIndex, we proceed if we got a match
        if (lastMovedIndex !== -1) {
            // store lastMoved's PE object temporarily so we can repopulate at end of array
            const lastMovedEngagement: PotentialEngagement = potentialEngagements[lastMovedIndex];
            potentialEngagements.splice(lastMovedIndex, 1);
            potentialEngagements.push(lastMovedEngagement);
        }
    }
    
    // iterate over the potential counts, starting at 1 going to max 4 (because cardinals)
    for (let count = 1; count <= 4; count++) {
        // now we iterate over the engagements array
        for (let potentialEngagement of potentialEngagements) {
            // we only want ones that match the count we're on and are not already engaged
            // we don't mind if the source is the lastMoved, as it will always be processed last in its cohort
            // ... so we don't check for it here
            if (potentialEngagement.count === count && potentialEngagement.source.piece!.engaged === false) {
                // iterate through the targets
                for (let target of potentialEngagement.targets) {
                    // check if the target is engaged
                    // here we DO want to ignore the lastMoved as a target, enforcing the rule that it will always be processed as a source...
                    // ... which ensures we get to it last in its count/cohort
                    if (target.piece!.engaged === false && target.getID() !== lastMovedID) {
                        // set both pieces to engaged
                        potentialEngagement.source.piece!.engaged = true;
                        target.piece!.engaged = true;
                        //--// console.log(`engaged ${potentialEngagement.source.getID()} to ${target.getID()}`);
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
                    square.piece.rotation = defaultRotation(square.piece.player);
                }
            }
        }
    }
    return board;
}