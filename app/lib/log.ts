import { instanceToPlain, plainToInstance } from 'class-transformer';
// my imports:
import { Game, Board, Player, GameAction, Log } from '@/app/lib/game-objects';
import { setBombardments } from './game-helpers';
import { setEngagements } from './engagement';

// takes as input game instance (which is easier syntax for class transformer)
// and returns us a clone of its board state
// useful for adding to the game log
export function snapshotBoard(game: Game): Board {
    const proxyGame: Game = plainToInstance(Game, instanceToPlain(game));
    // we have to set engagements/bombardments here
    proxyGame.board = setEngagements(proxyGame.board);
    proxyGame.board = setBombardments(proxyGame.board);
    return proxyGame.board;
}

export function logifyAction(action: GameAction, snapshot: Board): Log {

    let text: string = '';
    const activeIDs: string[] = [];
    const captureIDs: string[] = []

    switch (action.type) {
        case 'move': {
            text += `${action.piece?.player} moved a ${action.piece?.tag} ${action.piece?.type}`;
            activeIDs.push(action.source!.getID());
            activeIDs.push(action.target!.getID());

            if (action.capture !== null) {
                text += ` and captured a ${action.capture.piece?.tag} ${action.capture.piece?.type}`;
                captureIDs.push(action.capture.getID());
            }
            break;
        }
        case 'place': {
            text += `${action.reserve?.player} placed a ${action.reserve?.tag} ${action.reserve?.type}`;
            activeIDs.push(action.target!.getID());

            if (action.capture !== null) {
                text += ` and captured a ${action.capture.piece?.tag} ${action.capture.piece?.type}`;
                captureIDs.push(action.capture.getID());
            }
            break;
        }
        case 'rotate': {
            text += `${action.piece?.player} rotated a ${action.piece?.tag} ${action.piece?.type} without moving it`;
            activeIDs.push(action.source!.getID());
            break;
        }
        case 'capture': {
            text += `${action.piece?.player} captured a ${action.capture?.piece?.tag} ${action.capture?.piece?.type}`;
            activeIDs.push(action.source!.getID());
            captureIDs.push(action.capture!.getID());
            break;
        }
    }

    text += '.';
    // a nifty pattern for capitalizing the start:
    text = text[0].toUpperCase() + text.slice(1);

    return new Log(text, snapshot, activeIDs, captureIDs);
}