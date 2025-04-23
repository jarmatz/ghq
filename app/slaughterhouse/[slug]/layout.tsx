import { Metadata } from 'next';

// this sets the title of the page

export async function generateMetadata(props: ParamProps): Promise<Metadata> {
    const params = await props.params;
    return {
        title: `Slaughterhouse: ${params.slug}`,
    }
}

export default function SlaughterhouseLayout({ children }: Readonly<{children: React.ReactNode;}>)  {
    return <>{children}</>
}

type ParamProps = {
    params: Promise<{
        slug: string;
    }>
}
