import React, { Dispatch } from 'react';
import { WritableDraft } from 'immer';
import { instanceToPlain, plainToInstance } from 'class-transformer';
// my imports:
import { Piece, UI, Board, Tray, Reserve, Square, Session, Game, GameAction } from './game-objects';
import { checkMoves, checkPlacements, setBombardments, deVectorize, Vector } from './game-helpers';
import { setEngagements, setDefaultRotations } from './engagement';
import { checkActiveCaptures } from './capture';

// this handles the logic of what kind of click it was
export function handleBoardClick (event: React.MouseEvent, dispatch: Dispatch<any>, session: Session, clickedSquare: Square) : void {
    event.stopPropagation();

    // did we click a piece on the board?
    if (clickedSquare.isOccupied()) {
        // is this piece already active?
        if (clickedSquare.piece === session.ui.activePiece) {
            // if so, deactivate it
            dispatch({
                type: 'deactivate'
            })
            return;
        }
        // otherwise, activate it
        else {
            dispatch({
                type: 'activate',
                square: clickedSquare,
                piece: clickedSquare.piece,
                source: 'board'
            })
            return;
        }
    // otherwise are we already active?
    } else if (session.ui.isActive) {
        // check if we can move or place
        if (session.ui.potentialMoves.includes(clickedSquare.getID()) && session.ui.activePiece) {
            dispatch({
                type: 'move',
                square: clickedSquare,
            })
            return;
        }
        else if (session.ui.potentialMoves.includes(clickedSquare.getID()) && session.ui.activeReserve) {
            dispatch({
                type: 'place',
                square: clickedSquare,
                reserve: session.ui.activeReserve,
                player: session.ui.activeReserve.player,
                count: session.ui.activeReserve.count,
            })
            return;
        }
    }
    // if we got this far we clicked a dead square
    dispatch({
        type: 'deactivate'
    })
    return;
}

export function handleTrayClick (event: React.MouseEvent, dispatch: Dispatch<any>, session: Session, clickedReserve: Reserve) : void {
    // first, let's make sure we're not out of reserves
    if (clickedReserve.count < 1) {
        dispatch({
            type:'deactivate'
        })
        return;
    }
    // is the reserve active? then we should deactivate it
    if (clickedReserve.getID() === session.ui.activeReserve?.getID()) {
        dispatch({
            type:'deactivate'
        })
        return;
    }
    if (clickedReserve.getID() !== session.ui.activeReserve?.getID()) {
        dispatch({
            type: 'activate',
            reserve: clickedReserve,
            source: 'tray'
        })
        return;
    }
}

export function handleRotator(event: React.MouseEvent, dispatch: Dispatch<any>, session: Session, square: Square, rotation: number) : void {
    if (event.type === 'mouseenter') {
        dispatch({
            type: 'provisionalRotate',
            rotation: rotation,
            piece: square.piece,
            square: square,
        })
        return;
    }
    else if (event.type === 'mouseleave') {
        dispatch({
            type: 'revertRotate',
            piece: square.piece,
            square: square,
        })
        return;
    }
    else if (event.type === 'click') {
        dispatch({
            type: 'setRotate',
            piece: square.piece,
            square: square,
        })
    }
}

export function handleCapture(event: React.MouseEvent, dispatch: Dispatch<any>, session: Session, square: Square) : void {
    
    if(event.type === 'click') {
        dispatch({
            type: 'capture',
            piece: square.piece,
            square: square,
        })
    }
    else if (event.type === 'mouseenter') {
        if (session.ui.activePiece === null) {
            return;
        }
        const diffVector: Vector = {row: square.row - session.ui.activePiece.row, column: square.column - session.ui.activePiece.column};
        let rotation: number = deVectorize(diffVector);
        dispatch({
            type: 'provisionalRotate',
            rotation: rotation,
            piece: session.ui.activePiece,
            square: session.game.board[session.ui.activePiece.row][session.ui.activePiece.column],
        })
    }
    else if (event.type === 'mouseleave') {
        if (session.ui.activePiece === null) {
            return;
        }
        dispatch({
            type: 'revertRotate',
            piece: session.ui.activePiece,
            square: session.game.board[session.ui.activePiece.row][session.ui.activePiece.column],
        })
    }
}


// this executes the updates to session (both UI and local game data) based on the kind of click/input/data push
// this is the ONLY function that can update the game state/ui (session object)
// note the 'session' passed as an argument to the function is really a draft, a la immer vernacular
export function sessionReducer (session: WritableDraft<Session | null>, action: any){
    
    // the only dispatch action available if session is null --> we load the initial game/session
    if (action.type === 'loadGame') {
        // first we re-instantiate the game data, then we make session and upkeep it
        const newGame = plainToInstance(Game, action.game as Game);
        const newSession = new Session(newGame, new UI(action.player));
        newSession.game = upkeep(newSession.game);
        // SINCE IT'S A NEW INSTANCE WE MUST RETURN IT!!
        return newSession;
    }
    // the safety check for null before we do anything else
    if (session === null) {
        console.error('a null session made it deeper into sessionReducer than allowed');
        return;
    }
    // below this line is only accessible if session is NOT NULL
    switch (action.type) {
        // up here are server/client actions
        case 'updateGame': {
            session.game = plainToInstance(Game, action.game as Game);
        }
        case 'revertGame': {
            session.game = plainToInstance(Game, action.game as Game);
            session.ui = deactivateUI(session.ui);
        }
        case 'clearGameAction': {
            session.ui.gameAction = null;
        }
        // down here are player actions
        case 'activate': {
            // wipe the board + activate the ui
            session.ui = deactivateUI(session.ui);
            session.ui.isActive = true;

            // was this from the board?
            if (action.source === 'board') {
                // activate the piece
                session.ui.activePiece = action.piece;
                session.ui.rotationMemory = action.piece.rotation;
                // add the checked moves to the potential moves UI so we can render them visually
                session.ui.potentialMoves = checkMoves(action.piece, session.game.board);
                if (session.ui.activePiece?.type === 'infantry') {
                    // add potential captures to the UI in rare case of stationary capture
                    session.ui.potentialCaptures = checkActiveCaptures(action.square, session.game.board);
                }
            }
            // otherwise was it from the tray?
            else if (action.source === 'tray') {
                //activate the reserve
                session.ui.activeReserve = action.reserve;
                // add the checked placements to the potential moves UI
                session.ui.potentialMoves = checkPlacements(action.reserve.player, session.game.board);
            }
            break;
        }
        case 'deactivate': {
            // is there a combo? then this is the user saying they want to keep rotation where it is on a pending action
            if (session.ui.preAction !== null) {
                session.ui.gameAction = session.ui.preAction.addRotation(session.ui.rotationMemory);
            }
            // wipe the board and ui
            session.ui = deactivateUI(session.ui);
            break;
        }
        case 'move': {
            // safety check
            if (session.ui.activePiece === null) {
                break;
            }
            // get our target and source for the move, reassignments for clarity
            const target: Square = session.game.board[action.square.row][action.square.column];
            const source: Square = session.game.board[session.ui.activePiece.row][session.ui.activePiece.column];
            // copy the piece to a clone at the new location, maintaining rotation
            target.load(session.ui.activePiece.name);
            // safety check
            if (!target.piece) {
                console.error('failed to load piece during move case in reducer')
                break;
            }
            target.piece.rotation = session.ui.activePiece.rotation;
            // clear the old location
            source.unload();
            // set up the game action
            const gameAction = new GameAction('move', session.ui.activePiece, null, source, target);
            // if it's artillery, we get a free rotation
            if (target.piece.type === 'artillery') {
                // this is now the active piece, since we will remain active!!!
                session.ui.activePiece = target.piece;
                // but we have no moves to make
                session.ui.potentialMoves = [];
                // set up the combo
                session.ui.preAction = gameAction;
            }
            // if it's infantry, check for captures
            else if (target.piece.type === 'infantry' && checkActiveCaptures(target, session.game.board).length > 0) {
                // this is now the active piece, since we will remain active!!!
                session.ui.activePiece = target.piece;
                session.ui.potentialMoves = [];
                session.ui.potentialCaptures = checkActiveCaptures(target, session.game.board);
                session.ui.preAction = gameAction;
            }
            // else, set our game action and wipe the ui
            else {
                session.game.board = setEngagements(session.game.board);
                session.ui.gameAction = gameAction.addRotation(session.ui.activePiece.rotation);
                session.ui = deactivateUI(session.ui);
            }
            break;
        }
        case 'place': {
            // safety check
            if (session.ui.activeReserve === null) {
                break;
            }
            // get our target for the placement
            const target: Square = session.game.board[action.square.row][action.square.column];
            // instantiate a new piece at the target
            target.load(session.ui.activeReserve.name);
            // safety check, mostly to get typescript checks off our ass
            if (!target.piece) {
                console.error('failed to load piece during place case in reducer')
                break;
            }
            // if it's red, rotate it
            if (session.ui.activeReserve.player === 'red') {
                target.piece.rotation = 180;
            }
            // decrement the reserve count
            // we don't do it directly, but rather refer to the count passed in by action
            // this avoids incrementing twice in strict mode
            // similarly, we're having issues sharing references between ui and game when we import game JSON
            // therefore we will make sure to directly access the tray reference in game class via position
            const reservePosition = session.ui.activeReserve.position;
            if (action.player === 'blue') {
                session.game.trays.blue[reservePosition].count = action.count - 1;
            }
            else if (action.player === 'red') {
                session.game.trays.red[reservePosition].count = action.count - 1;
            }
            // set up our gameaction
            const gameAction = new GameAction('place', null, session.ui.activeReserve, null, target);
            // if it's artillery, we get a free rotation
            if (target.piece.type === 'artillery') {
                // this is now the active piece, since we will remain active!!!
                session.ui.activePiece = target.piece;
                // but we have no moves to make
                session.ui.potentialMoves = [];
                session.ui.preAction = gameAction;
            }
            // if it's infantry, check for captures
            else if (target.piece.type === 'infantry' && checkActiveCaptures(target, session.game.board).length > 0) {
                // this is now the active piece, since we will remain active!!!
                session.ui.activePiece = target.piece;
                session.ui.potentialMoves = [];
                session.ui.potentialCaptures = checkActiveCaptures(target, session.game.board);
                session.ui.preAction = gameAction;
            }
            else {
                session.game.board = setEngagements(session.game.board);
                session.ui.gameAction = gameAction.addRotation(target.piece.rotation);
                session.ui = deactivateUI(session.ui);
            }
            break;
        }
        case 'capture': {
            // safety check
            if (session.ui.activePiece === null) {
                break;
            }
            // index to the captured square and remove the piece
            const captured: Square = session.game.board[action.square.row][action.square.column];
            captured.unload();
            // reset engagements
            session.game.board = setEngagements(session.game.board);
            // is this a combo?
            if (session.ui.preAction !== null) {
                // add a rotation to rdy the game action
                session.ui.preAction = session.ui.preAction.addRotation(session.ui.activePiece.rotation);
                // dispatch the game action
                session.ui.gameAction = session.ui.preAction.addCapture(action.square);
            }
            // else it is a stationary capture
            else {
                const source: Square = session.game.board[session.ui.activePiece.row][session.ui.activePiece.column];
                session.ui.gameAction = new GameAction('capture', session.ui.activePiece, null, source, action.square, null, action.square);
            }
            session.ui = deactivateUI(session.ui);
            break;
        }
        case 'provisionalRotate': {
            console.log('provisional');
            // safety check
            if (session.ui.activePiece === null) {
                break;
            }
            console.log('provisional');
            // make a new piece to force a re-render
            const newPiece = new Piece (action.piece.name, action.piece.row, action.piece.column)
            // set its rotation to the new rotation
            newPiece.rotation = action.rotation;
            // place it on the board
            session.game.board[action.piece.row][action.piece.column].piece = newPiece;
            session.ui.activePiece = newPiece;
            break;
        }
        case 'revertRotate': {
            // safety check
            if (session.ui.activePiece === null) {
                break;
            }
            // make a new piece to force a re-render
            const newPiece = new Piece (action.piece.name, action.piece.row, action.piece.column)
            // set its rotation back to the rotation memory
            newPiece.rotation = session.ui.rotationMemory;
            // place it on the board
            session.game.board[action.piece.row][action.piece.column].piece = newPiece;
            session.ui.activePiece = newPiece;
            break;
        }
        case 'setRotate': {
            // safety check
            if (session.ui.activePiece === null) {
                break;
            }
            // load a new piece into the source square and set its rotation
            const source: Square = session.game.board[action.piece.row][action.piece.column];
            source.load(action.piece.name);
            source.piece!.rotation = action.piece.rotation;
            // is this a combo?
            if (session.ui.preAction !== null) {
                session.ui.gameAction = session.ui.preAction.addRotation(action.piece.rotation)
                console.log('readied preaction');
            }
            else {
                session.ui.gameAction = new GameAction('rotate', action.piece, null, source, null, action.piece.rotation);
            }
            // deactivate the ui
            session.ui = deactivateUI(session.ui);
            break;
        }
    }
    // code down here activates for every case, except the initial load
    session.game = upkeep(session.game);
}

function deactivateUI(ui: UI) : UI {
    ui.isActive = false;
    ui.activePiece = null;
    ui.activeReserve = null;
    ui.potentialMoves = [];
    ui.potentialCaptures = [];
    ui.rotationMemory = 0;
    ui.preAction = null;
    return ui;
}

export function upkeep(game: Game): Game {
    game.board = setBombardments(game.board);
    //game.board = setDefaultRotations(game.board);
    return game;
}

export function isAlphaNum(input: string): boolean {
    const regExp: RegExp = /^[a-zA-Z0-9]+$/;
    return regExp.test(input);
}