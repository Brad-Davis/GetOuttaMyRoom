import * as THREE from 'three';
import loaderService from '../utils/loaderService.js';
import cameraService from '../utils/cameraPresets.js';
import iframeControls from '../UI/iframeControls.js';

class Computer {
  constructor(scene) {
    this.scene = scene;
    this.computerMesh = new THREE.Group(); // Initialize as a THREE.Group
    this.scene.add(this.computerMesh); // Add the group to the scene
    this.computerFocus = false;
    this.computer = document.getElementById('computer');
  }

  async createComputer(x, y, z) {
    try {
      const gltf = await loaderService.loadGLTF('./resources/models/computer.gltf');
      const model = gltf.scene;
      console.log(model);
      model.scale.set(2,2.5,2.5); // Scale the model
      
      model.position.set(0, 0, 0); // Position relative to the group
      model.rotation.y = Math.PI / 2 + Math.PI / 4; // Rotate the model
    //   const texture = new THREE.TextureLoader().load('./resources/images/wood.jpg');
    //   model.traverse((child) => {
    //     if (child.isMesh) {
    //       child.material.map = texture;
    //     }
    //   });

      this.computerMesh.add(model); // Add the model to the group

      this.computerMesh.position.set(x, y, z); // Position the group
    } catch (error) {
      console.error('Error loading dresser model:', error);
    }
  }

  getComputerMesh() {
    return this.computerMesh;
  }

  lookAtComputer() {
    if (cameraService.getCameraPreset() !== cameraService.getCameraPreset('DRESSER_VIEW')) {
      return;
    }
    this.computerFocus = true;
    cameraService.lookAtComputer();
    setTimeout(() => {
    this.showIframe('https://pleasewakeupdaddy.com/');
    }, 1000);
  }

  showIframe(url) {
    iframeControls.showIframe(url);
    iframeControls.zoomIn();
  }

  hideIframe() {
    iframeControls.hideIframe();
  }

  unsetFocus() {
    this.computerFocus = false;
  }

  getComputerFocus() {
    return this.computerFocus;
  }
}

export default Computer;