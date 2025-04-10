import { Square, Session, UI } from "./game-objects";

export class Render {

    square: Square;
    session: Session;
    
    constructor (square: Square, session: Session) {
        this.square = square;
        this.session = session;
    }

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

    getBackgroundEffect(): string {
        let backgroundEffect: string = '';
        const session: Session = this.session;
        const square: Square = this.square;
        // standard render
        if (session.ui.logRender === null) {
            if (square.piece && square.piece?.getID() === session.ui.activePiece?.getID()) {
                backgroundEffect += 'activeSquare ';
            }
            
        }
        // log render
        else if (session.ui.logRender !== null) {
            let entry: number = session.ui.logRender;
            if (session.game.log[entry].activeIDs.includes(square.getID())) {
                backgroundEffect += 'activeSquare';
            }
        }
        // both renders do bombardment in the same way
        if (square.bombardment !== '') {
            backgroundEffect = 'bombardment';
            backgroundEffect += (square.bombardment + ' ');
        }
        return backgroundEffect;
    }

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