let context: AudioContext | null = null;

function getContext() {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext;
  if (!AudioCtx) return null;
  if (!context) context = new AudioCtx();
  return context;
}

export function primeAudio() {
  const audio = getContext();
  if (audio && audio.state === "suspended") {
    void audio.resume();
  }
}

export function playTick() {
  const audio = getContext();
  if (!audio) return;
  if (audio.state === "suspended") {
    void audio.resume();
  }

  const start = audio.currentTime;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(1480, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.045, start + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.04);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + 0.045);
}
