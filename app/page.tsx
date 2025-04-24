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
      <div style={{transform: 'translate(190px)'}}>
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
        GHQ is a "lost" board game designed by legendary author Kurt Vonnegut
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
        You may also find the game's <a href='https://s3.amazonaws.com/geekdo-files.com/bgg397937?response-content-disposition=inline%3B%20filename%3D%22GHQ_Rules_7x7_03_22_2024.pdf%22&response-content-type=application%2Fpdf&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAJYFNCT7FKCE4O6TA%2F20250424%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250424T185916Z&X-Amz-SignedHeaders=host&X-Amz-Expires=120&X-Amz-Signature=8dd966c02f994a016271e0de03649df8bfdd4d7e8375406acdec769d6ddc27e7' target='_blank'>
        printed rules</a> useful to consult.
      </p>
      <br></br>
      <p>
        And check out my own <a href='/ui-tutorial'>(very short) guide</a> to the game's online controls.
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
