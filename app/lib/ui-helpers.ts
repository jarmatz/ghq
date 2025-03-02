import { Dispatch } from 'react';
import { Piece, Square, checkMoves, Local } from './game-objects';


// this handles the logic of what kind of click it was
export function handleClick (event: React.MouseEvent, dispatch: Dispatch<any>, local: Local, clickedSquare: Square) {
    event.stopPropagation();

    // first case: we're not active
    if (!local.ui.isActive) {
        // check if we clicked on a piece
        if (clickedSquare.isOccupied()) {
            // if so, activate it
            dispatch({
                type: 'activate',
                piece: clickedSquare.piece,
            })
        }
    }
    else if (local.ui.isActive) {
        // check if we can move there
        if (local.ui.potentialMoves.includes(clickedSquare.getID())) {
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
export function clickReducer (draft: Local, action: any){
    switch (action.type) {

        case 'activate': {

            // activate the UI status boolean
            draft.ui.isActive = true;
            draft.ui.activePiece = action.piece;

            // add the checked moves to the potential moves UI so we can render them visually
            draft.ui.potentialMoves = checkMoves(action.piece)
            break;
        }

        case "deactivate": {

            // deactivate the UI status boolean
            draft.ui.isActive = false;
            draft.ui.activePiece = null;

            // clear all potential move markers
            draft.ui.potentialMoves = [];
            break;
        }
    }
}
