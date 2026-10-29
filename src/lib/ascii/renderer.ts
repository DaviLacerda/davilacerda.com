import { GLYPHS, hash, type Field } from "./field";

/** The glyph ramp, from no ink to the most: the classic ASCII-art density scale. */
export const RAMP = " .:-=+*#%@";

/**
 * Draws a field onto a canvas as monospaced glyphs. The glyphs are drawn
 * once into an atlas (in the theme's ink, at the screen's pixel density) and
 * stamped cell by cell, on a pixel-aligned grid so they stay crisp. A few
 * cells change glyph on every tick (the shimmer), more when the card is
 * lively.
 */
export class AsciiRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private atlas: HTMLCanvasElement | null = null;
  /** Cell size in device pixels (integers, so the grid stays on the pixel grid). */
  private cw = 0;
  private ch = 0;
  private offsetX = 0;
  private offsetY = 0;
  private color = "";
  private font = "";
  cols = 0;
  rows = 0;
  /** A cell's size in card units (the canvas's height is 1). */
  cell = { width: 0, height: 0 };
  /** The grid in CSS pixels from the canvas's top left: its offset and cell size. */
  grid = { x: 0, y: 0, width: 0, height: 0 };

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("2d canvas unavailable");
    this.ctx = ctx;
  }

  /**
   * Fits the grid to the canvas's CSS size: cells about a 24th of the card's
   * height (7.5 to 10px tall), as wide as the font's advance.
   */
  resize(width: number, height: number, dpr: number, fontFamily: string) {
    const cellHeight = Math.min(10, Math.max(7.5, height / 24));
    const fontSize = cellHeight * 0.98;
    this.font = `500 ${(fontSize * dpr).toFixed(2)}px ${fontFamily}`;
    this.ctx.font = this.font;
    const advance = this.ctx.measureText("M").width || fontSize * dpr * 0.6;
    this.cw = Math.max(1, Math.round(advance));
    this.ch = Math.max(1, Math.round(cellHeight * dpr));
    this.canvas.width = Math.max(1, Math.round(width * dpr));
    this.canvas.height = Math.max(1, Math.round(height * dpr));
    this.cols = Math.max(1, Math.floor(this.canvas.width / this.cw));
    this.rows = Math.max(1, Math.floor(this.canvas.height / this.ch));
    this.offsetX = Math.floor((this.canvas.width - this.cols * this.cw) / 2);
    this.offsetY = Math.floor((this.canvas.height - this.rows * this.ch) / 2);
    this.cell = {
      width: this.cw / this.canvas.height,
      height: this.ch / this.canvas.height,
    };
    this.grid = {
      x: this.offsetX / dpr,
      y: this.offsetY / dpr,
      width: this.cw / dpr,
      height: this.ch / dpr,
    };
    this.atlas = null;
  }

  /** The glyphs' colour (the theme's ink); rebuilds the atlas when it changes. */
  setColor(color: string) {
    if (color === this.color) return;
    this.color = color;
    this.atlas = null;
  }

  private buildAtlas() {
    const atlas = document.createElement("canvas");
    const glyphs = RAMP + GLYPHS;
    atlas.width = this.cw * glyphs.length;
    atlas.height = this.ch;
    const ctx = atlas.getContext("2d");
    if (!ctx) return null;
    ctx.font = this.font;
    ctx.fillStyle = this.color || "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 1; i < glyphs.length; i++) {
      ctx.fillText(glyphs[i] ?? " ", i * this.cw + this.cw / 2, this.ch / 2);
    }
    return atlas;
  }

  /**
   * Paints the field. `tick` advances the shimmer; `flicker` is the share of
   * inked cells that step one glyph up or down on this tick.
   */
  draw(field: Field, tick: number, flicker: number) {
    const { ctx, canvas, cw, ch } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.atlas ??= this.buildAtlas();
    const atlas = this.atlas;
    if (!atlas) return;
    const last = RAMP.length - 1;
    const { cols, rows, ink, marks } = field;
    for (let r = 0; r < rows; r++) {
      const y = this.offsetY + r * ch;
      for (let c = 0; c < cols; c++) {
        const value = ink[r * cols + c] ?? 0;
        if (value < 0.04) continue;
        const marked = marks[r * cols + c] ?? 0;
        if (marked) {
          ctx.globalAlpha = Math.min(1, value);
          const sx = (last + marked) * cw;
          ctx.drawImage(atlas, sx, 0, cw, ch, this.offsetX + c * cw, y, cw, ch);
          continue;
        }
        let level = Math.round(Math.min(1, value) * last);
        const roll = hash(c, r, tick);
        if (roll < flicker) level += roll < flicker / 2 ? -1 : 1;
        if (level < 1) continue;
        if (level > last) level = last;
        ctx.globalAlpha = 0.5 + 0.5 * Math.min(1, value);
        ctx.drawImage(
          atlas,
          level * cw,
          0,
          cw,
          ch,
          this.offsetX + c * cw,
          y,
          cw,
          ch,
        );
      }
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
