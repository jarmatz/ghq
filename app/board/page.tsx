'use client';

import { init } from 'next/dist/compiled/webpack/webpack';
import Image from 'next/image';
import { useImmer, useImmerReducer } from 'use-immer';
// my imports:
import { Piece, Game, Square, Session } from '../lib/game-objects';
import { clickReducer, handleClick } from '../lib/ui-helpers';
import { Dispatch } from 'react';

const intialSession = new Session();

// the main page
export default function Home() {

    const [session, dispatch] = useImmerReducer(clickReducer, intialSession)

    console.log(session);
    
      return (
        <Board session={session} dispatch={dispatch}/>  
    )
}

// this renders the board itself
function Board({ session, dispatch }: BoardProps) {
    
    return (
        <div className="board-wrapper">
            <div className="board">
                {session.game.board.map((row) => (
                    row.map((square) => (
                        <Cell square={square} session={session} dispatch={dispatch} key={square.getID()}/>
                    ))
                ))}
            </div>
        </div>
    )
}


// this renders cells in the board
// we pass in the square object that is represented in the cell
function Cell({square, session, dispatch} : CellProps) {
    
    // we're going to highlight cells based on the UI state
    let circleClass: string = '';
    if (session.ui.potentialMoves.includes(square.getID())) {
        circleClass = 'circle';
    }
    let activeBorder: string = '';
    if (session.ui.activeSquare === square) {
        activeBorder = '1px dashed white';
    }

    // this renders the image in the cell if a piece is there
    return (
    <div
        className='cell'
        style={{border: `${activeBorder}`}}
        onClick ={(event) => handleClick(event, dispatch, session, square)}
    >
        {square.piece && <Image src={`/pieces/${square.piece.name}.webp`}
                        alt={square.piece.name}
                        width={100} height={100}
                        style={{transform: `rotate(${square.piece.rotation}deg)`}} />}
        <div className={circleClass}></div>
    </div>
    )
}

// these are important, we need these for type safety
type BoardProps = {
    session: Session
    dispatch: Dispatch<any>;
}

type CellProps = {
    session: Session
    square:Square
    dispatch: Dispatch<any>
}