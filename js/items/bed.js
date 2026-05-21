import loaderService from '../utils/loaderService.js';

class Bed {
  constructor(scene) {
    this.scene = scene;
    this.bedMesh = null;
  }

    async createBed(x, y, z) {
        try {
            const gltf = await loaderService.loadGLTF('./resources/models/bed.glb');
            this.bedMesh = gltf.scene;
            console.log(this.bedMesh);
            this.bedMesh.scale.set(0.02, 0.02, 0.02); // Scale the model
            this.bedMesh.position.set(x, y, z);
            this.scene.add(this.bedMesh);

        } catch (error) {
            console.error('Error loading bed model:', error);
        }
    }

    getBedMesh() {
      return this.bedMesh;
    }
}

export default Bed;