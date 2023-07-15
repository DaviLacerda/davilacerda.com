"use client";

import { Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { i18n } from "@/i18n/i18n-config";
import Link from "next/link";

interface LocaleToggleProps {
    lang: string;
}

function uppercaseFirstLetter(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function LocaleToggle({ lang }: LocaleToggleProps) {
    const locales = i18n.locales;
    const displayNames = new Intl.DisplayNames([lang], { type: "language" });

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                    <Languages className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />
                    <span className="sr-only">Toggle locale</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {locales.map((locale) => (
                    <Link href={`/${locale}`} key={locale} locale={locale}>
                        <DropdownMenuItem key={locale}>
                            {uppercaseFirstLetter(displayNames.of(locale)!)}
                        </DropdownMenuItem>
                    </Link>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
