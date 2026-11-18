import * as THREE from "three";

import { media } from "../types";
import {
  DAVI,
  ELENA,
  glow,
  heartGeometry,
  heartSprite,
  makePerson,
  mat,
  type Person,
  type PersonOpts,
  signTexture,
  texMat,
} from "./kit";
import { type Ctx, FINALE, MEMORY_ORDER, PLACES } from "./places";

export type Bubble = { text: string; x: number; y: number } | null;

export type WorldEvents = {
  onPickup: (id: string) => void;
  onFinale: () => void;
  onBubble: (bubble: Bubble) => void;
  onNext: (label: string | null) => void;
};

type Box = { minX: number; maxX: number; minZ: number; maxZ: number };
type Npc = {
  person: Person;
  text: string | null;
  mode: string;
  pos: THREE.Vector3;
  baseRot: number;
};
type Pickup = {
  id: string;
  group: THREE.Group;
  pos: THREE.Vector3;
  taken: boolean;
};

const BOUNDS = { minX: -30, maxX: 30, minZ: -192, maxZ: 16 };
const SPEED = 7;
const RADIUS = 0.45;

export class World {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private sun: THREE.DirectionalLight;
  private colliders: Box[] = [];
  private occluders: { mesh: THREE.Mesh; box: Box; top: number }[] = [];
  private npcs: Npc[] = [];
  private pickups: Pickup[] = [];
  private animations: ((t: number) => void)[] = [];
  private player: Person;
  private pos = new THREE.Vector3(0, 0, 10);
  private facing = Math.PI;
  private keys = new Set<string>();
  private stick = { x: 0, y: 0 };
  private frame = 0;
  private disposed = false;
  private beam: THREE.Mesh;
  private finaleDavi: Npc | null = null;
  private finaleFired = false;
  private sparkles: {
    sprite: THREE.Sprite;
    vel: THREE.Vector3;
    life: number;
  }[] = [];
  private heartTex = heartSprite();
  private loader = new THREE.TextureLoader();
  private lastBubble = "";
  private lastNext: string | null | undefined;
  private camTarget = new THREE.Vector3();
  paused = false;
  allCollected = false;
  private memoryLabels: Record<string, string>;

  constructor(
    private canvas: HTMLCanvasElement,
    private events: WorldEvents,
    private daviLines: Record<string, string>,
    labels: Record<string, string>,
    collected: string[],
  ) {
    this.memoryLabels = labels;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !coarse || window.devicePixelRatio < 2,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, coarse ? 1.6 : 2),
    );
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 400);
    this.scene.fog = new THREE.Fog("#ffd0e2", 55, 150);

    this.buildSky();
    const hemi = new THREE.HemisphereLight("#ffe3f1", "#7fb07a", 1.25);
    this.scene.add(hemi);
    this.sun = new THREE.DirectionalLight("#ffe0c2", 2.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -22;
    sc.right = 22;
    sc.top = 22;
    sc.bottom = -22;
    sc.near = 1;
    sc.far = 80;
    this.sun.shadow.bias = -0.0005;
    this.scene.add(this.sun, this.sun.target);

    this.buildGround();
    for (const place of PLACES) this.buildPlace(place);
    this.buildFinale();
    this.buildScenery();

    this.player = makePerson(ELENA);
    this.scene.add(this.player.group);

    this.beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 40, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: "#ff6fa5",
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    this.scene.add(this.beam);

    for (const p of this.pickups)
      if (collected.includes(p.id)) this.take(p, false);
    this.allCollected = this.pickups.every((p) => p.taken);

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("resize", this.resize);
    this.resize();
    this.renderer.setAnimationLoop(this.tick);
    if (process.env.NODE_ENV === "development")
      (window as unknown as { __world: World }).__world = this;
  }

  /** Development only: jump somewhere (used by the screenshot walkthrough). */
  teleport(x: number, z: number) {
    this.pos.set(x, 0, z);
    this.camera.position.set(x, 12, z + 12);
  }

  /* ---------------- public API ---------------- */

  setStick(x: number, y: number) {
    this.stick.x = x;
    this.stick.y = y;
  }

  collect(id: string) {
    const p = this.pickups.find((q) => q.id === id);
    if (p && !p.taken) this.take(p, true);
    this.allCollected = this.pickups.every((q) => q.taken);
  }

  celebrate() {
    for (let i = 0; i < 60; i++)
      this.spark(this.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), 1.6);
  }

  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("resize", this.resize);
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    this.renderer.dispose();
  }

  /* ---------------- input ---------------- */

  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (
      [
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
        "w",
        "a",
        "s",
        "d",
      ].includes(k)
    ) {
      this.keys.add(k);
      e.preventDefault();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  private resize = () => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.8 ? 58 : 48;
    this.camera.updateProjectionMatrix();
  };

  /* ---------------- building ---------------- */

  private buildSky() {
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(300, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader:
          "varying vec3 vP; void main(){ vP = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vP,1.0); }",
        fragmentShader:
          "varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 top = vec3(0.70,0.62,1.0); vec3 mid = vec3(1.0,0.78,0.87); vec3 low = vec3(1.0,0.86,0.76); vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0,0.55,h)) : mix(mid, low, smoothstep(0.0,-0.3,h)); gl_FragColor = vec4(c,1.0); }",
      }),
    );
    this.scene.add(sky);
    this.animations.push(() => sky.position.copy(this.camera.position));
  }

  private buildGround() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 320, 40, 60),
      mat("#9fd18b", { roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.02, -88);
    ground.receiveShadow = true;
    const pos = ground.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const wx = x;
      if (Math.abs(wx) > 36)
        pos.setZ(i, (Math.abs(wx) - 36) * 0.35 + Math.sin(y * 0.2) * 1.2);
    }
    ground.geometry.computeVertexNormals();
    this.scene.add(ground);

    // the path, a winding ribbon through the front of every place
    const points = [new THREE.Vector3(0, 0, 12), new THREE.Vector3(0, 0, 0)];
    for (const p of PLACES)
      points.push(new THREE.Vector3(p.x * 0.55, 0, p.z + p.d / 2 + 3.5));
    points.push(new THREE.Vector3(0, 0, FINALE.z + 8));
    const curve = new THREE.CatmullRomCurve3(points);
    const samples = curve.getSpacedPoints(400);
    const verts: number[] = [];
    const idx: number[] = [];
    samples.forEach((p, i) => {
      const next = samples[Math.min(i + 1, samples.length - 1)] ?? p;
      const prev = samples[Math.max(i - 1, 0)] ?? p;
      const dir = next.clone().sub(prev).normalize();
      const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(1.6);
      verts.push(
        p.x + side.x,
        0.03,
        p.z + side.z,
        p.x - side.x,
        0.03,
        p.z - side.z,
      );
      if (i > 0) {
        const a = (i - 1) * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const path = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        color: "#f3dcc0",
        roughness: 1,
        side: THREE.DoubleSide,
      }),
    );
    path.receiveShadow = true;
    this.scene.add(path);
    this.pathSamples = samples;

    // start: a little welcome arch
    const archMat = mat("#ff8fb8", { roughness: 0.6 });
    for (const x of [-2.6, 2.6])
      this.addMesh(
        new THREE.CylinderGeometry(0.15, 0.15, 3.4, 8),
        archMat,
        x,
        1.7,
        8,
      );
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(2.6, 0.15, 8, 24, Math.PI),
      archMat,
    );
    arch.position.set(0, 3.4, 8);
    this.scene.add(arch);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 0.9),
      new THREE.MeshBasicMaterial({
        map: signTexture("Nossa história", {
          bg: "#fff4f8",
          fg: "#d6336c",
          border: "#ff8fb8",
        }),
        transparent: true,
      }),
    );
    sign.position.set(0, 3.9, 8.05);
    this.scene.add(sign);
  }

  private pathSamples: THREE.Vector3[] = [];

  private nearPath(x: number, z: number, d: number) {
    for (let i = 0; i < this.pathSamples.length; i += 3) {
      const p = this.pathSamples[i];
      if (p && (p.x - x) ** 2 + (p.z - z) ** 2 < d * d) return true;
    }
    return false;
  }

  private insidePlace(x: number, z: number, margin: number) {
    if (
      PLACES.some(
        (p) =>
          Math.abs(x - p.x) < p.w / 2 + margin &&
          Math.abs(z - p.z) < p.d / 2 + margin,
      )
    )
      return true;
    return (x - FINALE.x) ** 2 + (z - FINALE.z) ** 2 < (9 + margin) ** 2;
  }

  private buildScenery() {
    let seed = 42;
    const r = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const trunk = mat("#8b5e3c");
    const greens = ["#4f9d5a", "#5fae63", "#3f8a52"].map((c) => mat(c));
    const blossom = ["#ffb3cf", "#ffc8dd", "#f7a1c4"].map((c) => mat(c));
    const flowers = ["#ff6fa5", "#ffd166", "#ffffff", "#c77dff"].map((c) =>
      mat(c, { roughness: 0.6 }),
    );
    let trees = 0;
    for (let i = 0; i < 900 && trees < 120; i++) {
      const x = (r() - 0.5) * 70;
      const z = BOUNDS.minZ + 4 + r() * (BOUNDS.maxZ - BOUNDS.minZ + 10);
      if (
        this.nearPath(x, z, 4) ||
        this.insidePlace(x, z, 2.5) ||
        (Math.abs(x) < 4 && z > 4)
      )
        continue;
      trees++;
      const s = 0.8 + r() * 0.8;
      const pink = r() < 0.35;
      this.addMesh(
        new THREE.CylinderGeometry(0.18 * s, 0.25 * s, 1.6 * s, 6),
        trunk,
        x,
        0.8 * s,
        z,
      );
      const crown = new THREE.Mesh(
        pink
          ? new THREE.IcosahedronGeometry(1.3 * s, 0)
          : new THREE.ConeGeometry(1.2 * s, 2.6 * s, 7),
        (pink ? blossom : greens)[Math.floor(r() * 3)] ?? greens[0]!,
      );
      crown.position.set(x, (pink ? 2.4 : 2.7) * s, z);
      crown.castShadow = true;
      this.scene.add(crown);
      if (Math.abs(x) < BOUNDS.maxX)
        this.colliders.push({
          minX: x - 0.4,
          maxX: x + 0.4,
          minZ: z - 0.4,
          maxZ: z + 0.4,
        });
    }
    // flowers along the path
    const fGeo = new THREE.SphereGeometry(0.12, 6, 4);
    for (let i = 0; i < this.pathSamples.length; i += 2) {
      const p = this.pathSamples[i];
      if (!p) continue;
      for (const side of [-1, 1]) {
        if (r() < 0.45) continue;
        const x = p.x + side * (2.2 + r() * 1.2);
        const z = p.z + (r() - 0.5);
        if (this.insidePlace(x, z, 0.3)) continue;
        const f = new THREE.Mesh(
          fGeo,
          flowers[Math.floor(r() * flowers.length)] ?? flowers[0]!,
        );
        f.position.set(x, 0.15, z);
        this.scene.add(f);
      }
    }
    // floating hearts in the air
    for (let i = 0; i < 50; i++) {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.heartTex,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
        }),
      );
      const x = (r() - 0.5) * 60;
      const z = BOUNDS.minZ + r() * (BOUNDS.maxZ - BOUNDS.minZ);
      const y = 4 + r() * 8;
      s.position.set(x, y, z);
      s.scale.setScalar(0.6 + r() * 0.6);
      this.scene.add(s);
      const ph = r() * 6;
      this.animations.push((t) => {
        s.position.y = y + Math.sin(t * 0.6 + ph) * 0.6;
      });
    }
  }

  private addMesh(
    geo: THREE.BufferGeometry,
    m: THREE.Material,
    x: number,
    y: number,
    z: number,
  ) {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    this.scene.add(o);
    return o;
  }

  private ctxFor(ox: number, oz: number, group: THREE.Group): Ctx {
    const collide = (x: number, z: number, w: number, d: number) => {
      this.colliders.push({
        minX: ox + x - w / 2,
        maxX: ox + x + w / 2,
        minZ: oz + z - d / 2,
        maxZ: oz + z + d / 2,
      });
    };
    return {
      group,
      collide,
      box: (w, h, d, m, x, y, z, o = {}) => {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          o.occlude ? (m as THREE.Material).clone() : m,
        );
        mesh.position.set(x, y + h / 2, z);
        mesh.castShadow = o.shadow ?? true;
        mesh.receiveShadow = true;
        group.add(mesh);
        if (o.collide) collide(x, z, w, d);
        if (o.occlude) {
          const mm = mesh.material as THREE.MeshStandardMaterial;
          mm.transparent = true;
          this.occluders.push({
            mesh,
            box: {
              minX: ox + x - w / 2,
              maxX: ox + x + w / 2,
              minZ: oz + z - d / 2,
              maxZ: oz + z + d / 2,
            },
            top: y + h,
          });
        }
        return mesh;
      },
      cyl: (rt, rb, h, m, x, y, z, o = {}) => {
        const mesh = new THREE.Mesh(
          new THREE.CylinderGeometry(rt, rb, h, o.seg ?? 12),
          m,
        );
        mesh.position.set(x, y + h / 2, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        if (o.collide) collide(x, z, rb * 2, rb * 2);
        return mesh;
      },
      npc: (opts, x, z, rotY, text, mode = "idle") =>
        this.addNpc(opts, ox + x, oz + z, rotY, text, mode, group, x, z),
      pickup: (id, x, z, y = 1.3) => this.addPickup(id, ox + x, oz + z, y),
      photo: (name, w, h, x, y, z, rotY = 0) => {
        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.16, h + 0.16, 0.06),
          mat("#f7f1e8"),
        );
        frame.position.set(x, y + h / 2, z);
        frame.rotation.y = rotY;
        group.add(frame);
        const tex = this.loader.load(media(name));
        tex.colorSpace = THREE.SRGBColorSpace;
        const pic = new THREE.Mesh(
          new THREE.PlaneGeometry(w, h),
          texMat(tex, { emissive: true, roughness: 0.6 }),
        );
        pic.position.set(
          x + Math.sin(rotY) * 0.04,
          y + h / 2,
          z + Math.cos(rotY) * 0.04,
        );
        pic.rotation.y = rotY;
        group.add(pic);
      },
      sign: (text, x, y, z, o) => {
        const tex = signTexture(text, {
          bg: o.bg,
          fg: o.fg,
          w: o.w,
          h: o.h,
          border: o.border,
        });
        const ratio = (o.w ?? 512) / (o.h ?? 128);
        const height = 0.85;
        const m = o.emissive
          ? new THREE.MeshBasicMaterial({ map: tex })
          : texMat(tex, { emissive: true });
        const sign = new THREE.Mesh(
          new THREE.BoxGeometry(height * ratio, height, 0.08),
          [mat(o.bg), mat(o.bg), mat(o.bg), mat(o.bg), m, mat(o.bg)],
        );
        sign.position.set(x, y + height / 2, z);
        sign.rotation.y = o.rotY ?? 0;
        sign.castShadow = true;
        group.add(sign);
      },
      light: (color, intensity, distance, x, y, z) => {
        const l = new THREE.PointLight(color, intensity, distance, 1.6);
        l.position.set(x, y, z);
        group.add(l);
      },
      animate: (fn) => this.animations.push(fn),
      davi: (id) => this.daviLines[id] ?? "💗",
    };
  }

  private buildPlace(place: (typeof PLACES)[number]) {
    const group = new THREE.Group();
    group.position.set(place.x, 0, place.z);
    this.scene.add(group);
    place.build(this.ctxFor(place.x, place.z, group));
    // a small numbered signpost by the path
    const n = PLACES.indexOf(place) + 1;
    const post = new THREE.Group();
    post.position.set(
      place.x + (place.x < 0 ? place.w / 2 + 1.2 : -place.w / 2 - 1.2),
      0,
      place.z + place.d / 2 + 0.5,
    );
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 1.8, 6),
      mat("#8b5e3c"),
    );
    pole.position.y = 0.9;
    pole.castShadow = true;
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.08), [
      mat("#fff4f8"),
      mat("#fff4f8"),
      mat("#fff4f8"),
      mat("#fff4f8"),
      new THREE.MeshBasicMaterial({
        map: signTexture(`${n}. ${place.label}`, {
          bg: "#fff4f8",
          fg: "#c2255c",
          border: "#ff8fb8",
        }),
      }),
      mat("#fff4f8"),
    ]);
    board.position.y = 1.7;
    board.castShadow = true;
    post.add(pole, board);
    this.scene.add(post);
  }

  private buildFinale() {
    const g = new THREE.Group();
    g.position.set(FINALE.x, 0, FINALE.z);
    this.scene.add(g);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(6, 6.4, 0.5, 32),
      mat("#fff7fb", { roughness: 0.6 }),
    );
    base.position.y = 0.25;
    base.receiveShadow = true;
    g.add(base);
    const step = new THREE.Mesh(
      new THREE.CylinderGeometry(6.8, 7.0, 0.2, 32),
      mat("#ffd6e7", { roughness: 0.6 }),
    );
    step.position.y = 0.1;
    g.add(step);
    // columns and a dome
    const col = mat("#ffffff", { roughness: 0.5 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const c = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.25, 4.5, 10),
        col,
      );
      c.position.set(Math.cos(a) * 5.2, 2.75, Math.sin(a) * 5.2);
      c.castShadow = true;
      g.add(c);
      if (i !== 2)
        this.colliders.push({
          minX: FINALE.x + Math.cos(a) * 5.2 - 0.3,
          maxX: FINALE.x + Math.cos(a) * 5.2 + 0.3,
          minZ: FINALE.z + Math.sin(a) * 5.2 - 0.3,
          maxZ: FINALE.z + Math.sin(a) * 5.2 + 0.3,
        });
    }
    // an open roof: a ring on the columns, so the camera sees inside
    const roof = new THREE.Mesh(
      new THREE.TorusGeometry(5.2, 0.45, 10, 40),
      mat("#ffc2da", { roughness: 0.6 }),
    );
    roof.rotation.x = Math.PI / 2;
    roof.position.y = 5.1;
    roof.castShadow = true;
    g.add(roof);
    // a big glowing heart in the middle
    const heart = new THREE.Mesh(heartGeometry(3.2, 0.5), glow("#ff4f8b", 0.9));
    heart.position.set(0, 3.0, -2.2);
    g.add(heart);
    this.animations.push((t) => {
      const s = 1 + Math.sin(t * 2.4) * 0.06;
      heart.scale.setScalar(s);
    });
    // lanterns
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const l = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 10, 8),
        glow("#ffd27a", 2),
      );
      l.position.set(Math.cos(a) * 7.6, 0.4, Math.sin(a) * 7.6);
      g.add(l);
    }
    this.finaleDavi = this.addNpc(
      { ...DAVI },
      FINALE.x + 0.8,
      FINALE.z + 0.4,
      0,
      null,
      "wave",
      null,
      0,
      0,
    );
  }

  private addNpc(
    opts: PersonOpts,
    x: number,
    z: number,
    rotY: number,
    text: string | null,
    mode: string,
    group: THREE.Group | null,
    lx: number,
    lz: number,
  ): Npc {
    const person = makePerson(opts);
    person.group.rotation.y = rotY;
    if (group) {
      person.group.position.set(lx, 0.12, lz);
      group.add(person.group);
    } else {
      person.group.position.set(x, 0.5, z);
      this.scene.add(person.group);
    }
    if (mode === "sit") {
      person.group.position.y += -0.2;
      person.legL.rotation.x = -1.4;
      person.legR.rotation.x = -1.4;
    }
    if (mode === "violin") {
      const violin = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.55, 0.1),
        mat("#8a3b12", { roughness: 0.4 }),
      );
      violin.position.set(0, -0.35, 0.15);
      violin.rotation.x = 1.2;
      person.armL.add(violin);
      person.armL.rotation.set(-1.4, 0, 0.6);
      const bow = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.8, 0.02),
        mat("#dddddd"),
      );
      bow.position.set(0, -0.45, 0.1);
      bow.rotation.z = 1.2;
      person.armR.add(bow);
    }
    const npc: Npc = {
      person,
      text,
      mode,
      pos: new THREE.Vector3(x, 0, z),
      baseRot: rotY,
    };
    this.npcs.push(npc);
    this.colliders.push({
      minX: x - 0.4,
      maxX: x + 0.4,
      minZ: z - 0.4,
      maxZ: z + 0.4,
    });
    return npc;
  }

  private addPickup(id: string, x: number, z: number, y: number) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const heart = new THREE.Mesh(
      heartGeometry(0.9, 0.25),
      glow("#ff3d7f", 1.2),
    );
    heart.position.y = y;
    heart.castShadow = true;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 0.85, 32),
      new THREE.MeshBasicMaterial({
        color: "#ff6fa5",
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.16;
    group.add(heart, ring);
    this.scene.add(group);
    const pickup: Pickup = {
      id,
      group,
      pos: new THREE.Vector3(x, 0, z),
      taken: false,
    };
    this.pickups.push(pickup);
    this.animations.push((t) => {
      if (pickup.taken) return;
      heart.rotation.y = t * 1.8;
      heart.position.y = y + Math.sin(t * 2.5) * 0.15;
      ring.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
    });
  }

  private take(p: Pickup, celebrate: boolean) {
    p.taken = true;
    p.group.visible = false;
    if (celebrate)
      for (let i = 0; i < 30; i++)
        this.spark(p.pos.clone().add(new THREE.Vector3(0, 1.3, 0)), 1);
  }

  private spark(at: THREE.Vector3, power: number) {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.heartTex,
        transparent: true,
        depthWrite: false,
      }),
    );
    s.position.copy(at);
    s.scale.setScalar(0.4 + Math.random() * 0.4);
    this.scene.add(s);
    const a = Math.random() * Math.PI * 2;
    const v = new THREE.Vector3(
      Math.cos(a) * (1 + Math.random() * 2),
      3 + Math.random() * 3,
      Math.sin(a) * (1 + Math.random() * 2),
    ).multiplyScalar(power);
    this.sparkles.push({ sprite: s, vel: v, life: 1.6 });
  }

  /* ---------------- loop ---------------- */

  private collideCircle(p: THREE.Vector3) {
    for (const b of this.colliders) {
      const cx = Math.max(b.minX, Math.min(p.x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(p.z, b.maxZ));
      const dx = p.x - cx;
      const dz = p.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < RADIUS * RADIUS) {
        if (d2 > 1e-6) {
          const d = Math.sqrt(d2);
          p.x = cx + (dx / d) * RADIUS;
          p.z = cz + (dz / d) * RADIUS;
        } else {
          // center inside the box: push out on the shortest axis
          const pushes = [
            b.minX - RADIUS - p.x,
            b.maxX + RADIUS - p.x,
            b.minZ - RADIUS - p.z,
            b.maxZ + RADIUS - p.z,
          ];
          const abs = pushes.map(Math.abs);
          const i = abs.indexOf(Math.min(...abs));
          if (i < 2) p.x += pushes[i] ?? 0;
          else p.z += pushes[i] ?? 0;
        }
      }
    }
    p.x = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, p.x));
    p.z = Math.max(BOUNDS.minZ, Math.min(BOUNDS.maxZ, p.z));
  }

  private tick = () => {
    if (this.disposed) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    this.frame++;

    // movement
    let mx = 0;
    let mz = 0;
    if (!this.paused) {
      if (this.keys.has("arrowleft") || this.keys.has("a")) mx -= 1;
      if (this.keys.has("arrowright") || this.keys.has("d")) mx += 1;
      if (this.keys.has("arrowup") || this.keys.has("w")) mz -= 1;
      if (this.keys.has("arrowdown") || this.keys.has("s")) mz += 1;
      mx += this.stick.x;
      mz += this.stick.y;
    }
    const len = Math.hypot(mx, mz);
    let speed = 0;
    if (len > 0.08) {
      const k = Math.min(1, len) / len;
      mx *= k;
      mz *= k;
      speed = Math.min(1, len) * SPEED;
      this.pos.x += mx * SPEED * dt;
      this.pos.z += mz * SPEED * dt;
      this.collideCircle(this.pos);
      const target = Math.atan2(mx, mz);
      let diff = target - this.facing;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.facing += diff * Math.min(1, dt * 12);
    }
    const onFinale =
      (this.pos.x - FINALE.x) ** 2 + (this.pos.z - FINALE.z) ** 2 < 6.4 ** 2;
    this.player.group.position.set(
      this.pos.x,
      onFinale ? 0.5 : 0.1,
      this.pos.z,
    );
    this.player.group.rotation.y = this.facing;
    this.player.animate(t, speed);

    // camera
    const portrait = this.camera.aspect < 0.8;
    const back = portrait ? 11.5 : 12.5;
    const up = portrait ? 12.5 : 11.5;
    this.camTarget.set(this.pos.x * 0.85, up, this.pos.z + back);
    this.camera.position.lerp(this.camTarget, Math.min(1, dt * 4));
    this.camera.lookAt(this.pos.x * 0.92, 1, this.pos.z - 2.5);
    this.sun.position.set(this.pos.x - 14, 26, this.pos.z + 10);
    this.sun.target.position.set(this.pos.x, 0, this.pos.z - 4);

    for (const fn of this.animations) fn(t);

    // walls between the camera and Elena fade out
    for (const o of this.occluders) {
      const m = o.mesh.material as THREE.MeshStandardMaterial;
      const behind =
        this.pos.z < o.box.minZ + 0.2 &&
        this.pos.z > o.box.minZ - 8 &&
        this.pos.x > o.box.minX - 1.5 &&
        this.pos.x < o.box.maxX + 1.5;
      const target = behind ? 0.18 : 1;
      m.opacity += (target - m.opacity) * Math.min(1, dt * 8);
      m.depthWrite = m.opacity > 0.95;
    }

    // npcs
    let bubble: { text: string; at: THREE.Vector3 } | null = null;
    let best = 3.6;
    for (const n of this.npcs) {
      const wave = n.mode === "wave" || n === this.finaleDavi;
      n.person.animate(t + n.pos.x, 0, wave);
      if (n.mode === "violin")
        n.person.armR.rotation.set(-1.0 + Math.sin(t * 4) * 0.25, 0, -0.4);
      const d = Math.hypot(n.pos.x - this.pos.x, n.pos.z - this.pos.z);
      const text = n === this.finaleDavi ? this.finaleText() : n.text;
      if (text && d < best) {
        best = d;
        bubble = { text, at: n.pos.clone().setY(2.6) };
      }
      if (d < 4 && n.mode !== "sit" && n.mode !== "violin") {
        const look = Math.atan2(this.pos.x - n.pos.x, this.pos.z - n.pos.z);
        let diff = look - n.person.group.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        n.person.group.rotation.y += diff * Math.min(1, dt * 4);
      }
    }
    if (bubble) {
      const p = bubble.at.clone().project(this.camera);
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;
      this.events.onBubble({
        text: bubble.text,
        x: (p.x * 0.5 + 0.5) * w,
        y: (-p.y * 0.5 + 0.5) * h,
      });
      this.lastBubble = bubble.text;
    } else if (this.lastBubble) {
      this.lastBubble = "";
      this.events.onBubble(null);
    }

    // pickups
    if (!this.paused) {
      for (const p of this.pickups) {
        if (p.taken) continue;
        if (Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < 1.15) {
          this.paused = true;
          this.keys.clear();
          this.events.onPickup(p.id);
          break;
        }
      }
      if (
        this.allCollected &&
        !this.finaleFired &&
        this.finaleDavi &&
        Math.hypot(
          this.finaleDavi.pos.x - this.pos.x,
          this.finaleDavi.pos.z - this.pos.z,
        ) < 2.2
      ) {
        this.finaleFired = true;
        this.paused = true;
        this.keys.clear();
        this.events.onFinale();
      }
    }

    // guiding beam over the next memory (or the gazebo at the end)
    const next = MEMORY_ORDER.map((id) =>
      this.pickups.find((p) => p.id === id),
    ).find((p) => p && !p.taken);
    const beamAt = next
      ? next.pos
      : this.allCollected && !this.finaleFired
        ? new THREE.Vector3(FINALE.x, 0, FINALE.z)
        : null;
    this.beam.visible = !!beamAt;
    if (beamAt) {
      this.beam.position.set(beamAt.x, 20, beamAt.z);
      (this.beam.material as THREE.MeshBasicMaterial).opacity =
        0.16 + Math.sin(t * 3) * 0.06;
    }
    const nextLabel = next
      ? (this.memoryLabels[next.id] ?? null)
      : this.allCollected && !this.finaleFired
        ? "O coração no fim do caminho"
        : null;
    if (nextLabel !== this.lastNext) {
      this.lastNext = nextLabel;
      this.events.onNext(nextLabel);
    }

    // sparkles
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const s = this.sparkles[i];
      if (!s) continue;
      s.life -= dt;
      s.vel.y -= 6 * dt;
      s.sprite.position.addScaledVector(s.vel, dt);
      (s.sprite.material as THREE.SpriteMaterial).opacity = Math.max(
        0,
        s.life / 1.6,
      );
      if (s.life <= 0) {
        this.scene.remove(s.sprite);
        s.sprite.material.dispose();
        this.sparkles.splice(i, 1);
      }
    }

    this.renderer.render(this.scene, this.camera);
  };

  private finaleText() {
    if (this.allCollected) return "Vem cá, tenho uma coisa pra você 💗";
    const left = this.pickups.filter((p) => !p.taken).length;
    return `Ainda faltam ${left} ${left === 1 ? "memória" : "memórias"} pelo caminho 💭`;
  }
}
