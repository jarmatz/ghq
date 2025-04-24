import React from "react";
import { useState } from "react";

export default function BottomComponent({name}: BottomProp) {

    return (
        <div className="bottomWrapper">
            <div className='bottomContent'>
                <div>
                    <p>You can access this game by loading it via the <a href='/play'>lobby page</a> or by using these links:</p>
                </div>
                <CopyComponent name={name} player='blue' />
                <CopyComponent name={name} player='red' />
                <CopyComponent name={name} player='obs' />
            </div>
        </div>
    );
}

function CopyComponent({name, player}: CopyProp) {

    const [copyStatus, setCopyStatus] = useState('');
    
    const urlString: string = `${process.env.NEXT_PUBLIC_LOCAL_DOMAIN}/slaughterhouse/${name}?player=`;
    const size: number = urlString.length;
    const value: string = `${urlString}${player}`;

    let labelString = '';
    let spacing = 0;

    if (player === 'red' || player === 'blue') {
        labelString = `Play as ${player}: `;
        if (player === 'red') {
            spacing = 7;
        }
    }
    else {
        labelString = `Observe: `
        spacing = 27;
    }

    return (
        <div>
            <form onSubmit={(event) => handleSubmit(event, value)}>
                <label htmlFor={`playAs${player}`}>{labelString}</label>

                <input type='text'
                    id={`playAs${player}`}
                    value={value} 
                    readOnly
                    size={size}
                    style={{ marginLeft: spacing}}>
                </input>

                <button type='submit'
                    onMouseLeave={handleLeave}>
                        Copy
                </button>

                <span style={{ display: 'inline-block', width: 10}}>&nbsp;{copyStatus}</span>
            </form>
        </div>
    )

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>, value: string) {
        event.preventDefault();
        await navigator.clipboard.writeText(value);
        setCopyStatus('Copied!');
    }

    function handleLeave() {
        setCopyStatus('');
    }
}


type BottomProp = {
    name: string
}


type CopyProp = {
    name: string,
    player: string
}
