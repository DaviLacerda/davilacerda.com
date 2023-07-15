import Image from "next/image";
import Link from "next/link";
import { LocaleToggle } from "./locale-toggle";
import { ModeToggle } from "./mode-toggle";

interface HeaderProps {
    lang: string;
}

export function Header({ lang }: HeaderProps) {
    return (
        <header className="container">
            <div className="border-b py-4 flex justify-between items-center">
                <Link href="/">
                    <Image
                        src="/images/logo.png"
                        alt="Logo"
                        width={48}
                        height={48}
                    />
                </Link>
                <div className="space-x-4">
                    <LocaleToggle lang={lang} />
                    <ModeToggle lang={lang} />
                </div>
            </div>
        </header>
    );
}
