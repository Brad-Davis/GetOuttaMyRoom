import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

class Bed {
  constructor(scene) {
    this.scene = scene;
    this.bedMesh = null;
  }

    createBed(x, y, z) {
            const loader = new GLTFLoader();
            loader.load('./resources/models/bed.glb', (gltf) => {
            this.bedMesh = gltf.scene;
            console.log(this.bedMesh);
            this.bedMesh.scale.set(0.02, 0.02, 0.02); // Scale the model
            this.bedMesh.position.set(x, y, z);
            this.scene.add(this.bedMesh);
        }, undefined, (error) => {
            console.error('An error happened', error);
        });
    }
}

export default Bed;