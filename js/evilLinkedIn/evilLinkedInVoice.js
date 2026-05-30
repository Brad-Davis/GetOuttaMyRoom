import voiceRecognition from '../services/voiceRecognition.js';

const GOMR_COMPUTER_SUBMIT = 'GOMR_COMPUTER_SUBMIT';

const textarea = document.getElementById('comment');
const speakBtn = document.getElementById('speak-btn');
const form = document.getElementById('evil-form');

let unsubscribe = null;

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
    console.warn('[evilLinkedIn speak]', error);
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
