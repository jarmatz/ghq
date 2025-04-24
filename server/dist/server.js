var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp(target, key, result);
  return result;
};

// src/server.ts
import "reflect-metadata";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv2 from "dotenv";

// ../app/lib/server-helpers.ts
import { plainToInstance, instanceToPlain } from "class-transformer";

// src/pgpool.ts
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();
var pool = global.dbPool || new pg.Pool({
  connectionString: process.env.DB_URL,
  ssl: {
    rejectUnauthorized: false
    // just temp for now, we can change with a cert later
  }
});
if (process.env.NODE_ENV !== "production") {
  global.dbPool = pool;
}
var pgpool_default = pool;

// ../app/lib/game-cache.ts
var GameCache = class {
  constructor() {
    this.maxSize = 1e3;
    this.map = /* @__PURE__ */ new Map();
    // an array that stores our keys in order so we can see least recently updated
    this.keys = [];
  }
  set(key, value) {
    const result = this.map.set(key, value);
    this.keys = this.keys.filter((entry) => entry !== key);
    this.keys.push(key);
    if (this.map.size > this.maxSize) {
      const firstKey = this.keys.shift();
      this.map.delete(firstKey);
    }
    return result;
  }
  get(key) {
    if (this.map.has(key)) {
      this.keys = this.keys.filter((entry) => entry !== key);
      this.keys.push(key);
    }
    return this.map.get(key);
  }
  has(key) {
    return this.map.has(key);
  }
  // clear (removes all entries)
  clear() {
    this.map.clear();
    this.keys = [];
  }
  // validate (check that the size of keys is the same as map)
  validate() {
    if (this.map.size !== this.keys.length) {
      console.error("gamecache map size does not match key size");
      return false;
    } else if (this.map.size > this.maxSize || this.keys.length > this.maxSize) {
      console.error("gamecache is larger than maxSize");
      return false;
    }
    for (let key of this.keys) {
      if (!this.map.has(key)) {
        console.error("in gamecache there is a map entry without matching key entry");
        return false;
      }
    }
    return true;
  }
};
var gameCache = globalThis.gameCache ?? new GameCache();
if (process.env.NODE_ENV !== "production") {
  globalThis.gameCache = gameCache;
}
var game_cache_default = gameCache;

// ../app/lib/game-objects.ts
import "reflect-metadata";
import { immerable } from "immer";

// ../app/lib/game-config.ts
var ROWS = 8;
var COLUMNS = 8;
var setup = {
  trayConfig: [
    { name: "standard-infantry", count: 5 },
    { name: "armored-infantry", count: 3 },
    { name: "airborne-infantry", count: 1 },
    { name: "standard-artillery", count: 2 },
    { name: "armored-artillery", count: 1 },
    { name: "heavy-artillery", count: 1 }
  ],
  boardConfig: [
    { name: "red-standard-hq", row: 0, column: 0 },
    { name: "red-standard-artillery", row: 0, column: 1 },
    { name: "red-standard-infantry", row: 1, column: 0 },
    { name: "red-standard-infantry", row: 1, column: 1 },
    { name: "red-standard-infantry", row: 1, column: 2 },
    { name: "blue-standard-hq", row: 7, column: 7 },
    { name: "blue-standard-artillery", row: 7, column: 6 },
    { name: "blue-standard-infantry", row: 6, column: 7 },
    { name: "blue-standard-infantry", row: 6, column: 6 },
    { name: "blue-standard-infantry", row: 6, column: 5 }
  ]
};

// ../app/lib/game-helpers.ts
function checkMoves(piece, board) {
  let potentialMoves = [];
  let backRank;
  piece.player === "blue" ? backRank = 7 : backRank = 0;
  if (piece.tag === "armored") {
    potentialMoves = move(piece, board, 2);
  } else if (piece.tag === "airborne" && piece.row === backRank) {
    potentialMoves = scanBoard((square) => !square.isOccupied() && !(square.bombardment === "both") && !(square.bombardment === invertPlayer(piece.player)), board);
  } else {
    potentialMoves = move(piece, board, 1);
  }
  if (piece.type === "infantry") {
    potentialMoves = potentialMoves.filter((square) => !isDoubleOpposed(square, piece.player, board));
  }
  return potentialMoves.map((square) => square.getID());
}
function checkPlacements(player, board) {
  const potentialMoves = [];
  let backRank;
  player === "blue" ? backRank = 7 : backRank = 0;
  for (let column = 0; column < COLUMNS; column++) {
    if (!board[backRank][column].isOccupied()) {
      potentialMoves.push(board[backRank][column]);
    }
  }
  return potentialMoves.map((square) => square.getID());
}
function move(piece, board, maxMoves) {
  const potentialMoves = [];
  for (let row = -1; row <= 1; row++) {
    for (let column = -1; column <= 1; column++) {
      for (let move2 = 1; move2 <= maxMoves; ) {
        let targetRow = row * move2 + piece.row, targetColumn = column * move2 + piece.column;
        if (isOnGrid(targetRow, targetColumn) && !board[targetRow][targetColumn].isOccupied()) {
          let target = board[targetRow][targetColumn];
          if (target.bombardment !== "both" && target.bombardment !== invertPlayer(piece.player) && // and it is not the case that the piece is adjacent to enemy and the  target is in a zone of control
          !(checkAdjacency(piece, board) && checkZoneControl(target, invertPlayer(piece.player), board))) {
            potentialMoves.push(target);
            move2++;
          } else {
            break;
          }
        } else {
          break;
        }
      }
    }
  }
  return potentialMoves;
}
function isDoubleOpposed(source, activePlayer, board) {
  const opposingPlayer = invertPlayer(activePlayer);
  const vectors = [{ row: 0, column: 1 }, { row: 1, column: 0 }, { row: 0, column: -1 }, { row: -1, column: 0 }];
  let count = 0;
  for (let vector of vectors) {
    if (isOnGrid(source.row + vector.row, source.column + vector.column)) {
      const target = board[source.row + vector.row][source.column + vector.column];
      if (target.piece?.type === "infantry" && target.piece?.player === opposingPlayer && target.piece?.engaged === false) {
        count++;
      }
    }
    if (count >= 2) {
      return true;
    }
  }
  return false;
}
function setBombardments(board) {
  board = wipeBombardments(board);
  const artillerySquares = [];
  artillerySquares.push(...scanBoard((square) => square.piece?.type === "artillery", board));
  for (let square of artillerySquares) {
    if (square.piece === null) {
      break;
    }
    let bombardments = 2;
    square.piece.tag === "heavy" ? bombardments = 3 : bombardments = 2;
    const vector = vectorize(square.piece.rotation);
    for (let i = 1; i <= bombardments; i++) {
      let targetRow = square.piece.row + i * vector.row;
      let targetColumn = square.piece.column + i * vector.column;
      if (isOnGrid(targetRow, targetColumn)) {
        if (board[targetRow][targetColumn].bombardment === "") {
          board[targetRow][targetColumn].bombardment = square.piece.player;
        } else if (board[targetRow][targetColumn].bombardment === invertPlayer(square.piece.player)) {
          board[targetRow][targetColumn].bombardment = "both";
        }
      }
    }
  }
  return board;
}
function wipeBombardments(board) {
  for (let row = 0; row < ROWS; row++) {
    for (let square of board[row]) {
      square.bombardment = "";
    }
  }
  return board;
}
function isOnGrid(row, column) {
  if (row >= 0 && row < ROWS && column >= 0 && column < COLUMNS) {
    return true;
  } else {
    return false;
  }
}
function scanBoard(condition, board) {
  const resultSquares = [];
  for (let row = 0; row < ROWS; row++) {
    for (let square of board[row]) {
      if (condition(square)) {
        resultSquares.push(square);
      }
    }
  }
  return resultSquares;
}
function checkZoneControl(square, player, board) {
  const vectors = [{ row: 0, column: 1 }, { row: 1, column: 0 }, { row: 0, column: -1 }, { row: -1, column: 0 }];
  for (let vector of vectors) {
    if (isOnGrid(square.row + vector.row, square.column + vector.column)) {
      const target = board[square.row + vector.row][square.column + vector.column];
      if (target.piece?.type === "infantry" && target.piece?.player === player) {
        return true;
      }
    }
  }
  return false;
}
function checkAdjacency(piece, board) {
  const source = board[piece.row][piece.column];
  let vectors = [{ row: 0, column: 1 }, { row: 1, column: 0 }, { row: 0, column: -1 }, { row: -1, column: 0 }];
  for (let vector of vectors) {
    if (isOnGrid(source.row + vector.row, source.column + vector.column)) {
      const target = board[source.row + vector.row][source.column + vector.column];
      if (target.piece?.type === "infantry" && target.piece?.player === invertPlayer(piece.player)) {
        return true;
      }
    }
  }
  return false;
}
function vectorize(angle) {
  if (angle === 0) {
    return { row: -1, column: 0 };
  } else if (angle === 45) {
    return { row: -1, column: 1 };
  } else if (angle === 90) {
    return { row: 0, column: 1 };
  } else if (angle === 135) {
    return { row: 1, column: 1 };
  } else if (angle === 180) {
    return { row: 1, column: 0 };
  } else if (angle === 225) {
    return { row: 1, column: -1 };
  } else if (angle === 270) {
    return { row: 0, column: -1 };
  } else if (angle === 315) {
    return { row: -1, column: -1 };
  } else {
    return { row: 0, column: 0 };
  }
}
function deVectorize(vector) {
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
  if (vector.row === -1 && vector.column === 0) {
    return 0;
  } else if (vector.row === -1 && vector.column === 1) {
    return 45;
  } else if (vector.row === 0 && vector.column === 1) {
    return 90;
  } else if (vector.row === 1 && vector.column === 1) {
    return 135;
  } else if (vector.row === 1 && vector.column === 0) {
    return 180;
  } else if (vector.row === 1 && vector.column === -1) {
    return 225;
  } else if (vector.row === 0 && vector.column === -1) {
    return 270;
  } else if (vector.row === -1 && vector.column === -1) {
    return 315;
  } else {
    return 0;
  }
}
function invertPlayer(player) {
  if (player === "red") {
    return "blue";
  } else if (player === "blue") {
    return "red";
  } else {
    return "";
  }
}
function parsePlayer(name) {
  if (dashCount(name) === 2) {
    for (let i = 0; i < name.length; i++) {
      if (name.charAt(i) === "-") {
        return name.slice(0, i);
      }
    }
  }
  return "";
}
function parseTag(name) {
  let firstDash = 0;
  for (let i = 0; i < name.length; i++) {
    if (name.charAt(i) === "-") {
      if (dashCount(name) === 1) {
        return name.slice(0, i);
      } else if (firstDash === 0) {
        firstDash = i;
      } else {
        return name.slice(firstDash + 1, i);
      }
    }
  }
  return "";
}
function parseType(name) {
  let firstDash = 0;
  for (let i = 0; i < name.length; i++) {
    if (name.charAt(i) === "-") {
      if (dashCount(name) === 1) {
        return name.slice(i + 1);
      } else if (firstDash === 0) {
        firstDash = i;
      } else {
        return name.slice(i + 1);
      }
    }
  }
  return "";
}
function dashCount(name) {
  let dashCount2 = 0;
  for (let i = 0; i < name.length; i++) {
    if (name.charAt(i) === "-") {
      dashCount2++;
    }
  }
  return dashCount2;
}

// ../app/lib/game-objects.ts
import { Type } from "class-transformer";
var _a;
_a = immerable;
var Square = class {
  constructor(row, column) {
    this[_a] = true;
    this.row = row;
    this.column = column;
    this.piece = null;
    this.bombardment = "";
  }
  isOccupied() {
    return this.piece !== null;
  }
  getID() {
    return `${this.row}${this.column}`;
  }
  load(pieceName) {
    this.piece = new Piece(pieceName, this.row, this.column);
  }
  unload() {
    this.piece = null;
  }
};
__decorateClass([
  Type(() => Piece)
], Square.prototype, "piece", 2);
var Piece = class {
  constructor(name, row = -1, column = -1) {
    if (name) {
      this.name = name;
      this.type = parseType(name);
      this.tag = parseTag(name);
      this.player = parsePlayer(name);
    } else {
      this.name = "";
      this.type = "undefined";
      this.tag = "undefined";
      this.player = "";
    }
    this.row = row;
    this.column = column;
    this.rotation = 0;
    this.engaged = false;
    this.depleted = false;
  }
  getID() {
    return `${this.row}${this.column}`;
  }
};
function createBoard() {
  const board = [];
  for (let row = 0; row < ROWS; row++) {
    board[row] = [];
    for (let column = 0; column < COLUMNS; column++) {
      board[row][column] = new Square(row, column);
    }
  }
  return board;
}
function setupBoard(boardConfig) {
  const board = createBoard();
  for (let i = 0; i < boardConfig.length; i++) {
    let row = boardConfig[i].row;
    let column = boardConfig[i].column;
    board[row][column].piece = new Piece(boardConfig[i].name, row, column);
    if (board[row][column].piece.player === "red") {
      board[row][column].piece.rotation = 180;
    }
  }
  return board;
}
var _a2;
_a2 = immerable;
var Reserve = class {
  constructor(name, count, position) {
    this[_a2] = true;
    if (name) {
      this.name = name;
      this.type = parseType(name);
      this.tag = parseTag(name);
      this.player = parsePlayer(name);
    } else {
      this.name = "";
      this.type = "undefined";
      this.tag = "undefined";
      this.player = "";
    }
    this.count = count;
    this.position = position;
  }
  // returns a tray ID of format b3, r1, b0, etc.
  getID() {
    return `${this.player[0]}${this.position}`;
  }
};
function createTray(player, trayConfig) {
  const tray = [];
  for (let i = 0; i < trayConfig.length; i++) {
    tray[i] = new Reserve(player + "-" + trayConfig[i].name, trayConfig[i].count, i);
  }
  return tray;
}
var _a3;
_a3 = immerable;
var Trays = class {
  constructor() {
    this[_a3] = true;
    this.blue = createTray("blue", setup.trayConfig);
    this.red = createTray("red", setup.trayConfig);
  }
};
__decorateClass([
  Type(() => Reserve)
], Trays.prototype, "blue", 2);
__decorateClass([
  Type(() => Reserve)
], Trays.prototype, "red", 2);
var _a4;
_a4 = immerable;
var _GameAction = class _GameAction {
  constructor(type, piece, reserve, source, target, rotation = null, capture = null, endTurnFlag = false) {
    this[_a4] = true;
    this.type = type;
    this.piece = piece;
    this.reserve = reserve;
    this.source = source;
    this.target = target;
    this.rotation = rotation;
    this.capture = capture;
    this.endTurnFlag = endTurnFlag;
  }
  addRotation(rotation) {
    return new _GameAction(this.type, this.piece, this.reserve, this.source, this.target, rotation, this.capture, this.endTurnFlag);
  }
  addCapture(capture) {
    return new _GameAction(this.type, this.piece, this.reserve, this.source, this.target, this.rotation, capture, this.endTurnFlag);
  }
  addEndTurnFlag() {
    return new _GameAction(this.type, this.piece, this.reserve, this.source, this.target, this.rotation, this.capture, true);
  }
};
__decorateClass([
  Type(() => Piece)
], _GameAction.prototype, "piece", 2);
__decorateClass([
  Type(() => Reserve)
], _GameAction.prototype, "reserve", 2);
__decorateClass([
  Type(() => Square)
], _GameAction.prototype, "source", 2);
__decorateClass([
  Type(() => Square)
], _GameAction.prototype, "target", 2);
__decorateClass([
  Type(() => Square)
], _GameAction.prototype, "capture", 2);
var GameAction = _GameAction;
var _a5;
_a5 = immerable;
var Log = class {
  constructor(text, snapshot, activeIDs, captureIDs) {
    this[_a5] = true;
    this.text = text;
    this.snapshot = snapshot;
    this.activeIDs = activeIDs;
    this.captureIDs = captureIDs;
  }
};
__decorateClass([
  Type(() => Square)
], Log.prototype, "snapshot", 2);
var _a6;
_a6 = immerable;
var Game = class {
  constructor(name, hqVictory = false) {
    this[_a6] = true;
    this.name = name;
    this.board = setupBoard(setup.boardConfig);
    this.activePlayer = "blue";
    this.actionsLeft = 3;
    this.trays = new Trays();
    this.log = [];
    this.winner = "";
    this.hqVictory = hqVictory;
  }
};
__decorateClass([
  Type(() => Square)
], Game.prototype, "board", 2);
__decorateClass([
  Type(() => Trays)
], Game.prototype, "trays", 2);
__decorateClass([
  Type(() => Log)
], Game.prototype, "log", 2);
var _a7;
_a7 = immerable;
var UI = class {
  constructor(self = "") {
    this[_a7] = true;
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
    } else {
      return true;
    }
  }
};
var _a8;
_a8 = immerable;
var Session = class {
  constructor(game = new Game(""), ui = new UI()) {
    this[_a8] = true;
    this.game = game;
    this.ui = ui;
  }
  getBoardForRender() {
    if (this.ui.logRender === null) {
      return this.game.board;
    } else {
      let entry = this.ui.logRender;
      return this.game.log[entry].snapshot;
    }
  }
};
__decorateClass([
  Type(() => Game)
], Session.prototype, "game", 2);
__decorateClass([
  Type(() => UI)
], Session.prototype, "ui", 2);

// ../app/lib/server-helpers.ts
async function getGame(name, forceDatabaseQuery = false) {
  if (game_cache_default.has(name) && forceDatabaseQuery === false) {
    console.log(`retrieved ${name} from cache and cache is ${game_cache_default.validate()}`);
    return game_cache_default.get(name);
  } else {
    try {
      const result = await pgpool_default.query("SELECT data FROM games WHERE name = $1", [name]);
      if (result.rowCount && result.rowCount > 0) {
        const game = plainToInstance(Game, result.rows[0].data);
        game_cache_default.set(name, game);
        console.log(`retrieved ${name} from database and cache is ${game_cache_default.validate()}`);
        return game;
      }
    } catch (error) {
      console.error("database error when requesting game:", error);
    }
  }
  console.log(`Failed to retreive ${name} from cache or database.`);
  return void 0;
}
async function loadGameResponse(socket, data) {
  const game = await getGame(data.name, true);
  if (!game) {
    socket.emit("loadGameResponse", { status: `Failed to find game: ${data.name}.`, game });
  } else {
    socket.emit("loadGameResponse", { status: `success`, game: instanceToPlain(game) });
  }
}
async function updateDatabase(game) {
  try {
    const result = await pgpool_default.query("UPDATE games SET data = $1 WHERE name = $2", [instanceToPlain(game), game.name]);
    if (result.rowCount === 0) {
      console.log("failed to find game to update in database");
    }
  } catch (error) {
    console.error("error when trying to update database entry", error);
  }
}

// ../app/lib/update-game.ts
import { instanceToPlain as instanceToPlain4, plainToInstance as plainToInstance4 } from "class-transformer";

// ../app/lib/capture.ts
import { plainToInstance as plainToInstance2, instanceToPlain as instanceToPlain2 } from "class-transformer";

// ../app/lib/engagement.ts
var PotentialEngagement = class {
  constructor(source, targets) {
    this.source = source;
    this.targets = targets;
    this.count = targets.length;
  }
};
function setEngagements(board, lastMoved) {
  let lastMovedID;
  if (lastMoved === void 0) {
    lastMovedID = "zz";
  } else {
    lastMovedID = lastMoved.getID();
  }
  const potentialEngagements = checkEngagements(board);
  for (let count = 1; count <= 4; count++) {
    for (let potentialEngagement of potentialEngagements) {
      if (potentialEngagement.count === count && potentialEngagement.source.piece.engaged === false && potentialEngagement.source.getID() !== lastMovedID) {
        for (let target of potentialEngagement.targets) {
          if (target.piece.engaged === false && target.getID() !== lastMovedID) {
            potentialEngagement.source.piece.engaged = true;
            target.piece.engaged = true;
            console.log(`engaged ${potentialEngagement.source.getID()} to ${target.getID()}`);
            let diffVector = {
              row: target.row - potentialEngagement.source.row,
              column: target.column - potentialEngagement.source.column
            };
            let sourceAngle = deVectorize(diffVector);
            potentialEngagement.source.piece.rotation = sourceAngle;
            target.piece.rotation = (sourceAngle + 180) % 360;
          }
        }
      }
    }
  }
  if (lastMoved !== void 0) {
    const vectors = [{ row: 0, column: 1 }, { row: 1, column: 0 }, { row: 0, column: -1 }, { row: -1, column: 0 }];
    for (let vector of vectors) {
      if (isOnGrid(lastMoved.row + vector.row, lastMoved.column + vector.column)) {
        const target = board[lastMoved.row + vector.row][lastMoved.column + vector.column];
        if (target.piece?.type === "infantry" && target.piece?.player !== lastMoved.piece?.player && !target.piece.engaged) {
          console.log("engaged last moved piece");
          lastMoved.piece.engaged = true;
          target.piece.engaged = true;
          let diffVector = {
            row: target.row - lastMoved.row,
            column: target.column - lastMoved.column
          };
          let sourceAngle = deVectorize(diffVector);
          lastMoved.piece.rotation = sourceAngle;
          target.piece.rotation = (sourceAngle + 180) % 360;
        }
      }
    }
  }
  return board;
}
function checkEngagements(board) {
  board = wipeEngagements(board);
  const potentialEngagements = [];
  const infantrySquares = [];
  infantrySquares.push(...scanBoard((square) => square.piece?.type === "infantry", board));
  for (let source of infantrySquares) {
    const vectors = [{ row: 0, column: 1 }, { row: 1, column: 0 }, { row: 0, column: -1 }, { row: -1, column: 0 }];
    const targets = [];
    for (let vector of vectors) {
      if (isOnGrid(source.row + vector.row, source.column + vector.column)) {
        const target = board[source.row + vector.row][source.column + vector.column];
        if (target.piece?.type === "infantry" && target.piece.player !== source.piece?.player) {
          targets.push(target);
        }
      }
    }
    if (targets.length > 0) {
      potentialEngagements.push(new PotentialEngagement(source, targets));
    }
  }
  ;
  return potentialEngagements;
}
function wipeEngagements(board) {
  for (let row of board) {
    for (let square of row) {
      if (square.piece) {
        square.piece.engaged = false;
        if (square.piece.type === "infantry") {
          if (square.piece.player === "blue") {
            square.piece.rotation = 0;
          } else {
            square.piece.rotation = 180;
          }
        }
      }
    }
  }
  return board;
}

// ../app/lib/capture.ts
function checkActiveCaptures(source, board) {
  board = setEngagements(board, source);
  let potentialCaptures = [];
  if (!source.piece || source.piece.type !== "infantry" || source.piece.engaged) {
    return [];
  }
  const vectors = [{ row: 0, column: 1 }, { row: 1, column: 0 }, { row: 0, column: -1 }, { row: -1, column: 0 }];
  for (let vector of vectors) {
    if (isOnGrid(source.row + vector.row, source.column + vector.column)) {
      const target = board[source.row + vector.row][source.column + vector.column];
      if (target.piece && target.piece.player === invertPlayer(source.piece.player)) {
        if (target.piece.type === "infantry" && target.piece.engaged) {
          potentialCaptures.push(target);
        }
        if (target.piece.type === "artillery") {
          let sourceAngle = deVectorize(vector);
          let targetAngle = (sourceAngle + 180) % 360;
          if (targetAngle !== target.piece.rotation) {
            potentialCaptures.push(target);
          }
        }
        if (target.piece.type === "hq") {
          let oppositionCount = 0;
          for (let metaVector of vectors) {
            if (isOnGrid(target.row + metaVector.row, target.column + metaVector.column)) {
              const metaTarget = board[target.row + metaVector.row][target.column + metaVector.column];
              if (metaTarget.piece && metaTarget.piece.player === source.piece.player && metaTarget.piece.type === "infantry" && !metaTarget.piece.engaged) {
                oppositionCount++;
              }
              if (oppositionCount >= 2) {
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
function checkPassiveCaptures(capturingPlayer, game) {
  let allCaptureIDs = [];
  const proxyGame = plainToInstance2(Game, instanceToPlain2(game));
  let board = proxyGame.board;
  board = setEngagements(board);
  let captureSquares = [];
  const infantrySquares = [] = scanBoard((square) => square.piece?.player === invertPlayer(capturingPlayer) && square.piece?.type === "infantry", board);
  for (let infantrySquare of infantrySquares) {
    if (infantrySquare.bombardment === "both" || infantrySquare.bombardment === capturingPlayer) {
      captureSquares.push(infantrySquare);
    }
    const vectors = [{ row: 0, column: 1 }, { row: 1, column: 0 }, { row: 0, column: -1 }, { row: -1, column: 0 }];
    for (let vector of vectors) {
      if (isOnGrid(infantrySquare.row + vector.row, infantrySquare.column + vector.column)) {
        const opposition = board[infantrySquare.row + vector.row][infantrySquare.column + vector.column];
        if (infantrySquare.piece.engaged && opposition.piece && opposition.piece.type === "infantry" && !opposition.piece.engaged && opposition.piece.player === capturingPlayer) {
          if (!captureSquares.includes(infantrySquare)) {
            captureSquares.push(infantrySquare);
            break;
          }
        }
      }
    }
  }
  for (let captureSquare of captureSquares) {
    if (captureSquare.piece) {
      captureSquare.unload();
      allCaptureIDs.push(captureSquare.getID());
    }
  }
  board = setEngagements(board);
  captureSquares = [];
  const hqSquares = scanBoard((square) => square.piece?.player === invertPlayer(capturingPlayer) && square.piece?.type === "hq", board);
  for (let hqSquare of hqSquares) {
    if (hqSquare.bombardment === "both" || hqSquare.bombardment === capturingPlayer) {
      captureSquares.push(hqSquare);
    }
    let oppositionCount = 0;
    const vectors = [{ row: 0, column: 1 }, { row: 1, column: 0 }, { row: 0, column: -1 }, { row: -1, column: 0 }];
    for (let vector of vectors) {
      if (isOnGrid(hqSquare.row + vector.row, hqSquare.column + vector.column)) {
        const opposition = board[hqSquare.row + vector.row][hqSquare.column + vector.column];
        if (opposition.piece && opposition.piece.type === "infantry" && !opposition.piece.engaged && opposition.piece.player === capturingPlayer) {
          oppositionCount++;
        }
        if (oppositionCount >= 2 && !captureSquares.includes(hqSquare)) {
          captureSquares.push(hqSquare);
          break;
        }
      }
    }
  }
  for (let captureSquare of captureSquares) {
    if (captureSquare.piece) {
      captureSquare.unload();
      allCaptureIDs.push(captureSquare.getID());
    }
  }
  board = setEngagements(board);
  captureSquares = [];
  const artillerySquares = scanBoard((square) => square.piece?.player === invertPlayer(capturingPlayer) && square.piece?.type === "artillery", board);
  for (let artillerySquare of artillerySquares) {
    const vectors = [{ row: 0, column: 1 }, { row: 1, column: 0 }, { row: 0, column: -1 }, { row: -1, column: 0 }];
    for (let vector of vectors) {
      if (isOnGrid(artillerySquare.row + vector.row, artillerySquare.column + vector.column)) {
        const opposition = board[artillerySquare.row + vector.row][artillerySquare.column + vector.column];
        if (opposition.piece && opposition.piece.type === "infantry" && !opposition.piece.engaged && opposition.piece.player === capturingPlayer) {
          const angle = deVectorize(vector);
          if (artillerySquare.piece.rotation !== angle && !captureSquares.includes(artillerySquare)) {
            captureSquares.push(artillerySquare);
            break;
          }
        }
      }
    }
  }
  for (let captureSquare of captureSquares) {
    if (captureSquare.piece) {
      captureSquare.unload();
      allCaptureIDs.push(captureSquare.getID());
    }
  }
  return allCaptureIDs;
}
function executePassiveCaptures(capturingPlayer, game) {
  console.log("executing passive captures from", capturingPlayer);
  const passiveCaptureIDs = checkPassiveCaptures(capturingPlayer, game);
  const passiveCaptureSquares = scanBoard((square) => passiveCaptureIDs.includes(square.getID()), game.board);
  for (let captureSquare of passiveCaptureSquares) {
    if (captureSquare.piece) {
      captureSquare.unload();
    }
  }
  game.board = setEngagements(game.board);
  return game;
}

// ../app/lib/upkeep.ts
function upkeep(game) {
  game.board = setBombardments(game.board);
  game = checkPlayerSwap(game);
  game = victoryCheck(game);
  return game;
}
function checkPlayerSwap(game) {
  if (game.actionsLeft === 0) {
    game.actionsLeft = 3;
    game.activePlayer = invertPlayer(game.activePlayer);
    game = executePassiveCaptures(game.activePlayer, game);
    game.board = refreshPieces(game.board);
  }
  return game;
}
function refreshPieces(board) {
  const allPieces = scanBoard((square) => square.piece !== null, board);
  for (let square of allPieces) {
    if (square.piece) {
      square.piece.depleted = false;
    }
  }
  return board;
}
function victoryCheck(game) {
  const hqSquares = scanBoard((square) => square.piece?.type === "hq", game.board);
  const hqPlayers = hqSquares.map((square) => square.piece.player);
  if (!hqPlayers.includes("red")) {
    game.winner = "blue";
  } else if (!hqPlayers.includes("blue")) {
    game.winner = "red";
  }
  if (game.hqVictory) {
    for (let hqSquare of hqSquares) {
      if (hqSquare.piece.player === "red" && hqSquare.row === 7) {
        game.winner = "red";
      } else if (hqSquare.piece.player === "blue" && hqSquare.row === 0) {
        game.winner = "blue";
      }
    }
  }
  if (game.winner !== "") {
    game.board = refreshPieces(game.board);
  }
  return game;
}

// ../app/lib/log.ts
import { instanceToPlain as instanceToPlain3, plainToInstance as plainToInstance3 } from "class-transformer";
function snapshotBoard(game) {
  const proxyGame = plainToInstance3(Game, instanceToPlain3(game));
  proxyGame.board = setEngagements(proxyGame.board);
  proxyGame.board = setBombardments(proxyGame.board);
  return proxyGame.board;
}
function logifyAction(action, snapshot) {
  let text = "";
  const activeIDs = [];
  const captureIDs = [];
  switch (action.type) {
    case "move": {
      text += `${action.piece?.player} moved a ${action.piece?.tag} ${action.piece?.type}`;
      activeIDs.push(action.source.getID());
      activeIDs.push(action.target.getID());
      if (action.capture !== null) {
        text += ` and captured a ${action.capture.piece?.tag} ${action.capture.piece?.type}. So it goes`;
        captureIDs.push(action.capture.getID());
      }
      break;
    }
    case "place": {
      text += `${action.reserve?.player} placed a ${action.reserve?.tag} ${action.reserve?.type}`;
      activeIDs.push(action.target.getID());
      if (action.capture !== null) {
        text += ` and captured a ${action.capture.piece?.tag} ${action.capture.piece?.type}. So it goes`;
        captureIDs.push(action.capture.getID());
      }
      break;
    }
    case "rotate": {
      text += `${action.piece?.player} rotated a ${action.piece?.tag} ${action.piece?.type} without moving it`;
      activeIDs.push(action.source.getID());
      break;
    }
    case "capture": {
      text += `${action.piece?.player} captured a ${action.capture?.piece?.tag} ${action.capture?.piece?.type}. So it goes`;
      activeIDs.push(action.source.getID());
      captureIDs.push(action.capture.getID());
      break;
    }
  }
  text += ".";
  text = text[0].toUpperCase() + text.slice(1);
  text = text.replaceAll(" a a", " an a");
  return new Log(text, snapshot, activeIDs, captureIDs);
}

// ../app/lib/update-game.ts
async function updateGame(gameLobby, action, io2) {
  let game = await getGame(gameLobby);
  if (!game) {
    console.error("GameAction attempted, but specified game not found");
    return;
  }
  game = plainToInstance4(Game, game);
  action = plainToInstance4(GameAction, action);
  let message = "reverted game";
  let proxyGame = plainToInstance4(Game, game);
  if (validate(action, proxyGame)) {
    game = proxyGame;
    game_cache_default.set(gameLobby, game);
    await updateDatabase(game);
    message = "updated game";
  }
  io2.to(gameLobby).emit("update", { message, game: instanceToPlain4(game) });
}
function validate(action, game) {
  let player = "";
  if (!action.piece && !action.reserve || action.piece && action.reserve) {
    return null;
  } else if (action.reserve) {
    player = action.reserve.player;
  } else if (action.piece) {
    player = action.piece.player;
  }
  if (player !== game.activePlayer || game.actionsLeft < 1) {
    return null;
  }
  let snapshot = snapshotBoard(game);
  switch (action.type) {
    case "move": {
      if (!action.piece || !action.source || !action.target || action.rotation === null) {
        return null;
      }
      if (action.piece.name !== game.board[action.source.row][action.source.column].piece?.name) {
        return null;
      }
      const potentialMoves = checkMoves(action.piece, game.board);
      if (!potentialMoves.includes(action.target.getID())) {
        return null;
      }
      const target = game.board[action.target.row][action.target.column];
      const source = game.board[action.piece.row][action.piece.column];
      target.load(action.piece.name);
      target.piece.rotation = action.rotation;
      source.unload();
      snapshot = snapshotBoard(game);
      if (action.capture !== null) {
        const captured = game.board[action.capture.row][action.capture.column];
        if (checkActiveCaptures(target, game.board).includes(captured.getID())) {
          captured.unload();
        }
      }
      target.piece.depleted = true;
      game.board = setEngagements(game.board);
      break;
    }
    case "place": {
      if (!action.reserve || !action.target || action.rotation === null) {
        return null;
      }
      if (player === "blue") {
        if (game.trays.blue[action.reserve.position].count === 0) {
          return null;
        } else {
          game.trays.blue[action.reserve.position].count--;
        }
      } else if (player === "red") {
        if (game.trays.red[action.reserve.position].count === 0) {
          return null;
        } else {
          game.trays.red[action.reserve.position].count--;
        }
      }
      const potentialMoves = checkPlacements(player, game.board);
      if (!potentialMoves.includes(action.target.getID())) {
        return null;
      }
      const target = game.board[action.target.row][action.target.column];
      target.load(action.reserve.name);
      target.piece.rotation = action.rotation;
      snapshot = snapshotBoard(game);
      if (action.capture !== null) {
        const captured = game.board[action.capture.row][action.capture.column];
        if (checkActiveCaptures(target, game.board).includes(captured.getID())) {
          captured.unload();
        }
      }
      target.piece.depleted = true;
      game.board = setEngagements(game.board);
      break;
    }
    // rare case of stationary capture
    case "capture": {
      if (!action.source || !action.capture) {
        return null;
      }
      const captured = game.board[action.capture.row][action.capture.column];
      const source = game.board[action.source.row][action.source.column];
      snapshot = snapshotBoard(game);
      if (checkActiveCaptures(source, game.board).includes(captured.getID())) {
        captured.unload();
        game.board = setEngagements(game.board);
      } else {
        return null;
      }
      source.piece.depleted = true;
      game.board = setEngagements(game.board);
      break;
    }
    case "rotate": {
      if (!action.source || !action.piece || action.rotation === null) {
        return null;
      }
      const source = game.board[action.source.row][action.source.column];
      if (!source.piece || action.piece.name !== source.piece.name) {
        return null;
      }
      if (action.piece.type !== "artillery") {
        return null;
      }
      source.piece.rotation = action.rotation;
      snapshot = snapshotBoard(game);
      source.piece.depleted = true;
      break;
    }
    case "endTurn": {
      break;
    }
  }
  if (action.endTurnFlag) {
    game.actionsLeft = 1;
  }
  if (action.type !== "endTurn") {
    game.log.unshift(logifyAction(action, snapshot));
  }
  game.actionsLeft--;
  if (game.actionsLeft < 1) {
    const nextPlayer = invertPlayer(player);
    const passiveCaptureIDs = checkPassiveCaptures(nextPlayer, game);
    if (passiveCaptureIDs.length > 0) {
      let text = `${nextPlayer} captured ${passiveCaptureIDs.length} enemy units at the start of their turn.`;
      text = text[0].toUpperCase() + text.slice(1);
      snapshot = snapshotBoard(game);
      const upkeepLog = new Log(text, snapshot, [], passiveCaptureIDs);
      game.log.unshift(upkeepLog);
    }
  }
  game = upkeep(game);
  return game;
}

// src/server.ts
dotenv2.config();
var expressApp = express();
var httpServer = http.createServer(expressApp);
var io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://ghq-ten.vercel.app"
    ],
    methods: ["GET", "POST"]
  }
});
io.on("connection", async (socket) => {
  const gameLobby = socket.handshake.query.game;
  if (gameLobby && typeof gameLobby === "string") {
    socket.join(gameLobby);
    console.log(`Socket ${socket.id} joined lobby ${gameLobby}`);
  } else {
    console.log(`Socket ${socket.id} failed to join lobby ${gameLobby}`);
    socket.disconnect();
    return;
  }
  socket.on("loadGameRequest", (data) => loadGameResponse(socket, data));
  socket.on("gameAction", (data) => updateGame(gameLobby, data, io));
  socket.on("disconnect", () => {
    console.log(`Socket ${socket.id} left lobby ${gameLobby}`);
  });
});
var PORT = process.env.PORT;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO listening on ${PORT}`);
});
