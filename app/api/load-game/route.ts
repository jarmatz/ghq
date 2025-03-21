// LOAD GAME ROUTE

import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';
import { isAlphaNum } from '@/app/lib/ui-helpers';

export async function POST (req: Request) {

    try {
        
        const body = await req.json();
        const { name } = body;

        if (!name || typeof name !== 'string') {
                return NextResponse.json({ sucess: false, error: 'Invalid name.' }, { status: 400 });
        }
        if (isAlphaNum(name) === false){
            return NextResponse.json({ sucess: false, error: 'Names must contain only letters and numbers.' }, { status: 400 });
        }

        const result = await pool.query('SELECT name FROM games WHERE name = $1', [name]);

        if (result.rowCount && result.rowCount > 0) {
            return NextResponse.json({ success: true, name: name }, { status: 200 });
        }
        else {
            return NextResponse.json({ sucess: false, error: 'No matching game found.'}, {status: 200});
        }
    }
    catch (error: any) {
        console.error('FETCH GAME ERROR', error);
        
        return NextResponse.json({ success: false, error: JSON.stringify(error) }, { status: 500 });
    }
}