import * as THREE from 'three';
import { clone as cloneSkinnedModel } from 'three/examples/jsm/utils/SkeletonUtils.js';
import gsap from 'gsap';
import Room from '../controls/room.js';
import Hallway from './hallway.js';
import GpuRainEffect from '../utils/gpuRainEffect.js';
import cameraService from '../utils/cameraPresets.js';
import loaderService from '../utils/loaderService.js';

const OUTSIDE_MODEL_PATH = './resources/models/Outside.glb';
const GUY_MODEL_PATH = './resources/models/guy.glb';
const HEAD_MODEL_PATH = './resources/models/head.glb';

const VIDEO_TAPES_PATH = './resources/images/videoTapes.mp4';
const VIDEO_WALL_BACKING_TEXTURE = './resources/images/goldFrame.png';

/** Blocks +Z behind the default interior camera until the Thirties turn-around. */
const THIRTIES_BACKDROP_WALL_Z = 5;

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
    /** @type {THREE.Object3D | null} */
    this.outsideModel = null;
    /** @type {THREE.Object3D | null} */
    this.passerByModel = null;

    this.headModel = null;
    /** @type {{ mesh: THREE.Mesh; backingMesh?: THREE.Mesh; videoTexture: THREE.VideoTexture; video: HTMLVideoElement } | null} */
    this._videoWallScreen = null;
    /** User has clicked the CRT; volume fades with camera view. */
    this._videoWallAudioUnlocked = false;
    this._videoWallWasAtView = false;
    /** @type {gsap.core.Tween | null} */
    this._videoWallVolumeTween = null;
    /** Meshes registered for scene clicks (see AssetManager). */
    this.voidMeshes = [];
    /** @type {THREE.Mesh | null} */
    this._rightWindowClickMesh = null;
    /** @type {THREE.Mesh | null} */
    this._poster2Mesh = null;
    /** @type {THREE.Mesh | null} */
    this._poster5Mesh = null;
    /** @type {import('./hallway.js').default | null} */
    this.hallway = null;
    /** Solid plane behind default interior view; removed before Thirties chase turn. */
    this._thirtiesBackdropWall = null;
    this._thirtiesBackdropWallTween = null;

    this.questionForPasserBy = false;
    /** @type {THREE.Mesh | null} */
    this._passerByClickMesh = null;
    this._passerbyQuestionActive = false;
    this._passerbyQuestionDone = false;
  }

  getDadsRoomDoor() {
    return this.hallway?.getDadsRoomDoor?.() ?? null;
  }

  /** Invisible click target in front of the right-wall window (see AssetManager). */
  getRightWindowClickMesh() {
    return this._rightWindowClickMesh;
  }

  /** CRT video plane for scene clicks (see AssetManager). */
  getVideoWallScreenMesh() {
    return this._videoWallScreen?.mesh ?? null;
  }

  /** Grandpa poster on the back wall (see AssetManager). */
  getPoster2Mesh() {
    return this._poster2Mesh;
  }

  /** Editor's note poster on the right wall (see AssetManager). */
  getPoster5Mesh() {
    return this._poster5Mesh;
  }

  /**
   * Wall behind INTERIOR_START (+Z). Fades out when the hallway chase begins.
   * @returns {Promise<void>}
   */
  removeThirtiesBackdropWall({ duration = 0.45 } = {}) {
    const wall = this._thirtiesBackdropWall;
    if (!wall) return Promise.resolve();

    this._thirtiesBackdropWallTween?.kill();
    this._thirtiesBackdropWall = null;

    const material = wall.material;
    if (!material) {
      wall.parent?.remove(wall);
      wall.geometry?.dispose?.();
      return Promise.resolve();
    }

    material.transparent = true;
    material.depthWrite = false;

    return new Promise((resolve) => {
      this._thirtiesBackdropWallTween = gsap.to(material, {
        opacity: 0,
        duration,
        ease: 'power2.in',
        onComplete: () => {
          wall.parent?.remove(wall);
          wall.geometry?.dispose?.();
          material.map?.dispose?.();
          material.dispose?.();
          this._thirtiesBackdropWallTween = null;
          resolve();
        },
      });
    });
  }

  _addThirtiesBackdropWall(scene) {
    const wall = this.createSurface('wall', {
      width: this.config.width,
      height: this.config.height,
      x: 0,
      y: this.config.wallHeight,
      z: THIRTIES_BACKDROP_WALL_Z,
      rotX: 0,
      rotY: Math.PI,
      rotZ: 0,
      texture: 'wall.jpg',
    });
    wall.name = 'thirtiesBackdropWall';
    scene.add(wall);
    this._thirtiesBackdropWall = wall;
    return wall;
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
    this._syncPasserbyClickMesh();
  }

  _configureOutsideModel(model) {
    model.scale.setScalar(1);
    model.rotation.y = Math.PI / 2;

    model.traverse((child) => {
      if (!child.isMesh) return;
      child.frustumCulled = false;
      if (Array.isArray(child.material)) {
        child.material.forEach((mat) => {
          mat.side = THREE.DoubleSide;
        });
      } else if (child.material) {
        child.material.side = THREE.DoubleSide;
      }
    });
  }

  _placeOutsideModel(model, z) {
    model.position.set(
      15 + this.config.width,
      this.config.floorLevel - 0.2,
      z
    );
  }

  /**
   * Cityscape GLB just beyond the right-wall window (+X), visible through the alpha cutout.
   */
  async _loadOutsideBeyondWindow(scene) {
    try {
      const gltf = await loaderService.loadGLTF(OUTSIDE_MODEL_PATH);
      const baseZ = -2.8;
      const duplicateZOffset = 30;

      const model = gltf.scene;
      this.outsideModel = model;
      this._configureOutsideModel(model);
      this._placeOutsideModel(model, baseZ);
      scene.add(model);

      const duplicate = cloneSkinnedModel(model);
      this._placeOutsideModel(duplicate, baseZ - duplicateZOffset);
      scene.add(duplicate);
    } catch (error) {
      console.error('Error loading outside view model:', error);
    }
  }

  async _loadPasserby(scene) {
    try {
      const gltf = await loaderService.loadGLTF(GUY_MODEL_PATH);
      const model = gltf.scene;
      this.passerByModel = model;

      model.scale.setScalar(2);
      model.position.set(
        7.5,
        this.config.floorLevel + 2,
        -5
      );

      const head = await loaderService.loadGLTF(HEAD_MODEL_PATH);
      this.headModel = head.scene;
      this.headModel.scale.setScalar(1);
      this.headModel.position.set(
        6,
        this.config.floorLevel - 1,
        -2
      );
      this.headModel.rotation.y = -Math.PI / 2;

      scene.add(model);
      scene.add(this.headModel);
      this._attachPasserbyClickMesh(scene);
      window.gameEngine?.interactionManager?.registerPasserbyClick?.(
        this._passerByClickMesh,
        this
      );
      this.walkByPasserby();
    } catch (error) {
      console.error('Error loading outside view model:', error);
    }
  }

  /**
   * Invisible target on the window plane (in front of the large right-window click plane)
   * so clicks reach the passerby while he walks outside.
   */
  _attachPasserbyClickMesh(scene) {
    const geometry = new THREE.BoxGeometry(1.4, 3.2, 1.2);
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'passerByClick';
    scene.add(mesh);
    this._passerByClickMesh = mesh;
    this._syncPasserbyClickMesh();
  }

  _syncPasserbyClickMesh() {
    if (!this._passerByClickMesh || !this.passerByModel) return;

    this._passerByClickMesh.visible = !this._passerbyQuestionDone;

    const wallX = this.config.width / 2;
    const p = this.passerByModel.position;
    this._passerByClickMesh.position.set(wallX - 0.12, p.y, p.z);
  }

  /** Click the passerby — peek / question animation at the window. */
  triggerPasserbyQuestion() {
    if (!this.passerByModel || this._passerbyQuestionDone || this._passerbyQuestionActive) {
      return;
    }

    this.questionForPasserBy = true;

    const pauseZ = -2.2;
    const z = this.passerByModel.position.z;
    if (z >= pauseZ - 0.3) {
      gsap.killTweensOf(this.passerByModel.position);
      gsap.killTweensOf(this.passerByModel.rotation);
      if (this.headModel) {
        gsap.killTweensOf(this.headModel.position);
      }
      this.passerByModel.position.z = pauseZ;
      this.questionForPasserBy = false;
      this.passerByApproach();
    }
  }

  //PASSERBY QUESTION LOGIC
  walkByPasserby() {
    const walkSpeed = 1.8; // z-units/sec (-20 → -2 in 10s)
    this.passerByDefaultLocation();

    const startZ = -20;
    const pauseZ = -2.2;

    gsap.to(this.passerByModel.position, {
      z: pauseZ,
      duration: Math.abs(pauseZ - startZ) / walkSpeed,
      ease: 'none',
      onComplete: () => {
        if (this.questionForPasserBy) {
          this.passerByApproach();
        } else {
          const exitZ = 5;
          gsap.to(this.passerByModel.position, {
            z: exitZ,
            duration: Math.abs(exitZ - pauseZ) / walkSpeed,
            ease: 'none',
            onComplete: () => {
              this.walkByPasserby();
            },
          });
        }
      },
    });
  }


  passerByApproach() {
    if (!this.passerByModel || this._passerbyQuestionActive || this._passerbyQuestionDone) {
      return;
    }
    this._passerbyQuestionActive = true;
    this.questionForPasserBy = false;

    gsap.to(this.passerByModel.rotation, {
      y: -Math.PI / 2,
      duration: 1,
      ease: 'power2.inOut',
      onComplete: () => {
        gsap.to(this.passerByModel.position, {
          y: -10,
          duration: 1,
          ease: 'power2.inOut',
          onComplete: () => {
            if (!this.headModel) {
              this._finishPasserbyQuestion();
              return;
            }
            gsap.to(this.headModel.position, {
              y: -0.7,
              duration: 0.1,
              ease: 'power2.inOut',
              onComplete: () => this._finishPasserbyQuestion(),
            });
          },
        });
      },
    });
  }

  _finishPasserbyQuestion() {
    this._passerbyQuestionActive = false;
    this._passerbyQuestionDone = true;
    this.questionForPasserBy = false;
  }

  passerByDefaultLocation() {
    if (!this.passerByModel) return;

    this.passerByModel.position.set(
      7.5,
      this.config.floorLevel + 2,
      -20
    );
    this.passerByModel.rotation.y = 0;
    this._passerbyQuestionActive = false;
    this._passerbyQuestionDone = false;
    this.questionForPasserBy = false;

    if (this.headModel) {
      this.headModel.position.set(
        6,
        this.config.floorLevel - 1,
        -2
      );
    }
  }

  /**
   * Road strip visible through the right (+X) wall window, just outside the building.
   */
  _addOutsideRoad(scene) {
    const wallX = this.config.width / 2;
    const roadLength = 4;
    const roadWidth = 20;

    const road = this.createSurface('road', {
      width: roadLength,
      height: roadWidth,
      x: wallX + roadLength / 2 + 0.6,
      y: this.config.floorLevel + 0.5,
      z: -4.5,
      rotX: -Math.PI / 2,
      rotY: 0,
      rotZ: 0,
      texture: 'road.jpg',
      textureOptions: { repeat: { x: 1, y: 1 } },
    });

    scene.add(road);
    return road;
  }

  /**
   * Transparent raycast plane just inside the right (+X) window wall.
   */
  _addRightWindowClickPlane(scene) {
    const wallX = this.config.width / 2;
    const w = 4.2;
    const h = 4.8;

    const geometry = new THREE.PlaneGeometry(w, h);
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(wallX - 0.08, 0.6, -2.6);
    mesh.rotation.set(0, -Math.PI / 2, 0);
    mesh.name = 'rightWindowClick';

    scene.add(mesh);
    this._rightWindowClickMesh = mesh;
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
    this._poster2Mesh = null;
    this._poster5Mesh = null;
    this._thirtiesBackdropWallTween?.kill();
    this._thirtiesBackdropWall = null;
    
    // Floor — extend 1 unit past the back wall so it overlaps the hallway plane (no seam).
    const floorDepth = this.config.depth + 1;
    const floor = this.createSurface('floor', {
      width: this.config.width,
      height: floorDepth,
      x: 0,
      y: this.config.floorLevel,
      z: -0.5,
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

    const longLeftWall = this.createSurface('wall', {
      width: 1000,
      height: this.config.height,
      x: -this.config.width / 2,
      y: this.config.wallHeight,
      z: 500 + this.config.depth / 2,
      rotX: 0,
      rotY: Math.PI / 2,
      rotZ: 0,
      texture: 'wall.jpg',
      textureOptions: { repeat: { x: 100, y: 1 } }
    });
    surfaces.push(longLeftWall);
    scene.add(longLeftWall);

    const longRightWall = this.createSurface('wall', {
      width: 1000,
      height: this.config.height,
      x: this.config.width / 2,
      y: this.config.wallHeight,
      z: 500 + this.config.depth / 2,
      rotX: 0,
      rotY: -Math.PI / 2,
      rotZ: 0,
      texture: 'wall.jpg',
      textureOptions: { repeat: { x: 100, y: 1 } }
    });
    surfaces.push(longRightWall);
    scene.add(longRightWall);

    // Horizontal plane: `width` = X, `height` = Z (after rotX −π/2).
    // Same Z center as long walls; length 1000 on Z like their `width`.
    const longRunLength = 1000;
    const longFloor = this.createSurface('floor', {
      width: this.config.width,
      height: longRunLength,
      x: 0,
      y: this.config.floorLevel,
      z: 500 + this.config.depth / 2,
      rotX: -Math.PI / 2,
      rotY: 0,
      rotZ: 0,
      texture: 'floor.jpg',
      textureOptions: { repeat: { x: 4, y: 400 } }
    });
    longFloor.frustumCulled = false;
    surfaces.push(longFloor);
    scene.add(longFloor);

    const longCeiling = this.createSurface('ceiling', {
      width: this.config.width,
      height: longRunLength,
      x: 0,
      y: this.config.ceilingLevel,
      z: 500 + this.config.depth / 2,
      rotX: Math.PI / 2,
      rotY: 0,
      rotZ: 0,
      texture: 'ceiling.jpg',
      textureOptions: { repeat: { x: 1, y: 100 } }
    });
    longCeiling.frustumCulled = false;
    surfaces.push(longCeiling);
    scene.add(longCeiling);

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

    const poster5 = this.createSurface('poster', {
      width: 1,
      height: 1.6,
      x: this.config.width/2 - 0.1,
      y: this.config.wallHeight/4 - 0.4,
      z: 1,
      rotX: 0,
      rotY: -Math.PI / 2,
      rotZ: 0,
      texture: "peepee.png"
    });
    this._poster5Mesh = poster5;
    surfaces.push(poster5);
    scene.add(poster5);

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

    this._addRightWindowClickPlane(scene);

    this._addOutsideRoad(scene);
    this._loadOutsideBeyondWindow(scene);
    this._loadPasserby(scene);

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
      texture: 'doorWall.png',
      alphaMap: 'dooredWall.jpg',
      textureOptions: {
        offset: { x: 0, y: 0 },
        repeat: { x: 1, y: 0.785 }
      },
      // Alpha hole is ~40% of image height; door mesh is 4/8 of wall (50%). Scale V so cutout matches door.
      alphaMapTextureOptions: {
        offset: { x: 0, y: 0 },
        repeat: { x: 1, y: 0.8 }
      },
      alphaTest: 0.5,
    });

    // Back wall (with door)
    const backWall2 = this.createSurface('wall', {
      width: this.config.width,
      height: this.config.height,
      x: 0,
      y: this.config.wallHeight,
      z: -this.config.depth / 2 - 0.01,
      rotX: 0,
      rotY: Math.PI,
      rotZ: 0,
      texture: 'doorWall.png',
      alphaMap: 'dooredWall.jpg',
      textureOptions: {
        offset: { x: 0, y: 0 },
        repeat: { x: 1, y: 0.785 }
      },
      // Alpha hole is ~40% of image height; door mesh is 4/8 of wall (50%). Scale V so cutout matches door.
      alphaMapTextureOptions: {
        offset: { x: 0, y: 0 },
        repeat: { x: 1, y: 0.8 }
      },
      alphaTest: 0.5,
    });

    surfaces.push(backWall2);
    scene.add(backWall2);

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
      height: 3,
      x: this.config.width / 4 + 0.6,
      y: this.config.wallHeight/4 - 0.2,
      z: -this.config.depth / 2 + 0.05,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      texture: 'grandpa.png'
    });

    this._poster2Mesh = poster2;
    surfaces.push(poster2);
    scene.add(poster2);

    const turnLeft = this.createSurface('poster', {
      width: 1.3,
      height: 1,
      x: this.config.width / 2 - 2.9,
      y: this.config.wallHeight/4 - 1,
      z: -this.config.depth / 2 + 0.01,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      texture: 'turnLeft2.png'
    });
    surfaces.push(turnLeft);
    scene.add(turnLeft);

    surfaces.push(backWall);
    scene.add(backWall);

    // // Front wall (window)
    // const frontWall = this.createSurface('wall', {
    //   width: 7,
    //   height: 4.1,
    //   x: -0.5,
    //   y: this.config.wallHeight - 1.5,
    //   z: this.config.depth / 2 + 0.1,
    //   rotX: 0,
    //   rotY: 0,
    //   rotZ: 0,
    //   texture: 'outdoorWindow.webp',
    //   alphaMap: 'outdoorAlpha.jpg',
    //   textureOptions: {
    //     repeat: { x: 1, y: 1 },
    //     offset: { x: 0, y: 0 }
    //   }
    // });

    // const frontWall2 = this.createSurface('wall', {
    //     width: this.config.width + 1,
    //     height: this.config.height,
    //     x: -0.5,
    //     y: this.config.wallHeight,
    //     z: this.config.depth / 2,
    //     rotX: 0,
    //     rotY: 0,
    //     rotZ: 0,
    //     texture: "outdoorWood.jpg",
    //     alphaMap: "frontAlpha.jpg",
    //     textureOptions: { repeat: { x: 3, y: 3 } }
    // });

    // if (frontWall2.material) {
    //     // Option 1: Reduce the overall brightness
    //     frontWall2.material.color.multiplyScalar(0.6); // 60% brightness
        
    //     // Option 2: Add a dark tint while preserving texture
    //     frontWall2.material.color.setHex(0x888888);
        
    //     // Option 3: Adjust the material's overall intensity
    //     // frontWall2.material.opacity = 0.7; // Makes it more transparent/dim
    // }

    // // Make the frontWall texture brighter by increasing material emissive
    // if (frontWall.material && frontWall.material.emissive) {
    // //   frontWall.material.emissive.set(0xffffff); // white emissive color
    //   frontWall.material.emissiveIntensity = 0.5; // adjust intensity as needed
    // }

    // surfaces.push(frontWall);
    // scene.add(frontWall);
    // surfaces.push(frontWall2);
    // scene.add(frontWall2);

    // const bush = this.createSurface('bush', {
    //     width: 12,
    //     height: 3,
    //     x: 0,
    //     y: -1.7,
    //     z: this.config.depth / 2 +0.2,
    //     rotX: 0,
    //     rotY: 0,
    //     rotZ: 0,
    //     texture: "bush.jpg",
    //     textureOptions: { repeat: { x: 8, y: 1 } },
    //     alphaMap: "bushAlpha.jpg"
    // });
    // surfaces.push(bush);
    // scene.add(bush);

    const grass = this.createSurface('grass', {
        width: 1000,
        height: 1000,
        x: 0,
        y: -3.1,
        z: this.config.depth / 2 + 1,
        rotX: -Math.PI / 2,
        rotY: 0,
        rotZ: 0,
        texture: "grass2.jpg",
        textureOptions: { repeat: { x: 10, y: 10 } }
    });
    surfaces.push(grass);
    // 
    scene.add(grass);

    const thirtiesBackdropWall = this._addThirtiesBackdropWall(scene);
    surfaces.push(thirtiesBackdropWall);

    this.hallway = new Hallway(scene);

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
