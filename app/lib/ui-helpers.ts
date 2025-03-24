import React, { Dispatch } from 'react';
// my imports:
import { Piece, UI, Board, Tray, Reserve, Square, Session } from './game-objects';
import { checkMoves, checkPlacements, setBombardments } from './game-helpers';
import { setEngagements } from './engagement';

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
        if (session.ui.potentialMoves.includes(clickedSquare) && session.ui.activePiece) {
            dispatch({
                type: 'move',
                square: clickedSquare,
            })
            return;
        }
        else if (session.ui.potentialMoves.includes(clickedSquare) && session.ui.activeReserve) {
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
    if (clickedReserve === session.ui.activeReserve) {
        dispatch({
            type:'deactivate'
        })
        return;
    }
    if (clickedReserve !== session.ui.activeReserve) {
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


// this executes the update to the UI based on the kind of click/input/data push
// this is the only function that can update the game state/ ui (session object)
// note the 'session' passed as an argument to the function is really a draft, a la immer vernacular
export function sessionReducer (session: Session, action: any){
    switch (action.type) {

        case 'loadGame': {
            session.ui.self = action.player;
            session.ui.isLoaded = true;
            session.game.board = setBombardments(session.game.board);
            break;
        }
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
            const targetRow: number = action.square.row, targetColumn: number = action.square.column;
            const sourceRow: number = session.ui.activePiece.row, sourceColumn: number = session.ui.activePiece.column;
            // copy the piece to a clone at the new location, maintaining rotation
            session.game.board[targetRow][targetColumn].piece = new Piece(session.ui.activePiece.name, targetRow, targetColumn);
            session.game.board[targetRow][targetColumn].piece.rotation = session.ui.activePiece.rotation;
            // clear the old location
            session.game.board[sourceRow][sourceColumn].piece = null;
            // if it's artillery, we get a free rotation
            if (session.game.board[targetRow][targetColumn].piece.type === 'artillery') {
                // this is now the active piece, since we will remain active!!!
                session.ui.activePiece = session.game.board[targetRow][targetColumn].piece;
                // but we have no moves to make
                session.ui.potentialMoves = [];
            }
            // else wipe the ui
            else {
                session.ui = deactivateUI(session.ui);
            }
            // since we've updated the board, set bombardments
            session.game.board = setBombardments(session.game.board);
            // the below is currently for debug
            setEngagements(session.game.board);
            break;
        }
        case 'place': {
            // safety check
            if (session.ui.activeReserve === null) {
                break;
            }
            // get our target for the placement
            const targetRow: number = action.square.row, targetColumn: number = action.square.column;
            // instantiate a new piece at the target
            session.game.board[targetRow][targetColumn].piece = new Piece(session.ui.activeReserve.name, targetRow, targetColumn);
            // if it's red, rotate it
            if (session.ui.activeReserve.player === 'red') {
                session.game.board[targetRow][targetColumn].piece!.rotation = 180;
            }
            // decrement the reserve count
            // we don't do it directly, but rather refer to the count passed in by action
            // this avoids incrementing twice in strict mode
            // similarly, we're having issues sharing references between ui and game when we import game JSON
            // therefore we will make sure to directly access the tray reference in game class
            const reservePosition = session.ui.activeReserve.position;
            if (action.player === 'blue') {
                session.game.trays.blue[reservePosition].count = action.count - 1;
            }
            else if (action.player === 'red') {
                session.game.trays.red[reservePosition].count = action.count - 1;
            }
            // we're done, deactivate
            session.ui = deactivateUI(session.ui);
            // we changed the board so set bombardments
            session.game.board = setBombardments(session.game.board);
            break;
        }
        case 'provisionalRotate': {
            // safety check
            if (session.ui.activePiece === null) {
                break;
            }
            // make a new piece to force a re-render
            const newPiece = new Piece (action.piece.name, action.piece.row, action.piece.column)
            // set its rotation to the new rotation
            newPiece.rotation = action.rotation;
            // place it on the board
            session.game.board[action.piece.row][action.piece.column].piece = newPiece;
            session.ui.activePiece = newPiece;
            // we adjusted the board so set bombardments
            session.game.board = setBombardments(session.game.board);
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
            // we reverted the board so set bombardments
            session.game.board = setBombardments(session.game.board);
            break;
        }
        case 'setRotate': {
            // safety check
            if (session.ui.activePiece === null) {
                break;
            }
            // make a new piece to force a re-render
            const newPiece = new Piece (action.piece.name, action.piece.row, action.piece.column)
            // set its rotation to the new rotation
            newPiece.rotation = action.piece.rotation;
            // place it on the board
            session.game.board[action.piece.row][action.piece.column].piece = newPiece;
            session.ui.activePiece = newPiece;
            // deactivate the ui
            session.ui = deactivateUI(session.ui);
            // update bombardments
            session.game.board = setBombardments(session.game.board);
            break;
        }
    }
}

function deactivateUI(ui: UI) : UI {
    ui.isActive = false;
    ui.activePiece = null;
    ui.activeReserve = null;
    ui.potentialMoves = [];
    ui.rotationMemory = 0;
    return ui;
}

export function isAlphaNum(input: string): boolean {
    const regExp: RegExp = /^[a-zA-Z0-9]+$/;
    return regExp.test(input);
}