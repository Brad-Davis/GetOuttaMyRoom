import iframeControls from '../UI/iframeControls.js';
import interactionService from '../utils/interactionService.js';
import cameraService from '../utils/cameraPresets.js';

class BackButtonManager {
  constructor() {
    this.noFocus = true;
    this.camera = null;
    this.gsap = null;
    this.unsetFocus = null;
    this.gameState = null;
    this.BackButtonEl = document.getElementById('backButton');
    this.disabled = true;
    this._listenersAttached = false;
    this._handleClick = () => {
      if (!this.camera || !this.gsap || !this.gameState) return;
      this.returnToDefaultPos(this.camera, this.gsap, this.gameState);
    };
    if (this.BackButtonEl) {
      this.hideBackButton();
    }
  }

  /**
   * Wire Three / GSAP deps once the game is running. Safe to call again after `dispose()`.
   */
  init(camera, gsap, unsetFocus, gameState) {
    this.camera = camera;
    this.gsap = gsap;
    this.unsetFocus = unsetFocus;
    this.gameState = gameState;
    if (this.BackButtonEl && !this._listenersAttached) {
      this.BackButtonEl.addEventListener('click', this._handleClick);
      this._listenersAttached = true;
    }
    this.hideBackButton();
  }

  dispose() {
    if (this.BackButtonEl && this._listenersAttached) {
      this.BackButtonEl.removeEventListener('click', this._handleClick);
      this._listenersAttached = false;
    }
    this.camera = null;
    this.gsap = null;
    this.unsetFocus = null;
    this.gameState = null;
    this.hideBackButton();
  }

  /** Call each frame (or after camera moves) so the control only appears away from the default view. */
  updateVisibility() {
    if (!this.BackButtonEl || !this.camera) return;
    if (this.disabled) return;
    const show =
      interactionService.checkEnabled() &&
      !cameraService.isAtInteriorDefault(this.camera);
    if (show) {
      this.showBackButton();
    } else {
      this.hideBackButton();
    }
  }

  showBackButton() {
    if (!this.BackButtonEl) return;
    this.BackButtonEl.style.display = 'block';
  }

  hideBackButton() {
    if (!this.BackButtonEl) return;
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

  enable() {
    this.disabled = false;
    this.updateVisibility();
  }

  disable() {
    this.disabled = true;
    this.updateVisibility();
  }
}

const backButtonManager = new BackButtonManager();
export default backButtonManager;
