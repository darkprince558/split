"use client";

import { Button } from "@/components/ui/button";
import type { Summary } from "@/lib/drill";

function linesFor(summary: Summary) {
  const lines: string[] = [];
  if (summary.reps === 0) {
    lines.push("No cues yet.");
  } else if (summary.reps === 1) {
    lines.push("1 cue.");
  } else {
    lines.push(`${summary.reps} cues.`);
  }

  if (!summary.respond) {
    lines.push("Cues ran on their own.");
  } else {
    lines.push(
      summary.averageMs === null
        ? "No clean reads to time."
        : `Average reaction ${summary.averageMs} ms.`,
    );
    if (summary.bestMs !== null) lines.push(`Best ${summary.bestMs} ms.`);
    lines.push(
      summary.misses === 0
        ? "No misses."
        : summary.misses === 1
          ? "1 miss."
          : `${summary.misses} misses.`,
    );
    lines.push(
      summary.feints === 0
        ? "You didn't bite on a feint."
        : summary.feints === 1
          ? "You fell for 1 feint."
          : `You fell for ${summary.feints} feints.`,
    );
  }

  if (summary.stoppedEarly) lines.push("You stopped it.");
  return lines;
}

export function SummaryScreen({
  summary,
  onAgain,
  onSetup,
}: {
  summary: Summary;
  onAgain: () => void;
  onSetup: () => void;
}) {
  const lines = linesFor(summary);

  return (
    <div className="min-h-dvh overflow-y-auto bg-white text-black" data-screen="summary">
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-5 py-10">
        <div>
          <h1 className="text-5xl font-semibold tracking-tight">
            {summary.stoppedEarly ? "Stopped" : "Done"}
          </h1>
          <ul className="mt-6 flex flex-col gap-2 text-xl">
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3">
          <Button type="button" className="h-14 text-lg font-semibold" onClick={onAgain}>
            Again
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-14 text-lg"
            onClick={onSetup}
          >
            Back to setup
          </Button>
        </div>
      </main>
    </div>
  );
}
