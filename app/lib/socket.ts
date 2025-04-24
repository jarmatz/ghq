import { io, Socket } from 'socket.io-client';

// we're going to use the singleton pattern like in game-cache to prevent hot reload duplicate connections
declare global {
    var socket: Socket | undefined;
}

// 
export function getSocket(gameLobby: string): Socket {

    // if the socket is undefined globally
    if (!globalThis.socket) {
        // we open a new socket
        globalThis.socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
            query: { game: gameLobby }
        });
    }
    // return what we just created (or what already was there)
    return globalThis.socket;
}

// this is that weird singleton pattern shit
// basically says in development mode to make sure the socket persists
if (process.env.NODE_ENV !== 'production') {
    globalThis.socket = globalThis.socket;
}