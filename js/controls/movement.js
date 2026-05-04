import * as THREE from 'three';
import iframeControls from '../UI/iframeControls.js';
import { HALLWAY_BLACK_FACE_LOCAL_Z } from '../enviroments/hallway.js';

/** Point on the hallway black wall (room-side face) for iframe trigger — keep Y with `hallway.js`. */
const HALLWAY_BLACK_TRIGGER_LOCAL = new THREE.Vector3(0, -0.85, HALLWAY_BLACK_FACE_LOCAL_Z);
const DADDY_IFRAME_URL = 'https://pleasewakeupdaddy.com/';
/** Open iframe when camera is this close to the black wall face (world units). */
const BLACK_BOX_OPEN_DISTANCE = 5;
/** Stop scroll before the black mass’s front face passes the camera (world Z, translation-only group). */
const BLACK_WALL_SCROLL_MARGIN = 0.35;

export default class Movement {
    constructor(camera, gameGroup) {
      this.camera = camera;
      this.gameGroup = gameGroup;
      this.enableMovement = false;
      this._daddyIframeOpened = false;
  
      // Bind the scroll event listener
      window.addEventListener('wheel', this.handleScroll.bind(this));
    }
  
    handleScroll(event) {
        if(!this.enableMovement) return;
        if (!this.gameGroup || !this.camera) return;

      const movementSpeed = 0.001; // Adjust the movement speed as needed
  
      const deltaZ = movementSpeed * event.deltaY;
  
      this.gameGroup.position.z += deltaZ;

      // Cannot scroll “through” the black mass: cap when its front face reaches the camera.
      const maxGroupZ =
          this.camera.position.z - HALLWAY_BLACK_FACE_LOCAL_Z - BLACK_WALL_SCROLL_MARGIN;
      if (this.gameGroup.position.z > maxGroupZ) {
          this.gameGroup.position.z = maxGroupZ;
      }
  
      this.camera.position.y = this.gameGroup.position.y;

      if (this._daddyIframeOpened) return;

      this.gameGroup.updateMatrixWorld(true);
      const worldBox = HALLWAY_BLACK_TRIGGER_LOCAL.clone().applyMatrix4(
          this.gameGroup.matrixWorld
      );
      if (worldBox.distanceTo(this.camera.position) < BLACK_BOX_OPEN_DISTANCE) {
          this._daddyIframeOpened = true;
          iframeControls.showIframe(DADDY_IFRAME_URL, { externalEmbed: true });
          iframeControls.zoomIn();
      }
    }

    enable() {
        this.enableMovement = true;
    }

    disable() {
        this.enableMovement = false;
    }


  }