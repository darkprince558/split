"use client";

import { useCallback, useState } from "react";
import { PlayScreen, type FinishedRun } from "@/components/play-screen";
import { ReviewScreen } from "@/components/review-screen";
import { SetupScreen } from "@/components/setup-screen";
import { SummaryScreen } from "@/components/summary-screen";
import { primeAudio } from "@/lib/audio";
import { type Summary } from "@/lib/drill";
import { useSettings } from "@/hooks/use-settings";

type Screen = "setup" | "play" | "summary" | "review";

export default function Home() {
  const [settings, changeSettings] = useSettings();
  const [runSettings, setRunSettings] = useState(settings);
  const [screen, setScreen] = useState<Screen>("setup");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [runId, setRunId] = useState(0);
  const [reviewFrom, setReviewFrom] = useState<"setup" | "summary">("setup");
  const [reviewSession, setReviewSession] = useState<string | null>(null);
  const [clipCount, setClipCount] = useState(0);
  const [runNote, setRunNote] = useState<string | null>(null);

  const start = useCallback(() => {
    primeAudio();
    setRunSettings(settings);
    setRunId((id) => id + 1);
    setScreen("play");
  }, [settings]);

  const finish = useCallback((run: FinishedRun) => {
    setSummary(run.summary);
    setClipCount(run.clipCount);
    setReviewSession(run.sessionId);
    setRunNote(run.note);
    setScreen("summary");
  }, []);

  if (screen === "play") {
    return (
      <PlayScreen
        key={runId}
        settings={runSettings}
        onFinish={finish}
        onCancel={() => setScreen("setup")}
      />
    );
  }

  if (screen === "review") {
    return (
      <ReviewScreen
        sessionId={reviewSession}
        onBack={() =>
          setScreen(reviewFrom === "summary" && summary ? "summary" : "setup")
        }
      />
    );
  }

  if (screen === "summary" && summary) {
    return (
      <SummaryScreen
        summary={summary}
        note={runNote}
        clipCount={clipCount}
        onReview={() => {
          setReviewFrom("summary");
          setScreen("review");
        }}
        onAgain={start}
        onSetup={() => setScreen("setup")}
      />
    );
  }

  return (
    <SetupScreen
      settings={settings}
      onChange={changeSettings}
      onStart={start}
      onReview={() => {
        setReviewSession(null);
        setReviewFrom("setup");
        setScreen("review");
      }}
    />
  );
}
