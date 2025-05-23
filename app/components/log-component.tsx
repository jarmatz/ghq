import { Dispatch } from 'react'
// my imports:
import { Session } from '../lib/game-objects'
import { handleLog } from '../lib/handler-reducer';

export default function LogComponent({ session, dispatch }: LogProp) {

    if (session.game.log.length > 0) {
        return (
            <div className ="log">
                {session.game.log.map((entry, i) => 
                    <div className='logEntry'
                        onMouseEnter={(event) => handleLog(event, dispatch, session, i)}
                        onMouseLeave={(event) => handleLog(event, dispatch, session, i)}
                        key={i}>
                        <p>{session.game.log.length - i}. {entry.text}</p>
                    </div>
                )}
            </div>
        );
    }
    else return(
        <div className='logPlaceholder'>
            <h3>Game Log:</h3>
            <p>A record of all moves will appear here after being validated by the server. Mouse over entries to see previous board states.</p>
        </div>
    );
}

type LogProp = {
    session: Session
    dispatch: Dispatch<any>
}