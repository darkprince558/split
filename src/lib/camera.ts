function preferredMime() {
  if (typeof MediaRecorder === "undefined") return "";
  const types = ["video/webm;codecs=vp8", "video/webm;codecs=vp9", "video/webm"];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export type RecordedCue = {
  blob: Blob;
  realCueMs?: number;
  durationMs: number;
};

// Separate recorders let a reaction finish while the next cue starts on time.
// Paused time is excluded from both the video and the cue's timeline marker.
export class CueRecording {
  private chunks: Blob[] = [];
  private startedAt = performance.now();
  private pausedAt: number | null = null;
  private pausedTotal = 0;
  private realCueMs: number | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopping = false;
  private settled = false;
  private durationMs = 0;
  private resolve!: (result: RecordedCue | null) => void;
  private result = new Promise<RecordedCue | null>((resolve) => { this.resolve = resolve; });
  private recorder: MediaRecorder;
  private onDone: () => void;
  private tailMs: number;

  constructor(stream: MediaStream, onDone: () => void, tailMs = 1200) {
    this.tailMs = tailMs;
    this.onDone = onDone;
    const mime = preferredMime();
    this.recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    this.recorder.ondataavailable = (event) => {
      if (event.data.size) this.chunks.push(event.data);
    };
    this.recorder.onstop = () => {
      if (!this.stopping) this.durationMs = this.elapsed();
      const blob = new Blob(this.chunks, { type: this.recorder.mimeType || this.chunks[0]?.type || "video/webm" });
      this.settle(blob.size ? { blob, realCueMs: this.realCueMs, durationMs: this.durationMs } : null);
    };
    this.recorder.onerror = () => { this.abort(); this.settle(null); };
    this.recorder.start();
    this.startedAt = performance.now();
  }

  private elapsed() {
    return Math.max(0, (this.pausedAt ?? performance.now()) - this.startedAt - this.pausedTotal);
  }

  markRealCue() {
    if (!this.stopping) this.realCueMs = this.elapsed();
  }

  pause() {
    if (this.recorder.state !== "recording" || this.stopping) return;
    this.recorder.pause();
    this.pausedAt = performance.now();
  }

  resume() {
    if (this.recorder.state !== "paused" || this.stopping) return;
    this.recorder.resume();
    this.pausedTotal += performance.now() - (this.pausedAt ?? performance.now());
    this.pausedAt = null;
  }

  finish(keepTail = true) {
    // Ending while paused saves what was captured; it never turns the camera back on.
    const endAt = keepTail && this.pausedAt === null && this.realCueMs !== undefined
      ? this.realCueMs + this.tailMs : 0;
    const check = () => {
      if (this.stopping || this.settled) return;
      const remaining = endAt - this.elapsed();
      if (remaining > 0) {
        this.timer = setTimeout(check, this.pausedAt !== null ? 100 : remaining);
      } else this.abort();
    };
    clearTimeout(this.timer);
    check();
    return this.result;
  }

  abort() {
    clearTimeout(this.timer);
    if (this.stopping || this.settled) return;
    this.stopping = true;
    this.durationMs = this.elapsed();
    try {
      // A broken encoder must not leave the finish screen waiting indefinitely.
      this.timer = setTimeout(() => this.settle(null), 5000);
      if (this.recorder.state !== "inactive") this.recorder.stop();
      else this.settle(null);
    } catch { this.settle(null); }
  }

  private settle(result: RecordedCue | null) {
    if (this.settled) return;
    this.settled = true;
    clearTimeout(this.timer);
    this.chunks = [];
    this.onDone();
    this.resolve(result);
  }
}

export class CueCamera {
  private closed = false;
  private stream: MediaStream | null = null;
  private recordings = new Set<CueRecording>();

  async open(deviceId?: string) {
    this.closed = false;
    if (!navigator.mediaDevices?.getUserMedia) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: deviceId ? { deviceId: { exact: deviceId } } : true, audio: false });
      if (this.closed || typeof MediaRecorder === "undefined") {
        stream.getTracks().forEach((track) => track.stop());
        return false;
      }
      this.stream = stream;
      return true;
    } catch { return false; }
  }

  get active() { return this.stream?.getVideoTracks().some((track) => track.readyState === "live") ?? false; }

  get previewStream() { return this.stream; }

  start(tailMs = 1200) {
    if (!this.stream || !this.active || this.closed) return null;
    try {
      const recording = new CueRecording(this.stream, () => this.recordings.delete(recording), tailMs);
      this.recordings.add(recording);
      return recording;
    } catch { return null; }
  }

  pause() { this.recordings.forEach((recording) => recording.pause()); }
  resume() { this.recordings.forEach((recording) => recording.resume()); }

  // Flush all pending tails when ending a paused drill.
  finishPending() { this.recordings.forEach((recording) => recording.finish(false)); }

  close() {
    this.closed = true;
    this.recordings.forEach((recording) => recording.abort());
    this.recordings.clear();
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }
}
