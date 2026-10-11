"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playTick } from "@/lib/audio";
import {
  burstChanceFor,
  directionFromKey,
  planCue,
  planGap,
  progressLabel,
  resolvedReps,
  resolvedTimerSeconds,
  scoreLiveAnswer,
  scoreTimeout,
  summarize,
  type Direction,
  type Settings,
  type Summary,
} from "@/lib/drill";

export type DrillPhase = "gap" | "fake" | "live";

export type DrillView = {
  phase: DrillPhase;
  paused: boolean;
  shown: Direction | null;
  progress: string;
  cueId: number;
};

const EMPTY_VIEW: DrillView = {
  phase: "gap",
  paused: false,
  shown: null,
  progress: "",
  cueId: 0,
};

export function useDrillSession(
  settings: Settings,
  onFinish: (summary: Summary) => void,
) {
  const settingsRef = useRef(settings);
  const onFinishRef = useRef(onFinish);
  const [view, setView] = useState<DrillView>(EMPTY_VIEW);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const apiRef = useRef<{
    answer: (direction: Direction) => void;
    togglePause: () => void;
    stop: () => void;
  }>({
    answer: () => {},
    togglePause: () => {},
    stop: () => {},
  });

  useEffect(() => {
    const snapshot = settingsRef.current;
    let timer: number | null = null;
    let clock: number | null = null;
    let finished = false;
    let onEnd = () => {};

    const engine = {
      phase: "gap" as DrillPhase,
      paused: false,
      shown: null as Direction | null,
      real: null as Direction | null,
      fake: null as Direction | null,
      fellDuringFake: false,
      cueStartedAt: 0,
      reps: 0,
      hits: [] as number[],
      misses: 0,
      feints: 0,
      burstLeft: 0,
      cueId: 0,
      remaining: 0,
      phaseEndsAt: 0,
      sessionStart: performance.now(),
      pausedTotal: 0,
      pauseStarted: 0,
    };

    const clearTimer = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    };

    const elapsedSeconds = () => {
      const now = engine.paused ? engine.pauseStarted : performance.now();
      return Math.max(0, (now - engine.sessionStart - engine.pausedTotal) / 1000);
    };

    const publish = () => {
      const timerSeconds = resolvedTimerSeconds(snapshot);
      setView({
        phase: engine.phase,
        paused: engine.paused,
        shown: engine.paused ? null : engine.shown,
        cueId: engine.cueId,
        progress: progressLabel({
          mode: snapshot.mode,
          reps: engine.reps,
          repTarget: resolvedReps(snapshot),
          elapsedSeconds: elapsedSeconds(),
          timerSeconds,
        }),
      });
    };

    const finish = (stoppedEarly: boolean) => {
      if (finished) return;
      finished = true;
      clearTimer();
      if (clock !== null) window.clearInterval(clock);
      onFinishRef.current(
        summarize({
          hits: engine.hits,
          misses: engine.misses,
          feints: engine.feints,
          reps: engine.reps,
          respond: snapshot.respond,
          stoppedEarly,
        }),
      );
    };

    const timerExpired = () =>
      snapshot.mode === "timer" &&
      elapsedSeconds() >= resolvedTimerSeconds(snapshot);

    const schedule = (ms: number, fn: () => void) => {
      clearTimer();
      onEnd = fn;
      const delay = Math.max(0, ms);
      engine.remaining = delay;
      engine.phaseEndsAt = performance.now() + delay;
      timer = window.setTimeout(() => {
        timer = null;
        if (finished || engine.paused) return;
        fn();
      }, delay);
    };

    const showReal = () => {
      engine.phase = "live";
      engine.shown = engine.real;
      engine.cueStartedAt = performance.now();
      engine.cueId += 1;
      publish();
      if (snapshot.sound) playTick();
      schedule(snapshot.holdMs, () => {
        const scored = scoreTimeout(engine.fellDuringFake, snapshot.respond);
        if (scored.miss) engine.misses += 1;
        if (scored.feint) engine.feints += 1;
        engine.reps += 1;
        beginGap();
      });
    };

    const beginCue = () => {
      if (finished) return;
      if (timerExpired()) {
        finish(false);
        return;
      }
      const cue = planCue(snapshot.directions, snapshot.fakeoutChance, Math.random);
      engine.real = cue.real;
      engine.fake = cue.fake;
      engine.fellDuringFake = false;
      if (cue.fake) {
        engine.phase = "fake";
        engine.shown = cue.fake;
        engine.cueId += 1;
        publish();
        schedule(snapshot.fakeoutMs, showReal);
        return;
      }
      showReal();
    };

    const beginGap = () => {
      if (finished) return;
      if (snapshot.mode === "reps" && engine.reps >= resolvedReps(snapshot)) {
        finish(false);
        return;
      }
      if (timerExpired()) {
        finish(false);
        return;
      }
      const planned = planGap({
        gapMin: snapshot.gapMin,
        gapMax: snapshot.gapMax,
        burstChance: burstChanceFor(snapshot),
        burstLeft: engine.burstLeft,
        rng: Math.random,
      });
      engine.burstLeft = planned.burstLeft;
      engine.phase = "gap";
      engine.shown = null;
      publish();
      schedule(planned.gapMs, beginCue);
    };

    const answer = (direction: Direction) => {
      if (!snapshot.respond || finished || engine.paused) return;
      if (engine.phase === "fake") {
        engine.fellDuringFake = true;
        return;
      }
      if (engine.phase !== "live" || !engine.real) return;
      clearTimer();
      const scored = scoreLiveAnswer({
        pressed: direction,
        real: engine.real,
        fake: engine.fake,
        fellDuringFake: engine.fellDuringFake,
        rt: performance.now() - engine.cueStartedAt,
      });
      if (scored.hit !== null) engine.hits.push(scored.hit);
      if (scored.miss) engine.misses += 1;
      if (scored.feint) engine.feints += 1;
      engine.reps += 1;
      beginGap();
    };

    const togglePause = () => {
      if (finished) return;
      if (!engine.paused) {
        engine.paused = true;
        engine.pauseStarted = performance.now();
        engine.remaining = Math.max(0, engine.phaseEndsAt - engine.pauseStarted);
        clearTimer();
        publish();
        return;
      }
      const pausedFor = performance.now() - engine.pauseStarted;
      engine.pausedTotal += pausedFor;
      engine.paused = false;
      if (engine.phase === "live") engine.cueStartedAt += pausedFor;
      publish();
      schedule(engine.remaining, onEnd);
    };

    const stop = () => finish(true);

    apiRef.current = { answer, togglePause, stop };

    const onKey = (event: KeyboardEvent) => {
      if (
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown"
      ) {
        event.preventDefault();
      }
      if (event.repeat) return;
      const direction = directionFromKey(event.key);
      if (!direction) return;
      answer(direction);
    };

    window.addEventListener("keydown", onKey);
    beginGap();
    clock = window.setInterval(() => {
      if (finished || engine.paused) return;
      if (timerExpired()) {
        finish(false);
        return;
      }
      publish();
    }, 200);

    return () => {
      finished = true;
      clearTimer();
      if (clock !== null) window.clearInterval(clock);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const answer = useCallback((direction: Direction) => {
    apiRef.current.answer(direction);
  }, []);
  const togglePause = useCallback(() => {
    apiRef.current.togglePause();
  }, []);
  const stop = useCallback(() => {
    apiRef.current.stop();
  }, []);

  return { view, answer, togglePause, stop };
}
