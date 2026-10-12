"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { CueArrow } from "@/components/cue-arrow";
import { Button } from "@/components/ui/button";
import { useDrillSession, type PlannedCue } from "@/hooks/use-drill-session";
import { CueCamera } from "@/lib/camera";
import {
  directionLabel,
  inkForBackground,
  summarize,
  swatchHex,
  type Direction,
  type Settings,
  type Summary,
} from "@/lib/drill";
import { saveClip } from "@/lib/video-storage";

const PAD: (Direction | null)[][] = [
  ["back-left", "back", "back-right"],
  ["left", null, "right"],
  ["forward-left", "forward", "forward-right"],
];

const STORAGE_NOTE = "Couldn't save that clip. The drill is still running.";
const CAMERA_NOTE = "Camera didn't start. This run won't be recorded.";

export type FinishedRun = {
  summary: Summary;
  sessionId: string | null;
  clipCount: number;
  note: string | null;
};

export function PlayScreen({
  settings,
  onFinish,
}: {
  settings: Settings;
  onFinish: (run: FinishedRun) => void;
}) {
  const cameraRef = useRef<CueCamera | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [camera, setCamera] = useState<"pending" | "on" | "off">(
    settings.record ? "pending" : "off",
  );
  const [note, setNote] = useState<string | null>(null);
  const background = swatchHex(settings.backgroundColor);
  const ink = inkForBackground(settings.backgroundColor);

  useEffect(() => {
    if (!settings.record) return;
    const cam = new CueCamera();
    cameraRef.current = cam;
    let cancelled = false;
    const giveUp = window.setTimeout(() => {
      if (cancelled) return;
      setNote(CAMERA_NOTE);
      setCamera("off");
    }, 8000);
    cam.open().then((ok) => {
      window.clearTimeout(giveUp);
      if (cancelled) {
        cam.close();
        return;
      }
      if (!ok) {
        setNote(CAMERA_NOTE);
        setCamera("off");
        return;
      }
      setCamera("on");
    });
    return () => {
      cancelled = true;
      window.clearTimeout(giveUp);
      cam.close();
      cameraRef.current = null;
    };
  }, [settings.record]);

  if (camera === "pending") {
    return (
      <div
        className="fixed inset-0 flex flex-col"
        style={{ backgroundColor: background, color: ink }}
        data-screen="play"
        data-phase="camera"
      >
        <header className="flex items-center px-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <Button
            type="button"
            variant="ghost"
            className="h-11 bg-transparent px-3 text-base hover:bg-transparent"
            style={{ color: ink }}
            onClick={() =>
              onFinish({
                summary: summarize({
                  hits: [],
                  misses: 0,
                  feints: 0,
                  reps: 0,
                  respond: settings.respond,
                  stoppedEarly: true,
                }),
                sessionId: null,
                clipCount: 0,
                note: null,
              })
            }
          >
            Stop
          </Button>
        </header>
        <p className="flex flex-1 items-center justify-center text-xl">Starting camera…</p>
      </div>
    );
  }

  return (
    <LiveDrill
      settings={settings}
      cameraRef={cameraRef}
      cameraOn={camera === "on"}
      note={note}
      sessionId={sessionId}
      onNote={setNote}
      onFinish={onFinish}
    />
  );
}

function LiveDrill({
  settings,
  cameraRef,
  cameraOn,
  note,
  sessionId,
  onNote,
  onFinish,
}: {
  settings: Settings;
  cameraRef: RefObject<CueCamera | null>;
  cameraOn: boolean;
  note: string | null;
  sessionId: string;
  onNote: (note: string) => void;
  onFinish: (run: FinishedRun) => void;
}) {
  const cueRef = useRef<PlannedCue | null>(null);
  const recording = useRef(false);
  const indexRef = useRef(0);
  const savedCount = useRef(0);
  const noteRef = useRef(note);

  useEffect(() => {
    noteRef.current = note;
  }, [note]);

  const onCueStart = useCallback(
    (cue: PlannedCue) => {
      cueRef.current = cue;
      const camera = cameraRef.current;
      if (!cameraOn || !camera?.active) return;
      recording.current = true;
      camera.start();
    },
    [cameraOn, cameraRef],
  );

  const onCueEnd = useCallback((keep: boolean) => {
    const cue = cueRef.current;
    if (!recording.current || !cue) return Promise.resolve();
    recording.current = false;
    const camera = cameraRef.current;
    if (!camera) return Promise.resolve();
    return (async () => {
      const blob = await camera.stop();
      if (!blob || !keep) return;
      indexRef.current += 1;
      const saved = await saveClip({
        id: crypto.randomUUID(),
        sessionId,
        index: indexRef.current,
        direction: cue.direction,
        feints: cue.feints,
        mime: blob.type || "video/webm",
        blob,
        createdAt: Date.now(),
      });
      if (saved) {
        savedCount.current = indexRef.current;
        return;
      }
      noteRef.current = STORAGE_NOTE;
      onNote(STORAGE_NOTE);
    })();
  }, [cameraRef, onNote, sessionId]);

  const finish = useCallback(
    (summary: Summary) => {
      onFinish({
        summary,
        sessionId: savedCount.current > 0 ? sessionId : null,
        clipCount: savedCount.current,
        note: noteRef.current,
      });
    },
    [onFinish, sessionId],
  );

  const { view, answer, togglePause, stop } = useDrillSession(settings, finish, {
    onCueStart,
    onCueEnd,
  });

  const background = swatchHex(settings.backgroundColor);
  const arrow = swatchHex(settings.arrowColor);
  const ink = inkForBackground(settings.backgroundColor);
  const line = `color-mix(in srgb, ${ink} 28%, transparent)`;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    if (view.paused) camera.pause();
    else camera.resume();
  }, [cameraRef, view.paused]);

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden select-none"
      style={{ backgroundColor: background, color: ink }}
      data-screen="play"
      data-phase={view.paused ? "paused" : view.phase}
      data-direction={view.shown ?? ""}
      data-cue-id={view.cueId}
      data-real={view.cueReal ?? ""}
      data-feints={view.cueFeints.join(",")}
      data-camera={cameraOn ? "on" : "off"}
      data-arrow-color={settings.arrowColor}
      data-background-color={settings.backgroundColor}
      onContextMenu={(event) => event.preventDefault()}
    >
      <header className="z-10 flex shrink-0 items-center justify-between px-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center">
          <Button
            type="button"
            variant="ghost"
            className="h-11 bg-transparent px-3 text-base hover:bg-transparent"
            style={{ color: ink }}
            onClick={stop}
          >
            Stop
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-11 bg-transparent px-3 text-base hover:bg-transparent"
            style={{ color: ink }}
            onClick={togglePause}
          >
            {view.paused ? "Resume" : "Pause"}
          </Button>
          {cameraOn ? (
            <p className="px-2 text-xs tracking-wide opacity-70" data-camera-mark="on">
              Camera on
            </p>
          ) : null}
        </div>
        <p className="px-3 text-sm tabular-nums opacity-70">{view.progress}</p>
      </header>
      {note ? (
        <p className="px-4 text-center text-sm" role="status">
          {note}
        </p>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {view.phase === "live" && view.shown && !view.paused ? directionLabel(view.shown) : ""}
      </p>

      <div className="flex min-h-0 flex-1 items-center justify-center">
        {view.paused ? (
          <p className="text-2xl">Paused</p>
        ) : view.shown ? (
          <CueArrow direction={view.shown} announce={view.phase === "live"} color={arrow} />
        ) : null}
      </div>

      {settings.respond ? (
        <div
          className="grid shrink-0 grid-cols-3 border-t pb-[env(safe-area-inset-bottom)]"
          style={{ borderColor: line }}
        >
          {PAD.flat().map((direction, index) => {
            const enabled = direction !== null && settings.directions.includes(direction);
            return (
              <div
                key={direction ?? `gap-${index}`}
                className={index % 3 === 0 ? "min-h-16" : "min-h-16 border-l"}
                style={{ borderColor: line }}
              >
                {enabled ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={view.paused}
                    className="h-16 w-full rounded-none bg-transparent px-1 text-sm leading-tight font-medium whitespace-normal hover:bg-transparent active:opacity-60"
                    style={{ color: ink }}
                    onPointerDown={(event) => {
                      if (event.button !== 0) return;
                      event.preventDefault();
                      answer(direction);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      answer(direction);
                    }}
                  >
                    {directionLabel(direction)}
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
