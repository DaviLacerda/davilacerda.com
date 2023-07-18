import { Icon, Icons } from "@/components/icons";
import { siteConfig } from "@/config/site";
import { getDictionary } from "@/i18n/get-dictionary";
import { Locale } from "@/i18n/i18n-config";
import Link from "next/link";

type Props = {
    params: {
        lang: Locale;
    };
};

type SocialLink = {
    icon: Icon;
    href: string;
    title: string;
};

type Project = {
    title: string;
    description: string;
    url: string;
};

function SocialLink({ icon, href, title }: SocialLink) {
    const Icon = Icons[icon];

    return (
        <Link
            href={href}
            className="flex items-center space-x-2 group"
            target="_blank"
            rel="noopener noreferrer"
        >
            <Icon className="w-6 h-6 group-hover:text-brand-700 transition-all" />
            <span className="text-foreground/75 group-hover:text-brand-700 transition-all">
                {title}
            </span>
        </Link>
    );
}

function Project({ title, description, url }: Project) {
    return (
        <Link
            key={title}
            href={url}
            className="border bg-muted/50 border rounded p-4 transition-all hover:border-brand"
        >
            <h3 className="underline underline-offset-4 font-semibold">
                {title}
            </h3>
            <p className="text-muted-foreground/75">{description}</p>
        </Link>
    );
}

export default async function Home({ params }: Props) {
    const { lang } = params;
    const dictionary = (await getDictionary(lang)).home;

    return (
        <div className="container flex flex-col space-y-6 divide-y">
            <div className="space-y-2 pt-6">
                <h2 className="sm:text-lg font-bold">
                    {dictionary.about.title}
                </h2>
                <p className="text-muted-foreground/75">
                    {dictionary.about.description}
                </p>
            </div>
            <div className="space-y-2 pt-6">
                <h2 className="sm:text-lg font-bold">
                    {dictionary.projects.title}
                </h2>
                <p className="text-muted-foreground/75">
                    {dictionary.projects.description}
                </p>
                <div className="flex flex-col space-y-4">
                    {dictionary.projects.content.map((project) => (
                        <Project
                            key={project.title}
                            title={project.title}
                            description={project.description}
                            url={project.url}
                        />
                    ))}
                </div>
            </div>
            <div className="space-y-2 pt-6">
                <h2 className="sm:text-lg font-bold">
                    {dictionary.links.title}
                </h2>
                <p className="text-muted-foreground/75">
                    {dictionary.links.description}
                </p>
                <div className="flex flex-col gap-2">
                    <SocialLink
                        icon="Github"
                        href={siteConfig.links.github}
                        title="Github"
                    />
                    <SocialLink
                        icon="Linkedin"
                        href={siteConfig.links.linkedin}
                        title="LinkedIn"
                    />
                    <SocialLink
                        icon="Instagram"
                        href={siteConfig.links.instagram}
                        title="Instagram"
                    />
                    <SocialLink
                        icon="Email"
                        href={siteConfig.links.email}
                        title="E-mail"
                    />
                </div>
            </div>
        </div>
    );
}
