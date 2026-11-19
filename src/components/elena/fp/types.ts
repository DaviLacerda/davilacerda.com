import type * as THREE from "three";

import type { Who } from "../types";

/**
 * The contract between the first-person engine (engine.ts) and each place's
 * scene module (scenes/<id>.ts). Units are meters; +Y is up. A scene module
 * builds its room inside `ctx.scene` and registers what the engine needs.
 */

export type Pose = "stand" | "sit" | "wave" | "violin" | "talk";

/** What a person wears in a given place (colors are CSS colors). */
export type Outfit = {
  top: string;
  /** "tshirt" | "tank" | "dress" | "jersey" | "blouse" | "hoodie" (a dress uses `top` for its color) */
  topStyle?: "tshirt" | "tank" | "dress" | "jersey" | "blouse" | "hoodie";
  bottom: string;
  /** "jeans" | "shorts" | "skirt" | "pants" */
  bottomStyle?: "jeans" | "shorts" | "skirt" | "pants";
  shoes?: string;
  /** Default: "flipflop" with shorts, "sneaker" otherwise. "sandal" = low block-heel strap sandal. */
  shoeStyle?: "sneaker" | "flipflop" | "sandal";
  /** Text printed on the chest, e.g. a jersey number. */
  print?: string;
  printColor?: string;
  /** Small print on the left chest (lines split by "\n"), e.g. "NATURE\nESCAPE". */
  logo?: string;
  logoColor?: string;
  /** Fabric print of the top (and of a dress's skirt). */
  pattern?: "leaves" | "lace" | "stripes";
  /** Overrides the pattern's colors (background first). */
  patternColors?: string[];
  /** Neckline override (defaults: tshirt crew, jersey v, blouse scoop, dress square). */
  neckline?: "crew" | "v" | "scoop" | "square";
  /** Strap width of a tank or dress. */
  straps?: "thin" | "wide";
  /** Small ruffles on the straps. */
  ruffles?: boolean;
  /** Hem of a dress or skirt (default "knee"). */
  length?: "mini" | "knee" | "midi" | "long";
  /** Pencil cut: the skirt hugs hips and legs instead of flaring (gets a back slit). */
  fitted?: boolean;
  /** Small buttons down the front (their color, e.g. gold). */
  buttons?: string;
  /** Sheer short sleeves (blouse). */
  sheerSleeves?: boolean;
  /** Where the glasses are today: default is the look's own glasses on the face. */
  glasses?: "face" | "collar" | "sun" | "none";
  /** Frame color (default black). */
  glassesColor?: string;
  /** Thin gold chain: with a small heart pendant, or a long thin one. */
  necklace?: "heart" | "long";
  /** Hair band color. */
  headband?: string;
};

export type SceneCtx = {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  /** "high" on desktop GPUs, "low" on phones: use it to scale counts, shadows and texture sizes. */
  quality: "high" | "low";
  /** Who is playing (the other one is the partner waiting in the place). */
  player: Who;
  /** A texture from the encrypted media route (photos, frames, tex-*.webp). */
  tex: (name: string, repeatX?: number, repeatY?: number) => THREE.Texture;
  /** Makes an object (and its children) solid: its axis-aligned XZ bounds block walking. */
  solid: (object: THREE.Object3D, padding?: number) => void;
  /** A solid axis-aligned box on the floor plan, without a mesh. */
  wall: (minX: number, minZ: number, maxX: number, maxZ: number) => void;
  /** Where the player appears, looking toward yaw (degrees, 0 = toward -Z). */
  spawn: (x: number, z: number, yawDeg: number) => void;
  /** The card pack of this place, resting at this point (on a table, a shelf...). */
  pack: (x: number, y: number, z: number, yawDeg?: number) => void;
  /** A framed photo that stays covered until the pack is opened. Normal faces +Z before rotation. */
  photo: (
    name: string,
    width: number,
    height: number,
    position: THREE.Vector3,
    yawDeg?: number,
  ) => THREE.Object3D;
  /** The other person, dressed for this place. */
  partner: (
    x: number,
    z: number,
    yawDeg: number,
    pose: Pose,
    outfit: { davi: Outfit; elena: Outfit },
    line?: string,
  ) => THREE.Object3D;
  /** Anyone else (family, waiters, the violinist). */
  person: (
    look: {
      skin: string;
      hair: string;
      hairStyle?: "short" | "long" | "bun" | "bald";
      height?: number;
      beard?: boolean;
      glasses?: boolean;
      female?: boolean;
    },
    outfit: Outfit,
    x: number,
    z: number,
    yawDeg: number,
    pose: Pose,
    line?: string,
  ) => THREE.Object3D;
  /** The player's own outfit in this place (seen when looking down, or in third person). */
  playerOutfit: (outfit: { davi: Outfit; elena: Outfit }) => void;
  /** Background sound of the place (a media file name), looping while inside. */
  ambient: (name: string, volume?: number) => void;
  /** Walking into this circle goes back to the map. */
  exit: (x: number, z: number, radius: number) => void;
  /** Called every frame. */
  onUpdate: (fn: (t: number, dt: number) => void) => void;
};

export type SceneModule = {
  id: string;
  /** Shown while loading and on the exit sign. */
  title: string;
  build: (ctx: SceneCtx) => void | Promise<void>;
};
