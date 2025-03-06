import { immerable } from 'immer';
import { ROWS, COLUMNS, TRAYSIZE, setup } from './game-config';

// string type restrictions
export type Player = 'red' | 'blue' | '';
export type PieceType = 'infantry' | 'hq' | 'paratrooper';
export type PieceTag = 'standard' | 'armored' | 'heavy' | 'airborne';
export type PieceStatus = 'tray' | 'board' | 'active' | 'inactive' | 'captured';
export type Rotation = number;


// this is the class that manages date for individual squares on the board
// each square has a row and column, and can contain a piece object
export class Square {
    public readonly row: number;
    public readonly column: number;
    public piece: Piece | null;

    constructor(
        row: number,
        column: number
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
export class Piece {

    public readonly name: string;
    public readonly player: Player;
    public readonly tag: PieceTag;
    public readonly type: PieceType;
    public isActive: false;
    public row: number;
    public column: number;
    public rotation: Rotation;

    constructor(
        // name must be of format "player-tag-type" to work
        name: string,
        row: number = -1,
        column: number = -1,
        status: PieceStatus = 'inactive',
    ) {
        this.name = name;
        this.type = this.parseType(name);
        this.tag = this.parseTag(name);
        this.isActive = false;
        this.player = this.parsePlayer(name);
        this.row = row;
        this.column = column;
        this.rotation = 0;
    }

    dashCount(name: string): number {
        let dashCount: number = 0;
        // iterate through characters
        for (let i=0; i < name.length; i++) {
            if (name.charAt(i) === '-') {
                dashCount++;
            }
        }
        return dashCount;
    }

    // these functions take a format "player-tag-type" or just "tag-type"...
    // ... and return the individual strings that compose it
    parsePlayer(name: string): Player {
        // first case two dashes, we have a player string
        if (this.dashCount(name) === 2) {
            // iterate through the characters
            for (let i = 0; i < name.length; i++) {
                if (name.charAt(i) === '-')
                {
                    return name.slice(0, i) as Player;
                }
            }
        }
        // if we got here, one or zero dashes, no name
        return '' as Player;
    }
    
    parseTag(name: string): PieceTag {
        let firstDash: number = 0;
        // iterate through the characters
        for (let i = 0; i < name.length; i++) {
            // did we hit a dash?
            if (name.charAt(i) === '-') {
                // is it the first string?
                if (this.dashCount(name) === 1) {
                    return name.slice(0, i) as PieceTag;
                }
                else if (firstDash === 0) {
                    firstDash = i;
                }
                else {
                    return name.slice(firstDash + 1, i) as PieceTag;
                }
            }
        
        }
        // if we got here, we have a problem
        return "" as PieceTag;
    }
    
    parseType(name: string): PieceType {
        let firstDash: number = 0;
        // iterate through the characters
        for (let i = 0; i < name.length; i++) {
            // did we hit a dash?
            if (name.charAt(i) === '-') {
                // did we only input two strings
                if (this.dashCount(name) === 1) {
                    return name.slice(i + 1) as PieceType;
                }
                else if (firstDash === 0) {
                    firstDash = i;
                }
                else {
                    return name.slice(i +1) as PieceType;
                }
            }
        }
        // if we got here, we have a problem
        return "" as PieceType;
    }
}

// this is how we build a blank board of squares
export type Board = Square[][];
function createBoard(): Board {
    const board: Board = [];

    for (let row = 0; row < ROWS; row++) {
        board[row] = [];
        for (let column = 0; column < COLUMNS; column++) {
            board[row][column] = new Square(row, column);
        }
    }
    return board;
}

// takes as input a setup config file for the board, imported from game-config
// returns a board with pieces in those starting locations
function setupBoard(boardConfig: {name: string, row: number, column: number}[]): Board {
    // initialize a blank board
    const board = createBoard();
    // iterate through them
    for (let i = 0; i < boardConfig.length; i++) {
        // these reassingments just for readability honestly
        let row = boardConfig[i].row;
        let column = boardConfig[i].column;

        // add a piece to the specified square at row, column
        board[row][column].piece = new Piece(boardConfig[i].name, row, column);
        // rotate it if it's red
        if (board[row][column].piece.player === 'red') {
            board[row][column].piece.rotation = 180;
        }
    }
    return board;
}


// this creates the tray object
// unlike createBoard, it does not reutn an empty tray, but one set by game-config
/*
type Tray = Square[];
function createTray(player: Player, trayConfig: {name: string, count: number}[]): Board {

}
*/


// this creates our initial board based on the configs above
const initialBoard: Board = setupBoard(setup.boardConfig);

// the main object that stores the current underyling game state
// shared between client and server
export class Game {

    [immerable] = true;
    public board: Board;
    public activePlayer: Player;

    constructor() {
        this.board = initialBoard;
        this.activePlayer = 'red';
    }
}

// the ui object keeps data on the state of the local UI...
// ... it's data that the server doesn't need, stuff only "you" see, like highlighted potential moves
export class UI {

    [immerable] = true;
    public isActive: boolean;
    public self: Player;
    public activeSquare: Square | null;
    public potentialMoves: string[];

    constructor() {
        this.isActive = false;
        this.potentialMoves = [];
        this.activeSquare = null;
        this.self = '';
    }
}

// the session object that keeps a local instance of the game + ui variables
// this is the main object managed on the client side
export class Session {
    
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