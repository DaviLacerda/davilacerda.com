import Image from "next/image";
import { LocaleToggle } from "./locale-toggle";
import { ModeToggle } from "./mode-toggle";

interface HeaderProps {
    lang: string;
}

export function Header({ lang }: HeaderProps) {
    return (
        <header className="max-w-screen-lg container border-b border-muted-foreground/50 py-4 flex justify-between items-center">
            <Image src="/images/logo.png" alt="Logo" width={48} height={48} />
            <div className="space-x-4">
                <LocaleToggle lang={lang} />
                <ModeToggle />
            </div>
        </header>
    );
}
