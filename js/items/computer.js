import * as THREE from 'three';
import loaderService from '../utils/loaderService.js';

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

  lookAtComputer(camera, gsap, dresserFocus) {
    if (!dresserFocus) {
      return;
    }
    this.computerFocus = true;
    gsap.to(camera.position, {
      x: -3.63,
      y: -0.8,
      z: -6.3,
      duration: 1,
      ease: 'power2.inOut',
    });
    gsap.to(camera.rotation, {
      x: 0.3,
      y: Math.PI/2 + Math.PI/4,
      z: -Math.PI/16 - 0.01,
      duration: 1,
      ease: 'power2.inOut',
    });
    this.showIframe('https://fritz.chessbase.com');
  }

  showIframe(url) {
    const computer = document.getElementById('computer');
    computer.style.display = 'block';
    computer.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '10px';
    iframe.style.overflow = 'hidden';
    iframe.style.boxShadow = '0 0 10px 0 rgba(0, 0, 0, 0.5)';
    computer.appendChild(iframe);
  }

  hideIframe() {
    const computer = document.getElementById('computer');
    computer.style.display = 'none';
    computer.innerHTML = '';
  }

  unsetFocus() {
    this.computerFocus = false;
  }

  getComputerFocus() {
    return this.computerFocus;
  }
}

export default Computer;