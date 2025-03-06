import { Dispatch } from 'react';
import { Board, Square, checkMoves, Session } from './game-objects';
import { ROWS, COLUMNS } from './game-config';

// this handles the logic of what kind of click it was
export function handleClick (event: React.MouseEvent, dispatch: Dispatch<any>, session: Session, clickedSquare: Square) {
    event.stopPropagation();

    // first case: we're not active
    if (!session.ui.isActive) {
        // check if we clicked on a piece
        if (clickedSquare.isOccupied()) {
            // if so, activate it
            dispatch({
                type: 'activate',
                square: clickedSquare,
                piece: clickedSquare.piece,
            })
        }
    }
    else if (session.ui.isActive) {
        // check if we can move there
        if (session.ui.potentialMoves.includes(clickedSquare.getID())) {
            dispatch({
                type: 'move',
                row: clickedSquare.row,
                column: clickedSquare.column,
            })
        }
        else {
        dispatch({
            type: 'deactivate',
        })
        }
    }
}


// this executes the update to the UI based on the kind of click
// this is the only function that can update the game state/ ui (session object)
export function clickReducer (session: Session, action: any){
    switch (action.type) {

        case 'activate': {

            // activate the UI status boolean
            session.ui.isActive = true;
            session.ui.activeSquare = action.square;

            // add the checked moves to the potential moves UI so we can render them visually
            session.ui.potentialMoves = checkMoves(action.piece, session.game.board)
            break;
        }

        case "deactivate": {

            // deactivate the UI status boolean
            session.ui.isActive = false;
            session.ui.activeSquare = null;

            // clear all potential move markers
            session.ui.potentialMoves = [];
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