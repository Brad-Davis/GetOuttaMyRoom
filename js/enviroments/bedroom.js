import Room from '../controls/room.js';
import Hallway from './hallway.js';

class Bedroom extends Room {
  constructor(config = {}) {
    // Bedroom-specific default configuration
    const bedroomConfig = {
      width: 10,
      height: 8,
      depth: 10,
      floorLevel: -3,
      ceilingLevel: 5,
      wallHeight: 1,
      ...config
    };
    
    super('Bedroom', bedroomConfig);
  }

  /**
   * Build the bedroom with all its surfaces
   */
  buildRoom(scene) {
    const surfaces = [];
    
    // Floor
    const floor = this.createSurface('floor', {
      width: this.config.width,
      height: this.config.depth,
      x: 0,
      y: this.config.floorLevel,
      z: 0,
      rotX: -Math.PI / 2,
      rotY: 0,
      rotZ: 0,
      texture: 'floor.jpg',
      textureOptions: { repeat: { x: 4, y: 4 } }
    });
    surfaces.push(floor);
    scene.add(floor);

    // Ceiling
    const ceiling = this.createSurface('ceiling', {
      width: this.config.width,
      height: this.config.depth,
      x: 0,
      y: this.config.ceilingLevel,
      z: 0,
      rotX: Math.PI / 2,
      rotY: 0,
      rotZ: 0,
      texture: 'ceiling.jpg'
    });
    surfaces.push(ceiling);
    scene.add(ceiling);

    // Left wall
    const leftWall = this.createSurface('wall', {
      width: this.config.depth,
      height: this.config.height,
      x: -this.config.width / 2,
      y: this.config.wallHeight,
      z: 0,
      rotX: 0,
      rotY: Math.PI / 2,
      rotZ: 0,
      texture: 'wall.jpg'
    });
    surfaces.push(leftWall);
    scene.add(leftWall);

    // Right wall (with window)
    const rightWall = this.createSurface('wall', {
      width: this.config.depth,
      height: this.config.height + 2,
      x: this.config.width / 2,
      y: this.config.wallHeight,
      z: 0,
      rotX: 0,
      rotY: -Math.PI / 2,
      rotZ: Math.PI,
      texture: 'windowWall.jpg',
      alphaMap: 'windowAlphaMap.jpg'
    });
    rightWall.position.y -= 1
    surfaces.push(rightWall);
    scene.add(rightWall);

    // Back wall (with door)
    const backWall = this.createSurface('wall', {
      width: this.config.width,
      height: this.config.height,
      x: 0,
      y: this.config.wallHeight,
      z: -this.config.depth / 2,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      texture: 'wall.jpg',
      alphaMap: 'dooredWall.jpg',
      textureOptions: {
        offset: { x: 0, y: -0.1 },
        repeat: { x: 1, y: 1 }
      }
    });
    
    surfaces.push(backWall);
    scene.add(backWall);

    // Front wall (window)
    const frontWall = this.createSurface('wall', {
      width: 7,
      height: 4.1,
      x: -0.5,
      y: this.config.wallHeight - 1.5,
      z: this.config.depth / 2 + 0.1,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      texture: 'outdoorWindow.webp',
      alphaMap: 'outdoorAlpha.jpg',
      textureOptions: {
        repeat: { x: 1, y: 1 },
        offset: { x: 0, y: 0 }
      }
    });

    const frontWall2 = this.createSurface('wall', {
        width: this.config.width + 1,
        height: this.config.height,
        x: -0.5,
        y: this.config.wallHeight,
        z: this.config.depth / 2,
        rotX: 0,
        rotY: 0,
        rotZ: 0,
        texture: "outdoorWood.jpg",
        alphaMap: "frontAlpha.jpg",
        textureOptions: { repeat: { x: 3, y: 3 } }
    });

    if (frontWall2.material) {
        // Option 1: Reduce the overall brightness
        frontWall2.material.color.multiplyScalar(0.6); // 60% brightness
        
        // Option 2: Add a dark tint while preserving texture
        frontWall2.material.color.setHex(0x888888);
        
        // Option 3: Adjust the material's overall intensity
        // frontWall2.material.opacity = 0.7; // Makes it more transparent/dim
    }

    // Make the frontWall texture brighter by increasing material emissive
    if (frontWall.material && frontWall.material.emissive) {
    //   frontWall.material.emissive.set(0xffffff); // white emissive color
      frontWall.material.emissiveIntensity = 0.5; // adjust intensity as needed
    }

    surfaces.push(frontWall);
    scene.add(frontWall);
    surfaces.push(frontWall2);
    scene.add(frontWall2);

    const bush = this.createSurface('bush', {
        width: 12,
        height: 3,
        x: 0,
        y: -3,
        z: this.config.depth / 2 + 1,
        rotX: 0,
        rotY: 0,
        rotZ: 0,
        texture: "bush.jpg",
        textureOptions: { repeat: { x: 8, y: 1 } },
        alphaMap: "bushAlpha.jpg"
    });

    const grass = this.createSurface('grass', {
        width: 30,
        height: 30,
        x: 0,
        y: -3.1,
        z: this.config.depth / 2 + 1,
        rotX: -Math.PI / 2,
        rotY: 0,
        rotZ: 0,
        texture: "grass.jpg",
        textureOptions: { repeat: { x: 10, y: 10 } }
    });
    surfaces.push(grass);
    surfaces.push(bush);
    scene.add(bush);
    scene.add(grass);

    const hallway = new Hallway(scene)

    return surfaces;
  }
}

export default Bedroom;
