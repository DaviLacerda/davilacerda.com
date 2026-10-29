import type { AsciiScene, Scene } from "../types";
import { basketball } from "./basketball";
import { longship } from "./longship";
import { soccer } from "./soccer";

/** Every ASCII backdrop, by the name a team picks in `src/content/personal.ts`. */
export const scenes: Record<AsciiScene, () => Scene> = {
  basketball,
  soccer,
  longship,
};
