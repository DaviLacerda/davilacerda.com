import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import Image from "next/image";
import type { ReactNode } from "react";

import { Piece } from "@/components/chat/piece";
import { AsciiBackdrop } from "@/components/ui/ascii-backdrop";
import { CopyButton } from "@/components/ui/copy-button";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { LogoTile } from "@/components/ui/logo";
import { TextLink } from "@/components/ui/text-link";
import {
  getCertifications,
  profile,
  type Certification,
} from "@/content/profile";
import { getDictionary, interpolate, t, type Locale } from "@/i18n";
import { formatPartialDate, toIsoDate } from "@/i18n/format";
import { certificationsSummary } from "@/lib/work/answers";

import { Panel } from "./parts";

/**
 * Certifications: the count, oversized ("3×", with the tiers beside it),
 * then the certificates themselves. Each credential is a panel whose picture
 * is the print of its certificate (the newest one across the canvas, the
 * others side by side); a tap opens it full size. Under the print: the
 * credential's name, its tier, date and expiry, and the credential ID to copy
 * with a Verify link (the issuer's share link). Then a quiet link to every
 * credential on Microsoft Learn, and the few courses worth listing, one line
 * each, as "Also completed".
 */
export function CertificationsAnswer({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const a = dict.chat.answers.certifications;
  const summary = certificationsSummary(lang);
  const credentials = getCertifications("certification");
  const courses = getCertifications("course");

  return (
    <>
      {credentials.length ? (
        <Piece
          i={2}
          className="relative isolate mt-8 flex flex-wrap items-end gap-x-8 gap-y-3"
        >
          <AsciiBackdrop
            scene="agents"
            clear
            className="-inset-y-6 h-[calc(100%+3rem)] max-sm:hidden"
          />
          <p className="text-figure font-semibold" aria-hidden="true">
            {summary.count}×
          </p>
          <p className="pb-1 sm:pb-3">
            <span className="sr-only">{summary.count}× </span>
            <span className="block text-heading font-semibold">
              {summary.title}
            </span>
            <span className="block text-muted-foreground">{summary.tiers}</span>
          </p>
        </Piece>
      ) : null}

      <ul
        aria-label={a.credentials}
        className="mt-10 grid gap-3 sm:grid-cols-2 sm:gap-4"
      >
        {credentials.map((cert, index) => (
          <Piece
            as="li"
            key={cert.id}
            i={3 + index}
            className={index === 0 ? "sm:col-span-2" : undefined}
          >
            <Credential cert={cert} lang={lang} featured={index === 0} />
          </Piece>
        ))}
      </ul>

      <Piece i={3 + credentials.length} className="mt-6">
        <TextLink
          href={t(profile.credentialsProfile.url, lang)}
          newTabLabel={dict.a11y.opensInNewTab}
          className="text-small"
        >
          {interpolate(a.allCredentials, {
            site: profile.credentialsProfile.name,
          })}
        </TextLink>
      </Piece>

      {courses.length ? (
        <Piece
          i={4 + credentials.length}
          as="section"
          className="mt-14"
          aria-labelledby="courses-title"
        >
          <h2 id="courses-title" className="font-semibold">
            {a.courses}
          </h2>
          <ul className="mt-3 grid gap-3">
            {courses.map((course) => (
              <li key={course.id} className="flex items-start gap-3">
                {course.logo ? (
                  <LogoTile logo={course.logo} name={course.issuer} size="sm" />
                ) : null}
                <span className="min-w-0">
                  {course.credentialUrl ? (
                    <a
                      href={course.credentialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-underline"
                    >
                      <LastWordWith name={t(course.name, lang)}>
                        <ArrowUpRightIcon
                          aria-hidden="true"
                          className="ml-0.5 inline size-[0.85em] align-[-0.05em] text-muted-foreground"
                        />
                      </LastWordWith>
                      <span className="sr-only">
                        {" "}
                        ({dict.a11y.opensInNewTab})
                      </span>
                    </a>
                  ) : (
                    t(course.name, lang)
                  )}
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

/** The text with `children` glued to its last word, so an icon never wraps onto a line alone. */
function LastWordWith({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  const at = name.lastIndexOf(" ");
  return (
    <>
      {name.slice(0, at + 1)}
      <span className="whitespace-nowrap">
        {name.slice(at + 1)}
        {children}
      </span>
    </>
  );
}

/** "Microsoft Certified: Multi-Agent AI Solutions Expert" -> the credential's own name and its program. */
function splitName(cert: Certification, lang: Locale) {
  const name = t(cert.name, lang);
  const match = /^(.+?): (.+)$/s.exec(name);
  return match?.[1] && match[2]
    ? { name, program: match[1], title: match[2] }
    : { name, program: cert.issuer, title: name };
}

/** One credential: the print of its certificate, then what it is and its ID. */
function Credential({
  cert,
  lang,
  featured,
}: {
  cert: Certification;
  lang: Locale;
  featured: boolean;
}) {
  const dict = getDictionary(lang);
  const a = dict.chat.answers.certifications;
  const labels = dict.work.labels;
  const { name, title } = splitName(cert, lang);
  const titleId = `${cert.id}-title`;
  const level = cert.level
    ? interpolate(labels.level, { level: cert.level })
    : "";
  // Month and year: "Oct 2026, valid through Oct 2027" (the day is on the print).
  const date = cert.date ? formatPartialDate(cert.date.slice(0, 7), lang) : "";
  const validThrough = cert.expires
    ? interpolate(a.validThrough, {
        date: formatPartialDate(cert.expires.slice(0, 7), lang),
      })
    : "";
  const image = cert.image;

  return (
    <Panel
      as="article"
      aria-labelledby={titleId}
      className="flex h-full flex-col p-2.5 sm:p-3"
    >
      {image ? (
        <ImageLightbox
          src={image.src}
          width={image.width}
          height={image.height}
          alt={interpolate(a.certificateAlt, {
            name,
            person: profile.fullName,
          })}
          caption={name}
          detail={[level, date].filter(Boolean).join(", ")}
          openLabel={a.viewFullSize}
          closeLabel={a.close}
          className="group overflow-hidden rounded-[1.125rem] sm:rounded-[1rem]"
        >
          <Image
            src={image.src}
            width={image.width}
            height={image.height}
            alt={interpolate(a.certificateAlt, {
              name,
              person: profile.fullName,
            })}
            quality={90}
            sizes={
              featured
                ? "(min-width: 1280px) 50rem, (min-width: 1024px) 62vw, 100vw"
                : "(min-width: 1280px) 25rem, (min-width: 1024px) 31vw, (min-width: 640px) 50vw, 100vw"
            }
            className="h-auto w-full transition-transform duration-300 ease-out group-hover:scale-[1.015] dark:brightness-90"
          />
        </ImageLightbox>
      ) : null}

      <div className="flex flex-1 flex-col justify-between gap-6 px-3.5 pt-5 pb-3.5 sm:px-5 sm:pt-6 sm:pb-5">
        <div>
          <h2
            id={titleId}
            className="text-[clamp(1.375rem,1.2rem+0.6vw,1.75rem)] leading-[1.1] tracking-[-0.03em]"
          >
            {title}
          </h2>
          <p className="mt-1.5 text-small text-muted-foreground">
            {level}
            {level && date ? ", " : null}
            {cert.date ? (
              <time dateTime={toIsoDate(cert.date)}>{date}</time>
            ) : null}
            {cert.expires ? (
              <>
                {level || date ? ", " : null}
                <time dateTime={toIsoDate(cert.expires)}>{validThrough}</time>
              </>
            ) : null}
          </p>
        </div>

        {cert.credentialId || cert.credentialUrl ? (
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            {cert.credentialId ? (
              <p className="flex min-w-0 items-center gap-2 text-small">
                <span className="text-muted-foreground">
                  {labels.credentialId}
                </span>
                <code className="font-mono tracking-tight break-all">
                  {cert.credentialId}
                </code>
                <CopyButton
                  value={cert.credentialId}
                  label={a.copyId}
                  copiedLabel={a.copied}
                  variant="raised"
                  iconOnly
                  className="-my-1.5"
                />
              </p>
            ) : null}
            {cert.credentialUrl ? (
              <TextLink
                href={cert.credentialUrl}
                newTabLabel={dict.a11y.opensInNewTab}
                className="text-small font-medium"
              >
                {a.verify}
              </TextLink>
            ) : null}
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
