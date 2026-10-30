import "server-only";

import type { CSSProperties } from "react";

import { getPressOutlets, profile, type Project } from "@/content/profile";
import { getDictionary, t, type Locale } from "@/i18n";
import {
  listFormat,
  projectHeadline,
  projectOutlets,
  type ProjectHeadline,
} from "@/lib/projects";

import { balance, display } from "./answers";
import { OgMeta, OgPanel, OgTitle, OgTrophy, ogColors } from "./template";

/*
 * The Projects tab's social cards, the same pictures as the page: the award
 * on the ink panel, the figure on a surface panel, and the outlets that
 * covered them. Sizes in pixels on the 1200x630 card (1056px wide inside
 * OgFrame's padding).
 */

const CONTENT_WIDTH = 1056;
/**
 * The panels' height and the title's largest size: with the header, the
 * gaps and the press line, they fill the card's 494px of content height.
 */
const PANEL_HEIGHT = 272;
const TITLE_MAX = 72;
/** OgPanel's padding, across and down. */
const PANEL_PAD_X = 88;
const PANEL_PAD_Y = 76;
/** Geist SemiBold at -0.05em: about 0.52em a character. */
const EM_PER_CHAR = 0.52;

function pressLine(outlets: string[], lang: Locale): string[] {
  if (outlets.length === 0) return [];
  return [
    `${getDictionary(lang).projects.press}: ${listFormat(outlets, lang)}`,
  ];
}

/**
 * The award's title as large as the panel allows: on one line when that is
 * larger ("Best AI Project in LATAM" across a full-width panel), else in two
 * balanced lines, never taller than `height`.
 */
function AwardTitle({
  text,
  width,
  height,
  max,
}: {
  text: string;
  width: number;
  height: number;
  max: number;
}) {
  const fits = (chars: number) => Math.floor(width / (chars * EM_PER_CHAR));
  const lines = balance(text);
  const longest = Math.max(...lines.map((line) => line.length));
  const one = Math.min(max, fits(text.length), Math.floor(height / 0.95));
  const two = Math.min(
    max,
    fits(longest),
    Math.floor(height / (lines.length * 0.95)),
  );
  const single = one >= two;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        ...display,
        fontSize: single ? one : two,
      }}
    >
      {(single ? [text] : lines).map((line) => (
        <div key={line} style={{ display: "flex" }}>
          {line}
        </div>
      ))}
    </div>
  );
}

function AwardPanel({
  headline,
  width,
  height,
  caption,
  max,
}: {
  headline: Extract<ProjectHeadline, { kind: "award" }>;
  width: number;
  height: number;
  caption?: string;
  max: number;
}) {
  // Inside: the edition's row (28px) and the caption (38px) leave the rest,
  // less 16px of air, to the title.
  const titleHeight = height - PANEL_PAD_Y - 28 - (caption ? 38 : 0) - 16;
  return (
    <OgPanel style={{ width, height }}>
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
        {headline.event ?? headline.issuer ?? ""}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <AwardTitle
          text={headline.title}
          width={width - PANEL_PAD_X}
          height={titleHeight}
          max={max}
        />
        {caption ? (
          <div
            style={{
              display: "flex",
              marginTop: 10,
              fontSize: 24,
              color: ogColors.onInkMuted,
            }}
          >
            {caption}
          </div>
        ) : null}
      </div>
    </OgPanel>
  );
}

function MetricPanel({
  value,
  label,
  caption,
  tone,
  width,
  height,
  size,
  style,
}: {
  value: string;
  label: string;
  caption?: string;
  tone: "ink" | "surface";
  width: number;
  height: number;
  size: number;
  style?: CSSProperties;
}) {
  const muted = tone === "ink" ? ogColors.onInkMuted : ogColors.muted;
  return (
    <OgPanel tone={tone} style={{ width, height, ...style }}>
      <div style={{ display: "flex", fontSize: 24, color: muted }}>
        {caption ?? ""}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            ...display,
            fontSize: size,
            lineHeight: 0.85,
            letterSpacing: "-0.06em",
          }}
        >
          {value}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 16,
            fontSize: 26,
            color: muted,
          }}
        >
          {label}
        </div>
      </div>
    </OgPanel>
  );
}

/** The Projects tab's card: the title, the award beside the first figure, the outlets. */
export function OgProjects({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const featured = profile.projects
    .filter((project) => project.story)
    .map((project) => ({ project, headline: projectHeadline(project, lang) }));
  const award = featured.find(({ headline }) => headline?.kind === "award");
  const metric = featured.find(({ headline }) => headline?.kind === "metric");
  const height = PANEL_HEIGHT;
  const gap = 20;
  const awardWidth = metric
    ? Math.round((CONTENT_WIDTH - gap) * 0.58)
    : CONTENT_WIDTH;
  const metricWidth = CONTENT_WIDTH - gap - awardWidth;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <OgTitle text={dict.projects.title} max={TITLE_MAX} />
      <div style={{ display: "flex", gap, marginTop: 24 }}>
        {award?.headline?.kind === "award" ? (
          <AwardPanel
            headline={award.headline}
            width={awardWidth}
            height={height}
            caption={`${t(award.project.name, lang)}, ${award.project.context ?? ""}`.replace(
              /, $/,
              "",
            )}
            max={64}
          />
        ) : null}
        {metric?.headline?.kind === "metric" ? (
          <MetricPanel
            value={metric.headline.value}
            label={metric.headline.label}
            caption={t(metric.project.name, lang)}
            tone={award ? "surface" : "ink"}
            width={award ? metricWidth : CONTENT_WIDTH}
            height={height}
            size={100}
          />
        ) : null}
      </div>
      <OgMeta
        items={pressLine(
          getPressOutlets().map((entry) => entry.outlet),
          lang,
        )}
      />
    </div>
  );
}

/** A project's card: its name, its result on the ink panel, the outlets that covered it. */
export function OgProject({
  project,
  lang,
}: {
  project: Project;
  lang: Locale;
}) {
  const headline = projectHeadline(project, lang);
  const height = PANEL_HEIGHT;
  const secondary = project.results?.[0];
  const gap = 20;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <OgTitle text={t(project.name, lang)} max={TITLE_MAX} />
      {/* No fragment in the row: Satori leaves out the gap around one. */}
      <div style={{ display: "flex", marginTop: 24 }}>
        {headline?.kind === "award" ? (
          <AwardPanel
            headline={headline}
            width={CONTENT_WIDTH}
            height={height}
            caption={headline.category}
            max={80}
          />
        ) : null}
        {headline?.kind === "metric" ? (
          <MetricPanel
            value={headline.value}
            label={headline.label}
            tone="ink"
            width={secondary ? 640 : CONTENT_WIDTH}
            height={height}
            size={150}
          />
        ) : null}
        {headline?.kind === "metric" && secondary ? (
          <MetricPanel
            value={t(secondary.value, lang)}
            label={t(secondary.label, lang)}
            tone="surface"
            width={CONTENT_WIDTH - gap - 640}
            height={height}
            size={64}
            style={{ marginLeft: gap }}
          />
        ) : null}
      </div>
      <OgMeta items={pressLine(projectOutlets(project), lang)} />
    </div>
  );
}
