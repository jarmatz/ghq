import Footer from '../components/footer-component'

export default function Page() {
    return (
        <div className="content">
            <h1>Let's talk some rules arcana:</h1>
            <p>(For the nerds already intimately familiar with the game)</p>
            <br></br>
            <p>
                Vonnegut's notes leave some room for interpretation of the rules. Most notably,
                the procedures surrounding the sequencing of engagements.
            </p>
            <br></br>
            <p>
                Without getting too in the weeds, this game engine doesn't care about the order
                that units have moved in order to arrive a particular board state, only what the
                current board state is (with one small, but significant exception, detailed below).
            </p>
            <br></br>
            <p>
                That is, engagements are freshly calculated every time an infantry unit is moved, placed, or captured, in a way that always maximizes
                the number of engagements.
            </p>
            <br></br>
            <p>
                As a consequence, the game prevents you from moving an infantry unit into a square where it would be
                "double engaged" and the engine would have to either make an arbitrary choice of which unit to engage, or
                otherwise hold the unit in some kind of Schroedinger's engagement, so to say.
            </p>
            <br></br>
            <p>
                This rule isn't in Geoff's rulebook, but it's suggested by Vonnegut himself in his notes, and I think
                it pairs elegantly with the rule that prevents infantry from entering bombarded squares: you can't willfully
                move into squares that would result in the unit's capture at the start of the opponent's turn.
            </p>
            <br></br>
            <p>
                As for the one exception mentioned above... the engine privileges the infantry unit that has just been moved,
                always engaging it LAST in the engagement algorithm, so that it is free to make a capture if one is
                possible. If it can make an infantry capture, it is precisely because it has put an enemy unit into the
                "Shcroedinger's engagement" mentioned above. This allows the engine to resolve the arbitrary choice in a way
                that always benefits the moving unit, freeing it to make the capture.
            </p>
            <br></br>
            <p>
                For further information see <a href='https://boardgamegeek.com/thread/3422335/capture-and-engagement'>this discussion</a> on BoardGameGeek. And to discuss further, reach out to me via feedback below!
            </p>
            <Footer />
        </div>
    )
}