import 'reflect-metadata';
// the server that handles web sockets and processes incoming moves
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
// nextjs does env variables for us vanilla, but we need a package here in node:
import dotenv from 'dotenv';
dotenv.config();
// my imports:
import { loadGameResponse } from '@/app/lib/server-helpers';
import { updateGame } from '@/app/lib/update-game';

// we need to use express to quickly set up an HTTP server to plug socket.io into
// this is just the vernacular for doing so
const expressApp = express();
const httpServer = http.createServer(expressApp);

const io = new Server(httpServer, {
    cors: {
        origin: [
            "http://localhost:3000",
            "https://ghq-ten.vercel.app"
          ],
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
    // loads initial game
    socket.on('loadGameRequest', (data) => loadGameResponse(socket, data));
    // listens for client updates then processes and returns its own update
    socket.on('gameAction', (data) => updateGame(gameLobby, data, io));

    socket.on('disconnect', () => {
        console.log(`Socket ${socket.id} left lobby ${gameLobby}`);
    });
});

const PORT = 4000;
httpServer.listen(PORT, () => {
    console.log(`Socket.IO listening on ${PORT}`);
});