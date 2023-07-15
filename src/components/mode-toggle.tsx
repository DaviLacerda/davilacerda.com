"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Locale } from "@/i18n/i18n-config";

interface ModeToggleProps {
    lang: Locale;
}

const modesDisplayNames = {
    "en": {
        "light": "Light",
        "dark": "Dark",
        "system": "System",
    },
    "pt-br": {
        "light": "Claro",
        "dark": "Escuro",
        "system": "Sistema",
    }
};

export function ModeToggle({ lang }: ModeToggleProps) {
    const { setTheme } = useTheme();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                    {modesDisplayNames[lang]["light"]}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                    {modesDisplayNames[lang]["dark"]}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                    {modesDisplayNames[lang]["system"]}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
