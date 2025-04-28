import Image from "next/image";
import Footer from "./components/footer-component";

export default function Home() {
  return (
    <div className='content'>
      <h1>
        Welcome to the GHQ Beta Test
      </h1>
      <p>
        (This will look prettier eventually.)
      </p>
      <br></br>
      <div className='centered'>
        <Image src='/butthole.webp' alt='bultthole' width='140' height='140' />
      </div>
      <br></br>
      <h1>
        <a href='/play'>START PLAYING</a>
      </h1>
      <p>
        No sign-up required. But you'll need a friend.*
      </p>
      <br></br>
      <h2>
        What is this?
      </h2>
      <p>
        General Headquarters is a "lost" board game designed by legendary author Kurt Vonnegut
        and adapted for modern play by Geoff Engelstein.
      </p>
      <br></br>
      <p>
        For more information on the game's adaptation, see this <a href='https://gametek.substack.com/p/and-so-it-goes' target="_blank">excellent post</a> from Geoff.
        And please support his work by <a href='https://www.kvmlshop.org/product/kurt-vonnegut-the-lost-board-game-ghq/877' target="_blank">purchasing a physical copy.</a> It's really great! I have one!
      </p>
      <br></br>
      <p>
        This is a fully-functional online adaptaton of the game, accurate to <a href='/rules'>my best interpretation</a> of the rules in Vonnegut's notes.
      </p>
      <br></br>
      <h2>
        How To Play:
      </h2>
      <p>
        Geoff has produced an <a href='https://www.youtube.com/watch?v=zfXPIhvFPjw' target='_blank'>excellent video</a> outlining the game's rules.
      </p>
      <br></br>
      <p>
        You may also find the game's <a href='https://boardgamegeek.com/filepage/285688/ghq-rules' target='_blank'>
        printed rules</a> useful to consult.
      </p>
      <br></br>
      <p>
        And check out my own <a href='/ui-tutorial'>(very short) guide</a> to the game's online controls.
      </p>
      <br></br>
      <p>
        Unfortunately, mobile is not currently supported.
      </p>
      <br></br>
      <br></br>
      <p style={{fontSize: '.8em'}}>
        *Friend not included.
      </p>
      <Footer />
    </div>
  );
}
