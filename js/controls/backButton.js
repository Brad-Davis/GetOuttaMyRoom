import iframeControls from '../UI/iframeControls.js';

class BackButton {
  constructor(camera, gsap, unsetFocus, gameState) {
    // constructor logic here
    this.noFocus = true;
    this.BackButtonEl = document.getElementById('backButton');
    this.BackButtonEl.addEventListener('click', () => {
      this.returnToDefaultPos(camera, gsap, gameState); 
    });
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
