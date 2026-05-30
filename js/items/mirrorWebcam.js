import * as THREE from 'three';
import gsap from 'gsap';

const DEFAULTS = {
  width: 1.2,
  height: 1.4,
  position: { x: -0.43, y: 2.13, z: 0 },
  rotation: { x: 0, y: Math.PI / 2, z: 0 },
  fadeDuration: 0.6,
  videoConstraints: {
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      facingMode: 'user',
    },
  },
};

/**
 * Live webcam feed on a plane mesh (e.g. dresser mirror).
 * Call `start()` after a user gesture so getUserMedia is allowed.
 */
class MirrorWebcam {
  constructor(parentGroup, options = {}) {
    this.parentGroup = parentGroup;
    this.config = { ...DEFAULTS, ...options };
    this.video = null;
    this.stream = null;
    this.videoTexture = null;
    this.mesh = null;
    this._started = false;
    this._starting = false;
    /** @type {gsap.core.Tween | null} */
    this._fadeTween = null;
  }

  attach() {
    const { width, height, position, rotation } = this.config;
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
      color: 0x1a1a22,
      transparent: true,
      opacity: 0,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.visible = false;
    this.mesh.position.set(position.x, position.y, position.z);
    this.mesh.rotation.set(rotation.x, rotation.y, rotation.z);
    // Mirror-like horizontal flip for front-facing camera.
    this.mesh.scale.x = -1;
    this.parentGroup.add(this.mesh);
    return this.mesh;
  }

  async start() {
    if (this._started || this._starting) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn('MirrorWebcam: getUserMedia is not available');
      return;
    }

    this._starting = true;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia(this.config.videoConstraints);
      this.video = document.createElement('video');
      this.video.playsInline = true;
      this.video.muted = true;
      this.video.setAttribute('playsinline', '');
      this.video.srcObject = this.stream;
      await this.video.play();

      if (this.videoTexture) {
        this.videoTexture.dispose();
      }
      this.videoTexture = new THREE.VideoTexture(this.video);
      this.videoTexture.colorSpace = THREE.SRGBColorSpace;
      this.videoTexture.minFilter = THREE.LinearFilter;
      this.videoTexture.magFilter = THREE.LinearFilter;

      const material = this.mesh.material;
      material.map = this.videoTexture;
      material.color.set(0xffffff);
      material.needsUpdate = true;
      this._started = true;
    } catch (error) {
      console.error('MirrorWebcam: failed to start camera', error);
    } finally {
      this._starting = false;
    }
  }

  update() {
    if (!this._started || !this.video || !this.videoTexture) return;
    if (this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      this.videoTexture.needsUpdate = true;
    }
  }

  _killFade() {
    this._fadeTween?.kill();
    this._fadeTween = null;
  }

  hide(onComplete) {
    if (!this.mesh) return;
    this._killFade();
    this._fadeTween = gsap.to(this.mesh.material, {
      opacity: 0,
      duration: this.config.fadeDuration,
      ease: 'power2.inOut',
      onComplete: () => {
        this._fadeTween = null;
        this.mesh.visible = false;
        onComplete?.();
      },
    });
  }

  show() {
    if (!this.mesh) return;
    this._killFade();
    this.mesh.visible = true;
    this._fadeTween = gsap.to(this.mesh.material, {
      opacity: 1,
      duration: this.config.fadeDuration,
      ease: 'power2.inOut',
      onComplete: () => {
        this._fadeTween = null;
      },
    });
  }

  stop() {
    this._killFade();
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
    if (this.videoTexture) {
      this.videoTexture.dispose();
      this.videoTexture = null;
    }
    if (this.mesh?.material) {
      this.mesh.material.map = null;
      this.mesh.material.color.set(0x1a1a22);
      this.mesh.material.opacity = 0;
      this.mesh.visible = false;
    }
    this._started = false;
  }

  dispose() {
    this._killFade();
    this.stop();
    if (this.mesh) {
      this.mesh.geometry?.dispose();
      this.mesh.material?.dispose();
      this.parentGroup?.remove(this.mesh);
      this.mesh = null;
    }
  }

}

export default MirrorWebcam;
