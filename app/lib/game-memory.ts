import { Game } from '@/app/lib/game-objects';
import { instanceToPlain } from 'class-transformer';

// this class holds a certain # of live games in server memory for quick access
// it's a wrapper on a map that actually holds the games, with the keys being lobby names values being the game data
// the wrapper manages the size of the map, limiting it to maxsize
export class GameMemory {


    public readonly maxSize: number = 100;
    public map: Map<string, Game> = new Map();
    // an array that stores our keys in order so we can do FIFO:
    public keys: string[] = [];

    public set(key: string, value: Game) {
        if (this.map.size >= this.maxSize) {
            // FIFO
            const firstKey: string = this.keys.shift()!;
            this.map.delete(firstKey);
        }
            this.keys.push(key);
            return this.map.set(key, value);
    }

    public get(key: string): Game | undefined {
        return this.map.get(key);
    }

    public has(key: string): boolean {
        return this.map.has(key);
    }

    // clear (removes all entries)
    public clear() {
        this.map.clear();
        this.keys = [];
    }

    // validate (check that the size of keys is the same as map)
    public validate(): boolean {
        if (this.map.size !== this.keys.length) {
            return false;
        }
        else if (this.map.size > this.maxSize || this.keys.length > this.maxSize) {
            return false;
        }
        else {
            return true;
        }
    }
}