import * as THREE from 'three';
import gsap from 'gsap';
import audioService from '../utils/audioService.js';

class CD {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.cdMesh = null;
    this.rotationSpeed = 0.01;
    this.exploded = false;
    this.cdPieces = [];
  }

  createCD(x, y, z) {
    // Create CD geometry - a thin cylinder
    const cdGeometry = new THREE.BoxGeometry(1.5, 1.5, 0.1);
    
    // Load CD texture
    const texture = new THREE.TextureLoader().load('./resources/images/cd.jpg');
    
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
    
    this.exploded = true;
    
    // Start background music on first user interaction
    audioService.startBackgroundMusic();
    
    // Smooth camera transition to CD position
    gsap.to(this.camera.position, {
      x: 0,
      y: 0, // Slightly above the CD
      z: 0, // Behind the CD
      duration: 1.5,
      ease: 'power2.inOut',
    });
    
    gsap.to(this.camera.rotation, {
      x: 0,
      y: 0,
      z: 0,
      duration: 1.5,
      ease: 'power2.inOut',
    });
    
    // Remove the original CD
    if (this.cdMesh) {
      this.scene.remove(this.cdMesh);
    }
    
    // Create explosion pieces
    const originalPosition = this.cdMesh.position.clone();
    const pieceCount = 8;
    
    for (let i = 0; i < pieceCount; i++) {
      // Create smaller CD pieces
      const pieceGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.05);
      const texture = new THREE.TextureLoader().load('./resources/images/cd.jpg');
      
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
    }
    
    // Animate the explosion
    this.animateExplosion();
    
    // Remove pieces after 2 seconds to save resources
    setTimeout(() => {
      this.cleanupPieces();
    }, 2000);
  }

  animateExplosion() {
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
      requestAnimationFrame(() => this.animateExplosion());
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
  }

  // Method to set rotation speed
  setRotationSpeed(speed) {
    this.rotationSpeed = speed;
  }

  // Method to get the CD mesh
  getCDMesh() {
    return this.cdMesh;
  }
}

export default CD;
