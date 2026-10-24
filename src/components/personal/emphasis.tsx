import { Fragment } from "react";

/**
 * Renders dictionary copy where `*phrase*` marks emphasis, so translators can
 * choose which words are set in the display italic.
 *
 * @example <Emphasis text="Off the *clock*" /> // Off the <em>clock</em>
 */
export function Emphasis({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts = text.split(/(\*[^*]+\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, index) =>
        part.length > 2 && part.startsWith("*") && part.endsWith("*") ? (
          <em key={index} className={className ?? "italic"}>
            {part.slice(1, -1)}
          </em>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}
