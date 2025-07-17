import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

class LoaderService {
  constructor() {
    this.gltfLoader = new GLTFLoader();
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
}

// Export a singleton instance
export default new LoaderService(); 