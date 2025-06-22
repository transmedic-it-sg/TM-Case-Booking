// Sound System for Case Booking Application

interface SoundConfig {
  volume: number;
  enabled: boolean;
}

class SoundManager {
  private config: SoundConfig;
  private audioContext: AudioContext | null = null;

  constructor() {
    this.config = this.loadConfig();
    this.initAudioContext();
  }

  private loadConfig(): SoundConfig {
    const saved = localStorage.getItem('case-booking-sound-config');
    if (saved) {
      return JSON.parse(saved);
    }
    return { volume: 0.5, enabled: true };
  }

  private saveConfig(): void {
    localStorage.setItem('case-booking-sound-config', JSON.stringify(this.config));
  }

  private initAudioContext(): void {
    if (typeof window !== 'undefined' && window.AudioContext) {
      this.audioContext = new AudioContext();
    }
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
    this.generateTone(523, 0.15); // C5
    setTimeout(() => this.generateTone(659, 0.15), 100); // E5
    setTimeout(() => this.generateTone(784, 0.2), 200); // G5
  }

  // Error sound - distinctive low tone
  playError(): void {
    this.generateTone(220, 0.3, 'sawtooth'); // A3
    setTimeout(() => this.generateTone(196, 0.4, 'sawtooth'), 150); // G3
  }

  // Button click sound - subtle tick
  playClick(): void {
    this.generateTone(800, 0.08, 'square');
  }

  // Notification sound - gentle chime
  playNotification(): void {
    this.generateTone(880, 0.2); // A5
    setTimeout(() => this.generateTone(1047, 0.3), 100); // C6
  }

  // Case status change - confirmation sound
  playStatusChange(): void {
    this.generateTone(440, 0.15); // A4
    setTimeout(() => this.generateTone(554, 0.15), 80); // C#5
    setTimeout(() => this.generateTone(659, 0.2), 160); // E5
  }

  // Delete action - warning sound
  playDelete(): void {
    this.generateTone(330, 0.2, 'triangle'); // E4
    setTimeout(() => this.generateTone(294, 0.3, 'triangle'), 100); // D4
  }

  // Form submit - completion sound
  playSubmit(): void {
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