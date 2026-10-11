"use client";

import { useEffect } from "react";
import { CueArrow } from "@/components/cue-arrow";
import { Button } from "@/components/ui/button";
import { useDrillSession } from "@/hooks/use-drill-session";
import { directionLabel, type Direction, type Settings, type Summary } from "@/lib/drill";

const TAP_ORDER: Direction[] = ["left", "back", "right"];

export function PlayScreen({
  settings,
  onFinish,
}: {
  settings: Settings;
  onFinish: (summary: Summary) => void;
}) {
  const { view, answer, togglePause, stop } = useDrillSession(settings, onFinish);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 overflow-hidden bg-white text-black select-none"
      data-screen="play"
      data-phase={view.paused ? "paused" : view.phase}
      data-direction={view.shown ?? ""}
      onContextMenu={(event) => event.preventDefault()}
    >
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center">
          <Button
            type="button"
            variant="ghost"
            className="h-11 px-3 text-base text-black"
            onClick={stop}
          >
            Stop
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-11 px-3 text-base text-black"
            onClick={togglePause}
          >
            {view.paused ? "Resume" : "Pause"}
          </Button>
        </div>
        <p className="px-3 text-sm tabular-nums text-neutral-500">{view.progress}</p>
      </header>
      <p className="sr-only" aria-live="polite">
        {view.phase === "live" && view.shown && !view.paused ? directionLabel(view.shown) : ""}
      </p>

      <div
        className={
          settings.respond
            ? "absolute inset-x-0 top-14 bottom-24 flex items-center justify-center"
            : "absolute inset-0 flex items-center justify-center"
        }
      >
        {view.paused ? (
          <p className="text-2xl">Paused</p>
        ) : view.shown ? (
          <CueArrow direction={view.shown} announce={view.phase === "live"} />
        ) : null}
      </div>

      {settings.respond ? (
        <div
          className="absolute inset-x-0 bottom-0 grid border-t border-black/10 pb-[env(safe-area-inset-bottom)]"
          style={{
            gridTemplateColumns: `repeat(${Math.max(settings.directions.length, 1)}, minmax(0, 1fr))`,
          }}
        >
          {TAP_ORDER.filter((direction) => settings.directions.includes(direction)).map(
            (direction, index) => (
            <Button
              key={direction}
              type="button"
              variant="ghost"
              disabled={view.paused}
              className={
                index === 0
                  ? "h-20 rounded-none text-lg font-medium text-black active:text-[#FF3B00]"
                  : "h-20 rounded-none border-l border-black/10 text-lg font-medium text-black active:text-[#FF3B00]"
              }
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
          ))}
        </div>
      ) : null}
    </div>
  );
}
