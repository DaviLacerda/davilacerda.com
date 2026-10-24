import type {
  ComponentPropsWithoutRef,
  CSSProperties,
  ElementType,
} from "react";

type PieceProps<T extends ElementType> = {
  /** Order of arrival in the answer, from 0 (the question bubble). */
  i: number;
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, "as">;

/**
 * One visual part of an answer on the canvas (the bubble, the title, a
 * panel, a figure). Parts arrive one after another, so an answer reads as
 * composed in front of you: in CSS on a full page load (`[data-piece]` in
 * globals.css, works without JavaScript) and with Motion on every canvas
 * swap (`Canvas` in `assistant.tsx`). Usable from server and client
 * components alike.
 */
export function Piece<T extends ElementType = "div">({
  i,
  as,
  style,
  ...props
}: PieceProps<T>) {
  const Component: ElementType = as ?? "div";
  return (
    <Component
      data-piece=""
      style={{ ...(style as CSSProperties), "--p": i } as CSSProperties}
      {...props}
    />
  );
}
