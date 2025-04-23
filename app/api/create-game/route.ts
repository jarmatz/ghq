import { NextResponse } from 'next/server';
import { instanceToPlain } from 'class-transformer';
// my imports:
import query from '@/app/lib/pgclient';
import { Game } from '@/app/lib/game-objects';
import { isAlphaNum } from '@/app/lib/ui-helpers';

export async function POST (req: Request) {

    try {
        const body = await req.json();
        // destructuring the name field
        const { name } = body;

        if (!name || typeof name !== 'string') {
            return NextResponse.json({ sucess: false, error: 'Invalid name.' }, { status: 400 });
        }
        if (isAlphaNum(name) === false){
            return NextResponse.json({ sucess: false, error: 'Names must contain only letters and numbers.' }, { status: 400 });
        }
        
        const newGame: Game = new Game(name);
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