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
  loadTexture(texturePath, options = {}) {
    if (this.textureCache.has(texturePath)) {
      return this.textureCache.get(texturePath);
    }

    const texture = this.textureLoader.load(`../resources/images/${texturePath}`);
    
    // Set proper texture filtering to prevent glitching
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    
    // Apply texture options
    if (options.repeat) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(options.repeat.x, options.repeat.y);
    }
    
    this.textureCache.set(texturePath, texture);
    return texture;
  }

  /**
   * Create a wall surface (floor, ceiling, or wall)
   */
  createSurface(type, config) {
    const geometry = new THREE.PlaneGeometry(config.width, config.height);
    const texture = this.loadTexture(config.texture, config.textureOptions);
    
    // Apply texture positioning options to main texture
    if (config.textureOptions) {
      if (config.textureOptions.offset) {
        // texture.offset.set(config.textureOptions.offset.x, config.textureOptions.offset.y);
      }
      if (config.textureOptions.repeat) {
        texture.repeat.set(config.textureOptions.repeat.x, config.textureOptions.repeat.y);
      }
    }
    
    // Create material with optional transparency
    const materialOptions = { map: texture };
    
    // Handle alpha map for custom transparency masks
    if (config.alphaMap) {
      const alphaMap = this.loadTexture(config.alphaMap);
      
      // Apply the same texture options to alpha map
      if (config.textureOptions) {
        if (config.textureOptions.offset) {
          alphaMap.offset.set(config.textureOptions.offset.x, config.textureOptions.offset.y);
        }
        // if (config.textureOptions.repeat) {
        //   alphaMap.repeat.set(config.textureOptions.repeat.x, config.textureOptions.repeat.y);
        // }
      }
      
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
   * Add an item to the room
   */
  addItem(item) {
    this.items.push(item);
  }

  /**
   * Remove an item from the room
   */
  removeItem(item) {
    const index = this.items.indexOf(item);
    if (index > -1) {
      this.items.splice(index, 1);
    }
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
}

export default Room;
