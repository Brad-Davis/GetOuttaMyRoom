import * as THREE from 'three';

const SMOKE_TEXTURE_PATH = './resources/images/smoke.png';

const loader = new THREE.TextureLoader();
let _smokeMap = null;

function getSmokeMap() {
  if (!_smokeMap) {
    _smokeMap = loader.load(SMOKE_TEXTURE_PATH);
    _smokeMap.colorSpace = THREE.SRGBColorSpace;
  }
  return _smokeMap;
}

/**
 * Single billboard sprite (pattern from Simple-Particle-Effects getLayer.js).
 * @see https://github.com/bobbyroe/Simple-Particle-Effects/blob/main/getLayer.js
 */
export function createSmokeSprite({ color, opacity, position, size }) {
  const material = new THREE.SpriteMaterial({
    map: getSmokeMap(),
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });
  material.color.offsetHSL(0, 0, Math.random() * 0.14 - 0.07);

  const sprite = new THREE.Sprite(material);
  sprite.position.copy(position);
  const scale = size + (Math.random() - 0.5) * size * 0.2;
  sprite.scale.set(scale, scale, scale);
  material.rotation = Math.random() * Math.PI * 2;
  sprite.renderOrder = 999;
  return sprite;
}

/**
 * Ring of smoke sprites in a group — only smoke.png, no other demo effects.
 */
export function buildSmokeLayer({
  numSprites = 14,
  radius = 0.02,
  size = 0.02,
  opacity = 0,
  hue = 0,
  sat = 0,
  lightness = 0.78,
} = {}) {
  const layerGroup = new THREE.Group();
  const sprites = [];

  for (let i = 0; i < numSprites; i += 1) {
    const angle = (i / numSprites) * Math.PI * 2;
    const position = new THREE.Vector3(
      Math.cos(angle) * Math.random() * radius,
      Math.sin(angle) * Math.random() * radius,
      (Math.random() - 0.5) * 0.06,
    );
    const color = new THREE.Color().setHSL(hue, sat, lightness);
    const sprite = createSmokeSprite({
      color,
      opacity,
      position,
      size,
    });
    layerGroup.add(sprite);
    sprites.push({
      sprite,
      angle,
      radiusFactor: 0.35 + Math.random() * 0.65,
      sizeJitter: 0.8 + Math.random() * 0.35,
      rotSpeed: (Math.random() - 0.5) * 0.5,
      drift: new THREE.Vector3(
        (Math.random() - 0.5) * 0.12,
        0.08 + Math.random() * 0.2,
        (Math.random() - 0.5) * 0.06,
      ),
    });
  }

  return { group: layerGroup, sprites };
}
