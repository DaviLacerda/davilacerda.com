import * as THREE from "three";

/* Building blocks for the low-poly world: materials, canvas textures, shapes, people. */

const materials = new Map<string, THREE.MeshStandardMaterial>();

export function mat(
  color: THREE.ColorRepresentation,
  opts: {
    emissive?: THREE.ColorRepresentation;
    emissiveIntensity?: number;
    roughness?: number;
    metalness?: number;
  } = {},
): THREE.MeshStandardMaterial {
  const key = `${String(color)}|${String(opts.emissive ?? "")}|${opts.emissiveIntensity ?? ""}|${opts.roughness ?? ""}|${opts.metalness ?? ""}`;
  let m = materials.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness ?? 0.85,
      metalness: opts.metalness ?? 0,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 1,
      flatShading: true,
    });
    materials.set(key, m);
  }
  return m;
}

export function glow(color: THREE.ColorRepresentation, intensity = 1.6) {
  return mat(color, {
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.4,
  });
}

export function texMat(
  texture: THREE.Texture,
  opts: { roughness?: number; emissive?: boolean } = {},
) {
  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: opts.roughness ?? 0.85,
    ...(opts.emissive
      ? { emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: 0.9 }
      : {}),
  });
}

/* ---------- canvas textures ---------- */

function canvasTexture(
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D) => void,
  repeat?: [number, number],
) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext("2d");
  if (g) draw(g);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

const rand = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

export function brickTexture(
  base: string,
  mortar: string,
  jitter: number,
  repeat: [number, number],
  seed = 7,
) {
  const r = rand(seed);
  return canvasTexture(
    256,
    256,
    (g) => {
      g.fillStyle = mortar;
      g.fillRect(0, 0, 256, 256);
      const bh = 32;
      for (let row = 0; row < 8; row++) {
        const off = row % 2 ? 32 : 0;
        for (let col = -1; col < 5; col++) {
          const c = new THREE.Color(base).offsetHSL(0, 0, (r() - 0.5) * jitter);
          g.fillStyle = `#${c.getHexString()}`;
          g.fillRect(col * 64 + off + 3, row * bh + 3, 58, bh - 6);
        }
      }
    },
    repeat,
  );
}

export function stoneTexture(repeat: [number, number]) {
  const r = rand(11);
  return canvasTexture(
    256,
    256,
    (g) => {
      g.fillStyle = "#cfc8bd";
      g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 70; i++) {
        const x = r() * 256;
        const y = r() * 256;
        const c = new THREE.Color("#f1ece4").offsetHSL(0, 0, (r() - 0.5) * 0.1);
        g.fillStyle = `#${c.getHexString()}`;
        g.beginPath();
        g.ellipse(x, y, 14 + r() * 18, 10 + r() * 12, r() * 3, 0, Math.PI * 2);
        g.fill();
      }
    },
    repeat,
  );
}

export function tileTexture(a: string, line: string, repeat: [number, number]) {
  return canvasTexture(
    128,
    128,
    (g) => {
      g.fillStyle = a;
      g.fillRect(0, 0, 128, 128);
      g.strokeStyle = line;
      g.lineWidth = 3;
      g.strokeRect(0, 0, 128, 128);
    },
    repeat,
  );
}

export function marbleTexture() {
  const r = rand(5);
  return canvasTexture(256, 256, (g) => {
    g.fillStyle = "#e9e0d2";
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = "rgba(150,130,110,.35)";
    for (let i = 0; i < 9; i++) {
      g.lineWidth = 1 + r() * 2;
      g.beginPath();
      let x = r() * 256;
      g.moveTo(x, 0);
      for (let y = 0; y <= 256; y += 16) {
        x += (r() - 0.5) * 30;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  });
}

export function woodTexture(base: string, repeat: [number, number]) {
  const r = rand(3);
  return canvasTexture(
    256,
    256,
    (g) => {
      for (let i = 0; i < 8; i++) {
        const c = new THREE.Color(base).offsetHSL(0, 0, (r() - 0.5) * 0.08);
        g.fillStyle = `#${c.getHexString()}`;
        g.fillRect(0, i * 32, 256, 32);
        g.fillStyle = "rgba(0,0,0,.18)";
        g.fillRect(0, i * 32, 256, 2);
      }
    },
    repeat,
  );
}

export function stripesTexture(colors: string[], repeat: [number, number]) {
  return canvasTexture(
    128,
    128,
    (g) => {
      const w = 128 / colors.length;
      colors.forEach((c, i) => {
        g.fillStyle = c;
        g.fillRect(i * w, 0, w, 128);
      });
    },
    repeat,
  );
}

export function abstractPainting() {
  const r = rand(21);
  return canvasTexture(256, 320, (g) => {
    g.fillStyle = "#f6e7c8";
    g.fillRect(0, 0, 256, 320);
    const colors = [
      "#e94e3c",
      "#f2b134",
      "#2e86ab",
      "#3bb273",
      "#e86fa8",
      "#7b4fa0",
    ];
    for (let i = 0; i < 16; i++) {
      g.fillStyle = colors[i % colors.length] ?? "#000";
      g.globalAlpha = 0.85;
      g.beginPath();
      g.ellipse(
        r() * 256,
        r() * 320,
        20 + r() * 50,
        15 + r() * 40,
        r() * 3,
        0,
        Math.PI * 2,
      );
      g.fill();
    }
    g.globalAlpha = 1;
  });
}

export function signTexture(
  text: string,
  opts: {
    bg: string;
    fg: string;
    font?: string;
    w?: number;
    h?: number;
    border?: string;
  },
) {
  const w = opts.w ?? 512;
  const h = opts.h ?? 128;
  return canvasTexture(w, h, (g) => {
    g.fillStyle = opts.bg;
    g.fillRect(0, 0, w, h);
    if (opts.border) {
      g.strokeStyle = opts.border;
      g.lineWidth = 10;
      g.strokeRect(5, 5, w - 10, h - 10);
    }
    g.fillStyle = opts.fg;
    g.textAlign = "center";
    g.textBaseline = "middle";
    let size = h * 0.5;
    g.font = `${opts.font ?? "600"} ${size}px Georgia, serif`;
    while (g.measureText(text).width > w * 0.88 && size > 10) {
      size -= 2;
      g.font = `${opts.font ?? "600"} ${size}px Georgia, serif`;
    }
    g.fillText(text, w / 2, h / 2 + 2);
  });
}

export function heartSprite(color = "#ff4f8b") {
  return canvasTexture(64, 64, (g) => {
    g.fillStyle = color;
    g.font = "52px serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("♥", 32, 36);
  });
}

/* ---------- shapes ---------- */

export function heartShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(5, 5);
  s.bezierCurveTo(5, 5, 4, 0, 0, 0);
  s.bezierCurveTo(-6, 0, -6, 7, -6, 7);
  s.bezierCurveTo(-6, 11, -3, 15.4, 5, 19);
  s.bezierCurveTo(12, 15.4, 16, 11, 16, 7);
  s.bezierCurveTo(16, 7, 16, 0, 10, 0);
  s.bezierCurveTo(7, 0, 5, 5, 5, 5);
  return s;
}

export function heartGeometry(size = 1, depth = 0.3) {
  const geo = new THREE.ExtrudeGeometry(heartShape(), {
    depth: depth / (size * 0.05),
    bevelEnabled: true,
    bevelSize: 1.2,
    bevelThickness: 1.2,
    bevelSegments: 3,
    curveSegments: 16,
  });
  geo.center();
  geo.rotateZ(Math.PI);
  geo.scale(size * 0.05, size * 0.05, size * 0.05);
  return geo;
}

/* ---------- people ---------- */

export type PersonOpts = {
  skin: string;
  hair: string;
  top: string;
  bottom: string;
  shoes?: string;
  longHair?: boolean;
  bun?: boolean;
  beard?: boolean;
  glasses?: boolean;
  scale?: number;
  number?: string;
};

export type Person = {
  group: THREE.Group;
  head: THREE.Object3D;
  armL: THREE.Object3D;
  armR: THREE.Object3D;
  legL: THREE.Object3D;
  legR: THREE.Object3D;
  /** Walk cycle when `speed` > 0, idle breathing otherwise; `wave` raises the right arm. */
  animate: (t: number, speed: number, wave?: boolean) => void;
};

function mesh(
  geo: THREE.BufferGeometry,
  m: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  return o;
}

export function makePerson(o: PersonOpts): Person {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const skin = mat(o.skin, { roughness: 0.7 });
  const hair = mat(o.hair, { roughness: 0.6 });
  const top = mat(o.top);
  const bottom = mat(o.bottom);
  const shoes = mat(o.shoes ?? "#2b2b2b");

  const leg = (side: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(0.14 * side, 0.72, 0);
    pivot.add(
      mesh(new THREE.CapsuleGeometry(0.13, 0.42, 4, 8), bottom, 0, -0.32, 0),
    );
    pivot.add(
      mesh(new THREE.BoxGeometry(0.22, 0.12, 0.32), shoes, 0, -0.66, 0.05),
    );
    body.add(pivot);
    return pivot;
  };
  const legL = leg(-1);
  const legR = leg(1);

  const torso = mesh(
    new THREE.CapsuleGeometry(0.3, 0.42, 4, 10),
    top,
    0,
    1.05,
    0,
  );
  torso.scale.set(1, 1, 0.78);
  body.add(torso);
  if (o.number) {
    const num = new THREE.Mesh(
      new THREE.PlaneGeometry(0.34, 0.34),
      new THREE.MeshStandardMaterial({
        map: signTexture(o.number, {
          bg: o.top,
          fg: "#ff8a1f",
          w: 128,
          h: 128,
        }),
        transparent: true,
      }),
    );
    num.position.set(0, 1.08, 0.235);
    body.add(num);
  }

  const arm = (side: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(0.38 * side, 1.34, 0);
    pivot.add(
      mesh(new THREE.CapsuleGeometry(0.1, 0.3, 4, 8), top, 0, -0.16, 0),
    );
    pivot.add(
      mesh(new THREE.CapsuleGeometry(0.08, 0.2, 4, 8), skin, 0, -0.42, 0),
    );
    body.add(pivot);
    return pivot;
  };
  const armL = arm(-1);
  const armR = arm(1);

  const head = new THREE.Group();
  head.position.set(0, 1.78, 0);
  body.add(head);
  head.add(mesh(new THREE.SphereGeometry(0.36, 20, 16), skin));
  head.add(mesh(new THREE.SphereGeometry(0.1, 8, 6), skin, 0, -0.38, 0)); // neck
  const cap = mesh(
    new THREE.SphereGeometry(0.385, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
    hair,
    0,
    0.02,
    -0.02,
  );
  cap.rotation.x = -0.25;
  head.add(cap);
  if (o.longHair) {
    const back = mesh(
      new THREE.CapsuleGeometry(0.3, 0.7, 4, 10),
      hair,
      0,
      -0.42,
      -0.16,
    );
    back.scale.set(1.15, 1, 0.55);
    head.add(back);
    const sideL = mesh(
      new THREE.CapsuleGeometry(0.08, 0.5, 4, 6),
      hair,
      -0.33,
      -0.3,
      0.05,
    );
    const sideR = mesh(
      new THREE.CapsuleGeometry(0.08, 0.5, 4, 6),
      hair,
      0.33,
      -0.3,
      0.05,
    );
    head.add(sideL, sideR);
  }
  if (o.bun)
    head.add(mesh(new THREE.SphereGeometry(0.16, 10, 8), hair, 0, 0.32, -0.2));
  const eye = mat("#1a1414", { roughness: 0.3 });
  head.add(mesh(new THREE.SphereGeometry(0.045, 8, 6), eye, -0.13, 0.03, 0.33));
  head.add(mesh(new THREE.SphereGeometry(0.045, 8, 6), eye, 0.13, 0.03, 0.33));
  const blush = mat("#ff9fb8", { roughness: 0.9 });
  const b1 = mesh(new THREE.CircleGeometry(0.05, 10), blush, -0.2, -0.07, 0.31);
  const b2 = mesh(new THREE.CircleGeometry(0.05, 10), blush, 0.2, -0.07, 0.31);
  b1.rotation.y = -0.5;
  b2.rotation.y = 0.5;
  head.add(b1, b2);
  if (o.beard) {
    const beard = mesh(
      new THREE.SphereGeometry(
        0.3,
        14,
        10,
        0,
        Math.PI * 2,
        Math.PI * 0.55,
        Math.PI * 0.45,
      ),
      hair,
      0,
      0.0,
      0.08,
    );
    beard.scale.set(1.1, 1, 1);
    head.add(beard);
  }
  if (o.glasses) {
    const frame = mat("#111111", { roughness: 0.3 });
    const ringL = mesh(
      new THREE.TorusGeometry(0.085, 0.018, 6, 16),
      frame,
      -0.13,
      0.04,
      0.35,
    );
    const ringR = mesh(
      new THREE.TorusGeometry(0.085, 0.018, 6, 16),
      frame,
      0.13,
      0.04,
      0.35,
    );
    const bridge = mesh(
      new THREE.BoxGeometry(0.08, 0.02, 0.02),
      frame,
      0,
      0.05,
      0.36,
    );
    head.add(ringL, ringR, bridge);
  }

  const s = o.scale ?? 1;
  group.scale.setScalar(s);

  let phase = 0;
  const animate = (t: number, speed: number, wave = false) => {
    if (speed > 0.05) {
      phase += speed * 0.016 * 2.2;
      const swing = Math.sin(phase * 3.2) * 0.7;
      legL.rotation.x = swing;
      legR.rotation.x = -swing;
      armL.rotation.x = -swing * 0.8;
      armR.rotation.x = swing * 0.8;
      armR.rotation.z = 0;
      body.position.y = Math.abs(Math.sin(phase * 3.2)) * 0.06;
    } else {
      legL.rotation.x *= 0.8;
      legR.rotation.x *= 0.8;
      armL.rotation.x *= 0.8;
      body.position.y = Math.sin(t * 2) * 0.015;
      if (wave) {
        armR.rotation.x = 0;
        armR.rotation.z = 2.5 + Math.sin(t * 8) * 0.35;
      } else {
        armR.rotation.x *= 0.8;
        armR.rotation.z *= 0.8;
      }
    }
    head.rotation.z = Math.sin(t * 1.3) * 0.04;
  };

  return { group, head, armL, armR, legL, legR, animate };
}

export const ELENA: PersonOpts = {
  skin: "#f2c7ab",
  hair: "#16100f",
  top: "#f5efe6",
  bottom: "#3a3550",
  shoes: "#f7f7f7",
  longHair: true,
};

export const DAVI: PersonOpts = {
  skin: "#e8b796",
  hair: "#2a1c15",
  top: "#5b3b2b",
  bottom: "#2e3440",
  beard: true,
  glasses: true,
  scale: 1.08,
};

/** Front of a card pack: foil gradient, a big heart and the island's name. */
export function packTexture(label: string) {
  return canvasTexture(256, 384, (g) => {
    const grad = g.createLinearGradient(0, 0, 256, 384);
    grad.addColorStop(0, "#ff7eb3");
    grad.addColorStop(0.45, "#ffc6dc");
    grad.addColorStop(0.55, "#c9b6ff");
    grad.addColorStop(1, "#ff5c95");
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 384);
    g.fillStyle = "rgba(255,255,255,.18)";
    for (let i = -384; i < 384; i += 28) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i + 384, 384);
      g.lineTo(i + 398, 384);
      g.lineTo(i + 14, 0);
      g.fill();
    }
    g.fillStyle = "#8f1d4a";
    g.fillRect(0, 0, 256, 34);
    g.fillRect(0, 350, 256, 34);
    g.fillStyle = "#fff";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = "600 20px Georgia, serif";
    g.fillText("NOSSA HISTÓRIA", 128, 18);
    g.font = "150px serif";
    g.fillText("♥", 128, 185);
    g.font = "600 26px Georgia, serif";
    let size = 26;
    while (g.measureText(label).width > 230 && size > 12) {
      size -= 2;
      g.font = `600 ${size}px Georgia, serif`;
    }
    g.fillText(label, 128, 300);
    g.font = "600 16px Georgia, serif";
    g.fillText("PACOTE DE CARTAS", 128, 367);
  });
}

/** Cover for a photo that is still locked: a question mark on pink. */
export function lockedTexture() {
  return canvasTexture(128, 160, (g) => {
    g.fillStyle = "#ffd6e7";
    g.fillRect(0, 0, 128, 160);
    g.fillStyle = "#e63d7a";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = "700 80px Georgia, serif";
    g.fillText("?", 64, 72);
    g.font = "600 13px Georgia, serif";
    g.fillText("abra o pacote", 64, 135);
  });
}
