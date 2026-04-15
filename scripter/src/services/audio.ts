/**
 * AudioPlaybackService — unified audio playback.
 * Replaces 3 duplicated audio player implementations from the old codebase.
 */
export class AudioPlaybackService {
  private players = new Map<string, HTMLAudioElement>();
  private activeKey: string | null = null;

  /** Play an audio blob. Returns the key for future control. */
  play(key: string, blob: Blob): void {
    this.stop(key);

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    this.players.set(key, audio);
    this.activeKey = key;

    audio.addEventListener('ended', () => {
      URL.revokeObjectURL(url);
      this.players.delete(key);
      if (this.activeKey === key) this.activeKey = null;
    });

    audio.play();
  }

  /** Stop a specific player */
  stop(key: string): void {
    const existing = this.players.get(key);
    if (existing) {
      existing.pause();
      existing.currentTime = 0;
      this.players.delete(key);
      if (this.activeKey === key) this.activeKey = null;
    }
  }

  /** Stop all players */
  stopAll(): void {
    for (const [key, audio] of this.players) {
      audio.pause();
      audio.currentTime = 0;
      this.players.delete(key);
    }
    this.activeKey = null;
  }

  /** Check if a specific key is currently playing */
  isPlaying(key: string): boolean {
    const audio = this.players.get(key);
    return audio !== undefined && !audio.paused;
  }

  /** Get the currently active player key */
  getActiveKey(): string | null {
    return this.activeKey;
  }

  /** Clean up all resources */
  destroy(): void {
    this.stopAll();
  }
}
