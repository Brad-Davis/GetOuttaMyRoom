class AudioService {
    constructor() {
        this.bgmAudio = new Audio();
        this.bgmAudio.volume = 0.7;
        this.bgmAudio.loop = true;
        this.bgmAudio.src = 'resources/sounds/ambient.mp3';
        this.isPlaying = false;
    }

    startBackgroundMusic() {
        if (!this.isPlaying) {
            this.bgmAudio.play().catch(error => {
                console.warn('Audio play failed:', error);
            });
            this.isPlaying = true;
        }
    }

    setBackgroundMusic(trackPath) {
        if (!trackPath) return;
        this.bgmAudio.src = trackPath;
    }

    setBackgroundVolume(volume = 0.5) {
        this.bgmAudio.volume = Math.max(0, Math.min(1, volume));
    }

    playSound(sound, options = {}) {
        if (!sound) return;
        const { volume = 0.7, playbackRate = 1 } = options;

        // Use a fresh Audio instance so short SFX can overlap without cutting off BGM.
        const sfx = new Audio(sound);
        sfx.volume = Math.max(0, Math.min(1, volume));
        sfx.playbackRate = playbackRate;
        sfx.play().catch(error => {
            console.warn('Audio play failed:', error);
        });
    }

    stopSound() {
        this.bgmAudio.pause();
        this.isPlaying = false;
    }
    fadeOutBackgroundMusic() {
        gsap.to(this.bgmAudio, {
            volume: 0,
            duration: 1,
            ease: 'power2.inOut',
        });
    }
}

const audioService = new AudioService();
export default audioService;