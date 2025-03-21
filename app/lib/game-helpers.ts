import { Bombardment, Piece, Player, Board, Square, createBoard } from './game-objects';
import { ROWS, COLUMNS } from './game-config';

export type Vector = {row: number, column: number};

// this takes as input a piece and then returns possible moves
// they are returned as an array of squares
export function checkMoves(piece: Piece, board: Board): Square[] {

    let backRank: number;
    piece.player === 'blue' ?  backRank = 7 : backRank = 0;

    if (piece.tag === 'armored') {
        return move(piece, board, 2)
    }
    else if (piece.tag === 'airborne' && piece.row === backRank) {
        return scanBoard(square => !square.isOccupied(), board);
    }
    else {
        return move(piece, board, 1);
    }
}

// this takes as input a player and returns potential placements
// all we need to know is the player, not the piece, since they all behave the same
export function checkPlacements(player: Player, board: Board): Square[] {

    const potentialMoves: Square[] = [];
    let backRank: number;
    player === 'blue' ?  backRank = 7 : backRank = 0;

    // iterate through the backrank
    for (let column = 0; column < COLUMNS; column++) {
        // if the square isn't occupied
        if (!(board[backRank][column].isOccupied())) {
            potentialMoves.push(board[backRank][column]);
        }
    }
    return potentialMoves;
    
}

// returns an array of potential squares where this piece can move
export function move(piece: Piece, board: Board, maxMoves: number): Square[] {
    const potentialMoves: Square[] = [];
    for (let row = -1; row <= 1; row++) {
        for (let column = -1; column <= 1; column++) {
            for (let move = 1; move <= maxMoves;) {
                let targetRow: number = row * move + piece.row, targetColumn: number = column * move + piece.column;
                // make sure it's not off the grid + the destination is not occupied
                if (isOnGrid(targetRow, targetColumn) && !(board[targetRow][targetColumn].isOccupied())) {
                    // once we know it's on grid, make sure it's not bombarded
                    if (board[targetRow][targetColumn].bombardment !== 'both' &&
                        board[targetRow][targetColumn].bombardment !== invertPlayer(piece.player)) {
                        potentialMoves.push(board[targetRow][targetColumn]);
                        move++
                    }
                    else {
                        break;
                    }
                }
                else {
                    break;
                }
            }
        }
    }
    return potentialMoves;
}

// scans the whole board for artillery then correctly sets bombardments in the appropriate squares
export function setBombardments(board: Board): Board {
    // first reset the board
    board = wipeBombardments(board);
    // scan the board for squares holding artillery and push to the array
    const artillerySquares: Square[] = [];
    artillerySquares.push(...scanBoard(square => square.piece?.type === 'artillery', board));
    // iterate through the artillery squares
    for (let square of artillerySquares) {
        // safety check
        if (square.piece === null) {
            console.log('break');
            break;
        }
        // set how many squares we are bombarding
        let bombardments: number = 2;
        square.piece.tag === 'heavy' ? bombardments = 3: bombardments = 2;
        // get the vector for the direction we are bombarding
        const vector: Vector = vectorize(square.piece.rotation);
        // loop through the bombardments
        for (let i = 1; i <= bombardments; i++) {
            // our target square is translated from our source by the vector * our bombardment number
            let targetRow: number = square.piece.row + i * vector.row;
            let targetColumn: number = square.piece.column + i * vector.column;
            // obviously, we only care if it's on grid
            if (isOnGrid(targetRow, targetColumn)) {
                // if our target isn't under bombardment, set it to our color
                if (board[targetRow][targetColumn].bombardment === '') {
                    board[targetRow][targetColumn].bombardment = square.piece.player;
                }
                // if it's under bombardment by the other player, set to both
                else if (board[targetRow][targetColumn].bombardment === invertPlayer(square.piece.player)) {
                    board[targetRow][targetColumn].bombardment = 'both';
                }
            }
        }
    }
    return board;
}

function wipeBombardments(board: Board) : Board {
    for (let row = 0; row < ROWS; row++) {
        for (let square of board[row]) {
            square.bombardment = '';
        }
    }
    return board;
}

// below here, secondary functions called as utilities
//----------------------------------------------------
// checks if a row/column are within the board (useful for checking moves)
export function isOnGrid(row: number, column: number): boolean {
    if (row >= 0 && row < ROWS && column >= 0 && column < COLUMNS) {
        return true;
    }
    else {
        return false;
    }
}

// checks the whole board for a condition
// returning an array of all squares that satisfy it
export function scanBoard(condition: (square: Square) => boolean, board: Board): Square[] {
    const resultSquares: Square[] = [];
    for (let row = 0; row < ROWS; row++) {
        for (let square of board[row]) {
            if (condition(square)) {
                resultSquares.push(square);
            }
        }
    }
    return resultSquares;
}

// this takes an angle and returns a vector object in that direction
export function vectorize(angle: number): Vector {
    // top
    if (angle === 0) {
        return {row: -1, column: 0};
    }
    // top right
    else if (angle === 45) {
        return {row: -1, column: 1};
    }
    // right
    else if (angle === 90) {
        return {row: 0, column: 1};
    }
    // bottom right
    else if (angle === 135) {
        return {row: 1, column: 1};
    }
    // bottom
    else if (angle === 180) {
        return {row: 1, column: 0};
    }
    // bottom left
    else if (angle === 225) {
        return {row: 1, column: -1};
    }
    // left
    else if (angle === 270) {
        return {row: 0, column: -1};
    }
    // top left
    else if (angle === 315) {
        return {row: -1, column: -1};
    }
    else {
        return {row: 0, column: 0};
    }
}

// this performs the reverse of vectorize
export function deVectorize (vector: Vector): number {
    // we only care about direction
    if (vector.row > 0) {
        vector.row = 1;
    }
    if (vector.column > 0) {
        vector.column = 1;
    }
    if (vector.row < 0) {
        vector.row = -1;
    }
    if (vector.column < 0) {
        vector.column = -1;
    }
    // convert the vector directions to angles
    if (vector.row === -1 && vector.column === 0) {
        return 0;
    }
    else if (vector.row === -1 && vector.column === 1) {
        return 45;
    }
    else if (vector.row === 0 && vector.column === 1) {
        return 90;
    }
    else if (vector.row === 1 && vector.column === 1) {
        return 135;
    }
    else if (vector.row === 1 && vector.column === 0) {
        return 180;
    }
    else if (vector.row === 1 && vector.column === -1) {
        return 225;
    }
    else if (vector.row === 0 && vector.column === -1) {
        return 270;
    }
    else if (vector.row === -1 && vector.column === -1) {
        return 315;
    }
    else {
        return 0;
    }
}

// returns red if passed blue, blue if passed red, empty string otherwise
export function invertPlayer(player: Player): Player {
    if (player === 'red' ) {
        return 'blue';
    }
    else if (player === 'blue') {
        return 'red';
    }
    else {
        return '';
    }
}

// these functions take a format "player-tag-type" or just "tag-type"...
// // ... and return the individual strings that compose it
export function parsePlayer(name: string): string {
        // first case two dashes, we have a player string
        if (dashCount(name) === 2) {
            // iterate through the characters
            for (let i = 0; i < name.length; i++) {
                if (name.charAt(i) === '-')
                {
                    return name.slice(0, i);
                }
            }
        }
        // if we got here, one or zero dashes, no name
        return '' ;
}
    
export function parseTag(name: string): string {
        let firstDash: number = 0;
        // iterate through the characters
        for (let i = 0; i < name.length; i++) {
            // did we hit a dash?
            if (name.charAt(i) === '-') {
                // is it the first string?
                if (dashCount(name) === 1) {
                    return name.slice(0, i);
                }
                else if (firstDash === 0) {
                    firstDash = i;
                }
                else {
                    return name.slice(firstDash + 1, i);
                }
            }
        
        }
        // if we got here, we have a problem
        return "";
}
    
export function parseType(name: string): string {
        let firstDash: number = 0;
        // iterate through the characters
        for (let i = 0; i < name.length; i++) {
            // did we hit a dash?
            if (name.charAt(i) === '-') {
                // did we only input two strings
                if (dashCount(name) === 1) {
                    return name.slice(i + 1);
                }
                else if (firstDash === 0) {
                    firstDash = i;
                }
                else {
                    return name.slice(i +1);
                }
            }
        }
        // if we got here, we have a problem
        return "";
}

// this counts dashes in a string, relevant for the parse functions
function dashCount(name: string): number {
    let dashCount: number = 0;
    // iterate through characters
    for (let i=0; i < name.length; i++) {
        if (name.charAt(i) === '-') {
            dashCount++;
        }
    }
    return dashCount;
}

