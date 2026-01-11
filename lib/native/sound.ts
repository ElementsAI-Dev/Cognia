/**
 * Sound Effects - Audio feedback for desktop chat assistant
 */

// Sound types
export type SoundType = 'message' | 'notification' | 'success' | 'error';

// Audio context for web audio API
let audioContext: AudioContext | null = null;

/**
 * Get or create audio context
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
    } catch {
      console.warn('Web Audio API not supported');
      return null;
    }
  }
  return audioContext;
}

/**
 * Play a simple beep sound using Web Audio API
 */
function playBeep(frequency: number, duration: number, volume: number = 0.3): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    // Fade in/out for smoother sound
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch {
    // Ignore audio errors
  }
}

/**
 * Play a notification chime (two-note sequence)
 */
function playChime(volume: number = 0.2): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    // First note
    setTimeout(() => playBeep(880, 0.1, volume), 0);
    // Second note (higher)
    setTimeout(() => playBeep(1100, 0.15, volume), 100);
  } catch {
    // Ignore audio errors
  }
}

/**
 * Play a success sound (ascending notes)
 */
function playSuccess(volume: number = 0.2): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    setTimeout(() => playBeep(523, 0.08, volume), 0);    // C5
    setTimeout(() => playBeep(659, 0.08, volume), 80);   // E5
    setTimeout(() => playBeep(784, 0.12, volume), 160);  // G5
  } catch {
    // Ignore audio errors
  }
}

/**
 * Play an error sound (descending notes)
 */
function playError(volume: number = 0.15): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    setTimeout(() => playBeep(400, 0.15, volume), 0);
    setTimeout(() => playBeep(300, 0.2, volume), 150);
  } catch {
    // Ignore audio errors
  }
}

/**
 * Sound settings stored in localStorage
 */
const SOUND_SETTINGS_KEY = 'cognia-sound-settings';

interface SoundSettings {
  enabled: boolean;
  volume: number; // 0-1
}

const defaultSettings: SoundSettings = {
  enabled: true,
  volume: 0.3,
};

/**
 * Get sound settings from localStorage
 */
export function getSoundSettings(): SoundSettings {
  if (typeof window === 'undefined') return defaultSettings;
  
  try {
    const raw = localStorage.getItem(SOUND_SETTINGS_KEY);
    if (raw) {
      return { ...defaultSettings, ...JSON.parse(raw) };
    }
  } catch {
    // Ignore parse errors
  }
  return defaultSettings;
}

/**
 * Save sound settings to localStorage
 */
export function setSoundSettings(settings: Partial<SoundSettings>): void {
  if (typeof window === 'undefined') return;
  
  try {
    const current = getSoundSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Play a sound effect
 */
export function playSound(type: SoundType): void {
  const settings = getSoundSettings();
  if (!settings.enabled) return;

  const volume = settings.volume;

  switch (type) {
    case 'message':
      playChime(volume);
      break;
    case 'notification':
      playChime(volume * 1.2);
      break;
    case 'success':
      playSuccess(volume);
      break;
    case 'error':
      playError(volume);
      break;
  }
}

/**
 * Play message received sound (for chat widget)
 */
export function playMessageSound(): void {
  playSound('message');
}

/**
 * Play notification sound (for unread messages)
 */
export function playNotificationSound(): void {
  playSound('notification');
}

/**
 * Check if sounds are enabled
 */
export function isSoundEnabled(): boolean {
  return getSoundSettings().enabled;
}

/**
 * Enable or disable sounds
 */
export function setSoundEnabled(enabled: boolean): void {
  setSoundSettings({ enabled });
}

/**
 * Set sound volume (0-1)
 */
export function setSoundVolume(volume: number): void {
  setSoundSettings({ volume: Math.max(0, Math.min(1, volume)) });
}
