import { lang as rootLang } from "next/root-params";
import Link from "next/link";
import type { CSSProperties } from "react";

import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { defaultLocale, getDictionary, isLocale } from "@/i18n";
import { routes } from "@/lib/routes";
import { composerTopics } from "@/lib/work/answers";

/**
 * Localized 404, rendered inside the [lang] layout for notFound() and unknown
 * paths: the title, one line, the way back and the Work answers as links
 * (most broken links point at something one of them covers).
 */
export default async function NotFound() {
  const value = await rootLang();
  const lang = isLocale(value) ? value : defaultLocale;
  const dict = getDictionary(lang);
  const enter = (i: number) => ({
    "data-enter": "",
    style: { "--i": i } as CSSProperties,
  });

  return (
    <Container className="pt-12 sm:pt-24">
      <h1 {...enter(0)} className="text-hero text-display">
        {dict.notFound.title}
      </h1>
      <p
        {...enter(1)}
        className="mt-5 max-w-[40ch] text-lead text-muted-foreground"
      >
        {dict.notFound.description}
      </p>
      <div {...enter(2)} className="mt-10">
        <ButtonLink href={routes.work(lang)} size="lg">
          {dict.notFound.backHome}
        </ButtonLink>
      </div>
      <nav aria-labelledby="nf-topics" className="mt-16">
        <h2
          {...enter(3)}
          id="nf-topics"
          className="text-small text-muted-foreground"
        >
          {dict.notFound.topics}
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {composerTopics(lang).map((topic, index) => (
            <li key={topic.id} {...enter(4 + index)}>
              <Link
                href={topic.href}
                className="inline-flex h-10 pressable items-center rounded-full bg-surface px-4 text-small font-medium hover:bg-surface-strong"
              >
                {topic.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </Container>
  );
}
