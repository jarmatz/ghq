import pg from "pg";

declare global {
    var dbPool: pg.Pool | undefined;
}

// this is a singleton pattern
// we check if the global variable for the pool already exists, then use that
// else we make a new one
// prevents creating it over and over again in hot reloading dev environment
const pool = global.dbPool || new pg.Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: parseInt(process.env.PGPORT || '5432', 10),
  });

// this is the final piece of the pattern
// if we're not in production (at risk of hot reloading)...
// then we reuse the pool we've already built (note the appropriately circular logic)
if (process.env.NODE_ENV !== 'production') {
    global.dbPool = pool;
}

export default pool;