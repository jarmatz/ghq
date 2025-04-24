'use client'
// SLAUGHTERHOUSE LOBBY

import { useEffect, useState, Dispatch } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { Socket } from 'socket.io-client';
import { useImmerReducer } from 'use-immer';
import { enableMapSet } from 'immer';
// my imports
import GameBoard from '@/app/components/board-component';
import LogComponent from '@/app/components/log-component';
import BottomComponent from '@/app/components/bottom-component';
import Footer from '@/app/components/footer-component';
import { Session, Game, Player } from '@/app/lib/game-objects';
import { getSocket } from '@/app/lib/socket';
import { sessionReducer } from '@/app/lib/handler-reducer';

enableMapSet();

export default function Page() {
    // get our game lobby from the slug + our player from the query
    const gameLobby: string = getSlug(usePathname());
    let playerParam = useSearchParams().get('player');
    // open our socket, kosher out here because it's a singleton (apparently?)
    const socket: Socket = getSocket(gameLobby);

    // our session reducer
    const [session, dispatch] = useImmerReducer<Session | null, any>(sessionReducer, null);
    // state for the loading status
    const [status, setStatus] = useState('Loading game...')

    // setting up socket listeners and loading the initial gamestate
    useEffect(() => {
        // safety cleanup
        if (playerParam !== 'red' && playerParam !== 'blue') {
            playerParam = '';
        }
        // our connection event
        if (socket.connected) {
            console.log(`connected on socket id: ${socket.id}`);
        }
        else {
            socket.on('connect', () => console.log(`connected on socket id: ${socket.id}`));
        }
        // initial request for a game
        socket.emit('loadGameRequest', {name: gameLobby});

        // listeners
        // waits for initial game response
        socket.on('loadGameResponse', (data) => loadGame(data, playerParam!, setStatus, dispatch));
        // waits for updates from the server
        socket.on('update', (data) => updateGame(data, dispatch));
    
        return () => {
            socket.off('connect');
            socket.off('update');
            socket.off('loadGameResponse');
        }
    }, []);

    // setting up our emit effect for game actions, updates when we update the game action
    useEffect(() => {
        // if we have a game action, we fire and clear it, conditional important to prevent infinite loop
        if (session?.ui.gameAction) {
            socket.emit('gameAction', instanceToPlain(session.ui.gameAction));
            dispatch({ type: 'clearGameAction' });
        }
    }, [session?.ui.gameAction]);

    // ###################################################
    // our components for the page:
    // ###################################################
    return (
        <div className="slaughterhouse">
            <div className="boardLogWrapper">
                <div className="gameBoard">
                    {session ? <GameBoard session={session} dispatch={dispatch}/> : <p>{status}</p>}
                </div>
                {session && <div className="logComponent">
                    <LogComponent session={session} dispatch={dispatch}/>
                </div>}
            </div>
            {session && <div>
                <BottomComponent name={session.game.name}/>
            </div>}
            <Footer />
        </div>
    );
}

// this loads the initial returned game into a new session by dispatching to reducer
function loadGame(data: {status: string, game: Game | undefined}, player: string, setStatus: Dispatch<any>, dispatch: Dispatch<any>) {

    // set our status so we can see if game failed to retrieve
    setStatus(data.status);
    // somewhat redundant double check here that we had success and the game exists
    if (data.game && data.status === 'success') {
        console.log(`loaded game ${data.game.name}`)
        // get our reducer to make our session from this
        dispatch({
            type: 'loadGame',
            player: player,
            game: data.game
        })
    }
}

function updateGame(data: {message: string, game: Game}, dispatch: Dispatch<any>) {

    // we distinguish between these two actions because we only deactivate the UI if we revert:
    if (data.message === 'updated game') {
        dispatch({
            type: 'updateGame',
            game: data.game
        })
        console.log(data.message, 'from server');
    }
    else if (data.message === 'reverted game') {
        dispatch({
            type: 'revertGame',
            game: data.game
        })
        console.log(data.message, 'from server');
    }
}

// a utility function, of use here to get the gameLobby from the URL slug
function getSlug(pathName: string): string {
    const beginningPath: string = '/slaughterhouse/';
    const slugStart: number = beginningPath.length;
    return pathName.slice(slugStart);
}