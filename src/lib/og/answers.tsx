import "server-only";

import { getCertifications, profile } from "@/content/profile";
import { getDictionary, t, type Locale } from "@/i18n";
import { formatPartialDate } from "@/i18n/format";
import {
  certificationsSummary,
  splitCompanyName,
  stackLogos,
  topicCopy,
  topicIntro,
} from "@/lib/work/answers";
import type { TopicId } from "@/lib/work/topics";

import {
  OgLead,
  OgLogo,
  OgPanel,
  OgQuestion,
  OgTitle,
  OgTrophy,
  clampText,
  ogColors,
  ogPublicImage,
} from "./template";

/*
 * The pictures on the social cards: each Work answer's card shows the same
 * visual as the answer on the page (the award on an ink panel, an oversized
 * "3×" beside the newest certificate, the career as one bar, the stack as
 * logos, UFU, the email), under the visitor's question. Every size here is in pixels on the
 * 1200x630 card, inside OgFrame's padding (1056px wide).
 */

const CONTENT_WIDTH = 1056;

/**
 * A font size that fits `text` on at most `lines` lines of `width` pixels,
 * capped at `max` (Geist SemiBold averages about 0.52em per character).
 */
function fitSize(text: string, width: number, max: number, lines = 2) {
  return Math.min(
    max,
    Math.floor(width / ((Math.ceil(text.length / lines) + 1) * 0.52)),
  );
}

/**
 * Splits a title into two lines of about the same length, at a space
 * (Satori fills lines greedily, which left "LATAM" alone on the second).
 */
export function balance(text: string): string[] {
  const words = text.split(" ");
  if (words.length < 2) return [text];
  let best = 1;
  for (let i = 1; i < words.length; i++) {
    const diff = Math.abs(
      words.slice(0, i).join(" ").length - words.slice(i).join(" ").length,
    );
    const bestDiff = Math.abs(
      words.slice(0, best).join(" ").length -
        words.slice(best).join(" ").length,
    );
    if (diff < bestDiff) best = i;
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

/** A display title set in balanced lines, one block per line. */
function Lines({
  text,
  width,
  max,
}: {
  text: string;
  /** The width the longest line must fit in. */
  width: number;
  max: number;
}) {
  const lines = balance(text);
  const longest = Math.max(...lines.map((line) => line.length));
  const fontSize = Math.min(max, Math.floor(width / (longest * 0.52)));
  return (
    <div
      style={{ display: "flex", flexDirection: "column", ...display, fontSize }}
    >
      {lines.map((line) => (
        <div key={line} style={{ display: "flex" }}>
          {line}
        </div>
      ))}
    </div>
  );
}

function awardData(lang: Locale) {
  const award = profile.achievements.find((item) =>
    item.id.startsWith("conecta-latam"),
  );
  const copilot = profile.projects.find((p) => p.id === "sales-copilot");
  return award
    ? {
        title: t(award.title, lang),
        issuer: award.issuer,
        project: copilot ? `${t(copilot.name, lang)}, ${copilot.context}` : "",
      }
    : null;
}

export const display = {
  fontWeight: 600,
  letterSpacing: "-0.05em",
  lineHeight: 0.95,
} as const;

/* ---------------------------------------------------------------- Home */

/** The Work card: the headline, then the award and the "3×" Microsoft Certified panels. */
export function OgHome({ lang }: { lang: Locale }) {
  const award = awardData(lang);
  const certified = certificationsSummary(lang);
  const awardWidth = 520;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <OgTitle text={t(profile.headline, lang)} max={96} />
      <div style={{ display: "flex", gap: 20, marginTop: 36, height: 290 }}>
        {award ? (
          <OgPanel style={{ flex: 1.4 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                fontSize: 24,
                color: ogColors.onInkMuted,
              }}
            >
              <OgTrophy size={28} color={ogColors.onInk} />
              {award.issuer}
            </div>
            <Lines text={award.title} width={awardWidth} max={60} />
          </OgPanel>
        ) : null}
        {certified.count > 0 ? (
          <OgPanel tone="surface" style={{ flex: 1 }}>
            {certified.logo ? (
              <OgLogo id={certified.logo} size={48} />
            ) : (
              <div style={{ display: "flex" }} />
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", ...display, fontSize: 100 }}>
                {`${certified.count}×`}
              </div>
              <div
                style={{
                  display: "flex",
                  marginTop: 12,
                  fontSize: 26,
                  fontWeight: 500,
                }}
              >
                {certified.title}
              </div>
              <div
                style={{
                  display: "flex",
                  marginTop: 4,
                  fontSize: 22,
                  color: ogColors.muted,
                }}
              >
                {certified.tiers}
              </div>
            </div>
          </OgPanel>
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- Answers */

/** A Work answer's card: the question as a bubble, then the answer's picture. */
export function OgAnswer({ topic, lang }: { topic: TopicId; lang: Locale }) {
  const copy = topicCopy(topic, lang);
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <OgQuestion>{copy.question}</OgQuestion>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 32 }}>
        <Visual topic={topic} lang={lang} />
      </div>
    </div>
  );
}

function Visual({ topic, lang }: { topic: TopicId; lang: Locale }) {
  switch (topic) {
    case "sales-copilot":
      return <AwardVisual lang={lang} />;
    case "certifications":
      return <CertificationsVisual lang={lang} />;
    case "experience":
      return <TimelineVisual lang={lang} />;
    case "skills":
      return <StackVisual lang={lang} />;
    case "education":
      return <EducationVisual lang={lang} />;
    case "contact":
      return <EmailVisual lang={lang} />;
    case "faq":
      return <TitleVisual topic={topic} lang={lang} />;
  }
}

function TitleVisual({ topic, lang }: { topic: TopicId; lang: Locale }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <OgTitle text={topicCopy(topic, lang).title} max={92} />
      <OgLead>{clampText(topicIntro(topic, lang), 110)}</OgLead>
    </div>
  );
}

function AwardVisual({ lang }: { lang: Locale }) {
  const award = awardData(lang);
  const labels = getDictionary(lang).chat.answers.salesCopilot;
  if (!award) return <TitleVisual topic="sales-copilot" lang={lang} />;
  return (
    <OgPanel style={{ height: 300 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 24,
          color: ogColors.onInkMuted,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <OgTrophy size={28} color={ogColors.onInk} />
          {labels.award}
        </div>
        <span>{award.issuer}</span>
      </div>
      <Lines text={award.title} width={CONTENT_WIDTH - 88} max={96} />
    </OgPanel>
  );
}

/** "3×" and the tiers, beside the print of the newest certificate. */
function CertificationsVisual({ lang }: { lang: Locale }) {
  const certified = certificationsSummary(lang);
  const featured = getCertifications("certification").find((cert) =>
    cert.image?.src.endsWith(".png"),
  );
  if (certified.count === 0) {
    return <TitleVisual topic="certifications" lang={lang} />;
  }
  const printHeight = 330;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 40,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            ...display,
            fontSize: 220,
            lineHeight: 0.8,
          }}
        >
          {`${certified.count}×`}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 30,
            fontSize: 48,
            fontWeight: 600,
            letterSpacing: "-0.035em",
            lineHeight: 1.05,
          }}
        >
          {certified.title}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 10,
            fontSize: 28,
            color: ogColors.muted,
          }}
        >
          {certified.tiers}
        </div>
      </div>
      {featured?.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- Satori, not the DOM.
        <img
          alt=""
          src={ogPublicImage(featured.image.src)}
          height={printHeight}
          width={Math.round(
            (printHeight * featured.image.width) / featured.image.height,
          )}
          style={{ borderRadius: 16 }}
        />
      ) : certified.logo ? (
        <OgLogo id={certified.logo} size={120} />
      ) : null}
    </div>
  );
}

function monthIndex(date: string): number {
  const [year = "0", month = "1"] = date.split("-");
  return Number(year) * 12 + Number(month) - 1;
}

function TimelineVisual({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const jobs = profile.experience
    .flatMap((job) => (job.start ? [{ ...job, start: job.start }] : []))
    .sort((a, b) => monthIndex(a.start) - monthIndex(b.start));
  const first = jobs[0];
  if (!first) return <TitleVisual topic="experience" lang={lang} />;
  const now = new Date();
  const today = now.getUTCFullYear() * 12 + now.getUTCMonth();
  const start = monthIndex(first.start);
  const span = Math.max(1, today - start);
  const gap = 8;
  const usable = CONTENT_WIDTH - gap * (jobs.length - 1);
  const widths = jobs.map((job) => {
    const end = job.end ? monthIndex(job.end) : today;
    return Math.max(
      150,
      Math.round(((end - monthIndex(job.start)) / span) * usable),
    );
  });
  const scale = usable / widths.reduce((sum, w) => sum + w, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <OgTitle text={topicCopy("experience", lang).title} max={84} />
      <div style={{ display: "flex", gap, marginTop: 40 }}>
        {jobs.map((job, index) => {
          const current = job.end === null;
          return (
            <div
              key={job.id}
              style={{
                display: "flex",
                flexDirection: "column",
                width: Math.floor((widths[index] ?? 0) * scale),
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  height: 112,
                  padding: "0 28px",
                  borderRadius: 28,
                  fontSize: 36,
                  fontWeight: 600,
                  letterSpacing: "-0.03em",
                  background: current ? ogColors.ink : "#e8e8e8",
                  color: current ? ogColors.onInk : ogColors.ink,
                }}
              >
                {splitCompanyName(t(job.company, lang)).short}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 14,
                  fontSize: 24,
                  color: ogColors.muted,
                }}
              >
                <span>{formatPartialDate(job.start, lang)}</span>
                {current ? <span>{dict.work.labels.today}</span> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StackVisual({ lang }: { lang: Locale }) {
  const logos = stackLogos().slice(0, 8);
  const gap = 16;
  const tile = Math.floor(
    (CONTENT_WIDTH - gap * (logos.length - 1)) / logos.length,
  );
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <OgTitle text={topicCopy("skills", lang).title} max={84} />
      <div style={{ display: "flex", gap, marginTop: 44 }}>
        {logos.map((id) => (
          <div
            key={id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: tile,
              height: tile,
              borderRadius: 32,
              background: ogColors.surface,
            }}
          >
            <OgLogo id={id} size={Math.round(tile * 0.5)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function EducationVisual({ lang }: { lang: Locale }) {
  const edu = profile.education[0];
  if (!edu?.shortName) return <TitleVisual topic="education" lang={lang} />;
  return (
    <OgPanel
      style={{
        height: 300,
        flexDirection: "row",
        alignItems: "flex-end",
        padding: "40px 48px 44px",
      }}
    >
      <div
        style={{ display: "flex", ...display, fontSize: 230, lineHeight: 0.78 }}
      >
        {edu.shortName}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          textAlign: "right",
          maxWidth: 440,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 44,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
          }}
        >
          {t(edu.field, lang)}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 12,
            fontSize: 26,
            lineHeight: 1.3,
            color: ogColors.onInkMuted,
          }}
        >
          {t(edu.institution, lang)}
        </div>
      </div>
    </OgPanel>
  );
}

function EmailVisual({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  return (
    <OgPanel style={{ height: 300, padding: "40px 48px 48px" }}>
      <div
        style={{
          display: "flex",
          fontSize: 26,
          color: ogColors.onInkMuted,
        }}
      >
        {dict.work.hero.talk}
      </div>
      <div
        style={{
          display: "flex",
          ...display,
          letterSpacing: "-0.04em",
          fontSize: fitSize(profile.email, CONTENT_WIDTH - 96, 84, 1),
        }}
      >
        {profile.email}
      </div>
    </OgPanel>
  );
}
