import { immerable } from 'immer';

export const ROWS: number = 8;
export const COLUMNS: number = 8;


// string type restrictions
export type Player = 'red' | 'blue' | '';
export type PieceType = 'infantry' | 'hq' | 'paratrooper';
export type PieceTag = '';
export type PieceStatus = 'tray' | 'board' | 'active' | 'inactive' | 'captured';
export type Rotation = 'up' | 'down' | 'left' | 'right';


// this is the class that manages date for individual squares on the board
// each square has a row and column, and can contain a piece
export class Square {
    public readonly row: number;
    public readonly column: number;
    public piece: Piece | null;

    constructor(
        row: number,
        column: number,
    ) {
        this.row = row;
        this.column = column;
        this.piece = null;
    }

    public isOccupied(): boolean {
        return this.piece !== null;
    }

    public getID(): string {
        return `${this.row}${this.column}`;
    }

}

// this is the class that manages data for individual pieces
// each piece has a type, status, player, row, column, and rotation
export class Piece {

    public readonly type: PieceType;
    public status: PieceStatus;
    public readonly player: Player;
    public row: number | null;
    public column: number | null;
    public rotation: Rotation;

    constructor(
        type: PieceType,
        player: Player,
        row: number | null = null,
        column: number | null = null,
        status: PieceStatus = 'tray',
    ) {
        this.type = type;
        this.status = status;
        this.player = player;
        this.row = row;
        this.column = column;
        this.rotation = 'up';
    }

    getName(): string {
        return `${this.player}-${this.type}`;
    }
}


// this is how we build a board of squares
export type Board = Square[][];

export function createBoard(): Board {
    const board: Board = [];

    for (let row = 0; row < ROWS; row++) {
        board[row] = [];
        for (let column = 0; column < COLUMNS; column++) {
            board[row][column] = new Square(row, column);
        }
    }
return board;

}

// the main object that stores the current underyling game state
export class Game {

    [immerable] = true;
    public board: Board;
    public activePlayer: Player;

    constructor() {
        this.board = createBoard();
        this.activePlayer = 'red';
    }
}

// the ui object keeps data on the state of the local UI

export class UI {

    [immerable] = true;
    public isActive: boolean;
    public self: Player;
    public activePiece: Piece | null;
    public potentialMoves: string[];

    constructor() {
        this.isActive = false;
        this.potentialMoves = [];
        this.activePiece = null;
        this.self = '';
    }
}

// the local object that keeps a local instance of the game + ui variables
export class Local {
    
    [immerable] = true;
    public game: Game;
    public ui: UI;

    constructor(
        game: Game = new Game(),
        ui: UI = new UI(),
    ) {
        this.game = game;
        this.ui = ui;
    }
}

export function checkMoves (piece: Piece): string[] {

    const potentialMoves: string[] = [];

    switch (piece.type) {

            case 'infantry': {

                return moveTwo(Number(piece.row), Number(piece.column));   
            }

            case 'hq': {
                
                return moveOne(Number(piece.row), Number(piece.column));
            }
    
    }
    return [];
}



// it returns an array with possible moves


export function moveOne(pieceRow: number, pieceColumn: number): string[] {
    
    const potentialMoves: string[] = [];
    
    for (let row = -1; row <= 1; row++) {
        for (let column = -1; column <= 1; column++) {
            // make sure it's not off the grid
            if (row + pieceRow >= 0 
                && row + pieceRow <= ROWS
                && column + pieceColumn >= 0
                && column + pieceColumn <= COLUMNS
                ) {
                    // and we're not at the piece's own location
                    if (!(row === 0 && column === 0)) {
                        potentialMoves.push(`${row+pieceRow}${column+pieceColumn}`)
                    }
            }   

        }
    }
    return potentialMoves;
}

export function moveTwo(pieceRow: number, pieceColumn: number): string[] {

        const potentialMoves: string[] = [];

        // first call move.one
        potentialMoves.push(...moveOne(pieceRow, pieceColumn));

        // now do the doubles
        for (let row = -2; row <= 2; row+= 2) {
            for (let column = -2; column <= 2; column+= 2) {
                // make sure it's not off the grid
                if (row + pieceRow >= 0 
                    && row + pieceRow <= ROWS
                    && column + pieceColumn >= 0
                    && column + pieceColumn <= COLUMNS
                    ) {
                        // and we're not at the piece's own location
                        if (!(row === 0 && column === 0)) {
                            potentialMoves.push(`${row+pieceRow}${column+pieceColumn}`)
                        }
                }   
    
            }
        }

        return potentialMoves;
    }
