import { plainToInstance, instanceToPlain } from 'class-transformer';
import { Socket } from 'socket.io'
// my imports:
import pool from '../../server/src/pgpool';
import gameCache from './game-cache';
import { Game } from './game-objects';

// this attempts to load the game from the cache
// if it's not there, it checks the db
// if it gets it in db, it retrieves it and loads into cache
// else it returns undefined
export async function getGame(name: string, forceDatabaseQuery: boolean = false): Promise<Game | undefined> {
    // if it's in the cache we're golden
    // but we only check if we're not forcing a database query
    if (gameCache.has(name) && forceDatabaseQuery === false) {
        // debug:
        console.log(`retrieved ${name} from cache and cache is ${gameCache.validate()}`)
        return gameCache.get(name);
    }
    else {
        // query the database
        try {
            const result = await pool.query('SELECT data FROM games WHERE name = $1', [name]);
              // if we get a match
            if (result.rowCount && result.rowCount > 0) {
                // get a game instance and set it into the cache
                // type checking is being wonky here because of the array literals, hence the cast
                const game: Game = plainToInstance(Game, result.rows[0].data as Game);
                gameCache.set(name, game);
                // debug
                console.log(`retrieved ${name} from database and cache is ${gameCache.validate()}`)
                return game;
            }
        }
        catch(error) {
            console.error('database error when requesting game:', error);
        }
    }
    // this far down we failed
    console.log(`Failed to retreive ${name} from cache or database.`);
    return undefined;
}

// this uses getGame() to try and find the game and then send it back as a response
// otherwise it returns an error
export async function loadGameResponse(socket: Socket, data: {name: string}) {

    // on the initial load we force a database query
    const game = await getGame(data.name, true);

    if (!game) {
        socket.emit('loadGameResponse', {status: `Failed to find game: ${data.name}.`, game: game});
    }
    else {
        socket.emit('loadGameResponse', {status: `success`, game: instanceToPlain(game)});
    }
}

// this is a wrapper for updating the database with try/catch
export async function updateDatabase(game: Game) {
    try {
        const result = await pool.query('UPDATE games SET data = $1 WHERE name = $2', [instanceToPlain(game), game.name])
        if (result.rowCount === 0) {
            console.log('failed to find game to update in database')
        }
    }
    catch (error) {
        console.error('error when trying to update database entry', error);
    }
}