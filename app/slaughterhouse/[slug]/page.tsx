'use client'
// SLAUGHTERHOUSE LOBBY

import { useEffect, Dispatch } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { Socket } from 'socket.io-client';
import { useImmerReducer } from 'use-immer';
// my imports
import GameBoard from '@/app/board/page';
import { Session, Game, Player } from '@/app/lib/game-objects';
import { setBombardments } from '@/app/lib/game-helpers';
import { getSocket } from '@/app/lib/socket';
import { sessionReducer } from '@/app/lib/ui-helpers';

let dummySession = new Session();

export default function Page() {

    // get our pathname and search params
    const pathName: string = usePathname();
    const gameLobby: string = getSlug(pathName);
    // get our searchparams
    const searchParams = useSearchParams();
    let playerParam = searchParams.get('player');
    // open our socket, kosher out here because it's a singleton
    const socket: Socket = getSocket(gameLobby);

    // our session reducer
    const [session, dispatch] = useImmerReducer(sessionReducer, dummySession);

    // setting up socket listeners and loading the initial gamestate
    useEffect(() => {
        if (playerParam !== 'red' && playerParam !== 'blue') {
            playerParam = '';
        }
        // our connection event
        if (socket.connected) {
            onConnect(playerParam, dispatch);
        }
        else {
            socket.on('connect', () => onConnect(playerParam!, dispatch));
        }
    
        return () => {
            socket.off('connect');
        }
    }, []);

    // our components for the page:
    return (
        <div>
            {session.ui.isLoaded ? <GameBoard session={session} dispatch={dispatch}/> : <p>Not loaded.</p>}
        </div>
    );
}

function onConnect(player: string, dispatch: Dispatch<any>) {
    // safety check
    if (!socket){
        return;
    }
    // log the connection
    console.log(`connected on socket id: ${socket.id}`);
    dispatch({
        type: 'loadGame',
        player: player
    })
}

// a utility function, of use here to get the gameLobby from the URL slug
function getSlug(pathName: string): string {
    const beginningPath: string = '/slaughterhouse/';
    const slugStart: number = beginningPath.length;
    return pathName.slice(slugStart);
}