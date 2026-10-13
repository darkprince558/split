"use client";

import { ScreenHeading } from "@/components/screen-heading";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { CueArrow } from "@/components/cue-arrow";
import { Button } from "@/components/ui/button";
import { useDrillSession, type PlannedCue } from "@/hooks/use-drill-session";
import { CueCamera, type CueRecording } from "@/lib/camera";
import {
  directionLabel,
  inkForBackground,
  swatchHex,
  type Direction,
  type Settings,
  type Summary,
} from "@/lib/drill";
import { saveClip } from "@/lib/video-storage";
import { Pause, Play, Square, Video } from "lucide-react";

const PAD: (Direction | null)[][] = [
  ["back-left", "back", "back-right"],
  ["left", null, "right"],
  ["forward-left", "forward", "forward-right"],
];

const STORAGE_NOTE = "A clip couldn't be saved on this device.";
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
  onCancel,
}: {
  settings: Settings;
  onFinish: (run: FinishedRun) => void;
  onCancel: () => void;
}) {
  const cameraRef = useRef<CueCamera | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [camera, setCamera] = useState<"pending" | "on" | "off">(
    settings.record ? "pending" : "off",
  );
  const [note, setNote] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [skipCamera, setSkipCamera] = useState(false);
  const begin = useCallback(() => setReady(true), []);
  const background = swatchHex(settings.backgroundColor);
  const ink = inkForBackground(settings.backgroundColor);

  useEffect(() => {
    if (!settings.record || skipCamera) return;
    const cam = new CueCamera();
    cameraRef.current = cam;
    let cancelled = false;
    const giveUp = window.setTimeout(() => {
      if (cancelled) return;
      cancelled = true;
      cam.close();
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
  }, [settings.record, skipCamera]);

  if (camera === "pending") {
    return (
      <div
        className="fixed inset-0 flex flex-col"
        style={{ backgroundColor: background, color: ink }}
        data-screen="play"
        data-phase="camera"
      >
        <main className="m-auto flex w-full max-w-md flex-col items-center gap-5 px-6 text-center">
          <Video className="size-9" aria-hidden />
          <ScreenHeading className="text-3xl font-semibold">Allow camera access</ScreenHeading>
          <p className="text-base opacity-75">
            Use your browser’s camera prompt to record each cue. Video stays on
            this device.
          </p>
          <Button
            type="button"
            className="h-12 rounded-xl px-6 text-base"
            onClick={() => {
              setSkipCamera(true);
              setCamera("off");
              setNote(null);
            }}
          >
            Continue without recording
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-xl px-6 text-base"
            onClick={onCancel}
          >
            Back to setup
          </Button>
        </main>
      </div>
    );
  }

  if (!ready) {
    return (
      <ReadyScreen
        background={background}
        ink={ink}
        cameraOn={camera === "on"}
        note={note}
        onReady={begin}
        onCancel={onCancel}
      />
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

function ReadyScreen({
  background,
  ink,
  cameraOn,
  note,
  onReady,
  onCancel,
}: {
  background: string;
  ink: string;
  cameraOn: boolean;
  note: string | null;
  onReady: () => void;
  onCancel: () => void;
}) {
  const [seconds, setSeconds] = useState(5);
  useEffect(() => {
    if (note) return;
    const interval = window.setInterval(
      () => setSeconds((current) => Math.max(1, current - 1)),
      1000,
    );
    const timer = window.setTimeout(onReady, 5000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timer);
    };
  }, [note, onReady]);
  return (
    <main
      className="fixed inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center"
      style={{ backgroundColor: background, color: ink }}
      data-screen="play"
      data-phase="ready"
    >
      <ScreenHeading className="text-3xl font-semibold">
        {note ? "Camera unavailable" : "Get ready"}
      </ScreenHeading>
      {note ? (
        <p className="max-w-sm text-base" role="status">
          Your camera didn’t start. You can still practise without recording, or
          go back and try again.
        </p>
      ) : (
        <p
          className="text-[clamp(5rem,20vw,9rem)] leading-none font-semibold tabular-nums"
          role="status"
          aria-live="polite"
        >
          {seconds}
        </p>
      )}
      <p className="max-w-sm text-lg opacity-75">
        Stand in the centre. Follow the arrow that stays, then return to the
        centre.
      </p>
      {cameraOn ? (
        <p className="text-sm">Camera ready · Clips saved on this device</p>
      ) : null}
      <Button
        type="button"
        className="h-12 rounded-xl px-6 text-base"
        onClick={onReady}
      >
        {note ? "Continue without recording" : "Start now"}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-12 rounded-xl px-6 text-base"
        onClick={onCancel}
      >
        Back to setup
      </Button>
    </main>
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
  const recording = useRef<CueRecording | null>(null);
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
      recording.current = camera.start();
    },
    [cameraOn, cameraRef],
  );

  const onCueEnd = useCallback(
    (keep: boolean) => {
      const cue = cueRef.current;
      if (!cue || !cameraOn) return Promise.resolve();
      const capture = recording.current;
      recording.current = null;
      // Reserve order before asynchronous tails finish.
      const clipIndex = keep ? ++indexRef.current : 0;
      return (async () => {
        const result = await capture?.finish(keep);
        if (!keep) return;
        if (!result) {
          noteRef.current = "A cue couldn't be recorded.";
          onNote(noteRef.current);
          return;
        }
        const { blob, realCueMs, durationMs } = result;
        const saved = await saveClip({
          id: crypto.randomUUID(),
          sessionId,
          index: clipIndex,
          direction: cue.direction,
          feints: cue.feints,
          mime: blob.type || "video/webm",
          blob,
          createdAt: Date.now(),
          realCueMs,
          durationMs,
        });
        if (saved) {
          savedCount.current += 1;
          return;
        }
        noteRef.current = STORAGE_NOTE;
        onNote(STORAGE_NOTE);
      })();
    },
    [cameraOn, onNote, sessionId],
  );

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

  const { view, answer, togglePause, stop } = useDrillSession(
    settings,
    finish,
    {
      onCueStart,
      onCueEnd,
      onRealCue: () => recording.current?.markRealCue(),
      onPause: (paused) => paused ? cameraRef.current?.pause() : cameraRef.current?.resume(),
      onEnding: () => cameraRef.current?.finishPending(),
    },
  );

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
      {!view.paused && !view.finishing ? <ScreenHeading className="sr-only">Drill in progress</ScreenHeading> : null}
      <header className="z-10 flex shrink-0 flex-wrap items-center justify-between px-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center">
          <Button
            type="button"
            variant="ghost"
            className="h-11 bg-transparent px-3 text-base hover:bg-transparent"
            style={{ color: ink }}
            onClick={stop}
            disabled={view.finishing}
          >
            <Square className="size-4" aria-hidden /> End drill
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-11 bg-transparent px-3 text-base hover:bg-transparent"
            style={{ color: ink }}
            onClick={togglePause}
            disabled={view.finishing}
          >
            {view.paused ? (
              <Play className="size-4" aria-hidden />
            ) : (
              <Pause className="size-4" aria-hidden />
            )}
            {view.paused ? "Resume" : "Pause"}
          </Button>
          {cameraOn ? (
            <p
              className="px-2 text-xs tracking-wide opacity-70"
              data-camera-mark="on"
            >
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
        {view.phase === "live" && view.shown && !view.paused
          ? directionLabel(view.shown)
          : ""}
      </p>

      <div className="flex min-h-0 flex-1 items-center justify-center">
        {view.finishing ? (
          <div className="px-6 text-center" role="status"><ScreenHeading className="text-2xl font-semibold">Saving your clips…</ScreenHeading><p className="mt-2 text-base opacity-70">Finishing the last reaction.</p></div>
        ) : view.paused ? (
          <div className="flex w-full max-w-md flex-col items-center gap-5 px-6 text-center">
            <ScreenHeading className="text-4xl font-semibold">Paused</ScreenHeading>
            <p className="text-base opacity-70">
              Take a breather. Resume when you’re ready.
            </p>
            <Button
              type="button"
              className="h-14 rounded-2xl px-8 text-lg"
              onClick={togglePause}
              disabled={view.finishing}
            >
              <Play className="size-5" aria-hidden /> Resume drill
            </Button>
            <p className="text-sm opacity-70">
              Space to pause or resume · Esc to end
            </p>
          </div>
        ) : view.shown ? (
          <CueArrow
            direction={view.shown}
            announce={view.phase === "live"}
            color={arrow}
          />
        ) : (
          <p className="px-6 text-center text-lg opacity-60">Return to centre</p>
        )}
      </div>

      {settings.respond ? (
        <div
          className="grid shrink-0 grid-cols-3 border-t pb-[env(safe-area-inset-bottom)]"
          style={{ borderColor: line }}
        >
          {PAD.flat().map((direction, index) => {
            const enabled =
              direction !== null && settings.directions.includes(direction);
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
                    disabled={view.paused || view.finishing}
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
