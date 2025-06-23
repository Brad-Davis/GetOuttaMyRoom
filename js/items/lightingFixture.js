import * as THREE from 'three';

class LightingFixture {
  constructor(scene) {
    this.scene = scene;
    this.fixtureMesh = null;
    this.currentIntensity = 1;
  }

  createFixture(x, y, z) {
    // Create a rectangle for the ceiling fixture
    const geometry = new THREE.BoxGeometry(1, 0.01, 4);
    const texture = new THREE.TextureLoader().load('./resources/images/lightFixtures.jpg');
    const material = new THREE.MeshStandardMaterial({ 
      map: texture,
      color: 0xffffff, // Keep base color white to show texture as-is
      emissive: 0xffffff, 
      emissiveIntensity: 1,
      metalness: 0.2,
      roughness: 0.5
    });
    this.fixtureMesh = new THREE.Mesh(geometry, material);
    this.fixtureMesh.position.set(x, y, z);
    this.scene.add(this.fixtureMesh);
  }

  /**
   * Change the fixture's brightness and color based on intensity (0-1)
   */
  changeIntensity(intensity) {
    this.currentIntensity = intensity;
    if (this.fixtureMesh && this.fixtureMesh.material) {
      // Only change emissive properties to make the fixture glow, preserving the texture color.
      const emissiveColor = new THREE.Color().setHSL(0.13, 0.7, 0.5 + 0.3 * intensity); // warm white
      this.fixtureMesh.material.emissive.copy(emissiveColor);
      this.fixtureMesh.material.emissiveIntensity = intensity * 2; // More dramatic effect
      this.fixtureMesh.material.needsUpdate = true;
    }
  }
}

export default LightingFixture; 