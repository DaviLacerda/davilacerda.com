import { SocialIcon } from "@/components/icons";
import { Container } from "@/components/ui/container";
import { profile } from "@/content/profile";
import { getDictionary, t, type Locale } from "@/i18n";
import { isExternalUrl } from "@/lib/utils";

/** Footer: name, headline + location, social links, copyright and colophon. */
export function SiteFooter({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-border">
      <Container className="flex flex-col gap-8 py-12 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="font-display text-3xl leading-none tracking-tight">
            {profile.name}
            <span className="text-accent">.</span>
          </p>
          <p className="text-sm text-muted-foreground">
            {t(profile.headline, lang)} · {t(profile.location.label, lang)}
          </p>
        </div>

        <nav aria-label={dict.a11y.socialNav}>
          <ul className="-ml-2 flex flex-wrap items-center gap-1 sm:-mr-2 sm:ml-0">
            {profile.socials.map((social) => {
              const external = isExternalUrl(social.url);
              const name = dict.socials[social.id];
              return (
                <li key={social.id}>
                  <a
                    href={social.url}
                    {...(external
                      ? { target: "_blank", rel: "me noopener noreferrer" }
                      : {})}
                    aria-label={
                      external ? `${name} (${dict.a11y.opensInNewTab})` : name
                    }
                    title={name}
                    className="inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <SocialIcon id={social.id} size={18} />
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </Container>

      <Container>
        <div className="flex flex-col gap-1 border-t border-border py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <p>
            © {year} {profile.name}. {dict.footer.rights}
          </p>
          <p>{dict.footer.colophon}</p>
        </div>
      </Container>
    </footer>
  );
}
