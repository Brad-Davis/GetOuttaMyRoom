import * as THREE from 'three';
import gsap from 'gsap';
import audioService from '../utils/audioService.js';
import cameraService from '../utils/cameraPresets.js';
import iframeControls from '../UI/iframeControls.js';
import textOverlay from '../UI/textOverlay.js';
import voiceRecognition from '../services/voiceRecognition.js';
import effectsService from '../utils/effectsService.js';

class CD {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.cdMesh = null;
    this.cdLight = null;
    this.cdLight2 = null;
    this.rotationSpeed = 0.01;
    this.exploded = false;
    this.cdPieces = [];
    this.onHouseEntered = null;
    this.onImmediateBattle = null;
    this.immediateBattleMode = false;
    this._introSequenceFinished = false;
  }

  setCamera(camera) {
    this.camera = camera;
  }

  setOnHouseEntered(callback) {
    this.onHouseEntered = typeof callback === 'function' ? callback : null;
  }

  setOnImmediateBattle(callback) {
    this.onImmediateBattle = typeof callback === 'function' ? callback : null;
  }

  setImmediateBattleMode(enabled) {
    this.immediateBattleMode = !!enabled;
  }

  /** Dev flow (`SKIP_INTRO`): remove CD and run `onHouseEntered` without explosion / iframe. */
  skipIntroTeardown() {
    if (this.exploded) {
      if (!this._introSequenceFinished) {
        this._introSequenceFinished = true;
        this.onHouseEntered?.();
      }
      return;
    }
    if (this.cdMesh) {
      if (this.cdLight) {
        this.cdMesh.remove(this.cdLight);
        this.cdLight = null;
      }
      if (this.cdLight2) {
        this.cdMesh.remove(this.cdLight2);
        this.cdLight2 = null;
      }
      this.scene.remove(this.cdMesh);
      this.cdMesh = null;
    }
    this.exploded = true;
    this.cleanupPieces();
  }

  createCD(x, y, z) {
    // Create CD geometry - a thin cylinder
    const cdGeometry = new THREE.BoxGeometry(1.5, 1.5, 0.1);
    
    // Load CD texture
    const texture = new THREE.TextureLoader().load('./resources/images/cd.png');
    
    // Create materials: front and back with texture, sides (top, bottom, left, right) all white
    const cdMaterials = [
      // Right
      new THREE.MeshLambertMaterial({ color: 0x000000 }),
      // Left
      new THREE.MeshLambertMaterial({ color: 0x000000}),
      // Top
      new THREE.MeshLambertMaterial({ color: 0xffffff }),
      // Bottom
      new THREE.MeshLambertMaterial({ color: 0xffffff }),
      // Front (z+)
      new THREE.MeshLambertMaterial({ 
        map: texture,
        transparent: false,
        opacity: 1
      }),
      // Back (z-)
      new THREE.MeshLambertMaterial({ 
        map: texture,
        transparent: false,
        opacity: 1
      }),
    ];

    // Create the CD mesh with per-face materials
    this.cdMesh = new THREE.Mesh(cdGeometry, cdMaterials);
    this.cdMesh.position.x = x;
    this.cdMesh.position.y = y;
    this.cdMesh.position.z = z;

    // Small glow so the CD emits light in the room.
    this.cdLight = new THREE.PointLight(0xffffff, 0.35, 5.2, 3);
    this.cdLight.position.set(0, 0, 0.6);
    this.cdMesh.add(this.cdLight);

    this.cdLight2 = new THREE.PointLight(0xffffff, 0.35, 5.2, 3);
    this.cdLight2.position.set(0, 0, -0.6);
    this.cdMesh.add(this.cdLight2);
    
    // Add the CD to the scene
    this.scene.add(this.cdMesh);
  }

  // Method to rotate the CD
  rotateCD() {
    if (this.cdMesh && !this.exploded) {
      this.cdMesh.rotation.y += this.rotationSpeed;
    }
    
    // Animate exploded pieces
    this.cdPieces.forEach(piece => {
      piece.rotation.x += 0.05;
      piece.rotation.y += 0.03;
      piece.rotation.z += 0.02;
    });
  }

  onClick() {
    if (this.exploded) return; // Prevent multiple explosions
    textOverlay.clearBottomOverlay();

    this.exploded = true;

    // Start background music on first user interaction
    // audioService.startBackgroundMusic();

    if (this.immediateBattleMode) {
      this.onImmediateBattle?.();
      this.animateExplosion();
      return;
    }

    const door2 = window.gameEngine?.getAssetManager?.()?.getGameObject('door2');

    cameraService.enterDoor({
      onComplete: () => {
        // Same beat as door2 — startupEffect must not wait on the woosh timeouts below.
        effectsService.playSfx('startupEffect');
        if (door2 && !door2.doorOpen) {
          door2.open();
        }
      },
    });
    
    
    setTimeout(() => {
      cameraService.wooshIntoDoor();
      effectsService.playSfx('startupEffect');
      setTimeout(() => {
          iframeControls.openSite('bedroomWelcome');
          iframeControls.zoomIn();
          setTimeout(() => {
            cameraService.sleepInBed();
            document.getElementById('active-items').style.display = 'block';
            document.getElementById('inventory-button').style.display = 'block';
          }, 1000);
      }, 1000);
    }, 3100)

    this.animateExplosion();

  }

  animateExplosion() {
    const originalPosition = this.cdMesh ? this.cdMesh.position.clone() : new THREE.Vector3();

    // Remove the original CD once
    if (this.cdMesh) {
      if (this.cdLight) {
        this.cdMesh.remove(this.cdLight);
        this.cdLight = null;
      }
      if (this.cdLight2) {
        this.cdMesh.remove(this.cdLight2);
        this.cdLight2 = null;
      }
      this.scene.remove(this.cdMesh);
      this.cdMesh = null;
    }

    // Create explosion pieces
    const pieceCount = 8;
    
    for (let i = 0; i < pieceCount; i++) {
      // Create smaller CD pieces
      const pieceGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.05);
      const texture = new THREE.TextureLoader().load('./resources/images/cd.png');
      
      const pieceMaterials = [
        new THREE.MeshLambertMaterial({ color: 0x000000 }),
        new THREE.MeshLambertMaterial({ color: 0x000000 }),
        new THREE.MeshLambertMaterial({ color: 0xffffff }),
        new THREE.MeshLambertMaterial({ color: 0xffffff }),
        new THREE.MeshLambertMaterial({ map: texture }),
        new THREE.MeshLambertMaterial({ map: texture }),
      ];
      
      const piece = new THREE.Mesh(pieceGeometry, pieceMaterials);
      
      // Position pieces around the original CD
      const angle = (i / pieceCount) * Math.PI * 2;
      const radius = 0.5;
      piece.position.x = originalPosition.x + Math.cos(angle) * radius;
      piece.position.y = originalPosition.y + Math.sin(angle) * radius;
      piece.position.z = originalPosition.z;
      
      // Add random velocity for explosion effect
      piece.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2
      );
      
      this.scene.add(piece);
      this.cdPieces.push(piece);
      textOverlay.hide();
    }
    
    // Start explosion physics loop
    this._animateExplosionPieces();

    // Remove pieces after 2 seconds to save resources
    setTimeout(() => {
      this.cleanupPieces();
    }, 2000);
  }

  _animateExplosionPieces() {
    this.cdPieces.forEach(piece => {
      // Apply velocity
      piece.position.add(piece.velocity);
      
      // Add gravity effect
      piece.velocity.y -= 0.01;
      
      // Slow down pieces over time
      piece.velocity.multiplyScalar(0.7);
    });
    
    // Continue animation if pieces are still moving
    if (this.cdPieces.length > 0) {
      requestAnimationFrame(() => this._animateExplosionPieces());
    }
  }

  cleanupPieces() {
    // Remove all pieces from the scene
    this.cdPieces.forEach(piece => {
      this.scene.remove(piece);
      // Dispose of geometry and materials to free memory
      if (piece.geometry) piece.geometry.dispose();
      if (piece.material) {
        if (Array.isArray(piece.material)) {
          piece.material.forEach(mat => mat.dispose());
        } else {
          piece.material.dispose();
        }
      }
    });
    
    // Clear the pieces array
    this.cdPieces = [];

    if (!this._introSequenceFinished) {
      this._introSequenceFinished = true;
      this.onHouseEntered?.();
    }
  }

  // Method to set rotation speed
  setRotationSpeed(speed) {
    this.rotationSpeed = speed;
  }

  // Method to get the CD mesh
  getCDMesh() {
    return this.cdMesh;
  }

  _setCdMaterialsEmissive(colorHex, intensity) {
    if (!this.cdMesh || this.exploded) return;
    const m = this.cdMesh.material;
    const apply = (mat) => {
      if (!mat || !mat.emissive) return;
      mat.emissive.setHex(colorHex);
      if (typeof mat.emissiveIntensity === 'number') {
        mat.emissiveIntensity = intensity;
      }
      mat.needsUpdate = true;
    };
    if (Array.isArray(m)) {
      m.forEach(apply);
    } else {
      apply(m);
    }
  }

  onHover() {
   
    // Scale the CD up slightly when hovered
    if (this.cdMesh && !this.exploded) {
      this._setCdMaterialsEmissive(0xffff00, 0.2);
      this.cdMesh.scale.set(1.25, 1.25, 1.25);
    }

  }

  onHoverLeave() {
    
    // Scale the CD up slightly when hovered
    if (this.cdMesh && !this.exploded) {
      this._setCdMaterialsEmissive(0x000000, 0);
      this.cdMesh.scale.set(1, 1, 1);
    }
  }
}

export default CD;
