import type { Thing } from "schema-dts";

type JsonLdNode = Exclude<Thing, string>;

type JsonLdProps = {
  /** One node, or several (rendered as a single `@graph`). Build them with `@/lib/seo`. */
  data: JsonLdNode | JsonLdNode[];
};

/**
 * Renders schema.org JSON-LD. Server component; safe against `</script>`
 * injection because `<` is escaped.
 *
 * @example <JsonLd data={[personJsonLd(lang), websiteJsonLd(lang), profilePageJsonLd(lang)]} />
 */
export function JsonLd({ data }: JsonLdProps) {
  const payload = Array.isArray(data)
    ? { "@context": "https://schema.org", "@graph": data }
    : { "@context": "https://schema.org", ...data };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(payload).replace(/</g, "\\u003c"),
      }}
    />
  );
}
