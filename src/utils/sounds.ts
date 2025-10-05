// Sound System for Case Booking Application

interface SoundConfig {
  volume: number;
  enabled: boolean;
}

class SoundManager {
  private config: SoundConfig;
  private audioContext: AudioContext | null = null;
  private activeSounds: Set<string> = new Set();
  private lastPlayTime: Map<string, number> = new Map();
  private readonly DEBOUNCE_DELAY = 100; // 100ms debounce to prevent rapid clicking

  constructor() {
    this.config = this.loadConfig();
    this.initAudioContext();
  }

  private loadConfig(): SoundConfig {
    // Sound config should be stored in user preferences table in database
    // For now, return default config
    return { volume: 0.5, enabled: true };
  }

  private saveConfig(): void {
    // TODO: Save sound config to user preferences in Supabase database
    // This should be replaced with a database call to store user preferences
  }

  private initAudioContext(): void {
    if (typeof window !== 'undefined' && window.AudioContext) {
      this.audioContext = new AudioContext();
    }
  }

  // Check if a sound can be played (debouncing and deduplication)
  private canPlaySound(soundType: string): boolean {
    if (!this.config.enabled || !this.audioContext) return false;
    
    // Check if this sound type is already playing
    if (this.activeSounds.has(soundType)) {
      return false;
    }
    
    // Check debounce timing
    const now = Date.now();
    const lastPlay = this.lastPlayTime.get(soundType) || 0;
    if (now - lastPlay < this.DEBOUNCE_DELAY) {
      return false;
    }
    
    return true;
  }

  // Mark sound as active and set last play time
  private markSoundActive(soundType: string, duration: number): void {
    this.activeSounds.add(soundType);
    this.lastPlayTime.set(soundType, Date.now());
    
    // Remove from active sounds after the duration
    setTimeout(() => {
      this.activeSounds.delete(soundType);
    }, duration * 1000);
  }

  // Generate different tones for different actions
  private generateTone(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
    if (!this.config.enabled || !this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.config.volume * 0.1, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  // Success sound - pleasant ascending tone
  playSuccess(): void {
    if (!this.canPlaySound('success')) return;
    this.markSoundActive('success', 0.6); // Total duration: 0.4s
    
    this.generateTone(523, 0.15); // C5
    setTimeout(() => this.generateTone(659, 0.15), 100); // E5
    setTimeout(() => this.generateTone(784, 0.2), 200); // G5
  }

  // Error sound - distinctive low tone
  playError(): void {
    if (!this.canPlaySound('error')) return;
    this.markSoundActive('error', 0.7); // Total duration: 0.55s
    
    this.generateTone(220, 0.3, 'sawtooth'); // A3
    setTimeout(() => this.generateTone(196, 0.4, 'sawtooth'), 150); // G3
  }

  // Button click sound - subtle tick
  playClick(): void {
    if (!this.canPlaySound('click')) return;
    this.markSoundActive('click', 0.15); // Total duration: 0.08s
    
    this.generateTone(800, 0.08, 'square');
  }

  // Notification sound - gentle chime
  playNotification(): void {
    if (!this.canPlaySound('notification')) return;
    this.markSoundActive('notification', 0.5); // Total duration: 0.4s
    
    this.generateTone(880, 0.2); // A5
    setTimeout(() => this.generateTone(1047, 0.3), 100); // C6
  }

  // Case status change - confirmation sound
  playStatusChange(): void {
    if (!this.canPlaySound('statusChange')) return;
    this.markSoundActive('statusChange', 0.5); // Total duration: 0.36s
    
    this.generateTone(440, 0.15); // A4
    setTimeout(() => this.generateTone(554, 0.15), 80); // C#5
    setTimeout(() => this.generateTone(659, 0.2), 160); // E5
  }

  // Delete action - warning sound
  playDelete(): void {
    if (!this.canPlaySound('delete')) return;
    this.markSoundActive('delete', 0.5); // Total duration: 0.4s
    
    this.generateTone(330, 0.2, 'triangle'); // E4
    setTimeout(() => this.generateTone(294, 0.3, 'triangle'), 100); // D4
  }

  // Form submit - completion sound
  playSubmit(): void {
    if (!this.canPlaySound('submit')) return;
    this.markSoundActive('submit', 0.7); // Total duration: 0.49s
    
    this.generateTone(392, 0.15); // G4
    setTimeout(() => this.generateTone(523, 0.15), 80); // C5
    setTimeout(() => this.generateTone(659, 0.15), 160); // E5
    setTimeout(() => this.generateTone(784, 0.25), 240); // G5
  }

  // Getters and setters for configuration
  isEnabled(): boolean {
    return this.config.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.saveConfig();
  }

  getVolume(): number {
    return this.config.volume;
  }

  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
    this.saveConfig();
  }

  toggle(): boolean {
    this.config.enabled = !this.config.enabled;
    this.saveConfig();
    return this.config.enabled;
  }
}

// Create singleton instance
export const soundManager = new SoundManager();

// Convenience functions for common actions
export const playSound = {
  success: () => soundManager.playSuccess(),
  error: () => soundManager.playError(),
  click: () => soundManager.playClick(),
  notification: () => soundManager.playNotification(),
  statusChange: () => soundManager.playStatusChange(),
  delete: () => soundManager.playDelete(),
  submit: () => soundManager.playSubmit(),
};

export default soundManager;