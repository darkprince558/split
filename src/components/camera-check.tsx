"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RefreshCw } from "lucide-react";
import { ScreenHeading } from "@/components/screen-heading";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function CameraCheck({ stream, busy, error, onChoose, onRetry, onReady, onSkip, onCancel }: {
  stream: MediaStream | null;
  busy: boolean;
  error: string | null;
  onChoose: (id: string) => void;
  onRetry: () => void;
  onReady: () => void;
  onSkip: () => void;
  onCancel: () => void;
}) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [live, setLive] = useState(false);
  const [deviceNote, setDeviceNote] = useState("");
  const [disconnected, setDisconnected] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentId = stream?.getVideoTracks()[0]?.getSettings().deviceId ?? "";
  const cameraLabel = stream?.getVideoTracks()[0]?.label;
  const refresh = useCallback(() => {
    const request = navigator.mediaDevices?.enumerateDevices() ?? Promise.resolve([]);
    return request.then((all) => {
      const cameras = all.filter((device) => device.kind === "videoinput" && device.deviceId);
      setDevices(cameras);
      setDeviceNote(cameras.length > 1 ? `${cameras.length} cameras available.` : "Connect another camera, then refresh to find it.");
    }).catch(() => setDeviceNote("Your browser couldn’t list cameras. Use its camera setting, then try again."));
  }, []);

  useEffect(() => {
    const media = navigator.mediaDevices;
    void refresh();
    media?.addEventListener?.("devicechange", refresh);
    return () => media?.removeEventListener?.("devicechange", refresh);
  }, [refresh, stream]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    const ended = () => { setDisconnected(true); setLive(false); };
    stream.getVideoTracks().forEach((track) => track.addEventListener("ended", ended));
    void video.play().catch(() => setDeviceNote("Tap the preview to play it."));
    return () => {
      stream.getVideoTracks().forEach((track) => track.removeEventListener("ended", ended));
      video.pause(); video.srcObject = null;
    };
  }, [stream]);

  const resetPreview = () => { setLive(false); setDisconnected(false); };
  return (
    <main className="screen-enter min-h-dvh bg-[#f5f5f7] px-5 py-7 text-[#1d1d1f]" data-screen="camera-check">
      <div className="mx-auto flex max-w-xl flex-col gap-5">
        <header>
          <ScreenHeading className="text-3xl font-semibold tracking-tight">Check your camera</ScreenHeading>
          <p className="mt-2 text-base text-neutral-600">Step back until your whole body and room to move are visible.</p>
        </header>
        <section className="setup-panel space-y-4">
          <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-neutral-900 text-white">
            {stream && !disconnected ? <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-contain" aria-label="Live camera preview"
              onPlaying={() => setLive(true)} onClick={() => { void videoRef.current?.play().catch(() => setDeviceNote("Preview unavailable. Try the camera again.")); }} /> :
              <div className="px-5 text-center"><Camera className="mx-auto mb-3 size-8" aria-hidden /><p role="status">{busy ? "Allow camera access in your browser…" : "Camera unavailable"}</p></div>}
          </div>
          {devices.length > 1 ? <div className="space-y-2">
            <Label htmlFor="camera-source">Camera</Label>
            <select id="camera-source" value={devices.some((device) => device.deviceId === currentId) ? currentId : ""} disabled={busy}
              className="min-h-12 w-full min-w-0 rounded-xl border border-neutral-300 bg-white px-3 text-base" onChange={(event) => { resetPreview(); onChoose(event.target.value); }}>
              <option value="" disabled>Choose a camera</option>
              {devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}
            </select>
          </div> : cameraLabel ? <p className="text-sm text-neutral-600">{cameraLabel}</p> : null}
          {error || disconnected ? <div role="status" className="space-y-2 text-sm text-red-700">
            <p>{disconnected ? "Camera disconnected. Reconnect it and try again." : "Camera didn’t start. Check camera access or connect another camera."}</p>
            <Button variant="outline" className="min-h-11 rounded-xl" onClick={() => { resetPreview(); onRetry(); }}>Try camera again</Button>
          </div> : null}
          <p className="text-sm text-neutral-600">Preview only. Recording starts with the drill. Clips stay in this browser.</p>
        </section>
        <details className="setup-panel camera-help">
          <summary className="min-h-11 cursor-pointer text-base font-semibold">Use an iPhone or another camera</summary>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-neutral-600">
            <p><strong className="text-neutral-900">iPhone + Mac:</strong> use Continuity Camera with the same Apple Account on both devices. Keep Wi-Fi and Bluetooth on, lock the iPhone, and position its rear camera toward the court. A USB cable also works.</p>
            <p>Keep Split open on your Mac. Choose the iPhone from the Camera menu above when your browser makes it available. Video comes from the phone; clips save here on your Mac.</p>
            <p>If it doesn’t appear, try connecting by USB and check your browser’s camera settings, then refresh the list.</p>
            <p><strong className="text-neutral-900">Other cameras:</strong> connect a USB webcam or a camera with a webcam mode or capture adapter, then select it above.</p>
            <a className="inline-block min-h-11 py-2 text-primary underline underline-offset-4" href="https://support.apple.com/en-us/102546" target="_blank" rel="noreferrer">Apple’s Continuity Camera setup guide</a>
            <div><Button variant="outline" className="min-h-11 rounded-xl" disabled={busy} onClick={() => void refresh()}><RefreshCw className="size-4" aria-hidden /> Refresh cameras</Button></div>
            {deviceNote ? <p role="status">{deviceNote}</p> : null}
          </div>
        </details>
        <Button className="press-feedback h-14 rounded-2xl text-lg font-semibold" disabled={busy || !stream || !live || disconnected} onClick={onReady}>Start 5-second countdown</Button>
        <div className="flex flex-wrap justify-between gap-2">
          <Button variant="ghost" className="min-h-11" onClick={onCancel}>Back to setup</Button>
          <Button variant="ghost" className="min-h-11" onClick={onSkip}>Continue without recording</Button>
        </div>
      </div>
    </main>
  );
}
