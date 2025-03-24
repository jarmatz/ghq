import { Game } from '@/app/lib/game-objects';

// this class holds a certain # of live games in server memory, cached for quick access
// it's a wrapper on a map that actually holds the games, with the keys being lobby names and values being the game data
// the wrapper manages the size of the map, limiting it to maxsize, ejecting entries based on the one with the oldest update
export class GameCache {

    public readonly maxSize: number = 1000;
    public map: Map<string, Game> = new Map();
    // an array that stores our keys in order so we can see least recently updated
    public keys: string[] = [];

    public set(key: string, value: Game) {
        // set the value and store the result so we can return it like the map.set function
        const result = this.map.set(key, value);
        // filter out any matching keys in the array (should be 1 max), in case we're updating an existing cache
        this.keys = this.keys.filter(entry => entry !== key );
        // put this key at the end of the array (most recently updated)
        this.keys.push(key);
        // now we check for size issues
        if (this.map.size > this.maxSize) {
            const firstKey: string = this.keys.shift()!;
            this.map.delete(firstKey);
        }
        return result;
    }

    public get(key: string): Game | undefined {
        // a get call should update the keys array order, but only if the entry exists
        if (this.map.has(key)) {
            // remove the existing entry and replace it
            this.keys = this.keys.filter(entry => entry !== key);
            this.keys.push(key);
        }
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
            console.log('gamecache map size does not match key size')
            return false;
        }
        else if (this.map.size > this.maxSize || this.keys.length > this.maxSize) {
            console.log('gamecache is larger than maxSize')
            return false;
        }
        for (let key of this.keys) {
            if (!this.map.has(key)) {
                console.log('in gamecache there is a map entry without matching key entry')
                return false;
            }
        }     
        return true;
    }
}

// we're going to use a singleton pattern to prevent hot reloading issues
declare global {
    var gameCache: GameCache | undefined;
}

// ?? the nullish operator means "if the value to the left is undefined, use the value to the right"
const gameCache = globalThis.gameCache ?? new GameCache();
if (process.env.NODE_ENV !== 'production') {
    globalThis.gameCache = gameCache;
}

export default gameCache;