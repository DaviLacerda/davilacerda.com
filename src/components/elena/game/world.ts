import * as THREE from "three";

import { media, type Who } from "../types";
import {
  DAVI,
  ELENA,
  glow,
  heartGeometry,
  heartSprite,
  lockedTexture,
  makePerson,
  mat,
  packTexture,
  type Person,
  type PersonOpts,
  signTexture,
  texMat,
} from "./kit";
import { type Ctx, type Place, PLACES } from "./places";

export type Bubble = { text: string; x: number; y: number } | null;

export type WorldEvents = {
  /** The player is next to an unopened pack (or walked away: null). */
  onNear: (islandId: string | null) => void;
  /** The player tapped a pack in the scene. */
  onPackTap: (islandId: string) => void;
  onFinale: () => void;
  onBubble: (bubble: Bubble) => void;
  onNext: (label: string | null) => void;
};

export type WorldOptions = {
  skin: Who;
  /** What the other person says on each island. */
  lines: Record<string, string>;
  labels: Record<string, string>;
  opened: string[];
};

type Box = { minX: number; maxX: number; minZ: number; maxZ: number };
type Npc = {
  person: Person;
  text: string | null;
  mode: string;
  pos: THREE.Vector3;
};
type Pack = {
  id: string;
  group: THREE.Group;
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  opened: boolean;
};
type Disc = { x: number; z: number; r: number };
type Bridge = { a: THREE.Vector2; b: THREE.Vector2 };

const SPEED = 7;
const RADIUS = 0.45;
const HUB = { x: 0, z: 10, r: 11 };
const FINALE = { x: 0, z: -236, r: 11 };
const ISLAND_POS: Record<string, { x: number; z: number }> = {
  panedoca: { x: -13, z: -26 },
  "casa-vo": { x: 13, z: -60 },
  caldas: { x: -13, z: -96 },
  famiglia: { x: 13, z: -132 },
  casa: { x: -13, z: -168 },
  cinema: { x: 13, z: -202 },
};
/** The room sits a little north of the island's center, leaving a front yard. */
const ROOM_OFFSET = -1.5;

/** Elena's outfits from the photos of each place, when she is the one waiting there. */
const ELENA_OUTFITS: Record<string, Partial<PersonOpts>> = {
  "casa-vo": { top: "#2f4f8f", bottom: "#2f4f8f" },
  caldas: { top: "#ff9fc4", bottom: "#f3e6da" },
  famiglia: { top: "#f5efe6", bottom: "#1d1d1d" },
  casa: { top: "#f5efe6", bottom: "#3a3550" },
  cinema: { top: "#2b2b2b", bottom: "#2b2b2b" },
};

export class World {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private sun: THREE.DirectionalLight;
  private colliders: Box[] = [];
  private occluders: { mesh: THREE.Mesh; box: Box }[] = [];
  private npcs: Npc[] = [];
  private packs: Pack[] = [];
  private photos: { island: string; mesh: THREE.Mesh; name: string }[] = [];
  private discs: Disc[] = [];
  private bridges: Bridge[] = [];
  private animations: ((t: number) => void)[] = [];
  private player: Person;
  private pos = new THREE.Vector3(HUB.x, 0, HUB.z + 4);
  private facing = Math.PI;
  private keys = new Set<string>();
  private stick = { x: 0, y: 0 };
  private disposed = false;
  private beam: THREE.Mesh;
  private finalePartner: Npc | null = null;
  private finaleFired = false;
  private sparkles: {
    sprite: THREE.Sprite;
    vel: THREE.Vector3;
    life: number;
  }[] = [];
  private heartTex = heartSprite();
  private loader = new THREE.TextureLoader();
  private locked = lockedTexture();
  private lastBubble = "";
  private lastNext: string | null | undefined;
  private lastNear: string | null = null;
  private camTarget = new THREE.Vector3();
  private raycaster = new THREE.Raycaster();
  private partnerOpts: PersonOpts;
  private partnerWho: Who;
  paused = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private events: WorldEvents,
    private opts: WorldOptions,
  ) {
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

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 500);
    this.scene.fog = new THREE.Fog("#ffd0e2", 60, 170);

    this.partnerWho = opts.skin === "elena" ? "davi" : "elena";
    this.partnerOpts = this.partnerWho === "davi" ? DAVI : ELENA;

    this.buildSky();
    this.scene.add(new THREE.HemisphereLight("#ffe3f1", "#7fb07a", 1.25));
    this.sun = new THREE.DirectionalLight("#ffe0c2", 2.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
    Object.assign(this.sun.shadow.camera, {
      left: -24,
      right: 24,
      top: 24,
      bottom: -24,
      near: 1,
      far: 90,
    });
    this.sun.shadow.bias = -0.0005;
    this.scene.add(this.sun, this.sun.target);

    this.buildWater();
    this.buildIslands();

    this.player = makePerson(opts.skin === "elena" ? ELENA : DAVI);
    this.scene.add(this.player.group);

    this.beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 40, 16, 1, true),
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

    for (const id of opts.opened) this.markOpened(id, false);

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("resize", this.resize);
    this.resize();
    this.renderer.setAnimationLoop(this.tick);
    if (process.env.NODE_ENV === "development")
      (window as unknown as { __world: World }).__world = this;
  }

  /* ---------------- public API ---------------- */

  setStick(x: number, y: number) {
    this.stick.x = x;
    this.stick.y = y;
  }

  /** The island's pack was opened: hide it and uncover its photos. */
  markOpened(id: string, celebrate = true) {
    const p = this.packs.find((q) => q.id === id);
    if (p && !p.opened) {
      p.opened = true;
      p.group.visible = false;
      if (celebrate)
        for (let i = 0; i < 40; i++)
          this.spark(p.pos.clone().add(new THREE.Vector3(0, 1.3, 0)), 1);
    }
    for (const ph of this.photos) {
      if (ph.island !== id) continue;
      const tex = this.loader.load(media(ph.name));
      tex.colorSpace = THREE.SRGBColorSpace;
      ph.mesh.material = texMat(tex, { emissive: true, roughness: 0.6 });
    }
    if (this.lastNear === id) {
      this.lastNear = null;
      this.events.onNear(null);
    }
  }

  get allOpened() {
    return this.packs.every((p) => p.opened);
  }

  /** Tap or click on the canvas: open a pack if it was hit (and is close enough). */
  pick(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.intersectObjects(
      this.packs.filter((p) => !p.opened).map((p) => p.mesh),
    )[0];
    if (!hit) return;
    const pack = this.packs.find((p) => p.mesh === hit.object);
    if (pack && pack.pos.distanceTo(this.pos.clone().setY(0)) < 6)
      this.events.onPackTap(pack.id);
  }

  /** Development only: jump somewhere (used by the screenshot walkthrough). */
  teleport(x: number, z: number) {
    this.pos.set(x, 0, z);
    this.camera.position.set(x, 12, z + 12);
  }

  celebrate() {
    for (let i = 0; i < 70; i++)
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
      new THREE.SphereGeometry(400, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader:
          "varying vec3 vP; void main(){ vP = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vP,1.0); }",
        fragmentShader:
          "varying vec3 vP; void main(){ float h = normalize(vP - cameraPosition).y; vec3 top = vec3(0.70,0.62,1.0); vec3 mid = vec3(1.0,0.80,0.88); vec3 low = vec3(1.0,0.86,0.78); vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0,0.55,h)) : mix(mid, low, smoothstep(0.0,-0.3,h)); gl_FragColor = vec4(c,1.0); }",
      }),
    );
    this.scene.add(sky);
    this.animations.push(() => sky.position.copy(this.camera.position));
  }

  private buildWater() {
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 700),
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader:
          "varying vec3 vW; void main(){ vW = (modelMatrix*vec4(position,1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW,1.0); }",
        fragmentShader:
          "uniform float uTime; varying vec3 vW; void main(){ vec2 p = vW.xz * 0.12; float w = sin(p.x*2.0+uTime*0.7)*sin(p.y*2.3-uTime*0.6); float s = smoothstep(0.82,1.0,abs(w)); vec3 c = mix(vec3(0.62,0.80,1.0), vec3(1.0,0.78,0.88), 0.35 + 0.15*sin(p.x*0.3)); gl_FragColor = vec4(c + s*0.18, 1.0); }",
      }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -9, -110);
    this.scene.add(water);
    this.animations.push(
      (t) =>
        ((water.material as THREE.ShaderMaterial).uniforms.uTime!.value = t),
    );

    // clouds drifting between the islands
    const cloud = mat("#ffffff", { roughness: 1 });
    let seed = 9;
    const r = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < 26; i++) {
      const g = new THREE.Group();
      for (let k = 0; k < 4; k++) {
        const puff = new THREE.Mesh(
          new THREE.IcosahedronGeometry(1.4 + r() * 1.4, 1),
          cloud,
        );
        puff.position.set(k * 1.6 - 2.4, r() * 0.8, r() * 1.2);
        g.add(puff);
      }
      const x = (r() < 0.5 ? -1 : 1) * (32 + r() * 30);
      const z = 20 - r() * 270;
      g.position.set(x, -6 + r() * 18, z);
      this.scene.add(g);
      const sp = 0.2 + r() * 0.4;
      this.animations.push(
        (t) => (g.position.x = x + Math.sin(t * 0.05 * sp + i) * 6),
      );
    }
  }

  private islandBase(x: number, z: number, r: number, grass: string) {
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r * 0.97, 0.8, 48),
      mat(grass, { roughness: 1 }),
    );
    top.position.set(x, -0.4, z);
    top.receiveShadow = true;
    this.scene.add(top);
    const sand = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.97, r * 0.9, 0.9, 48),
      mat("#f3dcc0", { roughness: 1 }),
    );
    sand.position.set(x, -1.2, z);
    this.scene.add(sand);
    const rock = new THREE.Mesh(
      new THREE.ConeGeometry(r * 0.9, 7, 12, 3),
      mat("#c7a0b4", { roughness: 1 }),
    );
    rock.rotation.x = Math.PI;
    rock.position.set(x, -5.1, z);
    this.scene.add(rock);
    this.discs.push({ x, z, r: r - 0.5 });
  }

  private buildIslands() {
    this.islandBase(HUB.x, HUB.z, HUB.r, "#b6e0a0");
    this.buildPhone(HUB.x - 5, HUB.z - 1);
    for (const place of PLACES) {
      const p = ISLAND_POS[place.id];
      if (!p) continue;
      this.islandBase(p.x, p.z, place.radius, place.theme.grass);
      this.buildPlace(place, p.x, p.z);
    }
    this.islandBase(FINALE.x, FINALE.z, FINALE.r, "#ffd6e7");
    this.buildFinale();

    const chain: Disc[] = [
      HUB,
      ...PLACES.map((pl) => ({ ...ISLAND_POS[pl.id]!, r: pl.radius })),
      FINALE,
    ];
    for (let i = 0; i < chain.length - 1; i++)
      this.buildBridge(chain[i]!, chain[i + 1]!, i);
    this.buildScenery(chain);
  }

  private buildBridge(a: Disc, b: Disc, index: number) {
    const A = new THREE.Vector2(a.x, a.z);
    const B = new THREE.Vector2(b.x, b.z);
    const dir = B.clone().sub(A).normalize();
    const start = A.clone().addScaledVector(dir, a.r - 1.2);
    const end = B.clone().addScaledVector(dir, -(b.r - 1.2));
    this.bridges.push({ a: start, b: end });
    const len = start.distanceTo(end);
    const g = new THREE.Group();
    g.position.set((start.x + end.x) / 2, 0, (start.y + end.y) / 2);
    g.rotation.y = Math.atan2(dir.x, dir.y);
    this.scene.add(g);
    const plank = mat("#b9835a", { roughness: 0.9 });
    const plankDark = mat("#a5714a", { roughness: 0.9 });
    const n = Math.floor(len / 0.6);
    for (let i = 0; i < n; i++) {
      const p = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 0.15, 0.5),
        i % 2 ? plank : plankDark,
      );
      p.position.set(
        0,
        -0.05 + Math.sin(((i + 0.5) / n) * Math.PI) * 0.6,
        -len / 2 + (i + 0.5) * (len / n),
      );
      p.receiveShadow = true;
      p.castShadow = true;
      g.add(p);
    }
    const posts = Math.max(2, Math.floor(len / 4));
    for (let i = 0; i <= posts; i++) {
      const z = -len / 2 + (i / posts) * len;
      const lift = Math.sin((i / posts) * Math.PI) * 0.6;
      for (const x of [-1.45, 1.45]) {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.07, 0.07, 1.1, 6),
          plankDark,
        );
        post.position.set(x, 0.5 + lift, z);
        post.castShadow = true;
        g.add(post);
        const ball = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 8, 6),
          glow(index % 2 ? "#ff8fb8" : "#ffd27a", 1.2),
        );
        ball.position.set(x, 1.1 + lift, z);
        g.add(ball);
      }
    }
  }

  private buildPhone(x: number, z: number) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = 0.35;
    this.scene.add(g);
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 5, 0.4),
      mat("#1d1d22", { roughness: 0.3 }),
    );
    body.position.y = 3.2;
    body.castShadow = true;
    g.add(body);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, 4.5),
      new THREE.MeshBasicMaterial({
        map: signTexture("♥ match!", {
          bg: "#ff5c95",
          fg: "#ffffff",
          w: 256,
          h: 512,
        }),
      }),
    );
    screen.position.set(0, 3.2, 0.21);
    g.add(screen);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.6, 0.6, 20),
      mat("#ffc6dc"),
    );
    base.position.y = 0.3;
    g.add(base);
    this.colliders.push({
      minX: x - 1.6,
      maxX: x + 1.6,
      minZ: z - 1.6,
      maxZ: z + 1.6,
    });
    this.animations.push(
      (t) =>
        (body.position.y = screen.position.y = 3.2 + Math.sin(t * 1.5) * 0.15),
    );
  }

  /** Distance from (x, z) to the nearest bridge, with how far along it (0..1). */
  private bridgeAt(x: number, z: number): { d: number; t: number } {
    const P = new THREE.Vector2(x, z);
    let best = { d: Infinity, t: 0 };
    for (const b of this.bridges) {
      const ab = b.b.clone().sub(b.a);
      const t = Math.max(
        0,
        Math.min(1, P.clone().sub(b.a).dot(ab) / ab.lengthSq()),
      );
      const d = b.a.clone().addScaledVector(ab, t).distanceTo(P);
      if (d < best.d) best = { d, t };
    }
    return best;
  }

  private onIsland(x: number, z: number) {
    return this.discs.some((d) => (x - d.x) ** 2 + (z - d.z) ** 2 < d.r * d.r);
  }

  private walkable(x: number, z: number) {
    return this.onIsland(x, z) || this.bridgeAt(x, z).d < 1.25;
  }

  private buildScenery(chain: Disc[]) {
    let seed = 42;
    const r = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const trunk = mat("#8b5e3c");
    const greens = ["#4f9d5a", "#5fae63", "#3f8a52"].map((c) => mat(c));
    const blossom = ["#ffb3cf", "#ffc8dd", "#f7a1c4"].map((c) => mat(c));
    const flowers = ["#ff6fa5", "#ffd166", "#ffffff", "#c77dff"].map((c) =>
      mat(c, { roughness: 0.6 }),
    );
    const fGeo = new THREE.SphereGeometry(0.13, 6, 4);
    const rooms = PLACES.map((pl) => ({
      x: ISLAND_POS[pl.id]!.x,
      z: ISLAND_POS[pl.id]!.z + ROOM_OFFSET,
      w: pl.w / 2 + 1.2,
      d: pl.d / 2 + 1.2,
    }));
    // keep a clear walkway from each bridge end to the next one across every island
    const walkway = (x: number, z: number, d: number) => {
      for (let i = 0; i < chain.length; i++) {
        const c = chain[i]!;
        for (const o of [chain[i - 1], chain[i + 1]]) {
          if (!o) continue;
          const dir = new THREE.Vector2(o.x - c.x, o.z - c.z).normalize();
          const end = new THREE.Vector2(c.x, c.z).addScaledVector(dir, c.r);
          if (end.distanceTo(new THREE.Vector2(x, z)) < d + 2) return true;
        }
      }
      return false;
    };
    const blocked = (x: number, z: number, m: number) =>
      this.bridgeAt(x, z).d < 2.6 + m ||
      walkway(x, z, m) ||
      rooms.some(
        (q) => Math.abs(x - q.x) < q.w + m && Math.abs(z - q.z) < q.d + m,
      ) ||
      (x - HUB.x) ** 2 + (z - HUB.z - 4) ** 2 < 9 ||
      (x - (HUB.x - 5)) ** 2 + (z - (HUB.z - 1)) ** 2 < 6 ||
      (x - FINALE.x) ** 2 + (z - FINALE.z) ** 2 < 64;
    for (const d of chain) {
      let trees = 0;
      for (let i = 0; i < 200 && trees < 8; i++) {
        const a = r() * Math.PI * 2;
        const rr = d.r - 1.6 - r() * 2.5;
        const x = d.x + Math.cos(a) * rr;
        const z = d.z + Math.sin(a) * rr;
        if (blocked(x, z, 0.5)) continue;
        trees++;
        const s = 0.7 + r() * 0.6;
        const pink = r() < 0.4;
        const t = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18 * s, 0.25 * s, 1.6 * s, 6),
          trunk,
        );
        t.position.set(x, 0.8 * s, z);
        t.castShadow = true;
        this.scene.add(t);
        const crown = new THREE.Mesh(
          pink
            ? new THREE.IcosahedronGeometry(1.3 * s, 0)
            : new THREE.ConeGeometry(1.2 * s, 2.6 * s, 7),
          (pink ? blossom : greens)[Math.floor(r() * 3)] ?? greens[0]!,
        );
        crown.position.set(x, (pink ? 2.4 : 2.7) * s, z);
        crown.castShadow = true;
        this.scene.add(crown);
        this.colliders.push({
          minX: x - 0.4,
          maxX: x + 0.4,
          minZ: z - 0.4,
          maxZ: z + 0.4,
        });
      }
      for (let i = 0; i < 70; i++) {
        const a = r() * Math.PI * 2;
        const rr = r() * (d.r - 0.8);
        const x = d.x + Math.cos(a) * rr;
        const z = d.z + Math.sin(a) * rr;
        if (blocked(x, z, -1.2)) continue;
        const f = new THREE.Mesh(
          fGeo,
          flowers[Math.floor(r() * flowers.length)] ?? flowers[0]!,
        );
        f.position.set(x, 0.12, z);
        this.scene.add(f);
      }
    }
    for (let i = 0; i < 50; i++) {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.heartTex,
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
        }),
      );
      const x = (r() - 0.5) * 70;
      const z = 20 - r() * 270;
      const y = 4 + r() * 9;
      s.position.set(x, y, z);
      s.scale.setScalar(0.6 + r() * 0.7);
      this.scene.add(s);
      const ph = r() * 6;
      this.animations.push(
        (t) => (s.position.y = y + Math.sin(t * 0.6 + ph) * 0.6),
      );
    }
  }

  private ctxFor(
    place: Place,
    ox: number,
    oz: number,
    group: THREE.Group,
  ): Ctx {
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
          o.occlude ? m.clone() : m,
        );
        mesh.position.set(x, y + h / 2, z);
        mesh.castShadow = o.shadow ?? true;
        mesh.receiveShadow = true;
        group.add(mesh);
        if (o.collide) collide(x, z, w, d);
        if (o.occlude) {
          (mesh.material as THREE.MeshStandardMaterial).transparent = true;
          this.occluders.push({
            mesh,
            box: {
              minX: ox + x - w / 2,
              maxX: ox + x + w / 2,
              minZ: oz + z - d / 2,
              maxZ: oz + z + d / 2,
            },
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
      npc: (o, x, z, rotY, text, mode = "idle") => {
        this.addNpc(o, ox + x, oz + z, rotY, text, mode, group, x, z);
      },
      partner: (x, z, rotY, outfit) => {
        const look =
          this.partnerWho === "davi"
            ? { ...DAVI, ...outfit }
            : { ...ELENA, ...ELENA_OUTFITS[place.id] };
        this.addNpc(
          look,
          ox + x,
          oz + z,
          rotY,
          this.opts.lines[place.id] ?? "💗",
          "idle",
          group,
          x,
          z,
        );
      },
      pack: (x, z) => this.addPack(place, ox + x, oz + z),
      photo: (name, w, h, x, y, z, rotY = 0) => {
        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.16, h + 0.16, 0.06),
          mat("#f7f1e8"),
        );
        frame.position.set(x, y + h / 2, z);
        frame.rotation.y = rotY;
        group.add(frame);
        const pic = new THREE.Mesh(
          new THREE.PlaneGeometry(w, h),
          texMat(this.locked, { emissive: true }),
        );
        pic.position.set(
          x + Math.sin(rotY) * 0.04,
          y + h / 2,
          z + Math.cos(rotY) * 0.04,
        );
        pic.rotation.y = rotY;
        group.add(pic);
        this.photos.push({ island: place.id, mesh: pic, name });
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
        const face = o.emissive
          ? new THREE.MeshBasicMaterial({ map: tex })
          : texMat(tex, { emissive: true });
        const side = mat(o.bg);
        const sign = new THREE.Mesh(
          new THREE.BoxGeometry(height * ratio, height, 0.08),
          [side, side, side, side, face, side],
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
    };
  }

  private buildPlace(place: Place, cx: number, cz: number) {
    const group = new THREE.Group();
    group.position.set(cx, 0, cz + ROOM_OFFSET);
    this.scene.add(group);
    place.build(this.ctxFor(place, cx, cz + ROOM_OFFSET, group));

    // the land's icon, floating behind the room
    const icon = new THREE.Group();
    const wrap = new THREE.Group();
    wrap.position.set(cx + (cx < 0 ? -5 : 5), 0, cz - place.radius * 0.6);
    wrap.add(icon);
    this.scene.add(wrap);
    place.landmark(icon, (fn) => this.animations.push(fn));

    // a welcome arch where the bridge from the previous island lands
    const n = PLACES.indexOf(place) + 1;
    const prev = n === 1 ? HUB : ISLAND_POS[PLACES[n - 2]!.id]!;
    const dir = new THREE.Vector2(prev.x - cx, prev.z - cz).normalize();
    const at = new THREE.Vector2(cx, cz).addScaledVector(
      dir,
      place.radius - 2.2,
    );
    const arch = new THREE.Group();
    arch.position.set(at.x, 0, at.y);
    arch.rotation.y = Math.atan2(dir.x, dir.y);
    this.scene.add(arch);
    const archMat = mat(place.theme.accent, { roughness: 0.6 });
    for (const x of [-1.9, 1.9]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.18, 3.2, 8),
        archMat,
      );
      post.position.set(x, 1.6, 0);
      post.castShadow = true;
      arch.add(post);
      this.colliders.push({
        minX: at.x + Math.cos(arch.rotation.y) * x - 0.25,
        maxX: at.x + Math.cos(arch.rotation.y) * x + 0.25,
        minZ: at.y - Math.sin(arch.rotation.y) * x - 0.25,
        maxZ: at.y - Math.sin(arch.rotation.y) * x + 0.25,
      });
    }
    const top = new THREE.Mesh(
      new THREE.TorusGeometry(1.9, 0.16, 8, 24, Math.PI),
      archMat,
    );
    top.position.y = 3.2;
    arch.add(top);
    const signMat = new THREE.MeshBasicMaterial({
      map: signTexture(`${n}. ${place.label}`, {
        bg: place.theme.accent,
        fg: place.theme.sign,
        border: place.theme.sign,
      }),
      side: THREE.DoubleSide,
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.75), signMat);
    board.position.set(0, 3.55, 0.02);
    arch.add(board);
  }

  private buildFinale() {
    const g = new THREE.Group();
    g.position.set(FINALE.x, 0, FINALE.z);
    this.scene.add(g);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(6, 6.4, 0.4, 32),
      mat("#fff7fb", { roughness: 0.6 }),
    );
    base.position.y = 0.2;
    base.receiveShadow = true;
    g.add(base);
    const col = mat("#ffffff", { roughness: 0.5 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const c = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.25, 4.5, 10),
        col,
      );
      c.position.set(Math.cos(a) * 5.2, 2.65, Math.sin(a) * 5.2);
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
    const roof = new THREE.Mesh(
      new THREE.TorusGeometry(5.2, 0.45, 10, 40),
      mat("#ffc2da", { roughness: 0.6 }),
    );
    roof.rotation.x = Math.PI / 2;
    roof.position.y = 5.0;
    roof.castShadow = true;
    g.add(roof);
    const heart = new THREE.Mesh(heartGeometry(3.2, 0.5), glow("#ff4f8b", 0.9));
    heart.position.set(0, 3.0, -2.2);
    g.add(heart);
    this.animations.push((t) =>
      heart.scale.setScalar(1 + Math.sin(t * 2.4) * 0.06),
    );
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const l = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 10, 8),
        glow("#ffd27a", 2),
      );
      l.position.set(Math.cos(a) * 8.6, 0.3, Math.sin(a) * 8.6);
      g.add(l);
    }
    this.finalePartner = this.addNpc(
      { ...this.partnerOpts },
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
    o: PersonOpts,
    x: number,
    z: number,
    rotY: number,
    text: string | null,
    mode: string,
    group: THREE.Group | null,
    lx: number,
    lz: number,
  ): Npc {
    const person = makePerson(o);
    person.group.rotation.y = rotY;
    if (group) {
      person.group.position.set(lx, 0.12, lz);
      group.add(person.group);
    } else {
      person.group.position.set(x, 0.4, z);
      this.scene.add(person.group);
    }
    if (mode === "sit") {
      person.group.position.y -= 0.2;
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
    const npc: Npc = { person, text, mode, pos: new THREE.Vector3(x, 0, z) };
    this.npcs.push(npc);
    this.colliders.push({
      minX: x - 0.4,
      maxX: x + 0.4,
      minZ: z - 0.4,
      maxZ: z + 0.4,
    });
    return npc;
  }

  private addPack(place: Place, x: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const tex = packTexture(place.label);
    const foil = mat("#ff8fb8", { metalness: 0.4, roughness: 0.3 });
    const face = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: 0.35,
      roughness: 0.35,
      metalness: 0.2,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 0.08), [
      foil,
      foil,
      foil,
      foil,
      face,
      face,
    ]);
    mesh.position.y = 1.4;
    mesh.castShadow = true;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 0.95, 32),
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
    group.add(mesh, ring);
    this.scene.add(group);
    const pack: Pack = {
      id: place.id,
      group,
      mesh,
      pos: new THREE.Vector3(x, 0, z),
      opened: false,
    };
    this.packs.push(pack);
    this.animations.push((t) => {
      if (pack.opened) return;
      mesh.rotation.y = Math.sin(t * 1.4) * 0.8;
      mesh.position.y = 1.4 + Math.sin(t * 2.5) * 0.15;
      ring.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
    });
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
      if (d2 >= RADIUS * RADIUS) continue;
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2);
        p.x = cx + (dx / d) * RADIUS;
        p.z = cz + (dz / d) * RADIUS;
      } else {
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

  /** Moves with sliding along walls and edges; never off an island or a bridge. */
  private move(dx: number, dz: number) {
    const tries: [number, number][] = [
      [dx, dz],
      [dx, 0],
      [0, dz],
    ];
    for (const [mx, mz] of tries) {
      if (mx === 0 && mz === 0) continue;
      const next = this.pos.clone();
      next.x += mx;
      next.z += mz;
      this.collideCircle(next);
      if (this.walkable(next.x, next.z)) {
        this.pos.copy(next);
        return;
      }
    }
  }

  /** Height under the player: the arc of a bridge, or the island top. */
  private groundY() {
    if (this.onIsland(this.pos.x, this.pos.z)) return 0.1;
    const b = this.bridgeAt(this.pos.x, this.pos.z);
    return 0.1 + Math.sin(b.t * Math.PI) * 0.6;
  }

  private tick = () => {
    if (this.disposed) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;

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
      this.move(mx * SPEED * dt, mz * SPEED * dt);
      let diff = Math.atan2(mx, mz) - this.facing;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.facing += diff * Math.min(1, dt * 12);
    }
    const onGazebo =
      (this.pos.x - FINALE.x) ** 2 + (this.pos.z - FINALE.z) ** 2 < 6.2 ** 2;
    const y = onGazebo ? 0.4 : this.groundY();
    this.player.group.position.set(this.pos.x, y, this.pos.z);
    this.player.group.rotation.y = this.facing;
    this.player.animate(t, speed);

    const portrait = this.camera.aspect < 0.8;
    this.camTarget.set(
      this.pos.x,
      (portrait ? 12.5 : 11.5) + y,
      this.pos.z + (portrait ? 11.5 : 12.5),
    );
    this.camera.position.lerp(this.camTarget, Math.min(1, dt * 4));
    this.camera.lookAt(this.pos.x, 1 + y, this.pos.z - 2.5);
    this.sun.position.set(this.pos.x - 14, 26, this.pos.z + 10);
    this.sun.target.position.set(this.pos.x, 0, this.pos.z - 4);

    for (const fn of this.animations) fn(t);

    for (const o of this.occluders) {
      const m = o.mesh.material as THREE.MeshStandardMaterial;
      const behind =
        this.pos.z < o.box.minZ + 0.2 &&
        this.pos.z > o.box.minZ - 8 &&
        this.pos.x > o.box.minX - 1.5 &&
        this.pos.x < o.box.maxX + 1.5;
      m.opacity += ((behind ? 0.18 : 1) - m.opacity) * Math.min(1, dt * 8);
      m.depthWrite = m.opacity > 0.95;
    }

    let bubble: { text: string; at: THREE.Vector3 } | null = null;
    let best = 3.6;
    for (const n of this.npcs) {
      n.person.animate(t + n.pos.x, 0, n.mode === "wave");
      if (n.mode === "violin")
        n.person.armR.rotation.set(-1.0 + Math.sin(t * 4) * 0.25, 0, -0.4);
      const d = Math.hypot(n.pos.x - this.pos.x, n.pos.z - this.pos.z);
      const text = n === this.finalePartner ? this.finaleText() : n.text;
      if (text && d < best) {
        best = d;
        bubble = { text, at: n.pos.clone().setY(2.6) };
      }
      if (d < 4 && n.mode !== "sit" && n.mode !== "violin") {
        let diff =
          Math.atan2(this.pos.x - n.pos.x, this.pos.z - n.pos.z) -
          n.person.group.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        n.person.group.rotation.y += diff * Math.min(1, dt * 4);
      }
    }
    if (bubble) {
      const p = bubble.at.clone().project(this.camera);
      this.events.onBubble({
        text: bubble.text,
        x: (p.x * 0.5 + 0.5) * this.canvas.clientWidth,
        y: (-p.y * 0.5 + 0.5) * this.canvas.clientHeight,
      });
      this.lastBubble = bubble.text;
    } else if (this.lastBubble) {
      this.lastBubble = "";
      this.events.onBubble(null);
    }

    let near: string | null = null;
    if (!this.paused) {
      for (const p of this.packs) {
        if (
          !p.opened &&
          Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < 2.2
        )
          near = p.id;
      }
      if (
        this.allOpened &&
        !this.finaleFired &&
        this.finalePartner &&
        Math.hypot(
          this.finalePartner.pos.x - this.pos.x,
          this.finalePartner.pos.z - this.pos.z,
        ) < 2.4
      ) {
        this.finaleFired = true;
        this.paused = true;
        this.keys.clear();
        this.events.onFinale();
      }
    }
    if (near !== this.lastNear) {
      this.lastNear = near;
      this.events.onNear(near);
    }

    const next = PLACES.map((pl) =>
      this.packs.find((p) => p.id === pl.id),
    ).find((p) => p && !p.opened);
    const beamAt = next
      ? next.pos
      : !this.finaleFired
        ? new THREE.Vector3(FINALE.x, 0, FINALE.z)
        : null;
    this.beam.visible = !!beamAt;
    if (beamAt) {
      this.beam.position.set(beamAt.x, 20, beamAt.z);
      (this.beam.material as THREE.MeshBasicMaterial).opacity =
        0.16 + Math.sin(t * 3) * 0.06;
    }
    const nextLabel = next
      ? (this.opts.labels[next.id] ?? null)
      : !this.finaleFired
        ? "o coração no fim do caminho"
        : null;
    if (nextLabel !== this.lastNext) {
      this.lastNext = nextLabel;
      this.events.onNext(nextLabel);
    }

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
    if (this.allOpened) return "Vem cá, tenho uma coisa pra você 💗";
    const left = this.packs.filter((p) => !p.opened).length;
    return `Ainda faltam ${left} ${left === 1 ? "pacote" : "pacotes"} pelo caminho 💭`;
  }
}
