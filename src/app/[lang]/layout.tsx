import { Header } from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";
import { siteConfig } from "@/config/site";
import { Locale } from "@/i18n/i18n-config";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../../styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

type Props = {
    params: {
        lang: Locale;
    };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const description = siteConfig.description[params.lang];

    return {
        metadataBase: new URL(siteConfig.url),
        title: {
            default: siteConfig.name,
            template: `%s | ${siteConfig.name}`,
        },
        description,
        keywords: [
            "Next.js",
            "TypeScript",
            "React",
            "i18n",
            "Tailwind CSS",
            "shadcn/ui",
            "UFU",
            "Universidade Federal de Uberlândia",
            "Front-end",
            "Front End",
            "Developer",
            "Desenvolvedor",
            "Uberlândia",
        ],
        authors: [
            {
                name: "Davi Lacerda",
                url: siteConfig.url,
            },
        ],
        creator: "Davi Lacerda",
        themeColor: [
            { media: "(prefers-color-scheme: light)", color: "white" },
            { media: "(prefers-color-scheme: dark)", color: "black" },
        ],
        openGraph: {
            type: "website",
            locale: params.lang,
            url: siteConfig.url,
            title: siteConfig.name,
            description,
            siteName: siteConfig.name,
            images: [
                {
                    url: siteConfig.ogImage,
                    width: 1200,
                    height: 630,
                    alt: siteConfig.name,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title: siteConfig.name,
            description,
            images: [siteConfig.ogImage],
            creator: "@davi16lacerda",
        },
        icons: {
            icon: "/favicon.ico",
            shortcut: "/favicon-16x16.png",
            apple: "/apple-touch-icon.png",
        },
    };
}

export default function RootLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Props["params"];
}) {
    const { lang } = params;

    return (
        <html lang={lang}>
            <body
                className={cn(
                    "relative min-h-screen flex flex-col gap-4",
                    inter.className
                )}
            >
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                >
                    <Header lang={lang} />
                    <div className="flex-1">{children}</div>
                </ThemeProvider>
            </body>
        </html>
    );
}
