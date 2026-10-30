import type { ProjectDemo } from "@/lib/projects";
import { cn } from "@/lib/utils";

/**
 * A project's demo, from `public/work/<id>/` (see `projectDemo()`): the
 * browser's own player, playing on its own (muted and looping, which is what
 * browsers allow to autoplay), the poster in place until the first frame and
 * the box sized by it, so nothing shifts. WebM first, MP4 for Safari. The
 * controls stay, so the visitor can pause it. A small label (`note`) says it
 * is a demo with sample data, not the company's own: in the video's corner,
 * or under it on phones, where it would cover too much.
 */
export function DemoVideo({
  demo,
  label,
  note,
  className,
}: {
  demo: ProjectDemo;
  /** Accessible name: "Demo: Sales Copilot". */
  label: string;
  /** The corner label: "Demo with sample data, showing how the real product works". */
  note: string;
  className?: string;
}) {
  return (
    <figure className={cn("relative", className)}>
      <video
        controls
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={demo.poster}
        aria-label={label}
        width={demo.width}
        height={demo.height}
        className={cn("h-auto w-full rounded-panel bg-surface")}
        style={{ aspectRatio: `${demo.width} / ${demo.height}` }}
      >
        {demo.webm ? <source src={demo.webm} type="video/webm" /> : null}
        <source src={demo.mp4} type="video/mp4" />
      </video>
      <figcaption className="mt-2 text-small text-muted-foreground sm:pointer-events-none sm:absolute sm:top-3 sm:right-3 sm:mt-0 sm:max-w-[calc(100%-1.5rem)] sm:rounded-full sm:bg-black/75 sm:px-3 sm:py-1 sm:text-[0.75rem] sm:leading-snug sm:font-medium sm:text-white sm:backdrop-blur-sm">
        {note}
      </figcaption>
    </figure>
  );
}
