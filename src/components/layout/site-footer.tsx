import { Container } from "@/components/ui/container";
import { getSocial, profile } from "@/content/profile";
import { getDictionary, type Locale } from "@/i18n";
import { agentPaths } from "@/lib/agents/discovery";

const linkClass =
  "link-underline rounded-sm text-muted-foreground hover:text-foreground";

/**
 * One quiet line on the page column: copyright, three ways to reach Davi and
 * the agent-readable entry points (llms.txt, the MCP server).
 */
export function SiteFooter({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const year = new Date().getFullYear();
  const github = getSocial("github");
  const linkedin = getSocial("linkedin");

  return (
    <footer className="mt-28 sm:mt-36">
      <Container className="flex flex-col gap-x-8 gap-y-3 pb-10 text-small sm:flex-row sm:items-baseline sm:justify-between sm:pb-14">
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
        <p className="text-muted-foreground">
          {dict.footer.forAgents}:{" "}
          <a href={agentPaths.llms} className={linkClass}>
            llms.txt
          </a>
          ,{" "}
          <a href={agentPaths.mcpServerCard} className={linkClass}>
            MCP
          </a>
        </p>
      </Container>
    </footer>
  );
}
