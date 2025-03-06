import { immerable } from 'immer';
import { Piece } from './game-objects';

// ui lets us know if it's active and stores an array of potential moves by the squares string ID
export class UI {

    [immerable] = true;
    public isActive: boolean;
    public activePiece: Piece | null;
    public potentialMoves: string[];

    constructor() {
        this.isActive = false;
        this.potentialMoves = [];
        this.activePiece = null;
    }
}