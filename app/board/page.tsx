'use client';
// the gameboard component

import Image from 'next/image';
import { Dispatch, useEffect } from 'react';
// my imports:
import { Game, Player, Reserve, Square, Session } from '@/app/lib/game-objects';
import { handleBoardClick, handleTrayClick, handleRotator} from '@/app/lib/ui-helpers';
import { setBombardments } from '@/app/lib/game-helpers';

const fetchedSession = new Session();
fetchedSession.game.board = setBombardments(fetchedSession.game.board);

// the main page
export default function GameBoard({ session, dispatch }: GameBoardProp) {

    console.log(session);

    const playerRotation = session.ui.self === 'red' ? 180 : 0;

      return (
        <div className="board-wrapper" style={{transform: `rotate(${playerRotation}deg)`}}>
            <br></br>
            <div className='tray-wrapper' style={{transform: `rotate(${playerRotation}deg)`}}>
                <Tray player='red' session={session} dispatch={dispatch}/>
            </div>
            <br></br>
            <Board session={session} dispatch={dispatch}/> 
            <br></br>
            <div className='tray-wrapper' style={{transform: `rotate(${playerRotation}deg)`}}>
                <Tray player='blue' session={session} dispatch={dispatch}/>
            </div>
            <br></br>
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
    // this option is for rendering centered circles inside the square
    let circleEffect: string = '';
    if (session.ui.potentialMoves.includes(square)) {
        circleEffect += 'circle ';
    }
    if (square.piece === session.ui.activePiece && square.piece && square.piece!.type=== 'artillery') {
        circleEffect += 'rotatorEffect pulse ';
    }
    // this option is for affecting the background of the square
    let backgroundEffect: string = '';
    if (square.piece === session.ui.activePiece && square.piece) {
        backgroundEffect += 'activeSquare ';
    }
    if (square.bombardment !== '') {
        backgroundEffect = 'bombardment';
        backgroundEffect += (square.bombardment + ' ');
    }

    // this renders the image in the cell if a piece is there
    return (
    <div
        className={`cell ${backgroundEffect}`}
        onClick ={(event) => handleBoardClick(event, dispatch, session, square)}
    >
        {square.piece && <Image src={`/pieces/${square.piece.name}.webp`}
                        alt={square.piece.name}
                        title={square.piece.name}
                        width={200} height={200}
                        style={{transform: `rotate(${square.piece.rotation}deg)`}} />}
        <div className={circleEffect}></div>
        {square.piece === session.ui.activePiece && square.piece && square.piece!.type === 'artillery' &&
            <Rotators square={square} session={session} dispatch={dispatch}/>}
    </div>
    )
}

function Rotators({ session, dispatch, square }: CellProps) {
    const rotatorMargin = 27;
    const rotations = [0, 45, 90, 135, 180, 225, 270, 315];

    return (
        <div style={{ transform: `translate(-12px, -12px)` }}>
            {rotations.map((rotation, index) => {
                {/* note the math.round which normalizes to 1 and avoids floating arithmetic problems at 0*/}
                const translateX = rotatorMargin * Math.round(Math.sin(rotation * Math.PI / 180));
                const translateY = rotatorMargin * - Math.round(Math.cos(rotation * Math.PI / 180));
                return (
                    <div
                        key={index}
                        className='rotator'
                        style={{ transform: `translate(${translateX}px, ${translateY}px)` }}
                        onMouseEnter={(event) => handleRotator(event, dispatch, session, square, rotation)}
                        onMouseLeave={(event) => handleRotator(event, dispatch, session, square, rotation)}
                        onClick={(event) => handleRotator(event, dispatch, session, square, rotation)}
                    ></div>
                );
            })}
        </div>
    );
}


// this renders the tray
function Tray({player, session, dispatch} : TrayProps) {
    return (
        <div className="tray">
            {session.game.trays[player].map((reserve, index) => (
                <TrayCell reserve={reserve} session={session} dispatch={dispatch} key={index}/>
            ))}
        </div>
    )
}

function TrayCell({reserve, session, dispatch} : TrayCellProps) {
    
    let activeEffect: string = '';
    if (reserve === session.ui.activeReserve) {
        activeEffect = 'activeSquare';
    }
    let spentEffect: string = '';
    if (reserve.count < 1) {
        spentEffect = 'spentReserve'
    }

    return (
        <div 
            className={`cell ${activeEffect} ${spentEffect}`}
            onClick={(event) => handleTrayClick(event, dispatch, session, reserve)}
        >
            <Image src={`/pieces/${reserve.name}.webp`}
                alt={reserve.name}
                title={reserve.name}     
                width={200} height={200}/>
            <div className="countText">
                {reserve.count} 
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
    reserve: Reserve
    dispatch: Dispatch<any>
}

type GameBoardProp = {
    session: Session
    dispatch: Dispatch<any>
}