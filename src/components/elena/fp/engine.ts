import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

import { lockedTexture, packTexture } from "../game/kit";
import { media, other, type Who } from "../types";
import { LOOKS, makeFirstPersonBody, makeHuman, type Human } from "./humans";
import type { Outfit, SceneCtx, SceneModule } from "./types";

/*
 * The first-person engine: one place at a time, at real scale. Physically
 * based lights and materials, soft shadows, image-based fill light, ambient
 * occlusion and SMAA on desktop, bloom and ACES tone mapping everywhere.
 * Walk with WASD / the left thumb, look with the mouse (pointer lock) / the
 * right thumb. The player's body is visible when looking down; a third-person
 * camera can be toggled.
 */

export type InteriorEvents = {
  /** The crosshair is on the pack (and it is close enough to open). */
  onFocus: (focused: boolean) => void;
  onBubble: (b: { text: string; x: number; y: number } | null) => void;
  onExit: () => void;
  onReady: () => void;
};

type Box = { minX: number; maxX: number; minZ: number; maxZ: number };
type Talker = {
  object: THREE.Object3D;
  text: string;
  human: Human;
  top: number;
};

const RADIUS = 0.28;
const WALK = 1.6;
const RUN = 3.0;

export class Interior {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(70, 1, 0.08, 320);
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private clock = new THREE.Clock();
  private boxes: Box[] = [];
  private updaters: ((t: number, dt: number) => void)[] = [];
  private talkers: Talker[] = [];
  private photos: { mesh: THREE.Mesh; name: string }[] = [];
  private pos = new THREE.Vector3(0, 0, 0);
  private yaw = 0;
  private pitch = -0.05;
  private keys = new Set<string>();
  private move = { x: 0, y: 0 };
  private packObject: THREE.Group | null = null;
  private packOpened = false;
  private exitZone: { x: number; z: number; r: number; armed: boolean } | null =
    null;
  private body: Human | null = null;
  private avatar: Human | null = null;
  private eye = 1.62;
  private third = false;
  private audio: HTMLAudioElement | null = null;
  private audioVolume = 0.5;
  private focused = false;
  private lastBubble = "";
  private disposed = false;
  private loader = new THREE.TextureLoader();
  private raycaster = new THREE.Raycaster();
  private playerOutfit: Outfit = { top: "#5b3b2b", bottom: "#2e3440" };
  private bob = 0;
  private gtao: GTAOPass | null = null;
  private smaa: SMAAPass | null = null;
  private ratio = 1;
  private maxRatio = 1.5;
  private frames = 0;
  private frameTime = 1 / 60;
  private adaptAt = 0;
  private goodSince = 0;
  readonly quality: "high" | "low";
  paused = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private player: Who,
    private events: InteriorEvents,
  ) {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    this.quality = coarse ? "low" : "high";
    THREE.Cache.enabled = true;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: "high-performance",
    });
    this.maxRatio = Math.min(window.devicePixelRatio, coarse ? 1.25 : 1.5);
    this.ratio = coarse ? Math.min(1, this.maxRatio) : this.maxRatio;
    this.renderer.setPixelRatio(this.ratio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // shadows are refreshed every other frame (the rooms are static)
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture;
    this.scene.environmentIntensity = 0.25;
    pmrem.dispose();

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    if (!coarse) {
      const gtao = new GTAOPass(this.scene, this.camera, 1, 1);
      gtao.updateGtaoMaterial({
        radius: 0.35,
        distanceExponent: 1.5,
        thickness: 0.5,
        scale: 1.2,
      });
      gtao.blendIntensity = 0.9;
      // ambient occlusion only while the frame rate has headroom (see adapt())
      gtao.enabled = false;
      this.gtao = gtao;
      this.composer.addPass(gtao);
    }
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.45, 1.4);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    if (!coarse) {
      this.smaa = new SMAAPass();
      this.composer.addPass(this.smaa);
    }

    this.eye = (LOOKS[player].height ?? 1.75) * 0.925;

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("resize", this.resize);
    document.addEventListener("mousemove", this.onMouse);
    canvas.addEventListener("click", this.onClick);
    this.resize();
  }

  /* ---------------- loading a place ---------------- */

  async load(module: SceneModule, opened: boolean) {
    this.packOpened = opened;
    const ctx = this.context();
    await module.build(ctx);
    this.body = makeFirstPersonBody(LOOKS[this.player], this.playerOutfit);
    this.scene.add(this.body.group);
    this.avatar = makeHuman(LOOKS[this.player], this.playerOutfit);
    this.avatar.group.visible = false;
    this.scene.add(this.avatar.group);
    if (opened) this.unlock();
    this.camera.position.set(this.pos.x, this.eye, this.pos.z);
    this.renderer.setAnimationLoop(this.tick);
    this.events.onReady();
    if (process.env.NODE_ENV === "development")
      (window as unknown as { __interior: Interior }).__interior = this;
  }

  private context(): SceneCtx {
    const partnerWho = other(this.player);
    return {
      scene: this.scene,
      renderer: this.renderer,
      camera: this.camera,
      quality: this.quality,
      player: this.player,
      tex: (name, rx = 1, ry = 1) => {
        const t = this.loader.load(media(name));
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(rx, ry);
        t.anisotropy = 8;
        return t;
      },
      solid: (object, padding = 0) => {
        object.updateWorldMatrix(true, true);
        const b = new THREE.Box3().setFromObject(object);
        if (b.isEmpty()) return;
        this.boxes.push({
          minX: b.min.x - padding,
          maxX: b.max.x + padding,
          minZ: b.min.z - padding,
          maxZ: b.max.z + padding,
        });
      },
      wall: (minX, minZ, maxX, maxZ) =>
        this.boxes.push({ minX, maxX, minZ, maxZ }),
      spawn: (x, z, yawDeg) => {
        this.pos.set(x, 0, z);
        this.yaw = THREE.MathUtils.degToRad(yawDeg);
      },
      pack: (x, y, z, yawDeg = 0) => this.placePack(x, y, z, yawDeg),
      photo: (name, w, h, position, yawDeg = 0) => {
        const g = new THREE.Group();
        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.06, h + 0.06, 0.025),
          new THREE.MeshStandardMaterial({ color: "#1d1a17", roughness: 0.4 }),
        );
        frame.castShadow = true;
        g.add(frame);
        const mat = new THREE.MeshStandardMaterial({
          map: lockedTexture(),
          roughness: 0.6,
        });
        const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
        pic.position.z = 0.014;
        g.add(pic);
        g.position.copy(position);
        g.rotation.y = THREE.MathUtils.degToRad(yawDeg);
        this.scene.add(g);
        this.photos.push({ mesh: pic, name });
        return g;
      },
      partner: (x, z, yawDeg, pose, outfit, line) =>
        this.addPerson(
          LOOKS[partnerWho],
          outfit[partnerWho],
          x,
          z,
          yawDeg,
          pose,
          line,
        ),
      person: (look, outfit, x, z, yawDeg, pose, line) =>
        this.addPerson(look, outfit, x, z, yawDeg, pose, line),
      playerOutfit: (outfit) => {
        this.playerOutfit = outfit[this.player];
      },
      ambient: (name, volume = 0.5) => {
        this.audioVolume = volume;
        if (this.disposed) return;
        const a = new Audio(media(name));
        a.loop = true;
        a.volume = 0;
        a.play().catch(() => undefined);
        this.audio = a;
      },
      exit: (x, z, r) => {
        this.exitZone = { x, z, r, armed: false };
      },
      onUpdate: (fn) => this.updaters.push(fn),
    };
  }

  private addPerson(
    look: Parameters<typeof makeHuman>[0],
    outfit: Outfit,
    x: number,
    z: number,
    yawDeg: number,
    pose: Parameters<Human["setPose"]>[0],
    line?: string,
  ) {
    const human = makeHuman(look, outfit);
    human.setPose(pose);
    human.group.position.set(x, 0, z);
    human.group.rotation.y = THREE.MathUtils.degToRad(yawDeg);
    this.scene.add(human.group);
    this.updaters.push((t, dt) => human.update(t, dt, 0));
    if (pose !== "sit")
      this.boxes.push({
        minX: x - 0.25,
        maxX: x + 0.25,
        minZ: z - 0.25,
        maxZ: z + 0.25,
      });
    if (line)
      this.talkers.push({
        object: human.group,
        text: line,
        human,
        top: pose === "sit" ? human.height * 0.72 : human.height,
      });
    return human.group;
  }

  private placePack(x: number, y: number, z: number, yawDeg: number) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = THREE.MathUtils.degToRad(yawDeg);
    const tex = packTexture("Nossa história");
    const foil = new THREE.MeshPhysicalMaterial({
      color: "#ff9cc2",
      metalness: 0.9,
      roughness: 0.18,
      iridescence: 1,
      iridescenceIOR: 1.6,
      clearcoat: 1,
    });
    const face = new THREE.MeshPhysicalMaterial({
      map: tex,
      metalness: 0.5,
      roughness: 0.25,
      iridescence: 0.8,
      clearcoat: 1,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: 0.25,
    });
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.012), [
      foil,
      foil,
      foil,
      foil,
      face,
      face,
    ]);
    pack.position.y = 0.16;
    pack.castShadow = true;
    g.add(pack);
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 0.13, 40),
      new THREE.MeshBasicMaterial({
        color: "#ff8fb8",
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.005;
    g.add(halo);
    const light = new THREE.PointLight("#ff9cc2", 0.6, 1.5, 2);
    light.position.y = 0.25;
    g.add(light);
    this.updaters.push((t) => {
      pack.rotation.y = Math.sin(t * 1.2) * 0.6;
      pack.position.y = 0.16 + Math.sin(t * 2) * 0.015;
      halo.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
    });
    g.userData.pack = true;
    this.scene.add(g);
    this.packObject = g;
  }

  /** The pack was opened: hide it and uncover the photos. */
  unlock() {
    this.packOpened = true;
    if (this.packObject) this.packObject.visible = false;
    for (const p of this.photos) {
      const t = this.loader.load(media(p.name));
      t.colorSpace = THREE.SRGBColorSpace;
      (p.mesh.material as THREE.MeshStandardMaterial).map = t;
      (p.mesh.material as THREE.MeshStandardMaterial).needsUpdate = true;
    }
    if (this.focused) {
      this.focused = false;
      this.events.onFocus(false);
    }
  }

  /* ---------------- input ---------------- */

  setMove(x: number, y: number) {
    this.move.x = x;
    this.move.y = y;
  }

  /** Look by a delta in pixels (touch drag). */
  look(dx: number, dy: number) {
    this.yaw -= dx * 0.005;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.004, -1.35, 1.2);
  }

  /** Development only: place the camera (used by the screenshot scripts). */
  debugView(
    x: number,
    z: number,
    yawDeg: number,
    pitchDeg = -5,
    third = false,
  ) {
    this.pos.set(x, 0, z);
    this.yaw = THREE.MathUtils.degToRad(yawDeg);
    this.pitch = THREE.MathUtils.degToRad(pitchDeg);
    this.third = third;
  }

  setThirdPerson(on: boolean) {
    this.third = on;
  }

  private onClick = () => {
    if (
      this.quality === "high" &&
      document.pointerLockElement !== this.canvas &&
      !this.paused
    ) {
      this.canvas.requestPointerLock?.();
    }
  };

  private onMouse = (e: MouseEvent) => {
    if (document.pointerLockElement !== this.canvas || this.paused) return;
    this.yaw -= e.movementX * 0.0022;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch - e.movementY * 0.0022,
      -1.35,
      1.2,
    );
  };

  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (
      [
        "w",
        "a",
        "s",
        "d",
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
        "shift",
      ].includes(k)
    ) {
      this.keys.add(k);
      e.preventDefault();
    }
    if (k === "v") this.third = !this.third;
  };

  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());

  private resize = () => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.bloom.resolution.set(w / 2, h / 2);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.8 ? 78 : 70;
    this.camera.updateProjectionMatrix();
  };

  releasePointer() {
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }

  /* ---------------- loop ---------------- */

  private collide(p: THREE.Vector3) {
    for (const b of this.boxes) {
      const cx = Math.max(b.minX, Math.min(p.x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(p.z, b.maxZ));
      const dx = p.x - cx;
      const dz = p.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= RADIUS * RADIUS) continue;
      if (d2 > 1e-8) {
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

  private tick = () => {
    if (this.disposed) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;

    // movement relative to where the player looks
    let mx = 0;
    let mz = 0;
    if (!this.paused) {
      if (this.keys.has("w") || this.keys.has("arrowup")) mz -= 1;
      if (this.keys.has("s") || this.keys.has("arrowdown")) mz += 1;
      if (this.keys.has("a") || this.keys.has("arrowleft")) mx -= 1;
      if (this.keys.has("d") || this.keys.has("arrowright")) mx += 1;
      mx += this.move.x;
      mz += this.move.y;
    }
    const len = Math.min(1, Math.hypot(mx, mz));
    let speed = 0;
    if (len > 0.05) {
      const n = Math.hypot(mx, mz);
      const fx = (mx / n) * len;
      const fz = (mz / n) * len;
      speed = (this.keys.has("shift") ? RUN : WALK) * len;
      const sin = Math.sin(this.yaw);
      const cos = Math.cos(this.yaw);
      const next = this.pos.clone();
      next.x += (fx * cos + fz * sin) * speed * dt;
      next.z += (-fx * sin + fz * cos) * speed * dt;
      this.collide(next);
      this.pos.copy(next);
      this.bob += dt * speed * 5.5;
    }

    // camera: eye height with a gentle head bob, or over the shoulder
    const bobY = Math.sin(this.bob) * 0.025 * Math.min(1, speed);
    const dir = new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch),
    );
    if (this.third) {
      const back = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      let dist = 2.4;
      // pull the camera in front of walls
      const origin = new THREE.Vector3(this.pos.x, this.eye, this.pos.z);
      for (let d = 0.3; d <= 2.4; d += 0.1) {
        const p = origin.clone().addScaledVector(back, d);
        if (
          this.boxes.some(
            (b) =>
              p.x > b.minX - 0.15 &&
              p.x < b.maxX + 0.15 &&
              p.z > b.minZ - 0.15 &&
              p.z < b.maxZ + 0.15,
          )
        ) {
          dist = Math.max(0.5, d - 0.25);
          break;
        }
      }
      const right = new THREE.Vector3(
        Math.cos(this.yaw),
        0,
        -Math.sin(this.yaw),
      );
      this.camera.position
        .copy(origin)
        .addScaledVector(back, dist)
        .addScaledVector(right, 0.35);
      this.camera.position.y = this.eye + 0.15 - this.pitch * 0.8;
      this.camera.lookAt(
        origin
          .clone()
          .addScaledVector(right, 0.35)
          .add(dir.clone().multiplyScalar(2)),
      );
    } else {
      this.camera.position.set(this.pos.x, this.eye + bobY, this.pos.z);
      this.camera.lookAt(this.camera.position.clone().add(dir));
    }

    // own body: legs under the camera in first person, the full avatar in third
    if (this.body && this.avatar) {
      this.body.group.visible = !this.third;
      this.avatar.group.visible = this.third;
      const active = this.third ? this.avatar : this.body;
      // in first person the body sits slightly behind the eye so the chest stays out of view
      const back = this.third ? 0 : 0.12;
      active.group.position.set(
        this.pos.x + Math.sin(this.yaw) * back,
        0,
        this.pos.z + Math.cos(this.yaw) * back,
      );
      active.group.rotation.y = this.yaw + Math.PI;
      active.update(t, dt, speed);
    }

    for (const fn of this.updaters) fn(t, dt);

    // focus on the pack through the crosshair (or from very close on touch screens)
    let focus = false;
    if (this.packObject && !this.packOpened) {
      const target = this.packObject.position
        .clone()
        .add(new THREE.Vector3(0, 0.16, 0));
      const dist = target.distanceTo(this.camera.position);
      if (dist < 2.6) {
        // looking roughly at it (within ~14 degrees), or very close on touch screens
        const eye = this.camera.getWorldPosition(new THREE.Vector3());
        const view = this.camera.getWorldDirection(new THREE.Vector3());
        const toPack = target.clone().sub(eye).normalize();
        focus =
          view.dot(toPack) > Math.cos(THREE.MathUtils.degToRad(17)) ||
          (this.quality === "low" && dist < 1.4);
      }
    }
    if (focus !== this.focused) {
      this.focused = focus;
      this.events.onFocus(focus);
    }

    // speech bubble of the closest person in front of the player
    let bubble: { text: string; at: THREE.Vector3 } | null = null;
    let best = 2.6;
    for (const tk of this.talkers) {
      const p = tk.object.getWorldPosition(new THREE.Vector3());
      const d = Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
      if (d < best) {
        best = d;
        bubble = { text: tk.text, at: p.clone().setY(p.y + tk.top + 0.22) };
      }
    }
    if (bubble) {
      const v = bubble.at.clone().project(this.camera);
      if (v.z < 1) {
        this.events.onBubble({
          text: bubble.text,
          x: (v.x * 0.5 + 0.5) * this.canvas.clientWidth,
          y: (-v.y * 0.5 + 0.5) * this.canvas.clientHeight,
        });
        this.lastBubble = bubble.text;
      }
    } else if (this.lastBubble) {
      this.lastBubble = "";
      this.events.onBubble(null);
    }

    // exit: armed once the player has stepped away from it
    if (this.exitZone && !this.paused) {
      const d = Math.hypot(
        this.pos.x - this.exitZone.x,
        this.pos.z - this.exitZone.z,
      );
      if (d > this.exitZone.r + 0.6) this.exitZone.armed = true;
      else if (d < this.exitZone.r && this.exitZone.armed) {
        this.exitZone.armed = false;
        this.events.onExit();
      }
    }

    // ambient sound fades in
    if (this.audio && this.audio.volume < this.audioVolume)
      this.audio.volume = Math.min(
        this.audioVolume,
        this.audio.volume + dt * 0.25,
      );

    this.frames++;
    this.renderer.shadowMap.needsUpdate = this.frames % 2 === 0;
    this.adapt(dt, t);
    this.composer.render(dt);
  };

  /**
   * Keeps the frame rate smooth: lowers the render resolution when frames get
   * slow, raises it back (and turns on ambient occlusion) when there is room.
   */
  private adapt(dt: number, t: number) {
    this.frameTime += (dt - this.frameTime) * 0.05;
    if (t < this.adaptAt) return;
    this.adaptAt = t + 1;
    const ms = this.frameTime * 1000;
    if (ms > 24) {
      this.goodSince = t;
      if (this.gtao?.enabled) this.gtao.enabled = false;
      else if (this.ratio > 0.6) this.setRatio(this.ratio - 0.15);
    } else if (ms < 15) {
      if (t - this.goodSince > 3) {
        if (this.ratio < this.maxRatio) this.setRatio(this.ratio + 0.1);
        else if (this.gtao && !this.gtao.enabled) this.gtao.enabled = true;
        this.goodSince = t;
      }
    } else {
      this.goodSince = t;
    }
  }

  private setRatio(r: number) {
    this.ratio = Math.max(0.6, Math.min(this.maxRatio, r));
    this.renderer.setPixelRatio(this.ratio);
    this.resize();
  }

  /** Pause or resume the place's ambient sound (e.g. while a video plays). */
  setAmbientPaused(paused: boolean) {
    if (!this.audio) return;
    if (paused) this.audio.pause();
    else if (!this.disposed) this.audio.play().catch(() => undefined);
  }

  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.releasePointer();
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
      this.audio = null;
    }
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("resize", this.resize);
    document.removeEventListener("mousemove", this.onMouse);
    this.canvas.removeEventListener("click", this.onClick);
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    this.composer.dispose();
    this.renderer.dispose();
  }
}
