import { Square, Session, UI } from "./game-objects";
import { invertPlayer } from "./game-helpers";
import { act } from "react";

export class Render {

    square: Square;
    session: Session;
    
    constructor (square: Square, session: Session) {
        this.square = square;
        this.session = session;
    }

    // helps circle effects (transparent move circles + rotator dashed circle)
    getCircleEffect(): string {
        let circleEffect: string = '';
        const session: Session = this.session;
        const square: Square = this.square;
        // standard render
        if (session.ui.logRender === null) {
            if (session.ui.potentialMoves.includes(square.getID())) {
                circleEffect += 'circle ';
            }
            if (square.piece && square.piece.getID() === session.ui.activePiece?.getID() && square.piece.type === 'artillery') {
                circleEffect += 'rotatorEffect pulse ';
            }
        }
        // no log renders for circle effect
        return circleEffect;
    }

    // helps render background effects such as bombardment or active square brightening
    getBackgroundEffect(): string {
        let backgroundEffect: string = '';
        let activeFlag: boolean = false;
        const session: Session = this.session;
        const square: Square = this.square;
        // standard render
        if (session.ui.logRender === null) {
            if (square.piece && square.piece?.getID() === session.ui.activePiece?.getID()) {
                backgroundEffect += 'activeSquare ';
                activeFlag = true;
            }
            
        }
        // log render
        else if (session.ui.logRender !== null) {
            let entry: number = session.ui.logRender;
            if (session.game.log[entry].activeIDs.includes(square.getID())) {
                backgroundEffect += 'activeSquare ';
                activeFlag = true;
            }
        }
        // both renders do bombardment in the same way
        if (square.bombardment !== '') {
            backgroundEffect += 'bombardment';
            backgroundEffect += square.bombardment;
            if (activeFlag) {
                backgroundEffect += 'light';
            }
            backgroundEffect += ' ';
        }
        return backgroundEffect;
    }

    // returns a true or false used to render crosshairs
    getCrosshairsBool(): boolean {
        const session: Session = this.session;
        const square: Square = this.square;
        // standard render
        if (session.ui.logRender === null) {
            if (session.ui.potentialCaptures.includes(square.getID()) || session.ui.upkeepCaptures.includes(square.getID())) {
                return true;
            }
        }
        // log render
        else if (session.ui.logRender !== null) {
            let entry: number = session.ui.logRender;
            if (session.game.log[entry].captureIDs.includes(square.getID())) {
                return true;
            }
        }
        return false;
    }

    getLockBool(): boolean {
        const session: Session = this.session;
        const square: Square = this.square;
        // standard render
        if (session.ui.logRender === null) {
            if (square.piece?.depleted || square.piece?.player === invertPlayer(session.game.activePlayer)) {
                return true;
            }
        }
        // for now we won't be rendering locks on the log snapshots
        return false;
    }
}

export function deactivateUI(ui: UI) : UI {
    ui.activePiece = null;
    ui.activeReserve = null;
    ui.potentialMoves = [];
    ui.potentialCaptures = [];
    ui.upkeepCaptures = [];
    ui.rotationMemory = 0;
    ui.preAction = null;
    return ui;
}

export function isAlphaNum(input: string): boolean {
    const regExp: RegExp = /^[a-zA-Z0-9]+$/;
    return regExp.test(input);
}