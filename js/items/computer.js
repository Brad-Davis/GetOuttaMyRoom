import * as THREE from 'three';
import loaderService from '../utils/loaderService.js';
import cameraService from '../utils/cameraPresets.js';
import iframeControls from '../UI/iframeControls.js';
import { linkedInScore } from '../services/aiScoring.js';
import dialogService from '../utils/dialogService.js';
import dopamineManager from '../managers/dopamineManager.js';
import missionService from '../utils/missionService.js';
import audioService from '../utils/audioService.js';

/** Production iframe (must serve the same postMessage markup as `/evilLinkedIn/index.html`). */
let COMPUTER_IFRAME_URL = '/evilLinkedIn/index.html';

const LINKEDIN_COMPUTER_IFRAME_URL = '/evilLinkedIn/index.html';

const TINDER_COMPUTER_IFRAME_URL = '/evilTinder/index.html';

const YOUTUBE_COMPUTER_IFRAME_URL = '/evilYoutube/index.html';

/** After LinkedIn submit, block re-opening the computer iframe for this long (ms). */
const COMPUTER_REOPEN_COOLDOWN_MS = 4000;

/** First computer open after cooldown loads this URL instead of Evil LinkedIn. */
const POST_SUBMIT_COMPUTER_IFRAME_URL = 'https://noisebetweenstatic.com/';

class Computer {
  constructor(scene) {
    this.scene = scene;
    this.computerMesh = new THREE.Group(); // Initialize as a THREE.Group
    this.scene.add(this.computerMesh); // Add the group to the scene
    this.computerFocus = false;
    this.computer = document.getElementById('computer');
    /** Latest textarea value from the computer iframe Submit (cleared when unset if you prefer). */
    this.lastIframeSubmitText = '';
    /** `Date.now()` threshold: `lookAtComputer` no-ops while `Date.now() < this`. */
    this._computerIframeOpensBlockedUntil = 0;
    /** After first LinkedIn submit, computer uses this URL (external embed). */
    this._postSubmitComputerIframeUrl = null;
    this.computerTimeUsed = false;
    /** Pending `lookAtComputer` iframe open — cleared on back / unsetFocus. */
    this._openIframeTimer = null;

    iframeControls.setComputerInstance(this);
    iframeControls.setComputerSubmitCallback((text) => {
      this.handleIframeSubmit(text);
    });
  }

  async createComputer(x, y, z) {
    try {
      const gltf = await loaderService.loadGLTF('./resources/models/computer.gltf');
      const model = gltf.scene;
      console.log(model);
      model.scale.set(2,2.5,2.5); // Scale the model
      
      model.position.set(0, 0, 0); // Position relative to the group
      model.rotation.y = Math.PI / 2 + Math.PI / 4; // Rotate the model
    //   const texture = new THREE.TextureLoader().load('./resources/images/wood.jpg');
    //   model.traverse((child) => {
    //     if (child.isMesh) {
    //       child.material.map = texture;
    //     }
    //   });

      this.computerMesh.add(model); // Add the model to the group

      this.computerMesh.position.set(x, y, z); // Position the group
    } catch (error) {
      console.error('Error loading dresser model:', error);
    }
  }

  getComputerMesh() {
    return this.computerMesh;
  }

  async lookAtComputer() {
    if (!cameraService.checkCameraPreset('DRESSER_VIEW')) {
      return;
    }
    if (Date.now() < this._computerIframeOpensBlockedUntil) {
      return;
    }
    if (this.computerTimeUsed) {
      await dialogService.runLines([
        {
          speaker: 'Inner Monologue',
          text: 'Your mom has rightfully limited your computer time ever since the incident.',
        }
      ]);
      return;
    }
    this.computerFocus = true;
    cameraService.lookAtComputer();
    if (this._openIframeTimer) {
      clearTimeout(this._openIframeTimer);
    }
    this._openIframeTimer = setTimeout(() => {
      this._openIframeTimer = null;
      if (!this.computerFocus) return;

      const url = COMPUTER_IFRAME_URL;

      // Check if the URL starts with "http://" or "https://", indicating it's an external embed
      const externalEmbed = /^https?:\/\//i.test(url);
      this.showIframe(url, { externalEmbed });
    }, 1000);
  }

  async handleIframeSubmit(text) {
    this.unsetFocus();
    if (COMPUTER_IFRAME_URL === TINDER_COMPUTER_IFRAME_URL) {
      this.unsetFocus();
      this.computerTimeUsed = true;
      console.log("first mission");
      await this.firstMission();
    } else if (COMPUTER_IFRAME_URL === LINKEDIN_COMPUTER_IFRAME_URL) {
      this._computerIframeOpensBlockedUntil = Date.now() + COMPUTER_REOPEN_COOLDOWN_MS;
      this._postSubmitComputerIframeUrl = POST_SUBMIT_COMPUTER_IFRAME_URL;
      this.lastIframeSubmitText = text;
      console.log(text);
      this.unsetFocus();
      // Call linkedInScore, then show a dialog with the result
      this.gradeLinkedIn(text);
      this.computerTimeUsed = true;
    }
  }

  resetComputerTimeUsed() {
    this.computerTimeUsed = false;
  }

  /** LinkedIn session again after a battle — clears cooldown and post-submit redirect. */
  resetForNewLinkedInSession() {
    this.setFrame('linkedin');
    this.resetComputerTimeUsed();
    this._computerIframeOpensBlockedUntil = 0;
    this._postSubmitComputerIframeUrl = null;
  }

  async gradeLinkedIn(text) {
    try {
      const scoreResult = await linkedInScore(text);
      console.log('[LinkedIn score result]', scoreResult);

      let responseText = `Your corporate self-worth score is ${scoreResult.score}.`;
      if (typeof scoreResult.reason === 'string') {
        responseText += `\n\n${scoreResult.reason}`;
      }
      // Show the result to the player via dialog box (assume dialogService is imported)
      await dialogService.runLines([
        {
          speaker: 'The LinkedIn Algorithm',
          text: responseText,
        }
      ]);

      if (scoreResult.score > 50) {
        // Give a dopamine boost
        dopamineManager.giveDopamine(10);
        missionService.completeCurrentMission();
      } else {
        await dialogService.runLines([
          {
            speaker: 'The LinkedIn Algorithm',
            text: 'The LinkedIn Algorithm has determined that you are not worthy of employment.',
          }
        ]);
        kill("You have died of unemployment.");
      }
    } catch (err) {
      console.error('[gradeLinkedIn] Error:', err);
      await dialogService.runLines([
        {
          speaker: 'The LinkedIn Algorithm',
          text: "Something went wrong scoring your LinkedIn post. We're just gonna say you did fine.",
        }
      ]);
      dopamineManager.giveDopamine(10);
    } finally {
      
    }
  }

  async firstMission() {
    cameraService.defaultRoomView();
    setTimeout(async () => {
      await dialogService.runLines([
        {
          speaker: 'Inner Monologue',
          text: 'You remember that your dad has a night shift tonight at Denny\'s.',
        }, {
          speaker: 'Inner Monologue',
          text: 'You have to wake him, but you hear your extended family just outside the door.',
        }, {
          speaker: 'Inner Monologue',
          text: 'Best talk to the Bed Goblin to get help.',
        }
      ]);
      missionService.setCurrentMission([
        'Go wake up your dad.',
        'Go talk to the Bed Goblin to get help.',
      ]);
    }, 2000);
  }

  getLastIframeSubmitText() {
    return this.lastIframeSubmitText;
  }

  showIframe(url, options = {}) {
    iframeControls.showIframe(url, options);
    iframeControls.zoomIn();
  }

  hideIframe() {
    iframeControls.hideIframe();
  }

  unsetFocus() {
    this.computerFocus = false;
    if (this._openIframeTimer) {
      clearTimeout(this._openIframeTimer);
      this._openIframeTimer = null;
    }
    this.hideIframe();
  }

  getComputerFocus() {
    return this.computerFocus;
  }

  setFrame(frame) {
    if (frame === 'linkedin') {
      COMPUTER_IFRAME_URL = LINKEDIN_COMPUTER_IFRAME_URL;
    } else if (frame === 'tinder') {
      COMPUTER_IFRAME_URL = TINDER_COMPUTER_IFRAME_URL;
    } else if (frame === 'youtube') {
      COMPUTER_IFRAME_URL = YOUTUBE_COMPUTER_IFRAME_URL;
    }
  }
}

export default Computer;