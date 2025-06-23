// Import Three.js library
import * as THREE from 'three';
import { InteractionManager } from 'three.interactive';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import gsap from 'gsap';
import Room from './controls/room.js';
import Door from './items/door.js';
import Rug from './items/rug.js';
import Bed from './items/bed.js';
import Moon from './items/moon.js';
import Bong from './items/bong.js';
import Dresser from './items/dresser.js';
import Movement from './controls/movement.js';
import BackButton from './controls/backButton.js';
import Enemy from './templates/enemy.js';
import Battle from './events/battle.js';
import Bedroom from './enviroments/bedroom.js';
import CD from './items/cd.js';
import LightingFixture from './items/lightingFixture.js';
import HealthBar from "./UI/healthBar.js";

// Set up the scene
const scene = new THREE.Scene();

// Set up the camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0.6486560300336698, -0.9197662709115966, 4.294323521853167);
camera.rotation.set(0.21099405221382178, 0.14663965263345446, -0.031284905874686096);

// Set up the renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const textureLoader = new THREE.TextureLoader();
textureLoader.load('./resources/images/sky.jpg', (texture) => {
  // texture.wrapS = THREE.RepeatWrapping;
  // texture.wrapT = THREE.RepeatWrapping;
  // texture.repeat.set(4, 4); // Set the number of times the texture should repeat in both directions
  scene.background = texture; // Set the loaded texture as the background
});

const interactionManager = new InteractionManager(
  renderer,
  camera,
  renderer.domElement
);

// Set up OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.update();

// const directionOfVision = new THREE.Vector3();
// camera.getWorldDirection(directionOfVision);
// console.log(directionOfVision);

const light = new THREE.AmbientLight(0xffffff, 5, 100);
const lightingFixture = new LightingFixture(scene);
lightingFixture.createFixture(0, 5, -7);

// Add soft ambient light
const softLight = new THREE.DirectionalLight(0x404040, 0.3);
softLight.position.set(4, 10, 10);

// Function to flicker the light
let targetIntensity = 0;
let currentIntensity = 0;
let rampSpeed = 0.005;



// Create a group for the room
const gameGroup = new THREE.Group();

function flickerLight() {
  targetIntensity = Math.random() * 0.05 + 0.01; // Random intensity between -2 and 3
  rampSpeed = 0.001; // Random ramp speed between 0.005 and 0.015
  console.log(targetIntensity);
  rampToValue();
}

function rampToValue() {
  console.log(currentIntensity);
  if (currentIntensity < targetIntensity - 0.001) {
    currentIntensity += rampSpeed;
    light.intensity = currentIntensity;
    lightingFixture.changeIntensity(currentIntensity * 1);
    requestAnimationFrame(rampToValue);
  } else if (currentIntensity > targetIntensity + 0.001) {
    currentIntensity -= rampSpeed;
    light.intensity = currentIntensity;
    lightingFixture.changeIntensity(currentIntensity * 1);
    requestAnimationFrame(rampToValue);
  } else {
    setTimeout(flickerLight, Math.random() * 500 + 100); // Random delay between 100ms and 600ms
  }
}



flickerLight();
light.position.set(0, 3.5, 0);
gameGroup.add(light);
gameGroup.add(softLight);


const door = new Door(gameGroup);
door.createDoor(0, -1, -5);
const doorMesh = door.getDoorMesh()

const rug = new Rug(gameGroup);
rug.createRug(0, -3, -1.5);

const backButton = new BackButton(camera, gsap, unsetFocus);

const bed = new Bed(gameGroup);
bed.createBed(3.5, -3, -1.5, gsap, camera, interactionManager, backButton);

const moon = new Moon(gameGroup);
moon.createMoon(7, 0, -5);

const bong = new Bong(gameGroup);
bong.createBong(-4, -1.5, -3);

const dresser = new Dresser(gameGroup);
dresser.createDresser(-4, -3, -2);

// Create a floating CD
const cd = new CD(gameGroup, camera);
cd.createCD(0, -0.5, 7); // Position the CD floating above the room

// Add the room to the group
const bedroom = new Bedroom();
bedroom.buildRoom(gameGroup);

gameGroup.position.z = -5

const movement = new Movement(camera, gameGroup);

// Get the CD mesh and add it to interaction manager
const cdMesh = cd.getCDMesh();
if (cdMesh) {
  interactionManager.add(cdMesh);
  
  cdMesh.addEventListener('click', () => {
    console.log('CD clicked - exploding!');
    cd.onClick();
  });
}

interactionManager.add(doorMesh);

let enemyIndex = 0;
const enemies = []

function generateEnemies() {
  for (let i = 0; i < 10; i++) {
    const enemy = new Enemy('Enemy' + i, [], 100, 1, 100, 100, 'enemy.glb');
    enemies.push(enemy);
  }
}
generateEnemies();


let battle;

// Add event listener to open the door on click
doorMesh.addEventListener('click', () => {
  if (door.doorOpen) {
    door.close();
    movement.disable();
  } else {
    door.open();
    if (enemyIndex < enemies.length) {
      const enemy = enemies[enemyIndex];
      battle = new Battle(player, enemy);
      battle.startBattle();
    } else {
      movement.enable();
    }
  }
});

const dresserMesh = dresser.getDresserMesh();


if (dresserMesh) {
  interactionManager.add(dresserMesh);

  dresserMesh.addEventListener('click', () => {
    console.log('Dresser clicked');
    if(!dresser.getDresserFocus()) {
      dresser.lookAtDresser(camera, gsap, backButton);
    }
  });
} else {
  console.error('dresserMesh is not valid');
}

function unsetFocus() {
  dresser.unsetFocus();
}


// Add the group to the scene
scene.add(gameGroup);



// Render the scene
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  moon.rotateMoon();
  cd.rotateCD(); // Rotate the CD
  // console.log("Pos: ", camera.position.x, camera.position.y, camera.position.z);
  // console.log("Rot: ", camera.rotation.x, camera.rotation.y, camera.rotation.z);
}
animate();

// Resize the renderer when the window is resized
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  controls.update();
});


// var btn = document.createElement('button');
// document.body.appendChild(btn);
// btn.textContent = 'Download .glb';
// btn.onclick = download;

// function download() {
//   console.log('gameGroup:', gameGroup); // Debugging: Check the contents of gameGroup
//   if (!gameGroup || gameGroup.children.length === 0) {
//     console.error('gameGroup is empty or not initialized.');
//     return;
//   }

//   const exporter = new GLTFExporter();
//   exporter.parse(
//     gameGroup,
//     function (result) {
//         // JSON export (.gltf)
//         const json = JSON.stringify(result, null, 2);
//         saveString(json, 'scene.gltf');
//     },
//     { binary: true } // Ensure binary export is enabled
//   );
// }

// function saveArrayBuffer(buffer, filename) {
//   save(new Blob([buffer], { type: 'application/octet-stream' }), filename);
// }

// function saveString(text, filename) {
//   save(new Blob([text], { type: 'text/plain' }), filename);
// }

// const link = document.createElement('a');
// link.style.display = 'none';
// document.body.appendChild(link); // Firefox workaround, see #6594

// function save(blob, filename) {
//   link.href = URL.createObjectURL(blob);
//   link.download = filename;
//   link.click();
// }