import { Piece, Board } from './game-objects';
import { ROWS, COLUMNS } from './game-config';

// this takes as input a piece and then returns possible moves
// they are returned as an array of strings of the unique square IDs
export function checkMoves(piece: Piece, board: Board): string[] {

    const potentialMoves: string[] = [];
    if (piece.tag === 'armored') {
        return moveTwo(piece, board)
    }
    else {
        return moveOne(piece, board);
    }
}

export function checkPlacements(piece: Piece, board: Board) {
    
}


// it returns an array with possible moves
// it takes as input the origin row and column
export function moveOne(piece: Piece, board: Board): string[] {
    
    const potentialMoves: string[] = [];
    
    for (let row = -1; row <= 1; row++) {
        for (let column = -1; column <= 1; column++) {
            // make sure it's not off the grid
            if (isOnGrid(row + piece.row, column + piece.column)) {
                // and not occupied (blissfully this will also exclde the piece's own location)
                if (!(board[row + piece.row][column + piece.column].isOccupied())){
                    potentialMoves.push(`${row+piece.row}${column+piece.column}`);
                }
            }   
        }
    }
    return potentialMoves;
}

export function moveTwo(piece: Piece, board: Board): string[] {

    const potentialMoves: string[] = [];
    // first call move.one
    potentialMoves.push(...moveOne(piece, board));

    // now do the doubles
    for (let row = -2; row <= 2; row+= 2) {
        for (let column = -2; column <= 2; column+= 2) {
            // make sure it's not off the grid
            if (isOnGrid(row + piece.row, column + piece.column)) {
                // check that the square isn't occupied
                if (!(board[row + piece.row][column + piece.column].isOccupied())){
                    potentialMoves.push(`${row+piece.row}${column+piece.column}`);
                }   
            }
        }
    }
    return potentialMoves;
}


// checks if a row/column are within the board (useful for checking moves)
export function isOnGrid(row: number, column: number): boolean {
    if (row >= 0 && row < ROWS && column >= 0 && column < COLUMNS) {
        return true;
    }
    else {
        return false;
    }
}