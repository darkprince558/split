"use client";

import { CheckCircle2, RotateCcw, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Summary } from "@/lib/drill";

export function SummaryScreen({
  summary,
  note,
  canReview,
  onReview,
  onAgain,
  onSetup,
}: {
  summary: Summary;
  note: string | null;
  canReview: boolean;
  onReview: () => void;
  onAgain: () => void;
  onSetup: () => void;
}) {
  return (
    <div
      className="min-h-dvh overflow-y-auto bg-[#f5f5f7] text-[#1d1d1f]"
      data-screen="summary"
    >
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-6 px-5 py-10">
        <header>
          <CheckCircle2 className="mb-4 size-9 text-primary" aria-hidden />
          <h1 className="text-4xl font-semibold tracking-tight">
            {summary.stoppedEarly ? "Drill ended" : "Nice work"}
          </h1>
          <p className="mt-2 text-base text-neutral-600">
            {summary.reps === 0
              ? "No cues completed. Ready for another go?"
              : summary.stoppedEarly
                ? "You ended this session early."
                : "You finished the session. Take a breather."}
          </p>
        </header>
        <section className="setup-panel" aria-label="Session results">
          <p className="text-5xl font-semibold tabular-nums">{summary.reps}</p>
          <p className="mt-1 text-base text-neutral-600">
            {summary.reps === 1 ? "cue completed" : "cues completed"}
          </p>
          {summary.respond ? (
            <dl className="mt-5 grid grid-cols-2 gap-5 border-t border-neutral-200 pt-5">
              {[
                [
                  "Average reaction",
                  summary.averageMs === null ? "—" : `${summary.averageMs} ms`,
                ],
                [
                  "Best reaction",
                  summary.bestMs === null ? "—" : `${summary.bestMs} ms`,
                ],
                ["Missed cues", summary.misses],
                ["Feints answered", summary.feints],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-sm text-neutral-600">{label}</dt>
                  <dd className="mt-1 text-xl font-semibold tabular-nums">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-4 text-sm text-neutral-600">
              This session tracks completed cues.
            </p>
          )}
          {note ? (
            <p className="mt-4 text-sm text-neutral-600" role="status">
              {note}
            </p>
          ) : null}
        </section>
        <div className="flex flex-col gap-3">
          <Button
            type="button"
            className="h-14 gap-2 rounded-2xl text-lg font-semibold"
            onClick={onAgain}
          >
            <RotateCcw className="size-5" aria-hidden />
            Repeat drill
          </Button>
          {canReview ? (
            <Button
              type="button"
              variant="outline"
              className="h-14 gap-2 rounded-2xl text-base"
              onClick={onReview}
            >
              <Video className="size-5" aria-hidden />
              Review recordings
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="h-14 rounded-2xl text-base"
            onClick={onSetup}
          >
            Change setup
          </Button>
        </div>
      </main>
    </div>
  );
}
