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
                Without getting too in the weeds, the difficulty arises in situations where there are two or more
                possible configurations that maximize the number of engagements, and the engine has to arbitrarily choose one of them.
            </p>
            <br></br>
            <p>
                Right now, the engine has been refactored from how it worked when it was first launched. Now, activating a piece
                by clicking on it will free it from engagement if there exists an alternate configuration that maintains
                the maximum number of engagements. This will allow the piece to move freely without zone of control rules enforced.
            </p>
            <br></br>
            <Footer />
        </div>
    )
}