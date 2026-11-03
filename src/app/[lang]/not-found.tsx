import { lang as rootLang } from "next/root-params";

import { unplugged } from "@/components/error/art";
import { ErrorScreen } from "@/components/error/error-screen";
import { errorLabels } from "@/components/error/labels";
import { defaultLocale, isLocale } from "@/i18n";

/**
 * Localized 404, rendered inside the [lang] layout for notFound() and unknown
 * paths: only the status code and an ASCII art (a pulled-out plug). Next sends
 * it with status 404 and `noindex`; the header and footer stay, so the way
 * back is one tap away.
 */
export default async function NotFound() {
  const value = await rootLang();
  const lang = isLocale(value) ? value : defaultLocale;

  return (
    <ErrorScreen
      status={404}
      label={errorLabels[lang].notFound}
      art={unplugged}
    />
  );
}
