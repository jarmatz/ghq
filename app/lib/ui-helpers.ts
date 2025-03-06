import { Dispatch } from 'react';
import { Piece, UI, Board, TraySquare, Square, Session } from './game-objects';
import { checkMoves } from './game-helpers';
import { ROWS, COLUMNS } from './game-config';

// this handles the logic of what kind of click it was
export function handleBoardClick (event: React.MouseEvent, dispatch: Dispatch<any>, session: Session, clickedSquare: Square) : void {
    event.stopPropagation();

    // did we click a piece on the board?
    if (clickedSquare.isOccupied()) {
        // is this piece already active?
        if (clickedSquare.piece?.isActive) {
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
        // check if we can move there
        if (session.ui.potentialMoves.includes(clickedSquare.getID())) {
            dispatch({
                type: 'move',
                square: clickedSquare,
            })
            return;
        }
    // this means we should be clicking on a dead square
    } else {
        dispatch({
            type: 'deactivate'
        })
        return;
    }
}

export function handleTrayClick (event: React.MouseEvent, dispatch: Dispatch<any>, session: Session, clickedTraySquare: TraySquare) : void {
}


// this executes the update to the UI based on the kind of click
// this is the only function that can update the game state/ ui (session object)
export function clickReducer (session: Session, action: any){
    switch (action.type) {

        case 'activate': {
            // wipe the board
            session.game.board = deactivateBoard(session.game.board);
            session.ui = deactivateUI(session.ui);
            // activate the status vars
            session.ui.isActive = true;
            session.ui.activePiece = action.piece;
            action.piece.isActive = true;

            // add the checked moves to the potential moves UI so we can render them visually
            session.ui.potentialMoves = checkMoves(action.piece, session.game.board)
            break;
        }

        case 'deactivate': {
            // wipe the board and ui
            session.game.board = deactivateBoard(session.game.board);
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
            const sourceRow: number = session.ui.activePiece!.row, sourceColumn: number = session.ui.activePiece!.column;
            // copy the piece to a clone at the new location, maintaining constant rotation
            session.game.board[targetRow][targetColumn].piece = new Piece(session.ui.activePiece.name, targetRow, targetColumn);
            session.game.board[targetRow][targetColumn].piece!.rotation = session.ui.activePiece.rotation;
            // clear the old location
            session.game.board[sourceRow][sourceColumn].piece = null;
            // wipe and deactivate
            session.game.board = deactivateBoard(session.game.board);
            session.ui = deactivateUI(session.ui);
            break;
        }
    }
}

function deactivateBoard(board: Board): Board {

    // iterate through entire board
    for (let row = 0; row < ROWS; row++) {
        for (let column = 0; column < COLUMNS; column++) {
            // if there's a piece in the square
            if (board[row][column].piece) {
                // deactivate it, note the non-null assertion operator after "piece"
                board[row][column].piece!.isActive = false;
            }
        }
    }
    return board;
}

function deactivateUI(ui: UI) : UI {
    ui.isActive = false;
    ui.activePiece = null;
    ui.potentialMoves = [];
    return ui;
}