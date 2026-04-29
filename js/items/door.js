import * as THREE from 'three';

class Door {
  constructor(scene) {
    this.scene = scene;
    this.doorMesh = null;
    this.doorOpen = false;
  }

  createDoor(x, y, z) {
    // Create door mesh and add it to the scene
    const doorGeometry = new THREE.BoxGeometry(2, 4, 0.1);
    const texture = new THREE.TextureLoader().load('./resources/images/door.png', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
    });
    // Standard (PBR) vs room Lambert: picks up directional specular and falls off differently when ambient flickers.
    const doorMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.52,
      metalness: 0.18,
    });
    this.doorMesh = new THREE.Mesh(doorGeometry, doorMaterial);
    this.doorMesh.position.x = x;
    this.doorMesh.position.y = y;
    this.doorMesh.position.z = z;
    this.doorMesh.rotation.X = Math.PI / 2;

    this.scene.add(this.doorMesh);
  }

  getDoorMesh() {
    return this.doorMesh;
  }

    open() {
        // Open the door
        this.doorMesh.rotation.y = Math.PI / 2;
        this.doorMesh.position.x -= 1; // Move the door to the right to align the rotation point to the left edge
        this.doorMesh.position.z += 1; // Move the door to the right to align the rotation point to the left edge
        this.doorOpen = true;
    }

    close(){
        this.doorMesh.rotation.y = 0;
        this.doorMesh.position.x += 1; 
        this.doorMesh.position.z -= 1; // Move the door to the right to align the rotation point to the left edge
        this.doorOpen = false;
    }
}

export default Door;
