import { BadgeCheck } from "lucide-react";

import { Tag } from "@/components/ui/tag";
import { TextLink } from "@/components/ui/text-link";
import { getCertifications, type Certification } from "@/content/profile";
import { getDictionary, t, type Locale } from "@/i18n";
import { formatPartialDate, toIsoDate } from "@/i18n/format";

import { WorkSection } from "./work-section";

/** "Microsoft Certified: Multi-Agent AI Solutions Expert" -> ["Microsoft Certified", "Multi-Agent AI Solutions Expert"]. */
function splitCredentialName(name: string): [string | undefined, string] {
  const index = name.indexOf(": ");
  return index === -1
    ? [undefined, name]
    : [name.slice(0, index), name.slice(index + 2)];
}

function CredentialCard({ cert, lang }: { cert: Certification; lang: Locale }) {
  const dict = getDictionary(lang);
  const copy = dict.work.page.certifications;
  const [program, title] = splitCredentialName(t(cert.name, lang));
  const titleId = `${cert.id}-title`;

  return (
    <article
      aria-labelledby={titleId}
      className="group relative isolate flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-[0_1px_2px_0_rgb(0_0_0/0.04),0_30px_60px_-44px_color-mix(in_oklch,var(--accent)_50%,transparent)] transition-[border-color] duration-300 ease-editorial hover:border-accent/35 sm:p-8"
    >
      {/* Engraved corner, top hairline and glow: certificate paper, quietly. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--accent),transparent)] opacity-60"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[repeating-linear-gradient(135deg,color-mix(in_oklch,var(--accent)_8%,transparent)_0_1px,transparent_1px_8px)] [mask-image:radial-gradient(60%_55%_at_100%_0%,#000,transparent)]"
      />
      <span
        aria-hidden="true"
        className="absolute -top-24 -right-24 -z-10 size-56 rounded-full bg-accent/10 blur-3xl"
      />

      <div className="flex items-start justify-between gap-4">
        <span className="grid size-12 place-items-center rounded-full border border-accent/25 bg-accent-subtle text-accent">
          <BadgeCheck aria-hidden="true" className="size-6" strokeWidth={1.5} />
        </span>
        {cert.level ? (
          <Tag tone="accent">
            {cert.level === "Expert"
              ? dict.work.labels.expertLevel
              : cert.level}
          </Tag>
        ) : null}
      </div>

      <h3 id={titleId} className="mt-8">
        {program ? (
          <>
            <span className="block font-mono text-eyebrow text-muted-foreground uppercase">
              {program}
            </span>
            <span className="sr-only">: </span>
          </>
        ) : null}
        <span className="mt-3 block font-display text-[1.875rem] leading-[1.08] tracking-[-0.01em] text-foreground sm:text-[2.125rem]">
          {title}
        </span>
      </h3>

      {cert.description ? (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {t(cert.description, lang)}
        </p>
      ) : null}

      <div className="mt-auto pt-8">
        <dl className="grid grid-cols-2 gap-4 border-t border-border pt-5 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">{copy.issuer}</dt>
            <dd className="mt-1 font-medium text-foreground">{cert.issuer}</dd>
          </div>
          {cert.date ? (
            <div>
              <dt className="text-xs text-muted-foreground">{copy.issued}</dt>
              <dd className="mt-1 font-medium text-foreground">
                <time dateTime={toIsoDate(cert.date)}>
                  {formatPartialDate(cert.date, lang)}
                </time>
              </dd>
            </div>
          ) : null}
        </dl>
        {cert.credentialUrl ? (
          <TextLink
            href={cert.credentialUrl}
            newTabLabel={dict.a11y.opensInNewTab}
            className="mt-5 text-sm font-medium"
          >
            {dict.work.labels.viewCredential}
          </TextLink>
        ) : null}
      </div>
    </article>
  );
}

/** Expert credentials as premium cards; courses as a modest list below. */
export function CertificationsSection({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const credentials = getCertifications("certification");
  const courses = getCertifications("course");

  return (
    <WorkSection
      id="certifications"
      title={dict.work.sections.certifications.title}
      description={dict.work.page.certifications.description}
    >
      <h3 className="sr-only">{dict.work.page.certifications.credentials}</h3>
      <ul className="grid gap-4 md:grid-cols-2">
        {credentials.map((cert) => (
          <li key={cert.id}>
            <CredentialCard cert={cert} lang={lang} />
          </li>
        ))}
      </ul>

      {courses.length ? (
        <div className="mt-14">
          <h3 className="text-sm font-medium text-foreground">
            {dict.work.labels.courses}
          </h3>
          <ul className="mt-4 divide-y divide-border border-t border-border">
            {courses.map((course) => (
              <li
                key={course.id}
                className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
              >
                <span className="text-foreground">{t(course.name, lang)}</span>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {course.issuer}
                  {course.date ? (
                    <>
                      <span
                        aria-hidden="true"
                        className="mx-2 text-border-strong"
                      >
                        /
                      </span>
                      <time dateTime={toIsoDate(course.date)}>
                        {formatPartialDate(course.date, lang)}
                      </time>
                    </>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </WorkSection>
  );
}
