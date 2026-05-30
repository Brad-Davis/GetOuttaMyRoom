import * as THREE from 'three';
import { buildSmokeLayer } from './smokeLayer.js';

const _worldOffset = new THREE.Vector3();

const DEFAULT_OPTIONS = {
  numSprites: 16,
  duration: 8,
  /** Ease-in: higher = slower growth from a tiny puff. */
  growthPower: 4,
  sizeStart: 0.008,
  sizeEnd: 1.4,
  radiusStart: 0.004,
  radiusEnd: 1.1,
  maxOpacity: 0.55,
  hue: 0,
  sat: 0,
  lightness: 0.78,
  offset: { x: 0, y: -0.08, z: -1.15 },
};

/**
 * Camera-facing smoke puff using stacked sprites (smoke.png).
 */
export default class CameraSmokeEffect {
  constructor(camera, scene, options = {}) {
    this.camera = camera;
    this.scene = scene;
    this.configure(options);

    this.elapsed = 0;
    this.alive = false;

    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.group.visible = false;

    /** @type {{ sprite: THREE.Sprite; angle: number; radiusFactor: number; sizeJitter: number; rotSpeed: number; drift: THREE.Vector3 }[]} */
    this.sprites = [];
  }

  configure(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    const o = this.options;
    this.numSprites = o.numSprites;
    this.duration = o.duration;
    this.growthPower = o.growthPower;
    this.sizeStart = o.sizeStart;
    this.sizeEnd = o.sizeEnd;
    this.radiusStart = o.radiusStart;
    this.radiusEnd = o.radiusEnd;
    this.maxOpacity = o.maxOpacity;
    this.hue = o.hue;
    this.sat = o.sat;
    this.lightness = o.lightness;
    this.localOffset = new THREE.Vector3(
      o.offset.x ?? 0,
      o.offset.y ?? -0.08,
      o.offset.z ?? -1.15,
    );
  }

  _clearSprites() {
    for (const { sprite } of this.sprites) {
      this.group.remove(sprite);
      sprite.material.dispose();
    }
    this.sprites = [];
  }

  _buildLayer() {
    this._clearSprites();
    const { group, sprites } = buildSmokeLayer({
      numSprites: this.numSprites,
      radius: this.radiusStart,
      size: this.sizeStart,
      opacity: 0,
      hue: this.hue,
      sat: this.sat,
      lightness: this.lightness,
    });
    while (this.group.children.length) {
      this.group.remove(this.group.children[0]);
    }
    for (const child of group.children) {
      this.group.add(child);
    }
    for (const meta of sprites) {
      meta.baseZ = meta.sprite.position.z;
    }
    this.sprites = sprites;
  }

  syncToCamera() {
    if (!this.camera) return;
    _worldOffset.copy(this.localOffset).applyQuaternion(this.camera.quaternion);
    this.group.position.copy(this.camera.position).add(_worldOffset);
    this.group.quaternion.copy(this.camera.quaternion);
  }

  _growthFactor(t) {
    const clamped = Math.min(Math.max(t, 0), 1);
    return Math.pow(clamped, this.growthPower);
  }

  spawn() {
    this._buildLayer();
    this.syncToCamera();
    this.elapsed = 0;
    this.alive = true;
    this.group.visible = true;
    this.group.scale.setScalar(1);

    for (const { sprite } of this.sprites) {
      const s = this.sizeStart;
      sprite.scale.set(s, s, s);
      sprite.material.opacity = 0;
    }
  }

  update(delta) {
    if (!this.alive) return;

    this.syncToCamera();

    this.elapsed += delta;
    const t = this.elapsed / this.duration;
    if (t >= 1) {
      this.alive = false;
      this.group.visible = false;
      this._clearSprites();
      return;
    }

    const grow = this._growthFactor(t);
    const growMotion = grow * grow;
    const radius = this.radiusStart + (this.radiusEnd - this.radiusStart) * grow;
    const baseSize = this.sizeStart + (this.sizeEnd - this.sizeStart) * grow;
    const fadeOut = 1 - t * t;
    const fadeIn = Math.min(grow * 2.5, 1);
    const opacity = this.maxOpacity * fadeOut * fadeIn;

    for (const meta of this.sprites) {
      const { sprite, angle, radiusFactor, sizeJitter, rotSpeed, drift } = meta;
      const a = angle + this.elapsed * rotSpeed * 0.15;
      const r = radius * radiusFactor;

      sprite.position.set(
        Math.cos(a) * r + drift.x * this.elapsed * growMotion,
        Math.sin(a) * r + drift.y * this.elapsed * growMotion,
        meta.baseZ + drift.z * this.elapsed * growMotion,
      );

      const s = baseSize * sizeJitter;
      sprite.scale.set(s, s, s);
      sprite.material.opacity = opacity * (0.85 + sizeJitter * 0.1);
      sprite.material.rotation += delta * rotSpeed * 0.35;
    }
  }

  dispose() {
    this._clearSprites();
    this.scene?.remove(this.group);
  }
}
