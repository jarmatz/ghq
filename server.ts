// the server that handles web sockets and processes incoming moves
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
// my imports:
import { initialGameResponse } from './app/lib/server-helpers.js';


// we need to use express to quickly set up an HTTP server to plug socket.io into
// this is just the vernacular for doing so
const expressApp = express();
const httpServer = http.createServer(expressApp);

let corsOrigin: string;
if (process.env.NODE_ENV === 'production') {
    corsOrigin = '';
}
else {
    corsOrigin = 'http://localhost:3000';
}

const io = new Server(httpServer, {
    cors: {
        origin: corsOrigin,
        methods: ["GET", "POST"]
    }
});

// this is how we open a socket connection with a client through socket.io
// the wrapper io.on function handles connection then offers the socket object to the child methods
// kinda like the event object from event handlers
io.on('connection', async (socket) => {
    // we'll get the game lobby from the query send in the handshake
    const gameLobby = socket.handshake.query.game;

    // safety check
    if (gameLobby && typeof gameLobby === 'string') {
        // then let's get this socket into the correct room
        socket.join(gameLobby);
        console.log(`Socket ${socket.id} joined lobby ${gameLobby}`);
    }
    else {
        console.log(`Socket ${socket.id} failed to join lobby ${gameLobby}`);
        socket.disconnect();
        return;
    }
    // listeners
    socket.on('initialGameRequest', (data) => initialGameResponse(socket, data));

    socket.on('disconnect', () => {
        console.log(`Socket ${socket.id} left lobby ${gameLobby}`);
    });
});

const PORT = 4000;
httpServer.listen(PORT, () => {
    console.log(`Socket.IO listening on ${PORT}`);
});