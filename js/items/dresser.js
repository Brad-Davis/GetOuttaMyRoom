import * as THREE from 'three';
import loaderService from '../utils/loaderService.js';
import cameraService from '../utils/cameraPresets.js';
import MirrorWebcam from './mirrorWebcam.js';

class Dresser {
  constructor(scene) {
    this.scene = scene;
    this.dresserMesh = new THREE.Group(); // Initialize as a THREE.Group
    this.scene.add(this.dresserMesh); // Add the group to the scene
    this.dresserFocus = false;
    this.mirrorWebcam = null;
  }

  async createDresser(x, y, z) {
    try {
      const gltf = await loaderService.loadGLTF('./resources/models/dresser.glb');
      const model = gltf.scene;
      console.log(model);
      model.scale.set(13, 10, 15); // Scale the model
      
      model.position.set(0, 0, 0); // Position relative to the group
      model.rotation.y = Math.PI / 2; // Rotate the model
      const texture = new THREE.TextureLoader().load('./resources/images/wood.jpg');
      model.traverse((child) => {
        if (child.isMesh) {
          child.material.map = texture;
        }
      });

      this.dresserMesh.add(model); // Add the model to the group
      const geometry = new THREE.BoxGeometry(0.1, 1.4, 1.2);
      const refractionCube = new THREE.CubeTextureLoader().load('./resources/images/envMap.jpg');
      console.log(refractionCube);
      const material = new THREE.MeshPhysicalMaterial({ color: 0xffffff, envMap: refractionCube, roughness: 0.2, combine: THREE.MixOperation, reflectivity: 0.3 });
      const rectangle = new THREE.Mesh(geometry, material);
      rectangle.position.set(-0.5, 2.1, 0);
      this.dresserMesh.add(rectangle);
      this.mirrorWebcam = new MirrorWebcam(this.dresserMesh);
      this.mirrorWebcam.attach();

      // const pentagramGeo = new THREE.BoxGeometry(0.8, 0.001, 0.8);
      // const pentagramTexture = new THREE.TextureLoader().load('./resources/images/pentagramV3.png');
      // const pentagramMat = new THREE.MeshLambertMaterial({ map: pentagramTexture });
      // const pentagram = new THREE.Mesh(pentagramGeo, pentagramMat);
      // pentagram.rotation.y = Math.PI / 2;
      // pentagram.position.set(0.1, 1.465, 0);
      // this.dresserMesh.add(pentagram);

      this.dresserMesh.position.set(x, y, z); // Position the group
    } catch (error) {
      console.error('Error loading dresser model:', error);
    }
  }

  getDresserMesh() {
    return this.dresserMesh;
  }

  lookAtDresser() {
    this.dresserFocus = true;
    cameraService.lookAtDresser();
    this.startMirrorWebcam();
  }

  update() {
    this.mirrorWebcam?.update();
  }

  unsetFocus() {
    this.dresserFocus = false;
    this.mirrorWebcam?.hide(() => this.mirrorWebcam?.stop());
  }

  getDresserFocus() {
    return this.dresserFocus;
  }

  startMirrorWebcam() {
    this.mirrorWebcam?.show();
    this.mirrorWebcam?.start();
  }
}



export default Dresser;