import type { ProjectDemo } from "@/lib/projects";
import { cn } from "@/lib/utils";

/**
 * A project's demo, from `public/work/<id>/` (see `projectDemo()`): the
 * browser's own player, playing on its own (muted and looping, which is what
 * browsers allow to autoplay), the poster in place until the first frame and
 * the box sized by it, so nothing shifts. WebM first, MP4 for Safari. The
 * controls stay, so the visitor can pause it.
 */
export function DemoVideo({
  demo,
  label,
  className,
}: {
  demo: ProjectDemo;
  /** Accessible name: "Demo: Sales Copilot". */
  label: string;
  className?: string;
}) {
  return (
    <figure className={className}>
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
    </figure>
  );
}
