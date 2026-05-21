import * as THREE from 'three';
import gsap from 'gsap';
import Room from '../controls/room.js';
import Hallway from './hallway.js';
import GpuRainEffect from '../utils/gpuRainEffect.js';
import cameraService from '../utils/cameraPresets.js';

const VIDEO_TAPES_PATH = './resources/images/videoTapes.mp4';
const VIDEO_WALL_BACKING_TEXTURE = './resources/images/goldFrame.png';

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

    const defaultRain = {
      enabled: true,
      /** Center of the rain volume in the same space as room meshes (gameGroup local). */
      center: { x: 6, y: 1.2, z: -3 },
      /** Axis-aligned box size around `center`. */
      volume: { width: 2, height: 7, depth: 2.8 },
      particleCount: 100,
      fallSpeed: 0.65,
      wind: 0.06,
      opacity: 0.34,
      color: 0xa8c4ee,
    };

    super('Bedroom', bedroomConfig);

    this.rainEffect = null;
    this.rainOptions = { ...defaultRain, ...(config.rain || {}) };
    /** @type {{ mesh: THREE.Mesh; backingMesh?: THREE.Mesh; videoTexture: THREE.VideoTexture; video: HTMLVideoElement } | null} */
    this._videoWallScreen = null;
    /** User has clicked the CRT; volume fades with camera view. */
    this._videoWallAudioUnlocked = false;
    this._videoWallWasAtView = false;
    /** @type {gsap.core.Tween | null} */
    this._videoWallVolumeTween = null;
    /** Meshes registered for scene clicks (see AssetManager). */
    this.voidMeshes = [];
  }

  /** CRT video plane for scene clicks (see AssetManager). */
  getVideoWallScreenMesh() {
    return this._videoWallScreen?.mesh ?? null;
  }

  /**
   * Call from a click handler: browsers allow audible playback after a user gesture.
   */
  enableVideoWallAudio() {
    const video = this._videoWallScreen?.video;
    if (!video) return;
    this._videoWallAudioUnlocked = true;
    this._videoWallWasAtView = cameraService.isAtVideoWallView();
    video.muted = false;
    video.volume = this._videoWallWasAtView ? 1 : 0;
    video.play().catch(() => {});
  }

  _fadeVideoWallVolume(targetVolume, duration = 1) {
    const video = this._videoWallScreen?.video;
    if (!video || !this._videoWallAudioUnlocked) return;

    this._videoWallVolumeTween?.kill();

    if (targetVolume <= 0) {
      this._videoWallVolumeTween = gsap.to(video, {
        volume: 0,
        duration,
        ease: 'power2.inOut',
        onComplete: () => {
          video.muted = true;
        },
      });
      return;
    }

    video.muted = false;
    this._videoWallVolumeTween = gsap.to(video, {
      volume: targetVolume,
      duration,
      ease: 'power2.inOut',
    });
  }

  _updateVideoWallAudio() {
    if (!this._videoWallAudioUnlocked) return;

    const atView = cameraService.isAtVideoWallView();
    if (atView === this._videoWallWasAtView) return;

    this._videoWallWasAtView = atView;
    this._fadeVideoWallVolume(atView ? 1 : 0);
  }

  /**
   * Called each frame (see AssetManager.updateAnimatedObjects).
   */
  update() {
    if (this.rainEffect) {
      this.rainEffect.update();
    }
    if (this._videoWallScreen) {
      const { video, videoTexture } = this._videoWallScreen;
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        videoTexture.needsUpdate = true;
      }
    }
    this._updateVideoWallAudio();
  }

  /**
   * CRT / tape wall — slightly in front of the left (-X) wall, facing into the room.
   */
  _addVideoWallScreen(scene) {
    const wallInsetX = -this.config.width / 2;
    // Backing sits on the wall; video floats slightly outward (toward +X) so edges read cleanly.
    const backingX = wallInsetX + 0.038;
    const videoX = wallInsetX + 0.072;

    const w = 2;
    const h = w / (16 / 9);
    const backingScale = 1.15;
    const bw = w * backingScale;
    const bh = h * backingScale;

    const backingTexture = new THREE.TextureLoader().load(VIDEO_WALL_BACKING_TEXTURE);
    backingTexture.colorSpace = THREE.SRGBColorSpace;
    backingTexture.minFilter = THREE.LinearMipmapLinearFilter;
    backingTexture.magFilter = THREE.LinearFilter;
    backingTexture.generateMipmaps = true;

    const backingMaterial = new THREE.MeshBasicMaterial({
      map: backingTexture,
      transparent: true,
      alphaTest: 0.1,
    });
    const backingGeometry = new THREE.PlaneGeometry(bw, bh);
    const backingMesh = new THREE.Mesh(backingGeometry, backingMaterial);

    backingMesh.position.set(backingX, -0.5, 1.2);
    backingMesh.rotation.set(0, Math.PI / 2, 0);
    scene.add(backingMesh);

    const video = document.createElement('video');
    video.src = VIDEO_TAPES_PATH;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.play().catch(() => {});

    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;

    const geometry = new THREE.PlaneGeometry(w, h);
    const material = new THREE.MeshBasicMaterial({ map: videoTexture });
    // `color` multiplies the video map (1 = full brightness).
    material.color.multiplyScalar(0.15);

    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(videoX, -0.5, 1.2);
    mesh.rotation.set(0, Math.PI / 2, 0);

    scene.add(mesh);
    this._videoWallScreen = { mesh, backingMesh, videoTexture, video };
  }

  /**
   * Build the bedroom with all its surfaces
   */
  buildRoom(scene) {
    const surfaces = [];
    this.voidMeshes = [];
    
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
    
    const poster3 = this.createSurface('poster', {
      width: 1,
      height: 1.6,
      x: -this.config.width/2 + 0.1,
      y: this.config.wallHeight/4,
      z: -3,
      rotX: 0,
      rotY: Math.PI / 2,
      rotZ: 0,
      texture: "alex.JPG"
    });

    surfaces.push(poster3);
    scene.add(poster3);

    const poster4 = this.createSurface('poster', {
      width: 0.5,
      height: 0.8,
      x: -this.config.width/2 + 0.1,
      y: this.config.wallHeight/4,
      z: -1,
      rotX: 0.1,
      rotY: Math.PI / 2,
      rotZ: 0,
      texture: "dad.png"
    });

    const voidSurface1 = this.createSurface('void', {
      width: 3,
      height: 3,
      x: -this.config.width/2 + 0.01,
      y: this.config.wallHeight + 3.5,
      z: -this.config.depth / 2 + 0.5,
      rotX: 0,
      rotY: Math.PI / 2,
      rotZ: Math.PI,
      texture: "void.png",
      alphaMap: "voidAlpha.png"
    });

    surfaces.push(voidSurface1);
    scene.add(voidSurface1);
    this.voidMeshes.push(voidSurface1);

    const voidSurface2 = this.createSurface('void', {
      width: 3,
      height: 3,
      x: -this.config.width/2,
      y: this.config.wallHeight + 4,
      z: -this.config.depth / 2 + 0.1,
      rotX: 0,
      rotY: 0,
      rotZ: Math.PI/2,
      texture: "void.png",
      alphaMap: "voidAlpha.png"
    });

    surfaces.push(voidSurface2);
    scene.add(voidSurface2);
    this.voidMeshes.push(voidSurface2);

    const voidSurface3 = this.createSurface('void', {
      width: 10,
      height: 10,
      x: -this.config.width/2,
      y: this.config.ceilingLevel - 0.2,
      z: -this.config.depth / 2 + 0.1,
      rotX: Math.PI/2,
      rotY: 0,
      rotZ: 0,
      texture: "void.png",
      alphaMap: "voidAlpha.png"
    });
    surfaces.push(voidSurface3);
    scene.add(voidSurface3);
    this.voidMeshes.push(voidSurface3);

    surfaces.push(poster4);
    scene.add(poster4);

    surfaces.push(leftWall);
    scene.add(leftWall);

    this._addVideoWallScreen(scene);

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

    const poster1 = this.createSurface('poster', {
      width: 1.5,
      height: 1.5,
      x: -this.config.width / 4,
      y: this.config.wallHeight/4,
      z: -this.config.depth / 2 + 0.01,
      rotX: 0,
      rotY: 0,
      rotZ: 0.2,
      texture: 'cd2.jpeg'
    });

    

    surfaces.push(poster1);
    scene.add(poster1);

    const poster2 = this.createSurface('poster', {
      width: 2.2,
      height: 1.5,
      x: this.config.width / 4 + 0.6,
      y: this.config.wallHeight/4 - 0.8,
      z: -this.config.depth / 2 + 0.05,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      texture: 'pullMeByTheNecktie.png'
    });
    
    surfaces.push(poster2);
    scene.add(poster2);

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
        y: -1.7,
        z: this.config.depth / 2 +0.2,
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

    const hallway = new Hallway(scene);

    if (this.rainOptions.enabled) {
      const { center, volume, particleCount, fallSpeed, wind, opacity, color } = this.rainOptions;
      this.rainEffect = new GpuRainEffect({
        center,
        volume,
        particleCount,
        fallSpeed,
        wind,
        opacity,
        color,
      });
      scene.add(this.rainEffect.group);
    }

    return surfaces;
  }
}

export default Bedroom;
