import Image from "next/image";
import { useId } from "react";

import {
  getLogoSvg,
  isLogoId,
  scopeSvgIds,
  type LogoId,
  type LogoSource,
} from "@/lib/logos";
import { cn } from "@/lib/utils";

/*
 * Brand logos, rendered on the server as inline SVG from the bundled Iconify
 * subset (`src/lib/logos`), so they cost no JavaScript and no request. A logo
 * keeps its brand colours; black or white marks use `currentColor` and follow
 * the theme (see the rule in `src/lib/logos/registry.ts`).
 *
 * Accessibility: a logo next to the name it stands for is decorative
 * (`aria-hidden`); pass `label` when the logo is the only thing that names it.
 */

type BrandLogoProps = {
  id: LogoId;
  className?: string;
  /** Accessible name, for a logo that stands alone. Omit when text beside it names the brand. */
  label?: string;
};

export function BrandLogo({ id, className, label }: BrandLogoProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const svg = getLogoSvg(id);
  return (
    <svg
      viewBox={svg.viewBox}
      className={cn("size-4 shrink-0", className)}
      {...(label
        ? { role: "img", "aria-label": label }
        : { "aria-hidden": true, focusable: false })}
      dangerouslySetInnerHTML={{ __html: scopeSvgIds(svg.body, `${uid}-`) }}
    />
  );
}

type TileSize = "sm" | "md" | "lg";

const tileSizes: Record<TileSize, { box: string; logo: string; px: number }> = {
  sm: { box: "size-8 text-small", logo: "size-[1.125rem]", px: 18 },
  md: { box: "size-10 text-body", logo: "size-[1.375rem]", px: 22 },
  lg: { box: "size-12 text-lead", logo: "size-7", px: 28 },
};

type LogoTileProps = {
  /** A bundled logo id or a file in /public. Missing: a typographic placeholder. */
  logo?: LogoSource;
  /** The organization or credential's name (the placeholder's letters come from it). */
  name: string;
  /** Letters for the placeholder, e.g. "UFU". Defaults to the name's first letter. */
  mark?: string;
  size?: TileSize;
  /** Accessible name when no text beside the tile names it. */
  label?: string;
  className?: string;
};

/**
 * A logo on a small surface tile (12px corners), the picture beside a
 * company, school or credential. Without a logo file it shows the name's
 * initial in the text face, so rows keep the same rhythm until the real logo
 * is added (`logo: "/logos/<name>.svg"` in the profile).
 */
export function LogoTile({
  logo,
  name,
  mark,
  size = "md",
  label,
  className,
}: LogoTileProps) {
  const s = tileSizes[size];
  const letters = mark ?? name.trim().charAt(0).toUpperCase();
  const a11y = label
    ? { role: "img" as const, "aria-label": label }
    : { "aria-hidden": true as const };
  return (
    <span
      {...a11y}
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-tile bg-surface",
        s.box,
        className,
      )}
    >
      {logo && isLogoId(logo) ? (
        <BrandLogo id={logo} className={s.logo} />
      ) : logo ? (
        <Image
          src={logo}
          alt=""
          width={s.px}
          height={s.px}
          unoptimized
          className={cn("object-contain", s.logo)}
        />
      ) : (
        <span
          className={cn(
            "leading-none font-semibold tracking-tight text-muted-foreground",
            letters.length > 1 && "text-[0.8125rem]",
          )}
        >
          {letters}
        </span>
      )}
    </span>
  );
}
