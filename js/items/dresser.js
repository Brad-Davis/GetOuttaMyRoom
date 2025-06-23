import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

class Dresser {
  constructor(scene) {
    this.scene = scene;
    this.dresserMesh = new THREE.Group(); // Initialize as a THREE.Group
    this.scene.add(this.dresserMesh); // Add the group to the scene
    this.dresserFocus = false;
  }

  createDresser(x, y, z) {
    const loader = new GLTFLoader();
    loader.load('./resources/models/dresser.glb', (gltf) => {
      const model = gltf.scene;
      console.log(model);
      model.scale.set(13, 10, 15); // Scale the model
      
      model.position.set(0, 0, 0); // Position relative to the group
      model.rotation.y = Math.PI / 2; // Rotate the model
      const texture = new THREE.TextureLoader().load('./resources/images/wood.jpg');
      model.traverse((child) => {
        if (child.isMesh) {
          child.material.map = texture;
        }
      });

      this.dresserMesh.add(model); // Add the model to the group

      const geometry = new THREE.BoxGeometry(0.1, 1.4, 1.2);
      const refractionCube = new THREE.CubeTextureLoader().load('./resources/images/envMap.jpg');
      console.log(refractionCube);
      const material = new THREE.MeshPhysicalMaterial({ color: 0xffffff, envMap: refractionCube, roughness: 0.2, combine: THREE.MixOperation, reflectivity: 0.3 });
      const rectangle = new THREE.Mesh(geometry, material);
      rectangle.position.set(-0.5, 2.1, 0);
      this.dresserMesh.add(rectangle);

      const pentagramGeo = new THREE.BoxGeometry(0.8, 0.001, 0.8);
      const pentagramTexture = new THREE.TextureLoader().load('./resources/images/pentagramV3.png');
      const pentagramMat = new THREE.MeshLambertMaterial({ map: pentagramTexture });
      const pentagram = new THREE.Mesh(pentagramGeo, pentagramMat);
      pentagram.rotation.y = Math.PI / 2;
      pentagram.position.set(0.1, 1.465, 0);
      this.dresserMesh.add(pentagram);

      this.dresserMesh.position.set(x, y, z); // Position the group
    }, undefined, (error) => {
      console.error('An error happened', error);
    });
  }

  getDresserMesh() {
    return this.dresserMesh;
  }

  lookAtDresser(camera, gsap, backButton) {
    this.dresserFocus = true;
    gsap.to(camera.position, {
      x: -2,
      z: -7,
      y: -1,
      duration: 1,
      ease: 'power2.inOut',
    });
    gsap.to(camera.rotation, {
      y: Math.PI/2,
      duration: 1,
      ease: 'power2.inOut',
    });
    backButton.showBackButton();
  }

  unsetFocus() {
    this.dresserFocus = false;
  }

  getDresserFocus() {
    return this.dresserFocus;
  }
}



export default Dresser;