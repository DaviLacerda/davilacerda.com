import * as THREE from "three";

import { LOOKS, makeHuman } from "../fp/humans";
import { concrete, pbr, repeat } from "../fp/materials";
import type { SceneModule } from "../fp/types";

/** Development only: a studio to build and check the characters. */
const scene: SceneModule = {
  id: "humans-lab",
  title: "Personagens",
  build(ctx) {
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(8, 64),
      pbr(repeat(concrete("#d8d2ca"), 6, 6)),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    ctx.scene.add(floor);
    ctx.scene.background = new THREE.Color("#cfc9c2");
    ctx.scene.add(new THREE.HemisphereLight("#ffffff", "#8a7f74", 0.8));
    const key = new THREE.DirectionalLight("#fff2e0", 2.5);
    key.position.set(3, 5, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = key.shadow.camera.bottom = -5;
    key.shadow.camera.right = key.shadow.camera.top = 5;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    ctx.scene.add(key);
    const fill = new THREE.PointLight("#ffd9b8", 6, 6, 2);
    fill.position.set(-1.5, 2.2, 0.5);
    ctx.scene.add(fill);
    const outfits = {
      davi: {
        top: "#5a3b2b",
        topStyle: "tshirt" as const,
        bottom: "#2f3542",
        bottomStyle: "jeans" as const,
        shoes: "#f2f2f2",
      },
      elena: {
        top: "#f3eee6",
        topStyle: "tank" as const,
        bottom: "#22252d",
        bottomStyle: "jeans" as const,
        shoes: "#f2f2f2",
      },
    };
    ctx.playerOutfit(outfits);
    // row 1 (z = -2): the two leads, facing the spawn
    ctx.partner(-0.5, -2, 0, "stand", outfits, "Oi!");
    ctx.person(
      LOOKS.davi,
      {
        top: "#1fa7a8",
        topStyle: "jersey",
        bottom: "#23252b",
        bottomStyle: "shorts",
        shoes: "#1b1b1b",
        print: "1",
        printColor: "#ff6a1a",
      },
      0.5,
      -2,
      0,
      "wave",
    );
    // row 2 (z = -4): poses
    ctx.person(
      LOOKS.elena,
      {
        top: "#f1ece2",
        topStyle: "dress",
        bottom: "#f1ece2",
        shoes: "#d9c3a8",
      },
      -1.6,
      -4,
      0,
      "sit",
    );
    ctx.person(
      { skin: "#d6a283", hair: "#2a2a2a", hairStyle: "short", height: 1.78 },
      {
        top: "#111111",
        topStyle: "blouse",
        bottom: "#151515",
        bottomStyle: "pants",
        shoes: "#111",
      },
      -0.4,
      -4,
      0,
      "violin",
    );
    ctx.person(
      LOOKS.davi,
      {
        top: "#6b4a3a",
        topStyle: "hoodie",
        bottom: "#3b4152",
        bottomStyle: "jeans",
        shoes: "#f2f2f2",
      },
      0.8,
      -4,
      0,
      "talk",
    );
    ctx.person(
      {
        skin: "#c99373",
        hair: "#5a5047",
        hairStyle: "bun",
        height: 1.62,
        female: true,
      },
      {
        top: "#7a2d3a",
        topStyle: "blouse",
        bottom: "#2a2a30",
        bottomStyle: "skirt",
        shoes: "#2a1d18",
      },
      2,
      -4,
      0,
      "stand",
    );
    // a chair under the seated one
    const chairMat = new THREE.MeshStandardMaterial({
      color: "#6b4a33",
      roughness: 0.6,
    });
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.04, 0.45),
      chairMat,
    );
    seat.position.set(-1.6, 0.43, -4.05);
    seat.castShadow = seat.receiveShadow = true;
    ctx.scene.add(seat);
    for (const [x, z] of [
      [-0.2, -0.2],
      [0.2, -0.2],
      [-0.2, 0.2],
      [0.2, 0.2],
    ] as const) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.43, 0.035),
        chairMat,
      );
      leg.position.set(-1.6 + x, 0.215, -4.05 + z);
      ctx.scene.add(leg);
    }
    // a walker, driven directly
    const walker = makeHuman(LOOKS.elena, {
      top: "#3a5f8f",
      topStyle: "tshirt",
      bottom: "#22252d",
      bottomStyle: "jeans",
      shoes: "#f2f2f2",
    });
    walker.group.position.set(2.2, 0, -2);
    ctx.scene.add(walker.group);
    let a = 0;
    ctx.onUpdate((t, dt) => {
      a += dt * 0.25;
      walker.group.position.set(
        2.2 + Math.sin(a) * 0.8,
        0,
        -2.4 + Math.cos(a) * 0.8,
      );
      walker.group.rotation.y = a + Math.PI / 2;
      walker.update(t, dt, 1.4);
    });
    ctx.spawn(0, 1, 0);
  },
};

export default scene;
