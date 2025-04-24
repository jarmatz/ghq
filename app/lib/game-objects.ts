import 'reflect-metadata';
import { immerable } from 'immer';
import { ROWS, COLUMNS, setup } from './game-config';
import { parsePlayer, parseTag, parseType } from './game-helpers';
import { Type } from 'class-transformer';

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
    [immerable] = true;
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
    public depleted: boolean;

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
        this.depleted = false;
    }
    public getID(): string {
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
    // returns a tray ID of format b3, r1, b0, etc.
    public getID(): string {
        return `${this.player[0]}${this.position}`;
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

// we need this to help out with decorators for class-transformer
export class Trays {
    [immerable] = true;
    @Type(() => Reserve)
    public blue: Reserve[];
  
    @Type(() => Reserve)
    public red: Reserve[];

    constructor() {
        this.blue = createTray('blue', setup.trayConfig)
        this.red = createTray('red', setup.trayConfig)
    }
}

// the class for a game action that is sent to server for validation
export class GameAction {
    [immerable] = true;
    public readonly type: string;
    @Type(() => Piece)
    public readonly piece: Piece | null;
    @Type(() => Reserve)
    public readonly reserve: Reserve | null;
    @Type(() => Square)
    public readonly source: Square | null;
    @Type(() => Square)
    public readonly target: Square | null;
    public readonly rotation: number | null;
    @Type(() => Square)
    public readonly capture: Square | null;
    public readonly endTurnFlag: boolean;

    constructor(type: string, piece: Piece | null, reserve: Reserve | null, source: Square | null, 
                target: Square| null, rotation: number | null = null, capture: Square | null = null,
                endTurnFlag: boolean = false
    ) {
        this.type = type;
        this.piece = piece;
        this.reserve = reserve;
        this.source = source;
        this.target= target;
        this.rotation = rotation;
        this.capture = capture;
        this.endTurnFlag = endTurnFlag;
    }
    addRotation(rotation: number) {
        return new GameAction(this.type, this.piece, this.reserve, this.source, this.target, rotation, this.capture, this.endTurnFlag);
    }
    addCapture(capture: Square) {
        return new GameAction(this.type, this.piece, this.reserve, this.source, this.target, this.rotation, capture, this.endTurnFlag);
    }
    addEndTurnFlag() {
        return new GameAction(this.type, this.piece, this.reserve, this.source, this.target, this.rotation, this.capture, true);
    }
}

// the class that stores an entry in the gamelog
export class Log {
    [immerable] = true;

    public text: string;
    @Type(() => Square)
    public snapshot: Square[][];
    // stored as string IDs:
    public activeIDs: string[];
    // likewise:
    public captureIDs: string[];

    constructor(text: string, snapshot: Square[][], activeIDs: string[], captureIDs: string[]) {
        this.text = text;
        this.snapshot = snapshot;
        this.activeIDs = activeIDs;
        this.captureIDs = captureIDs;
    }
}

// the main object that stores the current underyling game state
// shared between client and server
export class Game {

    [immerable] = true;
    public name: string;
    @Type(() => Square)
    public board: Square[][];
    @Type(() => Trays)
    public trays: Trays;
    @Type(() => Log)
    public log: Log[];
    public activePlayer: Player;
    public actionsLeft;
    public winner: Player;
    public hqVictory: boolean;

    constructor(name: string, hqVictory: boolean = false) {
        this.name = name;
        this.board = setupBoard(setup.boardConfig);
        this.activePlayer = 'blue';
        this.actionsLeft = 3;
        this.trays = new Trays();
        this.log = [];
        this.winner = '';
        this.hqVictory = hqVictory;
    }
}

// the ui object keeps data on the state of the local UI...
// ... it's data that the server doesn't need, stuff only "you" see, like highlighted potential moves
export class UI {

    [immerable] = true;
    public readonly self: Player;
    public logRender: number | null;
    public activePiece: Piece | null;
    public activeReserve: Reserve | null;
    public potentialMoves: string[];
    public potentialCaptures: string[];
    public upkeepCaptures: string[];
    // stores the current piece rotation when actively rotation so we can revert to it as needed:
    public rotationMemory: number;
    // stores an action readied to be emitted, in the case of a "free" rotation or capture
    public preAction: GameAction | null;
    public gameAction: GameAction | null;

    constructor(self: Player = '') {
        this.self = self;
        this.logRender = null;
        this.potentialMoves = [];
        this.potentialCaptures = [];
        this.upkeepCaptures = [];
        this.activePiece = null;
        this.activeReserve = null;
        this.rotationMemory = 0;
        this.preAction = null;
        this.gameAction = null;
    }
    isActive() {
        if (this.activePiece === null && this.activeReserve === null) {
            return false;
        }
        else {
            return true;
        }
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

    constructor(
        game: Game = new Game(''),
        ui: UI = new UI(),
    ) {
        this.game = game;
        this.ui = ui;
    }

    getBoardForRender(): Board {
        if (this.ui.logRender === null) {
            return this.game.board;
        }
        else {
            let entry: number = this.ui.logRender;
            return this.game.log[entry].snapshot;
        }
    }
}
