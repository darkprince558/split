"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { clipFilename, clipsCsv, directionLabel, type Direction } from "@/lib/drill";
import { downloadBlob } from "@/lib/clips";
import { listClips, latestSessionId, type StoredClip } from "@/lib/video-storage";
import { createZip } from "@/lib/zip";

function feintLine(feints: Direction[]) {
  if (feints.length === 0) return "No feint";
  return `Feints: ${feints.map((direction) => directionLabel(direction)).join(", ")}`;
}

export function ReviewScreen({
  sessionId,
  onBack,
}: {
  sessionId: string | null;
  onBack: () => void;
}) {
  const [clips, setClips] = useState<StoredClip[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const clip = clips?.[index] ?? null;

  const bindVideo = useCallback((node: HTMLVideoElement | null) => {
    if (!node || !clip) return;
    const next = URL.createObjectURL(clip.blob);
    node.src = next;
    void node.play().catch(() => undefined);
    return () => URL.revokeObjectURL(next);
  }, [clip]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const id = sessionId ?? (await latestSessionId());
        const rows = id ? await listClips(id) : [];
        if (!live) return;
        setClips(rows);
        setIndex(0);
      } catch {
        if (live) setError("Couldn't open the saved clips.");
      }
    })();
    return () => {
      live = false;
    };
  }, [sessionId]);

  const downloadClip = () => {
    if (!clip) return;
    downloadBlob(clip.blob, clipFilename(clip.index, clip.direction, clip.feints));
  };

  const downloadSession = async () => {
    if (!clips || clips.length === 0) return;
    const files = await Promise.all(
      clips.map(async (item) => ({
        name: clipFilename(item.index, item.direction, item.feints),
        data: new Uint8Array(await item.blob.arrayBuffer()),
      })),
    );
    const csv = clipsCsv(
      clips.map((item) => ({
        filename: clipFilename(item.index, item.direction, item.feints),
        direction: item.direction,
        feints: item.feints,
      })),
    );
    files.push({ name: "clips.csv", data: new TextEncoder().encode(csv) });
    downloadBlob(createZip(files), "split-session.zip");
  };

  return (
    <div className="min-h-dvh overflow-y-auto bg-white text-black" data-screen="review">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-neutral-500">
            {clips && clips.length > 0 ? `${index + 1} of ${clips.length}` : "Clips"}
          </p>
          <Button type="button" variant="outline" className="h-11" onClick={onBack}>
            Back
          </Button>
        </div>

        {error ? <p className="text-base">{error}</p> : null}
        {clips === null && !error ? <p className="text-base">Opening clips…</p> : null}
        {clips && clips.length === 0 ? <p className="text-xl">No clips saved.</p> : null}

        {clip ? (
          <>
            <div>
              <h1
                className="text-5xl font-semibold tracking-tight sm:text-6xl"
                data-review-direction={directionLabel(clip.direction)}
              >
                {directionLabel(clip.direction)}
              </h1>
              <p className="mt-3 text-2xl" data-review-feints={feintLine(clip.feints)}>
                {feintLine(clip.feints)}
              </p>
            </div>
            <video
              key={clip.id}
              ref={bindVideo}
              className="max-h-[52vh] w-full bg-black"
              controls
              playsInline
              data-review-video="true"
            />
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-12 text-base"
                disabled={index === 0}
                onClick={() => setIndex((current) => Math.max(0, current - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 text-base"
                disabled={!clips || index >= clips.length - 1}
                onClick={() =>
                  setIndex((current) => Math.min((clips?.length ?? 1) - 1, current + 1))
                }
              >
                Next
              </Button>
              <Button type="button" className="h-12 text-base" onClick={downloadClip}>
                Download this clip
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 text-base"
                onClick={() => void downloadSession()}
              >
                Download session
              </Button>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
