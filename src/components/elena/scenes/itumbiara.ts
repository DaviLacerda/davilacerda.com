import * as THREE from "three";

import { plaster, pbr, repeat, woodPlanks } from "../fp/materials";
import type { SceneModule } from "../fp/types";

/** Placeholder room: replaced by the real recreation of this place. */
const scene: SceneModule = {
  id: "itumbiara",
  title: "itumbiara",
  build(ctx) {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      pbr(repeat(woodPlanks(), 4, 4)),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    ctx.scene.add(floor);
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(10, 3, 0.2),
      pbr(repeat(plaster(), 4, 1)),
    );
    wall.position.set(0, 1.5, -5);
    ctx.scene.add(wall);
    ctx.solid(wall);
    ctx.scene.add(new THREE.HemisphereLight("#ffffff", "#444444", 1));
    ctx.spawn(0, 3, 0);
    ctx.pack(0, 0, -2);
    ctx.exit(0, 4.5, 0.6);
  },
};

export default scene;
