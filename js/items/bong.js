import * as THREE from 'three';
import loaderService from '../utils/loaderService.js';
import cameraService from '../utils/cameraPresets.js';
import effectsService from '../utils/effectsService.js';
import audioService from '../utils/audioService.js';
import iframeControls from '../UI/iframeControls.js';

import gsap from 'gsap';

class Bong {
  constructor(scene) {
    this.scene = scene;
    this.bongMesh = null;
    this.active = false;
    this.originalPosition = null;
    this.hitCounter = 0;
  }

  async createBong(x, y, z) {
    try {
      const gltf = await loaderService.loadGLTF('./resources/models/bong.glb');
      this.bongMesh = gltf.scene;
      console.log(this.bongMesh);
      this.bongMesh.scale.set(0.15, 0.15, 0.15); // Scale the model
      this.bongMesh.position.set(x, y, z);
      this.originalPosition = { x, y, z }; // Store original position
      this.bongMesh.rotation.y = 1.5 * Math.PI / 5; // Rotate the model
      // Apply glassy material
      this.bongMesh.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 1.9,
            roughness: 0.1,
            transmission: 0.9, // Enable transparency
            transparent: true,
            opacity: 0.8,
            ior: 100, // Index of refraction
          });
        }
      });
      this.scene.add(this.bongMesh);
    } catch (error) {
      console.error('Error loading bong model:', error);
    }
  }

  getBongMesh() {
    return this.bongMesh;
  }

  onClick() {
    this.hitCounter++;
    if (this.active) return;
    if (!cameraService.checkCameraPreset('DRESSER_VIEW')) return;
    this.active = true;

    if (this.hitCounter === 1) {
      effectsService.playSfx('bongHit1');
      
    } else if (this.hitCounter === 2) {
      effectsService.playSfx('bongHit2');
    } else if (this.hitCounter === 3) {
      effectsService.playSfx('bongHit3');
      setTimeout(() => {
        cameraService.closeEyes();
        
        audioService.playSound('bongHit3');
      
        
        audioService.playThoseWhoAreRememberedMusic();
        setTimeout(() => {
          const url = "/sites/thoseWhoAreRemebered/index.html";
          const externalEmbed = /^https?:\/\//i.test(url);
          iframeControls.showIframe(url, { externalEmbed });
          iframeControls.zoomIn();
          cameraService.openEyes();
        }, 5000);
      }, 5000);
      this.hitCounter = 0;
    }
    
    // Animate up first
    gsap.to(this.bongMesh.position, {
      y: this.bongMesh.position.y - 0.2,
      x: this.bongMesh.position.x + 1,
      z: this.bongMesh.position.z + 1,
      duration: 1,
      ease: 'power2.inOut',
      onComplete: () => {
        effectsService.smokeEffect({
          duration: 6,
          growthPower: 8,
          numSprites: 18,
          sizeStart: 0.006,
          sizeEnd: 1.5 * this.hitCounter,
          radiusStart: 0.003,
          radiusEnd: 1.2 * this.hitCounter,
        });
        console.log('Animation up finished!');
        setTimeout(() => {
          gsap.to(this.bongMesh.position, {
            y: this.originalPosition.y,
            x: this.originalPosition.x,
            z: this.originalPosition.z,
            rotationX: 0,
            duration: 1,
            ease: 'power2.inOut',
            onComplete: () => {
              console.log('Animation back to original finished!');
              this.active = false;
            }
          });
          gsap.to(this.bongMesh.rotation, {
            y: 0,
            z: 0, 
            duration: 1,
            ease: 'power2.inOut',
          });
        }, 3000);
      }
    });

    gsap.to(this.bongMesh.rotation, {
      y: Math.PI,
      z: Math.PI / 3,
      duration: 1,
      ease: 'power2.inOut',
    });
  }
}

export default Bong;
