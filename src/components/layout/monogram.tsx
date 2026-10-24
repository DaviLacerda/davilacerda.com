import { cn } from "@/lib/utils";

/** "dl" monogram set in the display serif; the ring turns accent on group hover. */
export function Monogram({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-grid size-9 place-items-center rounded-full border border-border-strong bg-surface font-display text-[1.2rem] leading-none text-foreground italic transition-colors duration-200 group-hover:border-accent group-hover:text-accent",
        className,
      )}
    >
      <span className="-translate-y-px">dl</span>
    </span>
  );
}
