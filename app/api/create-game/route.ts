import { NextResponse } from 'next/server';
import { instanceToPlain, plainToInstance } from 'class-transformer';
// my imports:
import query from '@/app/lib/pgclient';
import { Game } from '@/app/lib/game-objects';
import { isAlphaNum } from '@/app/lib/ui-helpers';

export async function POST (req: Request) {

    try {
        const body = await req.json();
        // destructuring the name field
        const { name, hqVictoryOption } = body;

        if (!name || typeof name !== 'string') {
            return NextResponse.json({ sucess: false, error: 'Invalid name.' }, { status: 400 });
        }
        if (isAlphaNum(name) === false){
            return NextResponse.json({ sucess: false, error: 'Names must contain only letters and numbers.' }, { status: 400 });
        }
        if (name.length > 100){
            return NextResponse.json({ sucess: false, error: 'Names must be fewer than 100 characters.' }, { status: 400 });
        }

        // check to see if the game exists but has finished, then we delete so we can overwrite a new one
        const result = await query('SELECT data FROM games WHERE name = $1', [name]);

        if (result.rowCount && result.rowCount > 0) {
            const game: Game = plainToInstance(Game, result.rows[0].data as Game);
            // if there is a winner
            if (game.winner !== '') {
                // delete the entry so we can overwrite
                await query('DELETE FROM games WHERE name = $1', [name]);
            }
        }
        
        // make the new game, with the correct victory settings
        const newGame: Game = new Game(name, hqVictoryOption);

        // this is the SQL query to insert, it will return error if name is a duplicate (table settings)
        await query('INSERT INTO games (name, data) VALUES ($1, $2)', [name, instanceToPlain(newGame)]);
        // we did it!
        return NextResponse.json({success: true, name: name}, { status: 201});   
    }
    catch (error: any) {
        console.error('CREATE GAME ERROR', error);

        // this is the error code for duplicate entries in the table
        if (error.code === '23505') {
            return NextResponse.json({ success: false, error: 'Name already exists.' }, { status: 409 });
        }
        
        return NextResponse.json({ success: false, error: JSON.stringify(error) }, { status: 500 });
    }
}