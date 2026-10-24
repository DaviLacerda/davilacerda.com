import { lang as rootLang } from "next/root-params";
import type { CSSProperties } from "react";

import { Composer } from "@/components/chat/composer";
import { Container } from "@/components/ui/container";
import { TextLink } from "@/components/ui/text-link";
import { profile } from "@/content/profile";
import { defaultLocale, getDictionary, isLocale } from "@/i18n";
import { routes } from "@/lib/routes";
import { composerStrings, composerTopics } from "@/lib/work/answers";

/**
 * Localized 404, rendered inside the [lang] layout for notFound() and unknown
 * paths. Instead of a dead end it offers the Work assistant: most broken links
 * point at something one of its answers covers.
 */
export default async function NotFound() {
  const value = await rootLang();
  const lang = isLocale(value) ? value : defaultLocale;
  const dict = getDictionary(lang);
  const [before, after = ""] = dict.notFound.description.split("{link}");

  return (
    <Container className="pt-10 sm:pt-20">
      <h1
        data-enter=""
        style={{ "--i": 0 } as CSSProperties}
        className="text-title"
      >
        {dict.notFound.title}
      </h1>
      <p
        data-enter=""
        style={{ "--i": 1 } as CSSProperties}
        className="mt-5 max-w-[48ch] text-lead text-muted-foreground"
      >
        {before}
        <TextLink href={routes.work(lang)} className="text-foreground">
          {dict.notFound.backHome}
        </TextLink>
        {after}
      </p>
      <Composer
        className="mt-10 sm:mt-12"
        action={routes.ask(lang)}
        topics={composerTopics(lang)}
        strings={composerStrings(lang)}
        email={profile.email}
        enterFrom={2}
      />
    </Container>
  );
}
