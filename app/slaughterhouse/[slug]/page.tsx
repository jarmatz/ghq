'use client'
// SLAUGHTERHOUSE LOBBY

import GameBoard from '@/app/board/page';
import { Session, Game } from '@/app/lib/game-objects';
import { setBombardments } from '@/app/lib/game-helpers';
import { instanceToPlain, plainToInstance } from 'class-transformer';

const fetchedSession = new Session();
fetchedSession.game.board = setBombardments(fetchedSession.game.board);
// testing
const plainGame = instanceToPlain(fetchedSession.game);
const adjustedGame = plainToInstance(Game, plainGame);

fetchedSession.game = adjustedGame;


// the slug gets stored by nextjs in an object called params that we can pass as a prop
export default function Page( { params }:  ParamProps) {
    // here we destructure the slug field to get the slug itself
    const { slug } = params;

    return (
        <GameBoard initialSession={fetchedSession}/>
    );
}

type ParamProps = {
    params: {
        slug: string;
    }
}