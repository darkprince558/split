"use client";

import { ScreenHeading } from "@/components/screen-heading";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { ChevronLeft, ChevronRight, Download, Play, RotateCcw, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { clipFilename, clipsCsv, directionLabel, type Direction } from "@/lib/drill";
import { downloadBlob, recordingSessions } from "@/lib/clips";
import { listClips, type StoredClip } from "@/lib/video-storage";
import { createZip } from "@/lib/zip";

function feintLine(feints: Direction[]) {
  if (feints.length === 0) return "No feints";
  return `${feints.length === 1 ? "Feint" : "Feints"}: ${feints.map(directionLabel).join(" → ")}`;
}

const selectClass = "h-12 w-full min-w-0 rounded-xl border border-neutral-300 bg-white px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const dateLabel = (date: number) => new Date(date).toLocaleString(undefined, {
  month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
});

function ClipVideo({ clip, videoRef, onPlayed }: {
  clip: StoredClip;
  videoRef: RefObject<HTMLVideoElement | null>;
  onPlayed: () => void;
}) {
  const { blob } = clip;
  const [realVisible, setRealVisible] = useState(clip.realCueMs === 0);
  const [duration, setDuration] = useState((clip.durationMs ?? 0) / 1000);
  const cueTime = clip.realCueMs === undefined ? null : clip.realCueMs / 1000;
  useEffect(() => {
    const video = videoRef.current;
    if (cueTime === null || !video) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      setRealVisible(video.currentTime + 0.001 >= cueTime);
      if (!video.paused && !video.ended) frame = requestAnimationFrame(update);
    };
    video.addEventListener("play", update);
    video.addEventListener("pause", update);
    video.addEventListener("seeked", update);
    video.addEventListener("ended", update);
    frame = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(frame);
      video.removeEventListener("play", update);
      video.removeEventListener("pause", update);
      video.removeEventListener("seeked", update);
      video.removeEventListener("ended", update);
    };
  }, [cueTime, videoRef]);
  const bindVideo = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (!node) return;
    const url = URL.createObjectURL(blob);
    node.src = url;
    return () => {
      node.pause();
      node.removeAttribute("src");
      node.load();
      URL.revokeObjectURL(url);
      if (videoRef.current === node) videoRef.current = null;
    };
  }, [blob, videoRef]);
  return (
    <div className="space-y-3">
      <video ref={bindVideo} className="max-h-[45vh] min-h-32 w-full rounded-xl bg-black" controls playsInline preload="auto" data-review-video="true" onPlay={onPlayed}
        onDurationChange={(event) => { const seconds = event.currentTarget.duration; if (Number.isFinite(seconds)) setDuration(seconds); }} />
      {cueTime !== null ? (
        <div className="rounded-xl bg-neutral-100 px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-x-3 text-sm">
            <span className={realVisible ? "font-semibold text-primary" : "text-neutral-600"} data-cue-timing={realVisible ? "real" : "feints"}>{realVisible ? `Real cue: ${directionLabel(clip.direction)}` : "Watch the feints"}</span>
            <Button type="button" variant="ghost" className="min-h-11 px-2 text-sm" onClick={() => {
              const video = videoRef.current;
              if (video) { video.pause(); video.currentTime = cueTime; }
            }}>Real cue at {cueTime.toFixed(2)} s</Button>
          </div>
          {duration > 0 ? <div className="relative my-2 h-1 rounded-full bg-neutral-300" aria-hidden>
            <span className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-white" style={{ left: `${Math.min(100, cueTime / duration * 100)}%` }} />
          </div> : null}
        </div>
      ) : <p className="text-xs text-neutral-600">Cue timing isn’t available for this older clip.</p>}
    </div>
  );
}

export function ReviewScreen({ sessionId, onBack }: {
  sessionId: string | null;
  onBack: () => void;
}) {
  const [recordings, setRecordings] = useState<StoredClip[] | null>(null);
  const [selectedSession, setSelectedSession] = useState(sessionId);
  const [error, setError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [index, setIndex] = useState(0);
  const [played, setPlayed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const exportingRef = useRef(false);
  const directionRef = useRef<HTMLHeadingElement>(null);
  const changeClip = (next: number) => {
    setIndex(next);
    setPlayed(false);
    setDownloadError(null);
    directionRef.current?.focus({ preventScroll: true });
  };
  const sessions = recordingSessions(recordings ?? []);
  const activeId = sessions.some((item) => item.id === selectedSession)
    ? selectedSession : sessions[0]?.id;
  const clips = recordings?.filter((item) => item.sessionId === activeId) ?? [];
  const clip = clips[index] ?? null;
  const activeSession = sessions.find((item) => item.id === activeId);

  useEffect(() => {
    let live = true;
    listClips().then((rows) => {
      if (live) setRecordings(rows);
    }).catch(() => {
      if (live) setError("Couldn't open the saved clips. Go back and try again.");
    });
    return () => { live = false; };
  }, []);

  const replay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(() => setDownloadError("Couldn't play this clip. Try downloading it to watch on your device."));
  };

  const downloadClip = () => {
    if (!clip) return;
    setDownloadError(null);
    try {
      downloadBlob(clip.blob, clipFilename(clip.index, clip.direction, clip.feints, clip.mime));
    } catch {
      setDownloadError("Couldn't download this clip. Try again.");
    }
  };

  const downloadSession = async () => {
    if (clips.length === 0 || exportingRef.current) return;
    exportingRef.current = true;
    setExporting(true);
    setDownloadError(null);
    try {
      const snapshot = clips;
      const files = await Promise.all(snapshot.map(async (item) => ({
        name: clipFilename(item.index, item.direction, item.feints, item.mime),
        data: new Uint8Array(await item.blob.arrayBuffer()),
      })));
      const csv = clipsCsv(snapshot.map((item) => ({
        filename: clipFilename(item.index, item.direction, item.feints, item.mime),
        direction: item.direction,
        feints: item.feints,
        realCueMs: item.realCueMs,
      })));
      files.push({ name: "clips.csv", data: new TextEncoder().encode(csv) });
      const date = new Date(activeSession?.createdAt ?? snapshot[0].createdAt).toISOString().replace(/[:.]/g, "-");
      downloadBlob(createZip(files), `split-${date}.zip`);
    } catch {
      setDownloadError("Couldn't download the session. Try again, or save individual clips.");
    } finally {
      exportingRef.current = false;
      setExporting(false);
    }
  };

  return (
    <div className="screen-enter min-h-dvh overflow-y-auto bg-[#f5f5f7] text-[#1d1d1f]" data-screen="review">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 py-7">
        <header className="flex items-start justify-between gap-4">
          <div>
            <ScreenHeading className="text-3xl font-semibold tracking-tight">Recordings</ScreenHeading>
            <p className="mt-1 text-sm text-neutral-600">Saved on this device. Download to keep a copy.</p>
          </div>
          <Button type="button" variant="outline" className="press-feedback h-11 rounded-xl" onClick={onBack}>Back</Button>
        </header>
        {error ? <p role="alert">{error}</p> : null}
        {recordings === null && !error ? <p role="status">Opening clips…</p> : null}
        {recordings && recordings.length === 0 ? (
          <section className="setup-panel flex flex-col items-center gap-3 py-8 text-center">
            <Video className="size-8 text-neutral-500" aria-hidden />
            <h2 className="text-xl font-semibold">No recordings yet</h2>
            <p className="text-sm text-neutral-600">Turn on Record reactions before your next drill.</p>
          </section>
        ) : null}
        {sessions.length > 1 ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="recording-session">Session</Label>
            <select id="recording-session" className={selectClass} value={activeId ?? ""} disabled={exporting}
              onChange={(event) => { setSelectedSession(event.target.value); setIndex(0); setPlayed(false); setDownloadError(null); }}>
              {sessions.map((item) => <option key={item.id} value={item.id}>{dateLabel(item.createdAt)} · {item.count} {item.count === 1 ? "clip" : "clips"}</option>)}
            </select>
          </div>
        ) : null}
        {clip ? (
          <>
            <section className="setup-panel flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="recording-cue">Cue {index + 1} of {clips.length}</Label>
                <select id="recording-cue" className={selectClass} value={index}
                  onChange={(event) => { setIndex(Number(event.target.value)); setPlayed(false); setDownloadError(null); }}>
                  {clips.map((item, position) => <option key={item.id} value={position}>{position + 1} · {directionLabel(item.direction)}{item.feints.length ? ` · ${item.feints.length} ${item.feints.length === 1 ? "feint" : "feints"}` : ""}</option>)}
                </select>
              </div>
              <div aria-live="polite">
                <p className="text-xs font-semibold tracking-wide text-neutral-600">REAL CUE</p>
                <h2 ref={directionRef} tabIndex={-1} className="mt-1 text-3xl font-semibold tracking-tight" data-review-direction={directionLabel(clip.direction)}>{directionLabel(clip.direction)}</h2>
                <p className="mt-1 text-sm text-neutral-600" data-review-feints={feintLine(clip.feints)}>{feintLine(clip.feints)}</p>
              </div>
              <ClipVideo key={clip.id} clip={clip} videoRef={videoRef} onPlayed={() => setPlayed(true)} />
              <div className="grid grid-cols-3 gap-2">
                <Button type="button" variant="outline" className="press-feedback h-12 rounded-xl px-2" disabled={index === 0}
                  onClick={() => changeClip(Math.max(0, index - 1))}>
                  <ChevronLeft className="hidden size-4 sm:block" aria-hidden /> Previous
                </Button>
                <Button type="button" className="press-feedback h-12 rounded-xl px-2" onClick={replay}>{played ? <RotateCcw className="hidden size-4 sm:block" aria-hidden /> : <Play className="hidden size-4 sm:block" aria-hidden />} {played ? "Replay" : "Play"}</Button>
                <Button type="button" variant="outline" className="press-feedback h-12 rounded-xl px-2" disabled={index >= clips.length - 1}
                  onClick={() => changeClip(Math.min(clips.length - 1, index + 1))}>
                  Next <ChevronRight className="hidden size-4 sm:block" aria-hidden />
                </Button>
              </div>
            </section>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" className="press-feedback h-12 rounded-xl text-base" onClick={downloadClip}><Download className="size-4" aria-hidden /> Save this clip</Button>
              <Button type="button" variant="outline" className="press-feedback h-12 rounded-xl text-base" disabled={exporting} onClick={() => void downloadSession()}>
                <Download className="size-4" aria-hidden /> {exporting ? "Preparing download…" : `Save session (${clips.length})`}
              </Button>
            </div>
            <p className="text-xs text-neutral-600">The session download includes all its clips and a cue list.</p>
            {downloadError ? <p className="text-sm text-red-700" role="alert">{downloadError}</p> : null}
            {exporting ? <p className="sr-only" role="status">Preparing session download</p> : null}
          </>
        ) : null}
      </main>
    </div>
  );
}
