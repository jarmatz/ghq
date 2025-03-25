'use client'
// SLAUGHTERHOUSE LOBBY

import { useEffect, useState, Dispatch } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { Socket } from 'socket.io-client';
import { useImmerReducer } from 'use-immer';
// my imports
import GameBoard from '@/app/board/page';
import { Session, Game, Player } from '@/app/lib/game-objects';
import { getSocket } from '@/app/lib/socket';
import { sessionReducer } from '@/app/lib/ui-helpers';


export default function Page() {
    // get our game lobby from the slug
    const gameLobby: string = getSlug(usePathname());
    // get our player
    let playerParam = useSearchParams().get('player');
    // open our socket, kosher out here because it's a singleton
    const socket: Socket = getSocket(gameLobby);

    // our session reducer
    const [session, dispatch] = useImmerReducer<Session | null, any>(sessionReducer, null);
    // state for loading status
    const [status, setStatus] = useState('Not loaded.')

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
        socket.emit('intialGameRequest', {name: gameLobby});

        // listeners
        socket.on('initialGameResponse', (data) => loadGame(data, playerParam!, setStatus, dispatch));
    
        return () => {
            socket.off('connect');
            socket.off('initialGameResponse');
        }
    }, []);

    // our components for the page:
    return (
        <div>
            {session ? <GameBoard session={session} dispatch={dispatch}/> : <p>{status}</p>}
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
        const game = plainToInstance(Game, data.game);
        // get our reducer to make our session from this
        dispatch({
            type: 'loadGame',
            player: player,
            socket: socket,
            game: game
        })
    }
}

// what we do when the connection is initialized, but called inside component effect
function onConnect(player: string, dispatch: Dispatch<any>) {
    // safety check
    if (!socket){
        return;
    }
    // log the connection
    console.log(`connected on socket id: ${socket.id}`);
    dispatch({
        type: 'loadGame',
        player: player,
        socket: socket
    })
}

// a utility function, of use here to get the gameLobby from the URL slug
function getSlug(pathName: string): string {
    const beginningPath: string = '/slaughterhouse/';
    const slugStart: number = beginningPath.length;
    return pathName.slice(slugStart);
}