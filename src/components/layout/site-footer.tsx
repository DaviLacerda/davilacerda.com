import { Container } from "@/components/ui/container";
import { getSocial, profile } from "@/content/profile";
import { getDictionary, type Locale } from "@/i18n";
import { agentPaths } from "@/lib/agents/discovery";

const linkClass =
  "link-underline rounded-sm text-muted-foreground hover:text-foreground";

/**
 * One quiet line on the wide frame: copyright, three ways to reach Davi and
 * llms.txt, the entry point for agents (the rest of the machine-readable
 * layer is announced in the head and the HTTP Link header).
 */
export function SiteFooter({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const year = new Date().getFullYear();
  const github = getSocial("github");
  const linkedin = getSocial("linkedin");

  return (
    <footer className="mt-28 sm:mt-36">
      <Container
        wide
        className="flex flex-col gap-x-8 gap-y-3 pb-10 text-small sm:flex-row sm:items-baseline sm:justify-between sm:pb-14"
      >
        <p className="text-muted-foreground">
          © {year} {profile.name}
        </p>
        <nav aria-label={dict.a11y.socialNav}>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            <li>
              <a
                href={github.url}
                target="_blank"
                rel="me noopener noreferrer"
                className={linkClass}
              >
                {dict.socials.github}
                <span className="sr-only"> ({dict.a11y.opensInNewTab})</span>
              </a>
            </li>
            <li>
              <a
                href={linkedin.url}
                target="_blank"
                rel="me noopener noreferrer"
                className={linkClass}
              >
                {dict.socials.linkedin}
                <span className="sr-only"> ({dict.a11y.opensInNewTab})</span>
              </a>
            </li>
            <li>
              <a href={`mailto:${profile.email}`} className={linkClass}>
                {dict.socials.email}
              </a>
            </li>
          </ul>
        </nav>
        <p>
          <a href={agentPaths.llms} className={linkClass}>
            llms.txt
          </a>
        </p>
      </Container>
    </footer>
  );
}
