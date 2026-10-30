import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";

import { Piece } from "@/components/chat/piece";
import { profile } from "@/content/profile";
import { t, type Locale } from "@/i18n";

/**
 * FAQ: the questions recruiters ask, each a disclosure set in large type;
 * the answer opens under it (native <details>, so the text is in the HTML
 * for search and answer engines; the FAQPage JSON-LD carries the same).
 */
export function FaqAnswer({ lang }: { lang: Locale }) {
  return (
    <ul className="-mx-4 mt-8 sm:-mx-5">
      {profile.faq.map((item, index) => (
        <Piece as="li" key={item.id} i={2 + index}>
          <details id={item.id} className="disclosure group scroll-mt-8">
            <summary className="flex items-center justify-between gap-6 rounded-surface px-4 py-4 transition-colors duration-200 ease-out hover:bg-surface sm:px-5">
              <h2 className="text-lead font-medium tracking-tight">
                {t(item.question, lang)}
              </h2>
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface transition-colors duration-200 ease-out group-hover:bg-background">
                <CaretDownIcon
                  data-caret=""
                  aria-hidden="true"
                  className="size-4"
                />
              </span>
            </summary>
            <p className="max-w-[62ch] px-4 pt-1 pb-6 sm:px-5">
              {t(item.answer, lang)}
            </p>
          </details>
        </Piece>
      ))}
    </ul>
  );
}
