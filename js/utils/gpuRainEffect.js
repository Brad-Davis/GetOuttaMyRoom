import * as THREE from 'three';

/**
 * Lightweight GPU rain: one Points draw, motion in the vertex shader (no per-frame CPU particle updates).
 * Position the effect via {@link GpuRainEffect#setCenter} or {@link GpuRainEffect#group}.position.
 * Similar intent to Three.js WebGPU compute rain, compatible with {@link THREE.WebGLRenderer}.
 */
const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uWidth;
uniform float uHeight;
uniform float uDepth;
uniform float uSpeed;
uniform float uWind;

void main() {
  float ry = fract(position.y - uTime * uSpeed);
  float xw = (position.x - 0.5) * uWidth + sin(uTime * 0.7 + position.z * 6.28318) * uWind;
  float yw = ry * uHeight - uHeight * 0.5;
  float zw = (position.z - 0.5) * uDepth;
  vec3 pos = vec3(xw, yw, zw);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float dist = max(-mvPosition.z, 0.1);
  gl_PointSize = clamp(180.0 / dist, 1.5, 6.0);
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;

void main() {
  vec2 d = gl_PointCoord - vec2(0.5);
  float r = length(d) * 2.0;
  if (r > 1.0) discard;
  float a = (1.0 - r) * uOpacity;
  gl_FragColor = vec4(uColor, a);
}
`;

export default class GpuRainEffect {
  /**
   * @param {object} [options]
   * @param {number} [options.particleCount=3200]
   * @param {{ x?: number, y?: number, z?: number }} [options.center] world-space center of the rain box
   * @param {{ width?: number, height?: number, depth?: number }} [options.volume] full width, height, and depth of the box around `center`
   * @param {number} [options.fallSpeed=1.1] scroll rate in the shader
   * @param {number} [options.wind=0.08] horizontal sway amplitude (world units)
   * @param {number} [options.color=0xa8c4ee]
   * @param {number} [options.opacity=0.38]
   */
  constructor(options = {}) {
    const {
      particleCount = 3200,
      center = { x: 0, y: 0, z: 0 },
      volume = { width: 4, height: 6, depth: 3 },
      fallSpeed = 1.1,
      wind = 0.08,
      color = 0xa8c4ee,
      opacity = 0.38,
    } = options;

    this.clock = new THREE.Clock();

    const count = Math.floor(particleCount);
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = Math.random();
      positions[i * 3 + 1] = Math.random();
      positions[i * 3 + 2] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWidth: { value: volume.width ?? 4 },
        uHeight: { value: volume.height ?? 6 },
        uDepth: { value: volume.depth ?? 3 },
        uSpeed: { value: fallSpeed },
        uWind: { value: wind },
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: opacity },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
    });

    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;

    this.group = new THREE.Group();
    this.group.add(this.points);
    this.setCenter(center.x ?? 0, center.y ?? 0, center.z ?? 0);
  }

  setCenter(x, y, z) {
    this.group.position.set(x, y, z);
  }

  setVolume(width, height, depth) {
    this.material.uniforms.uWidth.value = width;
    this.material.uniforms.uHeight.value = height;
    this.material.uniforms.uDepth.value = depth;
  }

  setFallSpeed(speed) {
    this.material.uniforms.uSpeed.value = speed;
  }

  setWind(amplitude) {
    this.material.uniforms.uWind.value = amplitude;
  }

  setOpacity(opacity) {
    this.material.uniforms.uOpacity.value = opacity;
  }

  setColor(hex) {
    this.material.uniforms.uColor.value.set(hex);
  }

  update() {
    this.material.uniforms.uTime.value += this.clock.getDelta();
  }

  dispose() {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
