export type SoundKey = "alarm-1" | "alarm-2" | "alarm-3" | "alarm-4" | "alarm-5" | "alarm-6" | "alarm-7" | "alarm-8" | "alarm-9" | "alarm-10";

export const SOUND_OPTIONS: { value: SoundKey; label: string; src: string }[] = [
  { value: "alarm-1", label: "Alarm 1", src: "/sounds/alarm-1.mp3" },
  { value: "alarm-2", label: "Alarm 2", src: "/sounds/alarm-2.mp3" },
  { value: "alarm-3", label: "Alarm 3", src: "/sounds/alarm-3.mp3" },
  { value: "alarm-4", label: "Alarm 4", src: "/sounds/alarm-4.mp3" },
  { value: "alarm-5", label: "Alarm 5", src: "/sounds/alarm-5.mp3" },
  { value: "alarm-6", label: "Alarm 6", src: "/sounds/alarm-6.mp3" },
  { value: "alarm-7", label: "Alarm 7", src: "/sounds/alarm-7.mp3" },
  { value: "alarm-8", label: "Alarm 8", src: "/sounds/alarm-8.mp3" },
  { value: "alarm-9", label: "Alarm 9", src: "/sounds/alarm-9.mp3" },
  { value: "alarm-10", label: "Alarm 10", src: "/sounds/alarm-10.mp3" },
];

let currentAudio: HTMLAudioElement | null = null;

export function playAlarmSound(soundKey: string) {
  stopAlarmSound();
  const opt = SOUND_OPTIONS.find((s) => s.value === soundKey);
  if (!opt) return;
  currentAudio = new Audio(opt.src);
  currentAudio.volume = 0.5;
  currentAudio.play().catch(console.error);
}

export function stopAlarmSound() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

export function previewSound(soundKey: string) {
  stopAlarmSound();
  const opt = SOUND_OPTIONS.find((s) => s.value === soundKey);
  if (!opt) return;
  currentAudio = new Audio(opt.src);
  currentAudio.volume = 0.7;
  currentAudio.play().catch(console.error);
  // Stop preview after 5 seconds
  setTimeout(() => stopAlarmSound(), 5000);
}
