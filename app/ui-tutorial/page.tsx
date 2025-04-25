import Image from 'next/image';
import Footer from '../components/footer-component';

export default function Home() {
    return (
      <div className='content'>
        <h1>
          Here's a quick overview of the controls:
        </h1>
        <br></br>
          <div>
          <h3>Click on a piece to activate it and see available moves. Click again to move.
            Pieces that have already moved show a "lock" icon:
          </h3>
          <Image src='/gifs/simple-move.gif' alt='simple-move' width='120' height='120' className='gif' />

          <h3>When an artillery is activated, you may rotate it by moving your mouse around the dotted circle.
            Click to set rotation. Don't forget that you get a free rotation after you move:
          </h3>
          <Image src='/gifs/artillery-move-rotate.gif' alt='artillery-move-rotate' width='120' height='120' className='gif'/>
          
          <h3>Infantry will automatically engage with each other when possible:</h3>
          <Image src='/gifs/engagement.gif' alt='engagement' width='120' height='120' className='gif'/>
          
          <h3>If an infantry can capture one or more infantry units, crosshairs will appear.
            Click on one to execute the capture:
          </h3>
          <Image src='/gifs/infantry-capture.gif' alt='infantry-capture' width='120' height='120' className='gif'/>

          <h3>Mousing over the End Turn button displays crosshairs on all friendly units that will be captured at the start of your opponent's turn:
          </h3>
          <Image src='/gifs/upkeep-captures.gif' alt='upkeep-captures' width='162' height='120' className='gif'/>

          <h3 style={{marginTop: 10}}><a href='/'>Return Home</a></h3>
        </div>
        <Footer />
      </div>
    );
  }
  