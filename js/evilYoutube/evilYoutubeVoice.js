import voiceRecognition from '../services/voiceRecognition.js';

const GOMR_COMPUTER_SUBMIT = 'GOMR_COMPUTER_SUBMIT';

/** Tourette's Guy picks — matches the 2006 youtube.png screenshot vibe. */
const EVIL_YOUTUBE_VIDEOS = [
  '5wcKpoAQKj4', // Best Of The Tourettes Guy (1 of 4)
  '-8JyX-rqZ10', // Best Of The Tourettes Guy (2 of 4)
  'yZKi9xXleaE', // Tourettes Guy - Ordering A Pizza
];

const textarea = document.getElementById('comment');
const speakBtn = document.getElementById('speak-btn');
const form = document.getElementById('evil-form');
const youtubePlayer = document.getElementById('youtube-player');

let unsubscribe = null;

function pickRandomYoutubeVideo() {
  const index = Math.floor(Math.random() * EVIL_YOUTUBE_VIDEOS.length);
  return EVIL_YOUTUBE_VIDEOS[index];
}

function initYoutubePlayer() {
  if (!youtubePlayer) return;
  const videoId = pickRandomYoutubeVideo();
  youtubePlayer.src = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
}

initYoutubePlayer();

function setSpeakButtonState(listening) {
  if (!speakBtn) return;
  speakBtn.textContent = listening ? 'Stop' : 'Speak';
  speakBtn.setAttribute('aria-pressed', listening ? 'true' : 'false');
  speakBtn.classList.toggle('is-listening', listening);
}

function syncTextarea(transcript) {
  if (!textarea) return;
  textarea.value = transcript.combined;
}

function teardownSubscription() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

function seedTranscriptFromTextarea() {
  voiceRecognition.finalTranscript = (textarea?.value || '').trim();
  voiceRecognition.interimTranscript = '';
}

function startSpeaking() {
  if (!voiceRecognition.isSupported()) {
    if (textarea) {
      textarea.placeholder = 'Voice input is not supported in this browser.';
    }
    return;
  }

  try {
    seedTranscriptFromTextarea();
    teardownSubscription();
    unsubscribe = voiceRecognition.subscribe(syncTextarea);

    voiceRecognition.startListening({
      keepPreviousText: true,
      continuous: true,
      interimResults: true,
      onStart: () => setSpeakButtonState(true),
      onEnd: () => {
        setSpeakButtonState(false);
        teardownSubscription();
        syncTextarea(voiceRecognition.getTranscript());
      },
      onError: event => {
        setSpeakButtonState(false);
        teardownSubscription();
        if (textarea && event?.error === 'not-allowed') {
          textarea.placeholder = 'Microphone access was blocked. Allow mic for this site and try again.';
        }
      },
    });
  } catch (error) {
    console.warn('[evilYoutube speak]', error);
    teardownSubscription();
    setSpeakButtonState(false);
    if (textarea) {
      textarea.placeholder = 'Could not start voice input. Check microphone permission.';
    }
  }
}

function stopSpeaking() {
  voiceRecognition.stopListening();
  setSpeakButtonState(false);
}

speakBtn?.addEventListener('click', () => {
  if (voiceRecognition.isListening) {
    stopSpeaking();
  } else {
    startSpeaking();
  }
});

form?.addEventListener('submit', e => {
  e.preventDefault();
  if (voiceRecognition.isListening) {
    stopSpeaking();
  }
  const text = textarea?.value?.trim() || '';
  if (window.parent !== window) {
    window.parent.postMessage({ type: GOMR_COMPUTER_SUBMIT, v: 1, text }, '*');
  }
});

window.addEventListener('pagehide', () => {
  if (voiceRecognition.isListening) {
    voiceRecognition.abortListening();
  }
  teardownSubscription();
});
