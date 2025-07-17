class AudioService {
    constructor() {
        this.audio = new Audio();   
        this.audio.volume = 0.5;
        this.audio.loop = true;
        this.audio.src = 'resources/sounds/oybitcrushed.mp3';
        this.isPlaying = false;
    }

    startBackgroundMusic() {
        if (!this.isPlaying) {
            this.audio.play().catch(error => {
                console.warn('Audio play failed:', error);
            });
            this.isPlaying = true;
        }
    }

    playSound(sound) {
        this.audio.src = sound;
        this.audio.play().catch(error => {
            console.warn('Audio play failed:', error);
        });
    }

    stopSound() {
        this.audio.pause();
        this.isPlaying = false;
    }
}

const audioService = new AudioService();
export default audioService;