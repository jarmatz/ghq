import { BoardConfig, BoardConfigEntry } from "./game-config";
import { parseID } from './game-helpers';

export const configRegExp: RegExp = /^([rb](si|ai|ri|sa|aa|ha|sq)[0-7]{2})(,([rb](si|ai|ri|sa|aa|ha|sq)[0-7]{2}))*$/;

// custom configs
// can input abbreviated piece designations
// + row and column ID
// abbreviations use initials, except airborne = 'r' to not conflict with armored
// hq = 'q' because it's cool
// separated by commas
// rsa21,bha47, etc.etc.
export function parseConfigString(configString: string): BoardConfig {

    const boardConfig: BoardConfig = [];

    // regex that enforces well-formed string
    if (!configRegExp.test(configString)) {
        return boardConfig;
    }

    // nifty little built-in method here that splits a string by a given delimiter, discarding the delimiter
    // returns each split string as an element in an array
    const configEntries: string[] = configString.split(',');

    for (let configEntry of configEntries) {
        // slice the strings into the names and position coords
        const abbreviatedName: string = configEntry.slice(0,3);
        const positionID: string = configEntry.slice(3);

        // expand the values
        const pieceName: string = expandPieceName(abbreviatedName);
        const position = parseID(positionID);

        // build an entry for the config
        const boardConfigEntry: BoardConfigEntry = {
            name: pieceName,
            row: position.row,
            column: position.column
        }
        // add it
        boardConfig.push(boardConfigEntry);
    }
    return boardConfig;
}

// returns an empty string if it gets a poorly formed abbreviation
export function expandPieceName(abbreviatedName: string): string {

    // test that it's well-formed
    const regExp: RegExp = /^[rb](si|ai|ri|sa|aa|ha|sq)$/;
    if (!regExp.test(abbreviatedName)) {
        return '';
    }

    // player component
    let pieceName: string = '';
    if (abbreviatedName[0] === 'r') {
        pieceName += 'red-'
    }
    else if (abbreviatedName[0] === 'b') {
        pieceName += 'blue-'
    }

    // tag component
    if (abbreviatedName[1] === 's') {
        pieceName += 'standard-'
    }
    else if (abbreviatedName[1] === 'a') {
        pieceName += 'armored-'
    }
    else if (abbreviatedName[1] === 'r') {
        pieceName += 'airborne-'
    }
    else if (abbreviatedName[1] === 'h') {
        pieceName += 'heavy-'
    }

    // type component
    if (abbreviatedName[2] === 'i') {
        pieceName += 'infantry'
    }
    else if (abbreviatedName[2] === 'a') {
        pieceName += 'artillery'
    }
    else if (abbreviatedName[2] === 'q') {
        pieceName += 'hq'
    }

    return pieceName;
}