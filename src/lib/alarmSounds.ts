// Web Audio API sound synthesizer for built-in alarm sounds
const audioCtx = typeof window !== "undefined" ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

export type BuiltInSound = "default" | "chime" | "bell" | "nature";

function playTone(frequency: number, duration: number, type: OscillatorType = "sine", volume = 0.3) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

export function playBuiltInSound(sound: BuiltInSound) {
  if (!audioCtx) return;
  // Resume context if suspended (browser autoplay policy)
  if (audioCtx.state === "suspended") audioCtx.resume();

  switch (sound) {
    case "default":
      // Two-tone chime
      playTone(880, 0.3, "sine", 0.25);
      setTimeout(() => playTone(1100, 0.4, "sine", 0.2), 300);
      setTimeout(() => playTone(880, 0.3, "sine", 0.25), 700);
      setTimeout(() => playTone(1100, 0.4, "sine", 0.2), 1000);
      break;
    case "chime":
      // Gentle ascending chime
      [523, 659, 784, 1047].forEach((freq, i) => {
        setTimeout(() => playTone(freq, 0.5, "sine", 0.2), i * 200);
      });
      break;
    case "bell":
      // Bell-like tone
      playTone(440, 1.5, "triangle", 0.3);
      playTone(880, 1.0, "triangle", 0.15);
      setTimeout(() => {
        playTone(440, 1.5, "triangle", 0.3);
        playTone(880, 1.0, "triangle", 0.15);
      }, 1800);
      break;
    case "nature":
      // Soft water-like sound
      for (let i = 0; i < 8; i++) {
        const freq = 300 + Math.random() * 400;
        setTimeout(() => playTone(freq, 0.3, "sine", 0.1), i * 150);
      }
      break;
  }
}

let customAudioEl: HTMLAudioElement | null = null;

export async function playCustomSound(url: string) {
  try {
    if (customAudioEl) {
      customAudioEl.pause();
      customAudioEl = null;
    }
    customAudioEl = new Audio(url);
    customAudioEl.volume = 0.5;
    await customAudioEl.play();
  } catch (e) {
    console.error("Failed to play custom sound:", e);
    // Fallback to default
    playBuiltInSound("default");
  }
}

export function stopCustomSound() {
  if (customAudioEl) {
    customAudioEl.pause();
    customAudioEl.currentTime = 0;
    customAudioEl = null;
  }
}

export function playAlarmSound(soundType: string, customUrl?: string | null) {
  if (soundType === "custom" && customUrl) {
    playCustomSound(customUrl);
  } else {
    playBuiltInSound((soundType as BuiltInSound) || "default");
  }
}

export const SOUND_OPTIONS = [
  { value: "default", label: "Default chime" },
  { value: "chime", label: "Gentle bell" },
  { value: "bell", label: "Nature sounds" },
  { value: "nature", label: "Soft piano" },
] as const;
