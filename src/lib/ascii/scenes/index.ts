import type { AsciiScene, Scene } from "../types";

/**
 * Every ASCII backdrop, by name, loaded on demand: a page downloads only the
 * scenes it shows (the Personal tab the sports, a Work answer its own).
 */
const loaders: Record<AsciiScene, () => Promise<() => Scene>> = {
  basketball: () => import("./basketball").then((m) => m.basketball),
  soccer: () => import("./soccer").then((m) => m.soccer),
  longship: () => import("./longship").then((m) => m.longship),
  copilot: () => import("./copilot").then((m) => m.copilot),
  invoice: () => import("./invoice").then((m) => m.invoice),
  agents: () => import("./agents").then((m) => m.agents),
  send: () => import("./send").then((m) => m.send),
};

/** The scene's factory (each call makes a fresh scene with its own state). */
export function loadScene(name: AsciiScene): Promise<() => Scene> {
  return loaders[name]();
}
