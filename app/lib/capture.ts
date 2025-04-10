import { plainToInstance, instanceToPlain } from "class-transformer";
// my imports:
import { Square, Board, Player, Game } from "./game-objects";
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
                // if it's an hq, we need an ally
                if (target.piece.type === 'hq') {
                    // iterate now over the squares around the hq -- the 'metatargets'
                    // we need to find 2 (to include the starting piece)
                    let oppositionCount = 0;
                    for (let metaVector of vectors) {
                        if (isOnGrid(target.row + metaVector.row, target.column + metaVector.column)) {
                            const metaTarget = board[target.row + metaVector.row][target.column + metaVector.column];
                            // if the hq is adjacent to an unengaged infantry of our own team
                            if (metaTarget.piece && metaTarget.piece.player === source.piece.player 
                                && metaTarget.piece.type === 'infantry' && !metaTarget.piece.engaged) {
                                    oppositionCount++;
                                    console.log(metaTarget.getID());
                                }
                            if (oppositionCount >= 2) {
                                console.log('opp count check')
                                potentialCaptures.push(target);
                                break;
                            }
                        }
                    }
                }
            }
        }
    }
    return potentialCaptures.map((square) => square.getID());
}

// this returns a string of IDs of pieces that can be captured passively
// it creates a proxy board object on which it runs the captures
// this way it can execute infantry captures BEFORE artillery captures, so engagement is freed up as necessary
// but it doesn't actually affect the actual board
export function checkPassiveCaptures(capturingPlayer: Player, game: Game) : string[] {
    let allCaptureIDs: string[] = [];

    // we do proxy with Game (instead of Board) because syntax with class transformer is less wonky
    const proxyGame: Game = plainToInstance(Game, instanceToPlain(game));
    let board = proxyGame.board;

    board = setEngagements(board);
    // PHASE 1: INFANTRY CAPTURES
    let captureSquares: Square[] = [];
    const infantrySquares: Square[] = [] = scanBoard(square => square.piece?.player === invertPlayer(capturingPlayer)
                                                    && square.piece?.type === 'infantry', board);

    for (let infantrySquare of infantrySquares) {
        // check for bombardment capture
        if (infantrySquare.bombardment === 'both' || infantrySquare.bombardment === capturingPlayer) {
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
                if (infantrySquare.piece!.engaged && opposition.piece && opposition.piece.type === 'infantry' &&
                    !opposition.piece.engaged && opposition.piece.player === capturingPlayer) {
                    // we could use a set, but whatever, this is easy too:
                    if (!captureSquares.includes(infantrySquare)) {
                        captureSquares.push(infantrySquare);
                        break; // we don't need to do more in the vector loop
                    }
                }
            }
        }
    }

    // EXECUTE ALL INFANTRY CAPTURES +++ LOAD UP OUR CAPTURE SQUARE IDS
    for (let captureSquare of captureSquares) {
        if (captureSquare.piece) {
            captureSquare.unload();
            // this loads it up for return:
            allCaptureIDs.push(captureSquare.getID());
        }
    }

    // PHASE 2: HQ CAPTURES
    // begin by resetting engagements and capture squares
    board = setEngagements(board);
    captureSquares = [];
    const hqSquares: Square[] = scanBoard(square => square.piece?.player === invertPlayer(capturingPlayer)
                                        && square.piece?.type === 'hq', board);
    // we should only get 1, but we'll allow iteration for future alternate rulesets
    for (let hqSquare of hqSquares) {
        // check bombardments
        if (hqSquare.bombardment === 'both' || hqSquare.bombardment === capturingPlayer) {
            captureSquares.push(hqSquare);
        }
        // check for 2!!! adjacent infantry
        let oppositionCount = 0;
        const vectors: Vector[] = [{row: 0, column: 1}, {row: 1, column: 0}, {row: 0, column: -1}, {row: -1, column: 0}];
        for (let vector of vectors) {
            if (isOnGrid(hqSquare.row + vector.row, hqSquare.column + vector.column)) {
                const opposition: Square = board[hqSquare.row + vector.row][hqSquare.column + vector.column];
                // check if the opposition square has infantry that is not yet engaged
                if (opposition.piece && opposition.piece.type === 'infantry' && !opposition.piece.engaged
                    && opposition.piece.player === capturingPlayer) {
                    oppositionCount++;
                }
                if (oppositionCount >= 2 && !captureSquares.includes(hqSquare)) {
                    captureSquares.push(hqSquare);
                    break;
                }
            }
        }
    }
    // EXECUTE HQ CAPTURES
    for (let captureSquare of captureSquares) {
        if (captureSquare.piece) {
            captureSquare.unload();
            // this loads it up for return:
            allCaptureIDs.push(captureSquare.getID());
        }
    }

    // PHASE 3: ARTILLERY CAPTURES
    // begin by resetting engagements and capture squares
    board = setEngagements(board);
    captureSquares = [];
    const artillerySquares: Square[] = scanBoard(square => square.piece?.player === invertPlayer(capturingPlayer)
                                                && square.piece?.type === 'artillery', board);

    for (let artillerySquare of artillerySquares) {
        const vectors: Vector[] = [{row: 0, column: 1}, {row: 1, column: 0}, {row: 0, column: -1}, {row: -1, column: 0}];
        for (let vector of vectors) {
            if (isOnGrid(artillerySquare.row + vector.row, artillerySquare.column + vector.column)) {
                const opposition: Square = board[artillerySquare.row + vector.row][artillerySquare.column + vector.column];
                // check if the opposition square has infantry that is not engaged
                if (opposition.piece && opposition.piece.type === 'infantry' && !opposition.piece.engaged
                    && opposition.piece.player === capturingPlayer) {
                    // we can't be directly in front of the artillery
                    const angle: number = deVectorize(vector);
                    if (artillerySquare.piece!.rotation !== angle && !captureSquares.includes(artillerySquare)) {
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
            captureSquare.unload();
            // this loads it up for return:
            allCaptureIDs.push(captureSquare.getID());
        }
    }
    return allCaptureIDs;
}


// this actually executes the captures by calling check first and then handling it
export function executePassiveCaptures(capturingPlayer: Player, game: Game): Game {

    console.log('executing passive captures from', capturingPlayer);

    // call our check function to get the squares that need capture
    const passiveCaptureIDs: string[] = checkPassiveCaptures(capturingPlayer, game);

    // scan the board to find ID matches
    const passiveCaptureSquares: Square[] = scanBoard(square => passiveCaptureIDs.includes(square.getID()), game.board);

    for (let captureSquare of passiveCaptureSquares) {
        if (captureSquare.piece) {
            captureSquare.unload();
        }
    }

    // we captured infantry potentially so reset engagements
    game.board = setEngagements(game.board);

    return game;
}