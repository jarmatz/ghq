'use client'
// SPLASH PAGE FOR CREATING AND LOADING GAMES
// USES API ROUTE (NOT WEB SOCKET) FOR INTERFACING WITH DATABASE

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAlphaNum } from '../lib/ui-helpers';

export default function Home() {
   
    const [name, setName] = useState('');
    const [status, setStatus] = useState('');
    const [action, setAction] = useState('create');
    const [player, setPlayer] = useState('blue');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        // prevent page reload
        e.preventDefault();

        setStatus('');

        if (!isAlphaNum(name)) {
            setStatus('Only alphanumeric characters allowed.');
            return;
        }
        
        // creating a new game
        if ( action === 'create') {
            try {
                setStatus('Fetching new game.');
                const response: GameResponse = await createNewGame(name);
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
        <div>
            <form onSubmit={handleSubmit}>
                <input value={name} type ='text' name='name' required placeholder='Lobby name'autoComplete='off'
                    onChange={(e) => setName(e.target.value)}>
                </input>
                <select name='action'
                    onChange={(e) => setAction(e.target.value)}>
                    <option value='create'>Create Game</option>
                    <option value='load'>Load Game</option>
                </select>
                <button type='submit'>Submit</button>
                <br></br>
                { action === 'load' && (
                    <div>
                        <input type='radio' name='player' id='blue' value='blue' checked={player === 'blue'}
                            onChange={(e) => setPlayer(e.target.value)}></input>
                        <label htmlFor='blue'>Blue</label>
                        <input type='radio' name='player' id='red' value='red' checked={player === 'red'}
                            onChange={(e) => setPlayer(e.target.value)}></input>
                        <label htmlFor='red'>Red</label>
                    </div>
                )}
            </form>
            <br></br>
            <p>{status}</p>
        </div>
    );

}

export async function createNewGame(name: string): Promise<GameResponse> {

    const response = await fetch('/api/create-game', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name })
    });

    // we convert the response to a json object
    const result = await response.json();
    return result;
}

export async function loadGame(name: string): Promise<GameResponse> {

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