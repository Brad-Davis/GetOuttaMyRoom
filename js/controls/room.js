import * as THREE from 'three';
import Bed from '../items/bed.js';

class Room {
  constructor(name, config = {}) {
    this.name = name;
    this.items = [];
    this.textureLoader = new THREE.TextureLoader();
    this.textureCache = new Map();
    
    // Default room configuration
    this.config = {
      width: 10,
      height: 8, 
      depth: 10,
      floorLevel: -3,
      ceilingLevel: 5,
      wallHeight: 1,
      ...config
    };
  }

  /**
   * Load and cache a texture
   */
  loadTexture(texturePath) {
    if (this.textureCache.has(texturePath)) {
      return this.textureCache.get(texturePath);
    }

    const texture = this.textureLoader.load(`../resources/images/${texturePath}`);

    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    this.textureCache.set(texturePath, texture);
    return texture;
  }

  /**
   * Per-mesh map so repeat/offset on one surface does not affect others sharing the same image.
   */
  _textureMapForSurface(texturePath, textureOptions = {}) {
    const map = this.loadTexture(texturePath).clone();
    map.repeat.set(1, 1);
    map.offset.set(0, 0);

    if (textureOptions.repeat) {
      map.repeat.set(textureOptions.repeat.x, textureOptions.repeat.y);
    }
    if (textureOptions.offset) {
      map.offset.set(textureOptions.offset.x, textureOptions.offset.y);
    }

    return map;
  }

  /**
   * Create a wall surface (floor, ceiling, or wall)
   */
  createSurface(type, config) {
    const geometry = new THREE.PlaneGeometry(config.width, config.height);
    const texture = this._textureMapForSurface(config.texture, config.textureOptions);

    const materialOptions = { map: texture };

    if (config.alphaMap) {
      const alphaMap = this._textureMapForSurface(config.alphaMap, config.textureOptions);
      
      materialOptions.alphaMap = alphaMap;
      materialOptions.transparent = true;
    }
    
    // Handle PNG transparency (check if texture file is PNG)
    if (config.texture && config.texture.toLowerCase().endsWith('.png')) {
      materialOptions.transparent = true;
      materialOptions.alphaTest = 0.1; // Helps with PNG transparency
    }
    
    // Force transparency for certain surface types
    if (type === 'void' || config.forceTransparent) {
      materialOptions.transparent = true;
    }
    
    const material = new THREE.MeshLambertMaterial(materialOptions);
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position and rotate
    mesh.position.set(config.x, config.y, config.z);
    mesh.rotation.set(config.rotX, config.rotY, config.rotZ);
    
    return mesh;
  }

  /**
   * Build room surfaces - to be implemented by subclasses
   */
  buildRoom(scene) {
    throw new Error('buildRoom() must be implemented by subclass');
  } 

  /**
   * Get room dimensions
   */
  getDimensions() {
    return {
      width: this.config.width,
      height: this.config.height,
      depth: this.config.depth
    };
  }

  /**
   * Update room configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.textureCache.forEach(texture => texture.dispose());
    this.textureCache.clear();
    this.items = [];
  }

  shake(mesh) {
    
  }
}

export default Room;
