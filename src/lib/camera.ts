function preferredMime() {
  if (typeof MediaRecorder === "undefined") return "";
  const types = ["video/webm;codecs=vp8", "video/webm;codecs=vp9", "video/webm"];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export class CueCamera {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private tail: Promise<void> = Promise.resolve();

  async open() {
    if (!navigator.mediaDevices?.getUserMedia) return false;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      return true;
    } catch {
      return false;
    }
  }

  get active() {
    return this.stream !== null;
  }

  start() {
    this.tail = this.tail.then(() => this.startNow()).catch(() => undefined);
  }

  stop() {
    let resolve: (blob: Blob | null) => void = () => undefined;
    const done = new Promise<Blob | null>((next) => {
      resolve = next;
    });
    this.tail = this.tail
      .then(async () => {
        resolve(await this.finishRecorder());
      })
      .catch(() => {
        resolve(null);
      });
    return done;
  }

  pause() {
    if (this.recorder?.state === "recording") this.recorder.pause();
  }

  resume() {
    if (this.recorder?.state === "paused") this.recorder.resume();
  }

  close() {
    if (this.recorder && this.recorder.state !== "inactive") {
      try {
        this.recorder.stop();
      } catch {
        // The track is about to stop anyway.
      }
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
  }

  private async startNow() {
    if (!this.stream) return;
    if (this.recorder && this.recorder.state !== "inactive") {
      await this.finishRecorder();
    }
    const mime = preferredMime();
    this.chunks = [];
    let recorder: MediaRecorder;
    try {
      recorder = mime
        ? new MediaRecorder(this.stream, { mimeType: mime })
        : new MediaRecorder(this.stream);
    } catch {
      this.recorder = null;
      return;
    }
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };
    try {
      recorder.start();
      this.recorder = recorder;
    } catch {
      this.recorder = null;
    }
  }

  private finishRecorder() {
    const recorder = this.recorder;
    if (!recorder || recorder.state === "inactive") {
      const blob = this.chunks.length
        ? new Blob(this.chunks, { type: this.chunks[0]?.type || "video/webm" })
        : null;
      this.chunks = [];
      this.recorder = null;
      return Promise.resolve(blob && blob.size > 0 ? blob : null);
    }

    return new Promise<Blob | null>((resolve) => {
      const mime = recorder.mimeType || "video/webm";
      recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: mime });
        this.chunks = [];
        this.recorder = null;
        resolve(blob.size > 0 ? blob : null);
      };
      recorder.onerror = () => {
        this.chunks = [];
        this.recorder = null;
        resolve(null);
      };
      try {
        if (recorder.state === "paused") recorder.resume();
        recorder.stop();
      } catch {
        this.recorder = null;
        resolve(null);
      }
    });
  }
}
