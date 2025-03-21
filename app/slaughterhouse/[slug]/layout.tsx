import { Metadata } from 'next';

// this sets the title of the page

export function generateMetadata({ params }: ParamProps): Metadata {
    return {
        title: `Slaughterhouse: ${params.slug}`,
    }
}

export default function SlaughterhouseLayout({ children }: Readonly<{children: React.ReactNode;}>)  {
    return <>{children}</>
}

type ParamProps = {
    params: {
        slug: string;
    }
}
