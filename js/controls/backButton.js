class BackButton {
  constructor(camera, gsap, unsetFocus) {
    // constructor logic here
    this.noFocus = true;
    this.BackButtonEl = document.getElementById('backButton');
    this.BackButtonEl.addEventListener('click', () => {
      this.returnToDefaultPos(camera, gsap); 
    });
  }

  // methods and properties here
  showBackButton() {
    this.BackButtonEl.style.display = 'block';
  }

  hideBackButton() {
      this.BackButtonEl.style.display = 'none';
  }

  returnToDefaultPos(camera, gsap) {
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
  }

}

export default BackButton;
