import { lang as rootLang } from "next/root-params";

import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { defaultLocale, getDictionary, isLocale } from "@/i18n";
import { routes } from "@/lib/routes";

/** Localized 404, rendered inside the [lang] layout for notFound() and unknown paths. */
export default async function NotFound() {
  const value = await rootLang();
  const lang = isLocale(value) ? value : defaultLocale;
  const dict = getDictionary(lang);

  return (
    <Container size="content" className="py-28 sm:py-40">
      <Eyebrow>404</Eyebrow>
      <h1 className="mt-6 font-display text-h1">{dict.notFound.title}</h1>
      <p className="mt-4 text-lead text-muted-foreground">
        {dict.notFound.description}
      </p>
      <ButtonLink href={routes.work(lang)} className="mt-10">
        {dict.notFound.backHome}
      </ButtonLink>
    </Container>
  );
}
