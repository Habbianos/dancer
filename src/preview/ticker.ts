export class Playback {
  frame = 0;
  length = 1;
  playing = false;
  fps = 12;
  private elapsed = 0;
  onFrame: (frame: number) => void = () => {};
  seek(frame: number) {
    this.frame = Math.max(0, Math.min(this.length - 1, Math.trunc(frame)));
    this.elapsed = 0;
    this.onFrame(this.frame);
  }
  advance(ms: number) {
    if (!this.playing) return;
    this.elapsed += ms;
    const count = Math.floor(this.elapsed * this.fps / 1000);
    if (!count) return;
    this.elapsed -= count * 1000 / this.fps;
    this.frame = (this.frame + count) % this.length;
    this.onFrame(this.frame);
  }
}
export class ManualTicker {
  private listeners = new Set<(frame: number, accurate: number) => void>();
  frame = 0;
  current() { return 0; }
  subscribe(callback: (frame: number, accurate: number) => void) { this.listeners.add(callback); return () => { this.listeners.delete(callback); }; }
  flush() { for (const listener of this.listeners) listener(this.frame, this.frame); }
}
