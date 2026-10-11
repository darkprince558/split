"use client";

import { useEffect } from "react";
import { CueArrow } from "@/components/cue-arrow";
import { Button } from "@/components/ui/button";
import { useDrillSession } from "@/hooks/use-drill-session";
import {
  directionLabel,
  inkForBackground,
  swatchHex,
  type Direction,
  type Settings,
  type Summary,
} from "@/lib/drill";

const PAD: (Direction | null)[][] = [
  ["back-left", "back", "back-right"],
  ["left", null, "right"],
  ["forward-left", "forward", "forward-right"],
];

export function PlayScreen({
  settings,
  onFinish,
}: {
  settings: Settings;
  onFinish: (summary: Summary) => void;
}) {
  const { view, answer, togglePause, stop } = useDrillSession(settings, onFinish);
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
        </div>
        <p className="px-3 text-sm tabular-nums opacity-70">{view.progress}</p>
      </header>
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
