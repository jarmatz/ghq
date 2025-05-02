import { Piece, Square, Board, Game } from './game-objects'
import { scanBoard, Vector, isOnGrid, deVectorize, cardinals, defaultRotation } from './game-helpers';

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
// this begins by asking for an array of potential engagements for all infantry by calling getPotentialEngagements
// then it iterates through the array by each potentialengagement's "count"
// the algo works by setting all pieces with only one engagement first, then two... up to max (4)
// we delay processing the privileged (if any) until the end
export function setEngagements(board: Board, privileged?: Square): Board {

    board = wipeEngagements(board);

    let privilegedID: string;
    // if it's undefined we just set it to a garbage string
    // this way it'll never match when we perform conditional checks on the ID
    if (privileged === undefined) {
        privilegedID = 'zz';
    }
    else {
        privilegedID = privileged.getID();
    }

    const infantrySquares: Square[] = scanBoard(square => square.piece?.type === 'infantry', board);

    const potentialEngagements: PotentialEngagement[] = getPotentialEngagements(infantrySquares, board);

    // iterate over the potential counts, starting at 1 and going to max 4 (because cardinals)
    for (let count = 1; count <= 4; count++) {
        for (let potentialEngagement of potentialEngagements) {
            // cleanup for readability
            const source: Square = potentialEngagement.source;
            // we only want ones that match the count we're on and are not already engaged
            // we skip the privileged
            if (potentialEngagement.count === count
                && source.piece && !source.piece.engaged
                && source.getID() !== privilegedID
            ) {
                // now we're okay to iterate through the source's targets
                for (let target of potentialEngagement.targets) {
                    // check if the target is engaged
                    // it can't be privileged
                    if (target.piece && !target.piece.engaged
                        && target.getID() !== privilegedID
                    ) {
                        // engage and break, we can move on to next source
                        engage(source, target);
                        break;
                    }
                }
            }
        }
    }
    // now that we are out of the loop, see if we need to process the privileged
    if (privileged) {
        const privilegedPotentialEngagements: PotentialEngagement[] = getPotentialEngagements([privileged], board);
        // if it round a result we proceed
        if (privilegedPotentialEngagements.length > 0) {
            // we should only have one object because only one square (privileged) was passed to getPotentialEngagements
            const privilegedPotentialEngagement: PotentialEngagement = privilegedPotentialEngagements[0];
            const source = privilegedPotentialEngagement.source;
            for (let target of privilegedPotentialEngagement.targets) {
                if (target.piece && !target.piece.engaged
                    // safety check
                    && source.piece && !source.piece.engaged
                ) {
                    engage(source, target);
                    break;
                }
            }
        }
    }
    return board;
}

// this function takes as input a selection of squares passsed into it...
// they should all contain infantry units
// then it creates the potential engagement objects for that unit
// we can pass in an optional parameter that limits us to potential engagements of a maximum count
// if we don't pass it in, it defaults to 4
// NOTE: it does not wipe engagements, and passes over units that are already engaged
export function getPotentialEngagements(squares: Square[], board: Board, maxEngagementTargets?: number): PotentialEngagement[] {

    if (maxEngagementTargets === undefined) {
        maxEngagementTargets = 4;
    }

    const potentialEngagements: PotentialEngagement[] = [];

    // iterate over the squares we passed in as parameter
    for (let source of squares) {
        const targets: Square[] = [];
        // iterate over the cardinal directions around each source
        for (let direction of cardinals) {
            // safety check that we're on the board
            // and that the source isn't engaged (it shouldn't be passed in that way)
            if (isOnGrid(source.row + direction.row, source.column + direction.column)
                && source.piece && !source.piece.engaged
            ) {
                // get our target if we are
                const target: Square = board[source.row + direction.row][source.column + direction.column];
                // check if it has an opposing infantry that is UNENGAGED
                if (target.piece?.type === 'infantry'
                    && target.piece.player !== source.piece?.player 
                    && !target.piece.engaged) {
                        // add it to the targets array
                        targets.push(target);
                    }
            }
        }
        // before we move on to the next source square, did we find any targets?
        // if so, we make a PE instance for return
        if (targets.length > 0 && targets.length <= maxEngagementTargets) {
            potentialEngagements.push(new PotentialEngagement(source, targets));
        }
    }
    return potentialEngagements;
}

// engages two pieces and sets them facing to each other
// takes as input their squares
export function engage(source: Square, target: Square) {
    if (!source.piece || !target.piece) {
        return;
    }

    // set engagement status
    source.piece.engaged = true;
    target.piece.engaged = true;
    console.log(`engaged ${source.getID()} to ${target.getID()}`);

    // handle rotations, start by getting diff vector for positions
    let diffVector: Vector = {
        row: target.row - source.row,
        column: target.column - source.column
    }
    let sourceAngle: number = deVectorize(diffVector);
    // point them at each other
    source.piece.rotation = sourceAngle;
    target.piece.rotation = (sourceAngle + 180) % 360;
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