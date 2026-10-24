import "server-only";

import { profile, type FaqItem } from "@/content/profile";
import { getDictionary, interpolate, t, type Locale } from "@/i18n";
import { formatLongPartialDate } from "@/i18n/format";
import { routes } from "@/lib/routes";

import { topicIds, type TopicId } from "./topics";

/*
 * Server-side copy for the Work assistant's answers, shared by the HTML
 * pages, their Markdown renditions, the OG images and the MCP search index,
 * so every surface says the same thing.
 */

/** The dictionary copy of a topic: chip label, question, title, description. */
export function topicCopy(topic: TopicId, lang: Locale) {
  return getDictionary(lang).chat.topics[topic];
}

function faqAnswer(id: string, lang: Locale): string {
  const item = profile.faq.find((entry) => entry.id === id);
  if (!item) throw new Error(`Unknown FAQ item "${id}"`);
  return t(item.answer, lang);
}

/**
 * The first paragraph of an answer: a direct, quotable reply to the topic's
 * question (most come straight from the profile FAQ).
 */
export function topicLead(topic: TopicId, lang: Locale): string {
  const dict = getDictionary(lang);
  switch (topic) {
    case "experience": {
      const [current, previous] = profile.experience;
      if (!current) return dict.chat.topics.experience.description;
      return interpolate(dict.chat.answers.experience.lead, {
        name: profile.givenName,
        role: t(current.role, lang),
        company: t(current.company, lang),
        since: current.start ? formatLongPartialDate(current.start, lang) : "",
        prevRole: previous ? t(previous.role, lang) : "",
        prevCompany: previous ? t(previous.company, lang) : "",
      });
    }
    case "sales-copilot":
      return faqAnswer("sales-copilot", lang);
    case "certifications":
      return faqAnswer("certifications", lang);
    case "skills":
      return faqAnswer("tech-stack", lang);
    case "education":
      return faqAnswer("education", lang);
    case "faq":
      return dict.chat.topics.faq.intro;
    case "contact":
      return faqAnswer("open-to-roles", lang);
  }
}

/**
 * "Brain (Centro de Inovação em Negócios Digitais)" -> { short: "Brain",
 * long: "Centro de Inovação em Negócios Digitais" }. Names without a
 * parenthesis come back as they are.
 */
export function splitCompanyName(name: string): {
  short: string;
  long?: string;
} {
  const match = /^(.+?) \((.+)\)$/.exec(name);
  return match?.[1] && match[2]
    ? { short: match[1], long: match[2] }
    : { short: name };
}

/**
 * The one sentence under an answer's title on its page (and on its OG
 * image). Shorter than `topicLead()`, which stays the full, quotable reply
 * in the Markdown and agent renditions; the panels below carry the rest.
 */
export function topicIntro(topic: TopicId, lang: Locale): string {
  const copy = getDictionary(lang).chat.topics[topic];
  if (topic !== "experience") return copy.intro;
  const [current, previous] = profile.experience;
  if (!current) return copy.description;
  return interpolate(copy.intro, {
    role: t(current.role, lang),
    company: t(current.company, lang),
    since: current.start ? formatLongPartialDate(current.start, lang) : "",
    prevCompany: previous
      ? splitCompanyName(t(previous.company, lang)).short
      : "",
  });
}

/** FAQ items shown on the FAQ topic (and in its FAQPage JSON-LD). */
export function topicFaq(): FaqItem[] {
  return profile.faq;
}

/** Suggestions for the composer, in display order. */
export function composerTopics(lang: Locale) {
  return topicIds.map((id) => ({
    id,
    label: topicCopy(id, lang).chip,
    href: routes.topic(lang, id),
  }));
}

/** Composer strings for a locale (client components get plain strings). */
export function composerStrings(lang: Locale) {
  const c = getDictionary(lang).chat.composer;
  return {
    label: c.label,
    placeholder: c.placeholder,
    submit: c.submit,
    suggestions: c.suggestions,
    bestMatch: c.bestMatch,
    noMatch: c.noMatch,
    note: c.note,
    fallbackTitle: c.fallbackTitle,
    fallbackBody: c.fallbackBody,
    dismiss: c.dismiss,
  };
}

/** UTC offset of Davi's time zone right now, e.g. "GMT-3". */
export function timezoneOffset(lang: Locale): string {
  const parts = new Intl.DateTimeFormat(lang === "en" ? "en-US" : "pt-BR", {
    timeZone: profile.location.timezone,
    timeZoneName: "shortOffset",
  }).formatToParts(new Date());
  return parts.find((part) => part.type === "timeZoneName")?.value ?? "";
}
