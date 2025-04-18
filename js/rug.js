import * as THREE from 'three';

class Rug {
  constructor(scene) {
    this.scene = scene;
    this.rugMesh = null;
    this.doorOpen = false;
  }

  createRug(x, y, z) {
    // Create door mesh and add it to the scene
    const rugGeometry = new THREE.BoxGeometry(5, 0.01, 4);
    // const doorMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const texture = new THREE.TextureLoader().load('./resources/images/rug.png');

    const rugMaterial = new THREE.MeshLambertMaterial({ map: texture });
    this.rugMesh = new THREE.Mesh(rugGeometry, rugMaterial);
    this.rugMesh.position.x = x;
    this.rugMesh.position.y = y;
    this.rugMesh.position.z = z;
    this.rugMesh.rotation.y = Math.PI / 2;
    this.scene.add(this.rugMesh);
  }

}

export default Rug;
