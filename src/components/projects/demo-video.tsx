import type { ProjectDemo } from "@/lib/projects";
import { cn } from "@/lib/utils";

/**
 * A project's demo, from `public/work/<id>/` (see `projectDemo()`): the
 * browser's own player, nothing loaded until it is played, the poster in
 * place meanwhile and the box sized by it, so nothing shifts. WebM first,
 * MP4 for Safari. No autoplay: the visitor starts it.
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
        playsInline
        preload="none"
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
