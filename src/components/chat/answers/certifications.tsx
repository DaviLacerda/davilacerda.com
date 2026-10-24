import { Piece } from "@/components/chat/piece";
import { BrandLogo, LogoTile } from "@/components/ui/logo";
import { TextLink } from "@/components/ui/text-link";
import { getCertifications } from "@/content/profile";
import { getDictionary, t, type Locale } from "@/i18n";
import { formatPartialDate, toIsoDate } from "@/i18n/format";
import { isLogoId } from "@/lib/logos";

import { BlockTitle, Panel } from "./parts";

/**
 * Certifications: the count, oversized ("2×"), then each Microsoft Expert
 * credential as its own panel with the Azure mark large, the way a badge is
 * shown; the courses follow as a short row with their schools' logos.
 */
export function CertificationsAnswer({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const a = dict.chat.answers.certifications;
  const labels = dict.work.labels;
  const home = dict.chat.home;
  const credentials = getCertifications("certification");
  const experts = credentials.filter((cert) => cert.level === "Expert");
  const courses = getCertifications("course");

  return (
    <>
      {experts.length ? (
        <Piece i={2} className="mt-8 flex flex-wrap items-end gap-x-8 gap-y-3">
          <p className="text-figure font-semibold" aria-hidden="true">
            {experts.length}×
          </p>
          <p className="pb-1 sm:pb-3">
            <span className="sr-only">{experts.length}× </span>
            <span className="block text-heading font-semibold">
              {home.expertsTitle}
            </span>
            <span className="block text-muted-foreground">
              {home.expertsDetail}
            </span>
          </p>
        </Piece>
      ) : null}

      <ul
        aria-label={a.credentials}
        className="mt-10 grid gap-3 sm:grid-cols-2 sm:gap-4"
      >
        {credentials.map((cert, index) => {
          const name = t(cert.name, lang);
          // "Microsoft Certified: Multi-Agent AI Solutions Expert": the
          // credential's own name is the title, the program goes under it.
          const [program, title] = name.includes(": ")
            ? (name.split(/: (.*)/s) as [string, string])
            : [cert.issuer, name];
          return (
            <Piece as="li" key={cert.id} i={3 + index}>
              <Panel
                as="article"
                className="flex h-full min-h-[17rem] flex-col justify-between gap-12"
              >
                <div className="flex items-start justify-between gap-4">
                  {cert.logo && isLogoId(cert.logo) ? (
                    <BrandLogo id={cert.logo} className="size-14 sm:size-16" />
                  ) : (
                    <LogoTile logo={cert.logo} name={cert.issuer} size="xl" />
                  )}
                  {cert.date ? (
                    <time
                      dateTime={toIsoDate(cert.date)}
                      className="text-small text-muted-foreground"
                    >
                      {formatPartialDate(cert.date, lang)}
                    </time>
                  ) : null}
                </div>
                <div>
                  <h2 className="text-[clamp(1.5rem,1.3rem+0.8vw,2rem)] leading-[1.1] tracking-[-0.03em]">
                    {title}
                  </h2>
                  <p className="mt-2 text-small text-muted-foreground">
                    {[
                      program,
                      cert.level === "Expert" ? labels.expertLevel : cert.level,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {cert.credentialUrl ? (
                    <TextLink
                      href={cert.credentialUrl}
                      newTabLabel={dict.a11y.opensInNewTab}
                      className="mt-3 text-small"
                    >
                      {labels.viewCredential}
                    </TextLink>
                  ) : null}
                </div>
              </Panel>
            </Piece>
          );
        })}
      </ul>

      {courses.length ? (
        <Piece
          i={3 + credentials.length}
          as="section"
          className="mt-14"
          aria-labelledby="courses-title"
        >
          <BlockTitle id="courses-title">{a.courses}</BlockTitle>
          <ul className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-3">
            {courses.map((course) => (
              <li key={course.id} className="flex items-start gap-4">
                <LogoTile logo={course.logo} name={course.issuer} size="lg" />
                <span className="min-w-0">
                  <span className="block font-medium">
                    {t(course.name, lang)}
                  </span>
                  <span className="block text-small text-muted-foreground">
                    {course.issuer}
                    {course.date
                      ? `, ${formatPartialDate(course.date, lang)}`
                      : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Piece>
      ) : null}
    </>
  );
}
