export default class Movement {
    constructor(camera, gameGroup) {
      this.camera = camera;
      this.gameGroup = gameGroup;
      this.enableMovement = false;
  
      // Bind the scroll event listener
      window.addEventListener('wheel', this.handleScroll.bind(this));
    }
  
    handleScroll(event) {
        if(!this.enableMovement) return;

      const movementSpeed = 0.001; // Adjust the movement speed as needed
  
      const deltaZ = movementSpeed * event.deltaY;
  
      this.gameGroup.position.z += deltaZ;
  
      this.camera.position.y = this.gameGroup.position.y;
    }

    enable() {
        this.enableMovement = true;
    }

    disable() {
        this.enableMovement = false;
    }


  }