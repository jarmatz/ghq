import { Piece, Game } from '../lib/game-objects';

const game = new(Game);

export default function Home() {

    game.board[0][0].piece = new Piece('hq', 'red');

    console.log(game.board);
}