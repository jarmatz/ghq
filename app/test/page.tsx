'use client';

import { init } from 'next/dist/compiled/webpack/webpack';
import Image from 'next/image';
import { useImmer, useImmerReducer } from 'use-immer';
// my imports:
import { Piece, Game, Square, Local } from '../lib/game-objects';
import { clickReducer, handleClick } from '../lib/ui-helpers';
import { Dispatch } from 'react';

const initialLocal = new Local();

initialLocal.game.board[0][0].piece = new Piece('hq', 'red', 0, 0);
initialLocal.game.board[7][7].piece = new Piece('hq', 'blue', 7, 7);
initialLocal.game.board[4][4].piece = new Piece('infantry', 'blue', 4, 4);
initialLocal.ui.self = 'blue';

// the main page
export default function Home() {

    const [local, dispatch] = useImmerReducer(clickReducer, initialLocal)

      return (
        <Board local={local} dispatch={dispatch}/>  
    )
}

// this renders the board itself
function Board({ local, dispatch }: BoardProps) {
    
    return (
        <div className="board-wrapper">
            <div className="board">
                {local.game.board.map((row) => (
                    row.map((square) => (
                        <Cell square={square} local={local} dispatch={dispatch} key={square.getID()}/>
                    ))
                ))}
            </div>
        </div>
    )
}


// this renders cells in the board
// we pass in the square object that is represented in the cell
function Cell({square, local, dispatch} : CellProps) {
    
    // we're going to highlight cells based on the UI state
    let brightness: number = 1;
    if (local.ui.potentialMoves.includes(square.getID())) {
        brightness = 1.25;
    }

    // this renders the image in the cell if a piece is there
    return (
    <div
        className="cell"
        onClick ={(event) => handleClick(event, dispatch, local, square)}
        style={{ filter: `brightness(${brightness})`}}
    >
        {square.piece && <Image src={`/pieces/${square.piece.getName()}.webp`} alt={square.piece.getName()} width={60} height={60} />}
    </div>
    )
}

// these are important, we need these for type safety
type BoardProps = {
    local:Local
    dispatch: Dispatch<any>;
}

type CellProps = {
    local:Local
    square:Square
    dispatch: Dispatch<any>
}