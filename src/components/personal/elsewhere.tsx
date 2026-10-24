import { Reveal } from "@/components/motion/reveal";
import { profile } from "@/content/profile";
import { getDictionary, type Locale } from "@/i18n";
import { isExternalUrl } from "@/lib/utils";

/**
 * Where to find Davi online: the network with its handle, and a line on what
 * is there. Sits on a surface panel, so a row takes the page colour on hover.
 */
export function Elsewhere({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const notes = dict.personal.sections.elsewhere.notes;

  return (
    <Reveal
      as="ul"
      stagger
      className="-mx-4 mt-6 grid gap-x-2 sm:-mx-5 lg:grid-cols-2"
    >
      {profile.socials.map((social) => {
        const external = isExternalUrl(social.url);
        return (
          <li key={social.id}>
            <a
              href={social.url}
              {...(external
                ? { target: "_blank", rel: "me noopener noreferrer" }
                : {})}
              className="group block h-full rounded-xl px-4 py-4 transition-colors duration-150 ease-out hover:bg-background sm:px-5"
            >
              <span className="flex flex-wrap items-baseline justify-between gap-x-4">
                <span className="text-lead font-medium">
                  {dict.socials[social.id]}
                  {external ? (
                    <span className="sr-only">
                      {" "}
                      ({dict.a11y.opensInNewTab})
                    </span>
                  ) : null}
                </span>
                <span className="text-small break-all text-muted-foreground transition-colors duration-150 group-hover:text-foreground">
                  {social.handle}
                </span>
              </span>
              <span className="mt-0.5 block text-muted-foreground">
                {notes[social.id]}
              </span>
            </a>
          </li>
        );
      })}
    </Reveal>
  );
}
