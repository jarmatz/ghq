import { Piece, Square, Board, Game } from './game-objects'
import { scanBoard, Vector, isOnGrid, deVectorize, cardinals, defaultRotation } from './game-helpers';

// this stores a source square (and by definition the piece it contains) plus...
// ... an array of target squares with enemy infantry that are adjacent to it in cardinal directions plus...
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

// a wrapper function that performs the setEngagements algo twice if we have a privileged square
// it compares the engagement count in both results
// then it decides if it can privilege the square
// doing it if and only if it doesn't lead to fewer total engagements
export function setEngagements(board: Board, privileged?: Square): Board {
    
    // if we don't have privileged, we do it simply and return
    if (privileged === undefined) {
        // return the board element of the function return
        return setEngagementsInner(board).board;
    }
    
    // if using the privileged leads to fewer engagements
    // return the result without using privileged
    if (setEngagementsInner(board, privileged).count < setEngagementsInner(board).count) {
        return setEngagementsInner(board).board;
    }
    // otherwise we can use the privileged
    else {
        return setEngagementsInner(board, privileged).board;
    }
}

// takes the board, sets engagements, and returns a new board with pieces engaged and rotations set
// it also returns a count of the number of engagements, that we can use to decide if we allow privileged status in the outer function
// this begins by finding all potential engagements for a given set of unengaged infantry squares
// then it iterates through that list, beginning by looking for sources with only one potential engagement and counting up from there
// NOTABLY, when it finds an engagement, it completely refreshes the process, getting a new set of potential engagements that account for
// ... the new board state (so some units that had two targets might now have one), and it starts the count at 1 again
// it keeps doing this until there are no more left to engage
// we delay processing the privileged (if any) until the end by engaging it temporarily until the main loop is done
function setEngagementsInner(board: Board, privileged?: Square): {count: number, board: Board} {

    // begin by wiping engagements
    board = wipeEngagements(board);

    // if we have a privileged, we set it to engaged NOW, so it doesn't get processed
    if (privileged && privileged.piece) {
        privileged.piece.engaged = true;
    }

    // now we get all unengagedInfantrySquares, noting that it will not pick up privileged
    let unengagedInfantrySquares: Square[] = scanBoard(
        square => (square.piece?.type === 'infantry' && square.piece?.engaged === false), 
        board
    );

    // we get a list of all possible engagements, not just singletons
    let potentialEngagements: PotentialEngagement[] = getPotentialEngagements(unengagedInfantrySquares, board);

    // iterate over the count of possible engagements for each source
    for (let count = 1; count <=4; count++) {
        // labeling this so we can break from inner targets loop
        engagementLoop: for (let potentialEngagement of potentialEngagements) {
            // cleanup for readability
            const source: Square = potentialEngagement.source;
            // we only want ones that match the count that we're on and are not already engaged
            if (potentialEngagement.count === count
                // this is a safetycheck, these should be true
                && source.piece && source.piece.engaged === false
            ) {
                // iterate over targets
                for (let target of potentialEngagement.targets) {
                    // check if the target is engaged
                    if (target.piece && target.piece.engaged === false) {
                        // if we got here, we're good to go
                        engage(source, target)
                        // now that we've engaged we RESET EVERYTHING AND GO AGAIN
                        // get the list of unengaged squares (now excluding what we just engaged)
                        unengagedInfantrySquares = scanBoard(
                            square => (square.piece?.type === 'infantry' && square.piece?.engaged === false), 
                            board
                        );
                        // get the fresh potentialEngagements objects for a fresh start
                        potentialEngagements = getPotentialEngagements(unengagedInfantrySquares, board);
                        // COUNT SET TO 0, WE WANT IT TO INCREMENT TO 1 AT THE END OF COUNT LOOP AND START FRESH
                        count = 0;
                        // now we break the engagement loop, return to count loop, which will start anew with count++
                        break engagementLoop;
                    }
                }
            }
        }
    }

    // now we process the privileged if it exists
    if (privileged && privileged.piece) {
        // begin by removing its temporary engagement status
        privileged.piece.engaged = false;
        // get potential engagements for the privileged
        const privilegedPotentialEngagements: PotentialEngagement[] = getPotentialEngagements([privileged], board);
        // if it found a result we proceed
        if (privilegedPotentialEngagements.length > 0) {
            // we should only have one object because only one square (privileged) was passed to getPotentialEngagements
            const privilegedPotentialEngagement: PotentialEngagement = privilegedPotentialEngagements[0];
            const source = privilegedPotentialEngagement.source;
            const targets = privilegedPotentialEngagement.targets;
            // engage arbirtarily to the first available target
            engage(source, targets[0]);         
        }
    }
     
    // find all engaged pieces so we can return the count of them
    const engagedSquares: Square[] = scanBoard(square => (square.piece !== null && square.piece.engaged), board);

    return {count: engagedSquares.length, board: board};
}

// this function takes as input a selection of squares passsed into it...
// they should all contain infantry units
// then it creates the potential engagement objects for that unit
// we can pass in an optional parameter that limits us to potential engagements of a maximum count
// if we don't pass it in, it defaults to 4 -- 1 is useful for finding units with only one engagement target
// it doesn't care about privilege, but it does care about engagement status
// NOTE: it does not wipe engagements, and passes over units that are already engaged
function getPotentialEngagements(squares: Square[], board: Board, maxEngagementTargets?: number): PotentialEngagement[] {

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
                && source.piece && source.piece.engaged === false
            ) {
                // get our target
                const target: Square = board[source.row + direction.row][source.column + direction.column];
                // check if it has an opposing infantry that is UNENGAGED
                // we ignore the privileged!
                if (target.piece?.type === 'infantry'
                    && target.piece.player !== source.piece?.player 
                    && target.piece.engaged === false
                ) {
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
function engage(source: Square, target: Square) {
    if (!source.piece || !target.piece) {
        return;
    }

    // we don't allow engagement overwriting
    if (source.piece.engaged === true || target.piece.engaged === true) {
        return;
    }

    // set engagement status
    source.piece.engaged = true;
    target.piece.engaged = true;

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




//--------------------------------------------------------------------------------------------
// ****** This is the old logic, with some faulty edge case I believe ****
// takes the board, sets engagements, and returns a new board with pieces engaged and rotations set
// it also returns a count of the number of engagements, that we can use to decide if we allow privileged status in the outer function
// this begins by asking for an array of potential engagements for all infantry by calling getPotentialEngagements
// then it iterates through the array by each potentialengagement's "count"
// the algo works by setting all pieces with only one engagement first, then two... up to max (4)
// we delay processing the privileged (if any) until the end
function oldSetEngagementsInner(board: Board, privileged?: Square): {count: number, board: Board} {

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

    // this gets us every square with an infantry in it
    const infantrySquares: Square[] = scanBoard(square => square.piece?.type === 'infantry', board);
    // getPotentialEngagements only runs on the squares we provide to it
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
                    // check if the target is engaged, we only care if it isn't
                    // and it can't be privileged
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
        // begin by only getting potential engagements for the privileged square
        // ok to pass it the privilegedID because we are processing it as a source not a target
        // and getPotentialEngagements only ignores privilged as a target
        const privilegedPotentialEngagements: PotentialEngagement[] = getPotentialEngagements([privileged], board);
        // if it found a result we proceed
        if (privilegedPotentialEngagements.length > 0) {
            // we should only have one object because only one square (privileged) was passed to getPotentialEngagements
            const privilegedPotentialEngagement: PotentialEngagement = privilegedPotentialEngagements[0];
            const source = privilegedPotentialEngagement.source;
            for (let target of privilegedPotentialEngagement.targets) {
                // we only care if the target is not engaged
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

    // find all engaged pieces so we can return the count of them
    const engagedSquares: Square[] = scanBoard(square => (square.piece !== null && square.piece.engaged), board);

    return {count: engagedSquares.length, board: board};
}