import * as THREE from 'three';
import gsap from 'gsap';

class Moon {
  constructor(scene) {
    this.scene = scene;
    this.moonMesh = null;
    this.moonLight = null;
    this.time = 0;
    this.active = false;
    this.defaultScale = 1;
    this.dimLightIntensity = 0.1;
    this.brightLightIntensity = 0.4;
  }

  createMoon(x, y, z) {
    // Create a sphere geometry
    const geometry = new THREE.SphereGeometry(1, 32, 32);

    // Load the moon texture
    const texture = new THREE.TextureLoader().load('./resources/images/moon.webp');

    // Create a material with the texture
    const material = new THREE.MeshToonMaterial({ map: texture });

    // Create a moon mesh
    this.moonMesh = new THREE.Mesh(geometry, material);

    // Set position
    this.moonMesh.position.set(x, y, z);

    // Add the moon to the scene
    this.scene.add(this.moonMesh);

    // Create a point light to simulate moonlight
    this.moonLight = new THREE.DirectionalLight(0xffffff, 0.1, 0);
    this.moonLight.position.set(x, y, z);

    // Add the light to the scene
    this.scene.add(this.moonLight);
  }

  rotateMoon() {
    if (this.moonMesh) {
        this.time += 0.04
        this.moonMesh.rotation.y += 0.001; // Rotate the moon
        this.moonMesh.position.y += 0.001 * Math.sin(this.time); // Simulate moon movement
    }
  }

  onClick() {
    if (!this.moonMesh || !this.moonLight || this.active) {
      return;
    }

    this.active = true;
    const shouldBrighten = this.moonLight.intensity <= this.dimLightIntensity + 0.01;
    const nextIntensity = shouldBrighten ? this.brightLightIntensity : this.dimLightIntensity;
    const nextScale = shouldBrighten ? this.defaultScale * 1.12 : this.defaultScale;

    gsap.to(this.moonLight, {
      intensity: nextIntensity,
      duration: 0.45,
      ease: 'power2.out',
    });

    gsap.to(this.moonMesh.scale, {
      x: nextScale,
      y: nextScale,
      z: nextScale,
      duration: 0.45,
      ease: 'power2.out',
      onComplete: () => {
        this.active = false;
      }
    });
  }

  getMoonMesh() {
    return this.moonMesh;
  }
}

export default Moon;