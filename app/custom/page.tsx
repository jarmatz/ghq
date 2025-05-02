'use client'
// SPLASH PAGE FOR CREATING AND LOADING GAMES
// USES API ROUTE (NOT WEB SOCKET) FOR INTERFACING WITH DATABASE

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAlphaNum } from '../lib/ui-helpers';
import { configRegExp, parseConfigString } from '../lib/custom-config';
import { BoardConfig } from '../lib/game-config';
import Footer from '../components/footer-component';

export default function Home() {
    return (
        <div className='content'>
            <Header />
            <hr></hr>
            <LobbyGenerator />
            <Disclaimer />
            <Footer />
        </div>
    )
}

function Header() {
    return (
        <div style={{lineHeight: 1.4}}>
            <h1>
                Custom Board State Generator
            </h1>
            <p style={{marginTop: 10}}> 
                Input a config string to set up the board.
            </p>
            <p style={{marginTop: 10}}>
                To avoid victory conditions, must include HQs (default provided).
            </p>
            <p style={{marginTop: 10}}>
                Note: Tray configs not currently supported.
            </p>
        </div>
    )
}

function Disclaimer() {
    return (
        <div style={{fontSize: '.8em', marginTop:30}}>
            <p >
               Config key:
            </p>
            <p>
                5-character strings for each piece. The first three characters define the piece type using the key below.
            </p>
            <p>
                The last two characters are digits defining the position, from 00 (top left) to 77 (bottom right).
            </p>
            <br></br>
            <p>
                PIECE KEY:
            </p>
            <p>format is [player][tag][type]</p>
            <br></br>
            <p>PLAYER</p>
            <p>r = red</p>
            <p>b = blue</p>
            <br></br>
            <p>TAG</p>
            <p>s = standard</p>
            <p>a = armored</p>
            <p>r = airborne</p>
            <p>h = heavy</p>
            <br></br>
            <p>TYPE</p>
            <p>i = infantry</p>
            <p>a = artillery</p>
            <p>q = HQ</p>
            <br></br>
            <p>
                Separate entries with commas, no spaces: rai01,bha45,rri32 etc.
            </p>
            <p>
                NOTE: HQ is considered a "standard" piece, like so: rsq00
            </p>
        </div>
    )
}

function LobbyGenerator() {
   
    const [name, setName] = useState('');
    const [status, setStatus] = useState('');
    const [action, setAction] = useState('create');
    const [player, setPlayer] = useState('blue');
    const [hqVictory, setHqVictory] = useState(false);
    const [configString, setConfigString] = useState('rsq77,bsq00');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        // prevent page reload
        e.preventDefault();

        setStatus('');

        if (!isAlphaNum(name)) {
            setStatus('Name must be alphanumeric.');
            return;
        }

        if (name.length > 100) {
            setStatus('Names must be fewer than 100 characters in length.');
            return;
        }
        
        if (!configRegExp.test(configString)) {
            setStatus('Config string is malformed, see key below');
            return;
        }

        // creating a new game
        if ( action === 'create') {
            try {
                setStatus('Fetching new game.');
                const response: GameResponse = await createNewGame(name, hqVictory, configString);
                console.log(response);

                if (response.success) {
                    setStatus(`Succeeded in creating game lobby: ${response.name}`);
                    router.push(`/slaughterhouse/${response.name}?player=blue`);
                }
                if (!response.success) {
                    setStatus(`Error: ${response.error}`);
                }
            }
            catch (err) {
                setStatus('Error reaching server.');
            }
        }
        //  loading an existing game
        else if ( action === 'load') {
            try {
                setStatus('Fetching existing game.');
                const response: GameResponse = await loadGame(name);
                console.log(response);

                if (response.success) {
                    setStatus(`Found the game lobby: ${name}`);
                    router.push(`/slaughterhouse/${name}?player=${player}`);
                }
                if (!response.success) {
                    setStatus(`Error: ${response.error}`);
                }
            }
            catch (err) {
                setStatus('Error reaching server.');
            }
        }

    }

    return (
        <div style={{lineHeight: 2}}>
            <form onSubmit={handleSubmit}>

                <label htmlFor='config'>Custom config:</label>
                <input value={configString} type='text' name='config' required placeholder='Config String' autoComplete='off' size={34}
                    onChange={(e) => setConfigString(e.target.value)}>
                </input>

                <input value={name} type ='text' name='name' required placeholder='Lobby name'autoComplete='off'
                    onChange={(e) => setName(e.target.value)}>
                </input>
                <button type='submit'>Submit</button>
                <br></br>
                { action === 'create' &&
                    <div>
                        <input type='checkbox' checked={hqVictory} id='hqVictoryBox' name='hqVictoryBox' value='true'
                            onChange={(e) => setHqVictory(e.target.checked)}>
                        </input>
                        <label htmlFor='hqVictoryBox' style={{fontSize: '.8em'}}>Optional rule: bringing HQ to enemy's backrank also results in victory</label>
                    </div>
                }
            </form>
            <br></br>
            <p>{status}</p>
        </div>
    );

}

async function createNewGame(name: string, hqVictoryOption: boolean, configString: string): Promise<GameResponse> {

    const customConfig: BoardConfig = parseConfigString(configString);

    const response = await fetch('/api/create-game', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
            name: name,
            hqVictoryOption: hqVictoryOption,
            customConfig: customConfig
        })
    });

    // we convert the response to a json object
    const result = await response.json();
    return result;
}

async function loadGame(name: string): Promise<GameResponse> {

    const response = await fetch('/api/load-game', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name })
    });

    const result = await response.json();
    return result;
}


type GameResponse = {
    success: boolean;
    error?: string;
    name?: string;
}