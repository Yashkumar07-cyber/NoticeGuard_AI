// Bulletproof Speech synthesis and recognition utility with multilingual support (en-IN and hi-IN)
// Fixes Chrome V8 GC bug, Windows missing voice silent failure, and queue freezing.

export const playChime = (frequency = 587.33, duration = 0.18) => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // user gesture required or unsupported
  }
};

export const isSpeechRecognitionSupported = () => {
  return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
};

export const isSpeechSynthesisSupported = () => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
};

// Global reference to prevent Chrome garbage collection of active utterances
if (typeof window !== 'undefined') {
  window.__activeUtterance = null;
}

export class SpeechSpeaker {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.currentUtterance = null;
    this.voices = [];
    this.initVoices();
  }

  initVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices() || [];
    if (typeof window !== 'undefined' && 'onvoiceschanged' in this.synth) {
      this.synth.onvoiceschanged = () => {
        this.voices = this.synth.getVoices() || [];
      };
    }
  }

  hasHindiVoice() {
    const vList = this.synth ? this.synth.getVoices() : [];
    return vList.some(v => v.lang && v.lang.toLowerCase().startsWith('hi'));
  }

  speak(text, lang = 'en', onBoundary = null, onEnd = null, onError = null) {
    if (!this.synth) {
      console.warn('Speech synthesis not supported on this device/browser.');
      if (onError) onError('Speech synthesis not supported');
      return;
    }

    // Play subtle friendly audio chime for guaranteed feedback
    playChime();

    // Always unfreeze and clear any stalled queue in Chrome
    try {
      this.synth.cancel();
      this.synth.resume();
    } catch {}

    const cleanText = text.replace(/[*_#`~[\]]/g, '').trim();
    if (!cleanText) return;

    // Refresh voices synchronously if needed
    const runtimeVoices = (this.synth.getVoices && this.synth.getVoices()) || [];
    const availableVoices = runtimeVoices.length > 0 ? runtimeVoices : this.voices;

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Detect Hindi text characters
    const hasHindiChars = /[\u0900-\u097F]/.test(cleanText);
    const preferHindi = lang === 'hi' || hasHindiChars;

    let selectedVoice = null;

    if (preferHindi) {
      // 1. Try to find actual Hindi voice
      selectedVoice = availableVoices.find(v => v.lang && v.lang.toLowerCase().startsWith('hi'));
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang || 'hi-IN';
      } else {
        // Fallback to Indian English or system default so audio actually plays
        const enInVoice = availableVoices.find(v => v.lang && v.lang.toLowerCase().includes('en-in'));
        const defaultVoice = availableVoices.find(v => v.default) || availableVoices[0];
        selectedVoice = enInVoice || defaultVoice;
        
        if (selectedVoice) {
          utterance.voice = selectedVoice;
          utterance.lang = selectedVoice.lang || 'en-US';
        } else {
          utterance.lang = 'en-US';
        }
      }
    } else {
      // English voice selection
      const enVoice = availableVoices.find(v => 
        (v.lang && v.lang.toLowerCase().includes('en-in')) ||
        (v.lang && v.lang.toLowerCase().includes('en-gb')) ||
        (v.lang && v.lang.toLowerCase().includes('en-us'))
      ) || availableVoices.find(v => v.default) || availableVoices[0];

      if (enVoice) {
        utterance.voice = enVoice;
        utterance.lang = enVoice.lang || 'en-US';
      } else {
        utterance.lang = 'en-US';
      }
    }

    utterance.rate = preferHindi ? 0.9 : 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    if (onBoundary) {
      utterance.onboundary = onBoundary;
    }

    utterance.onstart = () => {
      // Periodically resume to bypass Chrome 15-second speech freeze
      if (this.resumeTimer) clearInterval(this.resumeTimer);
      this.resumeTimer = setInterval(() => {
        if (this.synth && this.synth.speaking) {
          this.synth.resume();
        } else {
          clearInterval(this.resumeTimer);
        }
      }, 5000);
    };

    utterance.onend = () => {
      if (this.resumeTimer) clearInterval(this.resumeTimer);
      window.__activeUtterance = null;
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      if (this.resumeTimer) clearInterval(this.resumeTimer);
      console.warn('Speech synthesis utterance error:', e);
      window.__activeUtterance = null;
      this.currentUtterance = null;
      if (onError) onError(e);
    };

    // Store global reference to prevent garbage collection in Chrome V8
    window.__activeUtterance = utterance;
    this.currentUtterance = utterance;

    // Small delay ensures Chrome has processed the cancel() before speaking
    setTimeout(() => {
      try {
        this.synth.speak(utterance);
        if (this.synth.paused) {
          this.synth.resume();
        }
      } catch (err) {
        console.error('synth.speak() exception:', err);
        if (onError) onError(err);
      }
    }, 40);
  }

  pause() {
    if (this.synth && this.synth.speaking) {
      this.synth.pause();
    }
  }

  resume() {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
    }
  }

  stop() {
    if (this.resumeTimer) clearInterval(this.resumeTimer);
    if (this.synth) {
      this.synth.cancel();
      window.__activeUtterance = null;
      this.currentUtterance = null;
    }
  }

  isSpeaking() {
    return this.synth ? this.synth.speaking && !this.synth.paused : false;
  }

  isPaused() {
    return this.synth ? this.synth.paused : false;
  }
}

export class SpeechListener {
  constructor(options = {}) {
    this.recognition = null;
    this.isListening = false;
    this.lang = options.lang || 'en-IN';
    this.onResult = options.onResult || (() => {});
    this.onError = options.onError || (() => {});
    this.onEnd = options.onEnd || (() => {});

    if (isSpeechRecognitionSupported()) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = options.continuous ?? false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      this.recognition.lang = this.lang;

      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        this.onResult({
          final: finalTranscript.trim(),
          interim: interimTranscript.trim(),
          isFinal: finalTranscript.length > 0
        });
      };

      this.recognition.onerror = (event) => {
        console.warn('Speech recognition error event:', event.error);
        this.isListening = false;
        this.onError(event.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.onEnd();
      };
    }
  }

  setLang(lang) {
    this.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    if (this.recognition) {
      this.recognition.lang = this.lang;
    }
  }

  start() {
    if (!this.recognition) return false;
    try {
      this.recognition.abort(); // Clear any previous instance
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (e) {
      console.warn('SpeechRecognition start failed:', e);
      try {
        this.recognition.start();
        this.isListening = true;
        return true;
      } catch {
        return false;
      }
    }
  }

  stop() {
    if (!this.recognition) return;
    try {
      this.recognition.stop();
    } catch {}
    this.isListening = false;
  }
}
