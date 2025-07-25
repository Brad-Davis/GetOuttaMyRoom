import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

class LoaderService {
  constructor() {
    this.gltfLoader = new GLTFLoader();
    this.textureLoader = new THREE.TextureLoader();

  }

  /**
   * Load a GLTF model and return a Promise
   * @param {string} url - The URL of the GLTF/GLB file to load
   * @param {function} onProgress - Optional progress callback
   * @returns {Promise} Promise that resolves with the loaded GLTF object
   */
  async loadGLTF(url, onProgress = undefined) {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => resolve(gltf),
        onProgress,
        (error) => {
          console.error('Error loading GLTF:', error);
          reject(error);
        }
      );
    });
  }

  createSprite(url) {
    const texture = this.textureLoader.load(url);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, alphaTest: 0.5 }));
    sprite.scale.set(1, 1, 1);
    console.log(sprite);
    return sprite;
  }
}

// Export a singleton instance
const loaderService = new LoaderService();
export default loaderService; 