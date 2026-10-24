import { cn } from "@/lib/utils";

/**
 * Renders trusted HTML produced by `renderMarkdown()` / `getPost()` with the
 * `.markdown` typography from globals.css.
 */
export function Prose({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  return (
    <div
      className={cn("markdown", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
