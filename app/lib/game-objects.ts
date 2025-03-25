import 'reflect-metadata';
import { immerable } from 'immer';
import { ROWS, COLUMNS, setup } from './game-config';
import { parsePlayer, parseTag, parseType } from './game-helpers';
import { Type } from 'class-transformer';
import { Socket } from 'socket.io-client';

// string type restrictions
export type Player = 'red' | 'blue' | '';
export type PieceType = 'infantry' | 'hq' | 'artillery' | 'undefined';
export type PieceTag = 'standard' | 'armored' | 'heavy' | 'airborne' | 'undefined';
export type PieceStatus = 'tray' | 'board' | 'active' | 'inactive' | 'captured';
export type Bombardment = 'red' | 'blue' | 'both' | '';
export type Rotation = number;


// this is the class that manages date for individual squares on the board
// each square has a row and column, and can contain a piece object
export class Square {
    public readonly row: number;
    public readonly column: number;
    @Type(() => Piece)
    public piece: Piece | null;
    public bombardment: Bombardment;

    constructor(
        row: number,
        column: number
    ) {
        this.row = row;
        this.column = column;
        this.piece = null;
        this.bombardment = '';
    }
    public isOccupied(): boolean {
        return this.piece !== null;
    }
    public getID(): string {
        return `${this.row}${this.column}`;
    }
    public load(pieceName: string) {
        this.piece = new Piece(pieceName, this.row, this.column);
    }
    public unload() {
        this.piece = null;
    }
}

// this is the class that manages data for individual pieces
export class Piece {
    public readonly name: string;
    public readonly player: Player;
    public readonly tag: PieceTag;
    public readonly type: PieceType;
    public row: number;
    public column: number;
    public rotation: Rotation;
    public engaged: boolean;

    constructor(
        // name must be of format "player-tag-type" to work
        name: string,
        row: number = -1,
        column: number = -1,
    ) {
        // this is logic to help class-transformer as it can't take arguments
        // without it, it will face trouble trying to parse an undefined name
        if (name) {
            this.name = name;
            this.type = parseType(name) as PieceType;
            this.tag = parseTag(name) as PieceTag;
            this.player = parsePlayer(name) as Player;
        }
        else {
            this.name = '';
            this.type = 'undefined';
            this.tag = 'undefined';
            this.player = '';
        }
        this.row = row;
        this.column = column;
        this.rotation = 0;
        this.engaged = false;
    }
    public getID() {
        return `${this.row}${this.column}`;
    }
}

// this is how we build a blank board of squares
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
// unlike createBoard, it does not return an empty tray, but one set by game-config
// likewise, it does not contain squares but a more primitive array of tray objects
export type Tray = Reserve[];
export class Reserve {
    [immerable] = true;
    public readonly name: string;
    public readonly player: Player;
    public type: PieceType;
    public tag: PieceTag;
    public count: number;
    public position: number;

    constructor(name: string, count: number, position: number){
        if (name) {
            this.name = name;
            this.type = parseType(name) as PieceType;
            this.tag = parseTag(name) as PieceTag;
            this.player = parsePlayer(name) as Player;
        }
        else {
            this.name = '';
            this.type = 'undefined';
            this.tag = 'undefined';
            this.player = '';
        }
        this.count = count;
        this.position = position;
    }
}


function createTray(player: Player, trayConfig: { name: string, count: number }[]): Tray {
    const tray: Tray = [];
    // iterate through our setup config
    for (let i = 0; i < trayConfig.length; i++) {
        tray[i] = new Reserve(player + '-' + trayConfig[i].name, trayConfig[i].count, i);
    }
    return tray;
}

// the class for a game action that is sent to server for validation
// it stores the source and target squares as strings of the "getID()" format
export type Log = GameAction[];
export class GameAction {
    public readonly type: string;
    @Type(() => Piece)
    public readonly piece?: Piece;
    @Type(() => Reserve)
    public readonly reserve?: Reserve;
    @Type(() => Square)
    public readonly source?: Square;
    @Type(() => Square)
    public readonly target?: Square;
    public readonly rotation?: number;

    // we use a destructuring syntax so we can specify which parameters we pass in
    // new GameAction({ type: 'move', piece: somePiece}) etc.
    constructor({ type, piece, reserve, source, target, rotation}:
                { type: string; piece?: Piece; reserve?: Reserve; source?: Square, target?: Square; rotation?: number}
    ) {
        this.type = type;
        this.piece = piece;
        this.reserve = reserve;
        this.source = source;
        this.target= target;
        this.rotation = rotation;
    }
}

// the main object that stores the current underyling game state
// shared between client and server
export class Game {

    [immerable] = true;
    public name: string;
    @Type(() => Square)
    public board: Board;
    @Type(() => Reserve)
    public trays: { blue: Tray, red: Tray };
    @Type(() => GameAction)
    public log: Log = [];
    public activePlayer: Player;
    public actionsLeft;

    constructor(name: string) {
        this.name = name;
        this.board = setupBoard(setup.boardConfig);
        this.activePlayer = 'blue';
        this.actionsLeft = 3;
        this.trays = {
            blue: createTray('blue', setup.trayConfig),
            red: createTray('red', setup.trayConfig),
        };
    }
}

// the ui object keeps data on the state of the local UI...
// ... it's data that the server doesn't need, stuff only "you" see, like highlighted potential moves
export class UI {

    [immerable] = true;
    public readonly self: Player;
    public isActive: boolean;
    public activePiece: Piece | null;
    public activeReserve: Reserve | null;
    public potentialMoves: Square[];
    public rotationMemory: number;

    constructor(self: Player = '') {
        this.self = self;
        this.isActive = false;
        this.potentialMoves = [];
        this.activePiece = null;
        this.activeReserve = null;
        this.rotationMemory = 0;
    }
}

// the session object that keeps a local instance of the game + ui variables
// this is the main object managed on the client side
export class Session {
    
    [immerable] = true;
    @Type(() => Game)
    public game: Game;
    @Type(() => UI)
    public ui: UI;
    @Type(() => Socket)
    public readonly socket: Socket;

    constructor(
        game: Game = new Game(''),
        ui: UI = new UI(),
        socket: Socket
    ) {
        this.game = game;
        this.ui = ui;
        this.socket = socket;
    }
}
