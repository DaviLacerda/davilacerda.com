import type { SceneModule } from "../fp/types";

/** Every place's first-person scene, loaded on demand (one chunk each). */
export const SCENES: Record<string, () => Promise<{ default: SceneModule }>> = {
  panedoca: () => import("./panedoca"),
  "casa-vo": () => import("./casa-vo"),
  caldas: () => import("./caldas"),
  famiglia: () => import("./famiglia"),
  casa: () => import("./casa"),
  cinema: () => import("./cinema"),
  sabia: () => import("./sabia"),
  benedith: () => import("./benedith"),
  itumbiara: () => import("./itumbiara"),
  alpendre: () => import("./alpendre"),
  caramel: () => import("./caramel"),
  "humans-lab": () => import("./humans-lab"),
};
