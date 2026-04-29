import iframeControls from '../UI/iframeControls.js';
import interactionService from '../utils/interactionService.js';
import cameraService from '../utils/cameraPresets.js';

class BackButton {
  constructor(camera, gsap, unsetFocus, gameState) {
    // constructor logic here
    this.noFocus = true;
    this.camera = camera;
    this.BackButtonEl = document.getElementById('backButton');
    this.BackButtonEl.addEventListener('click', () => {
      this.returnToDefaultPos(camera, gsap, gameState); 
    });
    this.hideBackButton();
  }

  /** Call each frame (or after camera moves) so the control only appears away from the default view. */
  updateVisibility() {
    if (!this.BackButtonEl || !this.camera) return;
    const show =
      interactionService.checkEnabled() &&
      !cameraService.isAtInteriorDefault(this.camera);
    if (show) {
      this.showBackButton();
    } else {
      this.hideBackButton();
    }
  }

  // methods and properties here
  showBackButton() {
    this.BackButtonEl.style.display = 'block';
  }

  hideBackButton() {
      this.BackButtonEl.style.display = 'none';
  }

  returnToDefaultPos(camera, gsap, gameState) {
      gsap.to(camera.position, {
          x: 0,
          z: 0,
          y: 0,
          duration: 1,
          ease: 'power2.inOut',
        });
        gsap.to(camera.rotation, {
          y: 0,
          x: 0,
          z: 0,
          duration: 1,
          ease: 'power2.inOut',
        });
        gameState.resetPosition();
        iframeControls.hideIframe();
  }

}

export default BackButton;
