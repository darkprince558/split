"use client";

import { useCallback, useState } from "react";
import { PlayScreen } from "@/components/play-screen";
import { SetupScreen } from "@/components/setup-screen";
import { SummaryScreen } from "@/components/summary-screen";
import { primeAudio } from "@/lib/audio";
import { createDefaultSettings, type Settings, type Summary } from "@/lib/drill";

type Screen = "setup" | "play" | "summary";

export default function Home() {
  const [settings, setSettings] = useState<Settings>(createDefaultSettings);
  const [screen, setScreen] = useState<Screen>("setup");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [runId, setRunId] = useState(0);

  const start = useCallback(() => {
    primeAudio();
    setRunId((id) => id + 1);
    setScreen("play");
  }, []);

  const finish = useCallback((next: Summary) => {
    setSummary(next);
    setScreen("summary");
  }, []);

  if (screen === "play") {
    return <PlayScreen key={runId} settings={settings} onFinish={finish} />;
  }

  if (screen === "summary" && summary) {
    return <SummaryScreen summary={summary} onAgain={start} onSetup={() => setScreen("setup")} />;
  }

  return <SetupScreen settings={settings} onChange={setSettings} onStart={start} />;
}
