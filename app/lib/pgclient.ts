import pg from 'pg';

export default async function query(queryText: string, values?: any[]) {
    const client = new pg.Client({
        connectionString: process.env.DB_URL,
        ssl: {
            rejectUnauthorized: false, // just for now, can add cert later
        },
    });

    await client.connect();
    const result = await client.query(queryText, values);
    await client.end();
    
    return result;
}