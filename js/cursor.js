import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(32, 32);
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.width = '32px';
renderer.domElement.style.height = '32px';
renderer.domElement.style.transform = 'translate(-50%, -50%)';
renderer.domElement.style.zIndex = '9999';
document.body.appendChild(renderer.domElement);

window.addEventListener('pointermove', event => {
    renderer.domElement.style.left = `${event.clientX}px`;
    renderer.domElement.style.top = `${event.clientY}px`;
});

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
camera.position.z = 5;

const loader = new GLTFLoader();
loader.load('rocket.gltf', (gltf) => {
  const rocket = gltf.scene;
  scene.add(rocket);
  
  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();
});