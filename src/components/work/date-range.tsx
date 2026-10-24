import { Fragment, type ReactNode } from "react";

import { getDictionary, type Locale } from "@/i18n";
import { formatPartialDate, toIsoDate, type PartialDate } from "@/i18n/format";

type DateRangeProps = {
  start?: PartialDate;
  /** `null` = present, omitted = unknown. */
  end?: PartialDate | null;
  lang: Locale;
  className?: string;
};

function DateValue({ date, lang }: { date: PartialDate; lang: Locale }) {
  return (
    <time dateTime={toIsoDate(date)}>{formatPartialDate(date, lang)}</time>
  );
}

/**
 * A localized period ("Aug 2024 – Present") with machine-readable `<time>`
 * elements. Follows `dict.dates.range`, so word order stays per locale.
 */
export function DateRange({ start, end, lang, className }: DateRangeProps) {
  const dict = getDictionary(lang);
  const endNode: ReactNode =
    end === null ? (
      dict.dates.present
    ) : end ? (
      <DateValue date={end} lang={lang} />
    ) : null;

  if (!start)
    return endNode ? <span className={className}>{endNode}</span> : null;
  if (!endNode || end === start) {
    return (
      <span className={className}>
        <DateValue date={start} lang={lang} />
      </span>
    );
  }

  const parts = dict.dates.range.split(/(\{start\}|\{end\})/);
  return (
    <span className={className}>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part === "{start}" ? (
            <DateValue date={start} lang={lang} />
          ) : part === "{end}" ? (
            endNode
          ) : (
            part
          )}
        </Fragment>
      ))}
    </span>
  );
}
