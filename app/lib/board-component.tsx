'use client';
// the gameboard component

import Image from 'next/image';
import { Dispatch, useEffect } from 'react';
// my imports:
import { Game, Player, Reserve, Square, Session } from '@/app/lib/game-objects';
import { handleBoardClick, handleTrayClick, handleRotator, handleCapture, handleEndTurn} from '@/app/lib/handler-reducer';
import { invertPlayer } from './game-helpers';
import { Render } from './ui-helpers'


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
    
    const playerRotation = session.ui.self === 'red' ? 180 : 0;

    return (
        <div className="board">
            {session.game.winner !== '' &&
                <div className="victoryText" style={{transform: `translate(-50%, -50%) rotate(${playerRotation}deg)`}}>
                    {`${session.game.winner.toUpperCase()} WINS`}
                </div>
            }
            {session.getBoardForRender().map((row) => (
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
    
    const render: Render = new Render(square, session);
    const playerRotation = session.ui.self === 'red' ? 180 : 0;

    // this renders the image in the cell if a piece is there
    return (
    <div
        className={`cell ${render.getBackgroundEffect()}`}
        onClick ={(event) => handleBoardClick(event, dispatch, session, square)}

    >   {/*renders the piece image:*/}
        {square.piece && <Image src={`/pieces/${square.piece.name}.webp`}
                        alt={square.piece.name}
                        title={square.piece.name}
                        width={200} height={200}
                        style={{transform: `rotate(${square.piece.rotation}deg)`}} />}

        {/*renders the lock for depleted pieces */}
        {render.getLockBool() && <Image src={'/lock.webp'}
                                    alt='lock'
                                    width='40' height='40'
                                    style={{opacity: .6, transform: `scale(.3) rotate(${playerRotation}deg)`}}/>}

        <div className={render.getCircleEffect()}></div>

        {/*renders invisible rotators if artillery is active:*/}
        {square.piece?.getID() === session.ui.activePiece?.getID() && square.piece && square.piece?.type === 'artillery' &&
            <Rotators square={square} session={session} dispatch={dispatch}/>}

        {/*renders crosshairs for captures: */}
        {render.getCrosshairsBool() &&        
            <Image src={`/crosshairs.webp`} 
                        alt = 'crosshairs'
                        width='200' height='200'
                        className='crosshairs pulse'
                        onClick={(event) => handleCapture(event, dispatch, session, square)}
                        onMouseEnter={(event) => handleCapture(event, dispatch, session, square)}
                        onMouseLeave={(event) => handleCapture(event, dispatch, session, square)}
                        />}
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
    let bloom: string = '';
    let actions: number = 0;
    if (player === session.game.activePlayer) {
        bloom = 'bloom';
        actions = session.game.actionsLeft;
    }

    return (
        <div className={`tray ${bloom}`}>
            {session.game.trays[player].map((reserve, index) => (
                <TrayCell reserve={reserve} session={session} dispatch={dispatch} key={index}/>
            ))}
            {/*This renders the pass button and active ticks remaining: */}
            <div className="cell actions">
                Actions: {actions}
                <button className="endturn"
                        onClick={(event) => handleEndTurn(event, dispatch, session)}
                        onMouseLeave={(event) => handleEndTurn(event, dispatch, session)}
                        onMouseEnter={(event) => handleEndTurn(event, dispatch, session)}>
                    END TURN
                </button>
            </div>
        </div>
    )
}

function TrayCell({reserve, session, dispatch} : TrayCellProps) {
    
    let activeEffect: string = '';
    if (reserve.getID() === session.ui.activeReserve?.getID()) {
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