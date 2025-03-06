'use client';

import { init } from 'next/dist/compiled/webpack/webpack';
import Image from 'next/image';
import { useImmer, useImmerReducer } from 'use-immer';
// my imports:
import { Player, TraySquare, Square, Session } from '../lib/game-objects';
import { clickReducer, handleBoardClick, handleTrayClick } from '../lib/ui-helpers';
import { Dispatch } from 'react';

const intialSession = new Session();

// the main page
export default function Home() {

    const [session, dispatch] = useImmerReducer(clickReducer, intialSession)
    console.log(session);
    
      return (
        <div className="board-wrapper">
            <br></br>
            <Tray player='red' session={session} dispatch={dispatch}/>
            <br></br>
            <Board session={session} dispatch={dispatch}/> 
            <br></br>
            <Tray player='blue' session={session} dispatch={dispatch}/>
        </div>
    )
}

// this renders the board itself
function Board({ session, dispatch }: BoardProps) {
    
    return (
        <div className="board">
            {session.game.board.map((row) => (
                row.map((square) => (
                    <Cell square={square} session={session} dispatch={dispatch} key={square.getID()}/>
                ))
            ))}
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
    let activeEffect: string = '';
    if (square.piece?.isActive) {
        activeEffect = 'activeSquare';
    }

    // this renders the image in the cell if a piece is there
    return (
    <div
        className={`cell ${activeEffect}`}
        onClick ={(event) => handleBoardClick(event, dispatch, session, square)}
    >
        {square.piece && <Image src={`/pieces/${square.piece.name}.webp`}
                        alt={square.piece.name}
                        title={square.piece.name}
                        width={100} height={100}
                        style={{transform: `rotate(${square.piece.rotation}deg)`}} />}
        <div className={circleClass}></div>
    </div>
    )
}


// this renders the blue tray
function Tray({player, session, dispatch} : TrayProps) {
    return (
        <div className="tray">
            {session.game.trays[player].map((traySquare, index) => (
                <TrayCell traySquare={traySquare} session={session} dispatch={dispatch} key={index}/>
            ))}
        </div>
    )
}

function TrayCell({traySquare, session, dispatch} : TrayCellProps) {
    return (
        <div 
            className="cell"
            onClick={(event) => handleTrayClick(event, dispatch, session, traySquare)}
        >
            <Image src={`/pieces/${traySquare.name}.webp`}
                alt={traySquare.name}
                title={traySquare.name}     
                width={100} height={100}/>
            <div className="countText">
                {traySquare.count} 
            </div>     
        </div>
    )
}


// these are important, we need these for type safety
type BoardProps = {
    session: Session
    dispatch: Dispatch<any>;
}

type TrayProps = {
    session: Session
    dispatch: Dispatch<any>;
    player: 'red' | 'blue';
}

type CellProps = {
    session: Session
    square:Square
    dispatch: Dispatch<any>
}

type TrayCellProps = {
    session: Session
    traySquare: TraySquare
    dispatch: Dispatch<any>
}