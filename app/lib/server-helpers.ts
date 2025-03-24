import { plainToInstance } from 'class-transformer';
// my imports:
import pool from '@/app/lib/db';
import gameCache from '@/app/lib/game-cache';
import { Game } from '@/app/lib/game-objects';

export async function getGame(name: string): Promise<Game | undefined> {
    // if it's in the cache we're golden
    if (gameCache.has(name)) {
        return gameCache.get(name);
    }
    else {
        // query the database
        const result = await pool.query('SELECT data FROM games WHERE name = $1', [name]);
        // if we get a match
        if (result.rowCount && result.rowCount > 0) {
            // get a game instance and set it into the cache
            const game: Game = plainToInstance(Game, result.rows[0].data);
            gameCache.set(name, game);
            return game;
        }
    }
    // this far down we failed
    return undefined;
}