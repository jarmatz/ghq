// test page
import { stringify } from "querystring"
import { PieceType, Player, PieceTag } from "../lib/game-objects"


        function dashCount(name: string): number {
            let dashCount: number = 0;
            // iterate through characters
            for (let i=0; i < name.length; i++) {
                if (name.charAt(i) === '-') {
                    dashCount++;
                }
            }
            return dashCount;
        }


        // takes a name format (player-tag-type) and returns the player
        function parsePlayer(name: string): Player {
            // first case two dashes, we have a player string
            if (dashCount(name) === 2) {
                // iterate through the characters
                for (let i = 0; i < name.length; i++) {
                    if (name.charAt(i) === '-')
                    {
                        return name.slice(0, i) as Player;
                    }
                }
            }
            // if we got here, one or zero dashes, no name
            return '' as Player;
        }
    
        function parseTag(name: string): PieceTag {
            let firstDash: number = 0;
            // iterate through the characters
            for (let i = 0; i < name.length; i++) {
                // did we hit a dash?
                if (name.charAt(i) === '-') {
                    // is it the first string?
                    if (dashCount(name) === 1) {
                        return name.slice(0, i) as PieceTag;
                    }
                    else if (firstDash === 0) {
                        firstDash = i;
                    }
                    else {
                        return name.slice(firstDash + 1, i) as PieceTag;
                    }
                }
            
            }
            // if we got here, we have a problem
            return "" as PieceTag;
        }
    
        function parseType(name: string): PieceType {
            let firstDash: number = 0;
            // iterate through the characters
            for (let i = 0; i < name.length; i++) {
                // did we hit a dash?
                if (name.charAt(i) === '-') {
                    // did we only input two strings
                    if (dashCount(name) === 1) {
                        return name.slice(i + 1) as PieceType;
                    }
                    else if (firstDash === 0) {
                        firstDash = i;
                    }
                    else {
                        return name.slice(i +1) as PieceType;
                    }
                }
            }
            // if we got here, we have a problem
            return "" as PieceType;
        }


const name: string = 'red-standard-infantry';
const player = parsePlayer(name);
const tag = parseTag(name);
const type = parseType(name);


export default function Home() {
      return (
        <>
        <p>player = .{player}.</p>
        <p>tag = .{tag}.</p>
        <p>type = .{type}.</p>
        </>
    )
}