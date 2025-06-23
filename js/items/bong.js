import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

class Bong {
  constructor(scene) {
    this.scene = scene;
    this.bongMesh = null;
  }

  createBong(x, y, z) {
    const loader = new GLTFLoader();
    loader.load('./resources/models/bong.glb', (gltf) => {
      this.bongMesh = gltf.scene;
      console.log(this.bongMesh);
      this.bongMesh.scale.set(0.15, 0.15, 0.15); // Scale the model
      this.bongMesh.position.set(x, y, z);
      this.bongMesh.rotation.y = 1.5 * Math.PI / 5; // Rotate the model
      // Apply glassy material
    this.bongMesh.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          metalness: 0.9,
          roughness: 0.1,
          transmission: 0.9, // Enable transparency
          transparent: true,
          opacity: 0.8,
          ior: 1.5, // Index of refraction
        });
      }
    });
      this.scene.add(this.bongMesh);
    }, undefined, (error) => {
      console.error('An error happened', error);
    });
  }
}

export default Bong;
