// Import Three.js library
import * as THREE from 'three';
import { InteractionManager } from 'three.interactive';
import gsap from 'gsap';
import Room from './room.js';
import Door from './door.js';
import Rug from './rug.js';
import Bed from './bed.js';
import Moon from './moon.js';
import Bong from './bong.js';
import Dresser from './dresser.js'
import Movement from './movement.js';

// Set up the scene
const scene = new THREE.Scene();

// Set up the camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 0;

// Set up the renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const textureLoader = new THREE.TextureLoader();
textureLoader.load('./resources/images/background.jpg', (texture) => {
  scene.background = texture; // Set the loaded texture as the background
});

const interactionManager = new InteractionManager(
  renderer,
  camera,
  renderer.domElement
);

// Set up OrbitControls
// const controls = new OrbitControls(camera, renderer.domElement);
// controls.update();
// controls.zoomSpeed = 0;


// const directionOfVision = new THREE.Vector3();
// camera.getWorldDirection(directionOfVision);
// console.log(directionOfVision);

const light = new THREE.PointLight(0xffffff, 5, 100);

// Function to flicker the light
let targetIntensity = 0;
let currentIntensity = 0;
let rampSpeed = 0.005;

// Create a group for the room
const gameGroup = new THREE.Group();

function flickerLight() {
  targetIntensity = Math.random() * 5 + 1; // Random intensity between -2 and 3
  rampSpeed = Math.random() * 0.01 + 0.01; // Random ramp speed between 0.005 and 0.015
  // console.log(targetIntensity);
  rampToValue();
}

function rampToValue() {
  if (currentIntensity < targetIntensity - 0.1) {
    currentIntensity += rampSpeed;
    light.intensity = currentIntensity;
    requestAnimationFrame(rampToValue);
  } else if (currentIntensity > targetIntensity + 0.1) {
    currentIntensity -= rampSpeed;
    light.intensity = currentIntensity;
    requestAnimationFrame(rampToValue);
  } else {
    setTimeout(flickerLight, Math.random() * 500 + 100); // Random delay between 100ms and 600ms
  }
}

flickerLight();
light.position.set(0, 4, 0);
gameGroup.add(light);


const door = new Door(gameGroup);
door.createDoor(0, -1, -5);
const doorMesh = door.getDoorMesh()

const rug = new Rug(gameGroup);
rug.createRug(0, -3, -1.5);

const bed = new Bed(gameGroup);
bed.createBed(3.5, -3, -1.5);

const moon = new Moon(gameGroup);
moon.createMoon(7, 0, -5);

const bong = new Bong(gameGroup);
bong.createBong(-4, -1.5, -3);

const dresser = new Dresser(gameGroup);
dresser.createDresser(-4, -3, -2);

// Add the room to the group
const room = new Room('Bedroom', []);
room.buildWalls(gameGroup);

gameGroup.position.z = -5

const movement = new Movement(camera, gameGroup);

interactionManager.add(doorMesh);

// Add event listener to open the door on click
doorMesh.addEventListener('click', () => {
  if (door.doorOpen) {
    door.close();
    movement.disable();
  } else {
    door.open();
    movement.enable();
  }
});

const dresserMesh = dresser.getDresserMesh();

if (dresserMesh) {
  interactionManager.add(dresserMesh);

  dresserMesh.addEventListener('click', () => {
    console.log('Dresser clicked');
    dresser.lookAtDresser(camera, gsap);
  });
} else {
  console.error('dresserMesh is not valid');
}



// Add the group to the scene
scene.add(gameGroup);



// Render the scene
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  moon.rotateMoon();
}
animate();

// Resize the renderer when the window is resized
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});