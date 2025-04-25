import Image from "next/image";
import Footer from "../components/footer-component";

export default function Page() {
    return (
        <div className="content">
            <h1>About:</h1>
            <div className="centered">
            <Image src='/butthole.webp' alt='bultthole' width='140' height='140' />
            </div>
            <p>
                This project is created and maintained by <a href='mailto:jargru@gmail.com'>Jared Matzecki</a>. Hi!
                I'm a screenwriter by trade and a (relatively new) hobbyist programmer.
                I made this as my final project for Harvard's online <a href='https://cs50.harvard.edu/x/2025/' target='_blank'>CS50 course.</a>
            </p>
            <Footer />
        </div>
    )
}