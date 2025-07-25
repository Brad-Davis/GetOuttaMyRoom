import * as THREE from 'three';
import loaderService from '../utils/loaderService.js';
import interactionService from '../utils/interactionService.js';
import gameState from '../gameState.js';

class Bed {
  constructor(scene) {
    this.scene = scene;
    this.bedMesh = null;
  }

    async createBed(x, y, z, gsap, camera, interactionManager, backButton) {
        try {
            const gltf = await loaderService.loadGLTF('./resources/models/bed.glb');
            this.bedMesh = gltf.scene;
            console.log(this.bedMesh);
            this.bedMesh.scale.set(0.02, 0.02, 0.02); // Scale the model
            this.bedMesh.position.set(x, y, z);
            this.scene.add(this.bedMesh);
            interactionManager.add(this.bedMesh);

            this.bedMesh.addEventListener('click', () => {
              if (!interactionService.checkEnabled()) {
                return;
              }
              this.lookAtBed(camera, gsap);
              gameState.goToStore();
              backButton.showBackButton();
            });

        } catch (error) {
            console.error('Error loading bed model:', error);
        }
    }

    getBedMesh() {
      return this.bedMesh;
    }

    lookAtBed(camera, gsap) {
      this.dresserFocus = true;
      gsap.to(camera.position, {
        x: 0,
        z: -7,
        y: -1.5,
        duration: 1,
        ease: 'power2.inOut',
      });
      gsap.to(camera.rotation, {
       
        x: -Math.PI/2,
        z: -Math.PI/2,
        y: -Math.PI/4,
        duration: 1,
        ease: 'power2.inOut',
      });
    }
}

export default Bed;