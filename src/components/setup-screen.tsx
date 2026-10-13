"use client";

import {
  ArrowDown,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleDot,
  Play,
  Video,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  DIRECTIONS,
  PRESETS,
  RANGES,
  SWATCHES,
  activePreset,
  applyDifficulty,
  describeDifficulty,
  directionLabel,
  resolvedReps,
  resolvedTimerSeconds,
  startBlockReason,
  type Direction,
  type Mode,
  type RepsChoice,
  type Settings,
  type SwatchId,
  type TimerChoice,
} from "@/lib/drill";
import { hasAnyClips } from "@/lib/video-storage";

const MODES: { id: Mode; label: string; hint: string }[] = [
  {
    id: "reps",
    label: "Cues",
    hint: "Choose how many directions to practise.",
  },
  { id: "timer", label: "Timed", hint: "Choose how long to practise." },
  {
    id: "unlimited",
    label: "Open",
    hint: "Keep going until you end the drill.",
  },
];

const TIMER_CHOICES: { id: TimerChoice; label: string }[] = [
  { id: 30, label: "30s" },
  { id: 60, label: "1 min" },
  { id: 120, label: "2 min" },
  { id: 300, label: "5 min" },
  { id: "custom", label: "Custom" },
];

const REPS_CHOICES: { id: RepsChoice; label: string }[] = [
  { id: 20, label: "20" },
  { id: 50, label: "50" },
  { id: 100, label: "100" },
  { id: 200, label: "200" },
  { id: "custom", label: "Custom" },
];

const DIRECTION_GRID = [
  { direction: "back-left", icon: ArrowUpLeft },
  { direction: "back", icon: ArrowUp },
  { direction: "back-right", icon: ArrowUpRight },
  { direction: "left", icon: ArrowLeft },
  { direction: null, icon: CircleDot },
  { direction: "right", icon: ArrowRight },
  { direction: "forward-left", icon: ArrowDownLeft },
  { direction: "forward", icon: ArrowDown },
  { direction: "forward-right", icon: ArrowDownRight },
] as const;

function ChoiceButton({
  pressed,
  children,
  onClick,
  className,
  label,
}: {
  pressed: boolean;
  children: ReactNode;
  onClick: () => void;
  className?: string;
  label?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      aria-pressed={pressed}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "press-feedback relative h-auto min-h-11 rounded-xl border-neutral-300 px-2 py-2 text-center text-sm leading-tight font-medium whitespace-normal",
        pressed &&
          "border-primary bg-primary/8 font-semibold text-primary ring-1 ring-primary",
        className,
      )}
    >
      {children}
      {pressed ? (
        <span
          className="pointer-events-none absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-sm"
          aria-hidden
        >
          <Check className="size-3" strokeWidth={3} />
        </span>
      ) : null}
    </Button>
  );
}

function RangeField({
  id,
  label,
  min,
  max,
  value,
  invalid,
  onChange,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  value: number;
  invalid?: boolean;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);

  const commit = (raw: string, blur: boolean) => {
    const parsed = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(parsed)) {
      if (blur) {
        onChange(min);
        setText(String(min));
      }
      return;
    }
    const next = Math.trunc(parsed);
    if (next > max) {
      onChange(max);
      setText(String(max));
      return;
    }
    if (next < min) {
      if (blur) {
        onChange(min);
        setText(String(min));
      }
      return;
    }
    onChange(next);
    if (blur) setText(String(next));
  };

  return (
    <div className="flex flex-col gap-2" data-range={id}>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-3">
        <Slider
          className="min-w-0 flex-1"
          min={min}
          max={max}
          step={1}
          value={[Math.min(max, Math.max(min, value))]}
          onValueChange={(next) => {
            const picked = Array.isArray(next) ? next[0] : next;
            if (typeof picked === "number") onChange(picked);
          }}
          aria-label={label}
        />
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={text}
          aria-invalid={invalid}
          className="h-11 w-24 text-base md:text-base"
          onFocus={() => {
            focused.current = true;
          }}
          onBlur={() => {
            focused.current = false;
            commit(text, true);
          }}
          onChange={(event) => {
            setText(event.target.value);
            commit(event.target.value, false);
          }}
        />
      </div>
    </div>
  );
}

function SwatchRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: SwatchId;
  onChange: (value: SwatchId) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-base">{label}</Label>
      <div className="grid grid-cols-3 gap-2">
        {SWATCHES.map((swatch) => (
          <ChoiceButton
            key={swatch.id}
            pressed={value === swatch.id}
            label={`${label} ${swatch.label}`}
            onClick={() => onChange(swatch.id)}
            className="h-14 flex-col gap-1 text-xs"
          >
            <span
              className="size-5 rounded-sm border border-black/20"
              style={{ backgroundColor: swatch.hex }}
            />
            {swatch.label}
          </ChoiceButton>
        ))}
      </div>
    </div>
  );
}

function wholeNumber(raw: string) {
  if (raw.trim() === "") return 0;
  const value = Number(raw);
  if (!Number.isFinite(value)) return 0;
  return Math.trunc(value);
}

export function SetupScreen({
  settings,
  onChange,
  onStart,
  onReview,
}: {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onStart: () => void;
  onReview: () => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const block = startBlockReason(settings);
  const preset = activePreset(settings);
  const mode = MODES.find((item) => item.id === settings.mode) ?? MODES[2];

  useEffect(() => {
    let live = true;
    hasAnyClips()
      .then((yes) => {
        if (live) setCanReview(yes);
      })
      .catch(() => {
        if (live) setCanReview(false);
      });
    return () => {
      live = false;
    };
  }, []);

  const toggleDirection = (direction: Direction) => {
    const selected = settings.directions.includes(direction)
      ? settings.directions.filter((item) => item !== direction)
      : [...settings.directions, direction];
    onChange({
      ...settings,
      directions: DIRECTIONS.filter((item) => selected.includes(item)),
    });
  };

  return (
    <div
      className="min-h-dvh overflow-y-auto bg-[#f5f5f7] text-[#1d1d1f]"
      data-screen="setup"
    >
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 pt-7 pb-[calc(10rem+env(safe-area-inset-bottom))]">
        <header>
          <h1 className="text-4xl font-semibold tracking-tight">Split</h1>
          <p className="mt-2 text-base leading-relaxed text-neutral-600">
            Place your laptop facing the court. Follow the arrow that stays;
            ignore the brief feints.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <section
            className="setup-panel flex flex-col gap-3"
            aria-labelledby="difficulty-label"
          >
            <div className="flex items-baseline justify-between gap-3">
              <Label id="difficulty-label" className="text-base">
                Difficulty
              </Label>
              <span className="rounded-lg bg-neutral-100 px-2 py-1 text-sm tabular-nums">
                {settings.difficulty} / 10
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((item) => (
                <ChoiceButton
                  key={item.id}
                  pressed={preset === item.id}
                  onClick={() =>
                    onChange(applyDifficulty(settings, item.level))
                  }
                >
                  {item.label}
                </ChoiceButton>
              ))}
            </div>
            <Slider
              min={1}
              max={10}
              step={1}
              value={[settings.difficulty]}
              aria-labelledby="difficulty-label"
              onValueChange={(value) => {
                const next = Array.isArray(value) ? value[0] : value;
                if (typeof next === "number")
                  onChange(applyDifficulty(settings, next));
              }}
            />
            <div className="flex justify-between text-sm text-neutral-500">
              <span>Slower</span>
              <span>Faster</span>
            </div>
            <p className="text-sm text-neutral-600">
              {describeDifficulty(settings.difficulty)}
            </p>
            {preset === "custom" ? (
              <p className="text-sm text-primary">Custom timing</p>
            ) : null}
          </section>

          <section
            className="setup-panel flex flex-col gap-3"
            aria-labelledby="session-label"
          >
            <Label id="session-label" className="text-base">
              Session length
            </Label>
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-neutral-100 p-1">
              {MODES.map((item) => (
                <ChoiceButton
                  key={item.id}
                  pressed={settings.mode === item.id}
                  onClick={() => onChange({ ...settings, mode: item.id })}
                >
                  {item.label}
                </ChoiceButton>
              ))}
            </div>
            {settings.mode === "timer" ? (
              <div className="grid grid-cols-3 gap-2">
                {TIMER_CHOICES.map((item) => (
                  <ChoiceButton
                    key={String(item.id)}
                    pressed={settings.timerChoice === item.id}
                    onClick={() =>
                      onChange({ ...settings, timerChoice: item.id })
                    }
                  >
                    {item.label}
                  </ChoiceButton>
                ))}
              </div>
            ) : null}
            {settings.mode === "reps" ? (
              <div className="grid grid-cols-3 gap-2">
                {REPS_CHOICES.map((item) => (
                  <ChoiceButton
                    key={String(item.id)}
                    pressed={settings.repsChoice === item.id}
                    onClick={() =>
                      onChange({ ...settings, repsChoice: item.id })
                    }
                  >
                    {item.label}
                  </ChoiceButton>
                ))}
              </div>
            ) : null}
            {settings.mode === "timer" && settings.timerChoice === "custom" ? (
              <div className="flex items-center gap-3">
                <Label htmlFor="custom-time" className="text-base">
                  Seconds
                </Label>
                <Input
                  id="custom-time"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={settings.timerCustomSeconds}
                  aria-invalid={block?.code === "timer"}
                  className="h-11 w-28 text-base md:text-base"
                  onChange={(event) =>
                    onChange({
                      ...settings,
                      timerCustomSeconds: wholeNumber(event.target.value),
                    })
                  }
                />
              </div>
            ) : null}
            {settings.mode === "reps" && settings.repsChoice === "custom" ? (
              <div className="flex items-center gap-3">
                <Label htmlFor="custom-reps" className="text-base">
                  Cues
                </Label>
                <Input
                  id="custom-reps"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={settings.repsCustom}
                  aria-invalid={block?.code === "reps"}
                  className="h-11 w-28 text-base md:text-base"
                  onChange={(event) =>
                    onChange({
                      ...settings,
                      repsCustom: wholeNumber(event.target.value),
                    })
                  }
                />
              </div>
            ) : null}
            <p className="text-sm text-neutral-600">{mode.hint}</p>
          </section>
        </div>
        <section className="setup-panel flex items-center justify-between gap-4">
          <span>
            <span className="flex items-center gap-2 text-base font-semibold">
              <Video className="size-4" aria-hidden />
              Record reactions
            </span>
            <span className="block text-sm text-neutral-600">
              One clip per cue, saved only in this browser. Allow camera access
              when you start.
            </span>
          </span>
          <Switch
            checked={settings.record}
            onCheckedChange={(checked) =>
              onChange({ ...settings, record: checked })
            }
            aria-label="Record reactions"
          />
        </section>

        <Collapsible
          className="setup-panel"
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        >
          <CollapsibleTrigger className="flex min-h-11 w-full items-center justify-between text-left text-base font-semibold">
            Customize drill
            <ChevronDown
              className={cn("size-4", settingsOpen && "rotate-180")}
              aria-hidden
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="flex flex-col gap-4 pt-3">
            <details className="settings-group">
              <summary>
                Timing &amp; feints<span>Fine-tune the pace</span>
              </summary>
              <p className="mt-3 text-sm text-neutral-600">
                1,000 ms = 1 second. Choosing a difficulty resets these timing
                values.
              </p>
              <div className="mt-4 flex flex-col gap-5">
                <RangeField
                  id="gap-min"
                  label="Shortest wait between cues (ms)"
                  min={RANGES.gapMin.min}
                  max={RANGES.gapMin.max}
                  value={settings.gapMin}
                  invalid={block?.code === "gap"}
                  onChange={(gapMin) => onChange({ ...settings, gapMin })}
                />
                <RangeField
                  id="gap-max"
                  label="Longest wait between cues (ms)"
                  min={RANGES.gapMax.min}
                  max={RANGES.gapMax.max}
                  value={settings.gapMax}
                  invalid={block?.code === "gap"}
                  onChange={(gapMax) => onChange({ ...settings, gapMax })}
                />
                <RangeField
                  id="hold"
                  label="Arrow hold time (ms)"
                  min={RANGES.holdMs.min}
                  max={RANGES.holdMs.max}
                  value={settings.holdMs}
                  invalid={block?.code === "hold"}
                  onChange={(holdMs) => onChange({ ...settings, holdMs })}
                />
                <RangeField
                  id="fake-chance"
                  label="Chance of feints (%)"
                  min={RANGES.fakeoutChance.min}
                  max={RANGES.fakeoutChance.max}
                  value={settings.fakeoutChance}
                  invalid={block?.code === "fakeout"}
                  onChange={(fakeoutChance) =>
                    onChange({ ...settings, fakeoutChance })
                  }
                />
                <RangeField
                  id="fake-ms"
                  label="Feint flash time (ms)"
                  min={RANGES.fakeoutMs.min}
                  max={RANGES.fakeoutMs.max}
                  value={settings.fakeoutMs}
                  invalid={block?.code === "fakeout-ms"}
                  onChange={(fakeoutMs) => onChange({ ...settings, fakeoutMs })}
                />
                <RangeField
                  id="feints"
                  label="Maximum feints per cue"
                  min={RANGES.feintCount.min}
                  max={RANGES.feintCount.max}
                  value={settings.feintCount}
                  onChange={(feintCount) =>
                    onChange({ ...settings, feintCount })
                  }
                />
              </div>
              <p className="mt-4 text-sm text-neutral-600">
                0 is no feint. 3 shows one, two, or three fake arrows. The real
                arrow is the one that counts.
              </p>
            </details>
            <details className="settings-group">
              <summary>
                Arrow &amp; background<span>Make the cue easy to see</span>
              </summary>
              <div className="mt-4 space-y-4">
                <SwatchRow
                  label="Arrow"
                  value={settings.arrowColor}
                  onChange={(arrowColor) =>
                    onChange({ ...settings, arrowColor })
                  }
                />
                <SwatchRow
                  label="Background"
                  value={settings.backgroundColor}
                  onChange={(backgroundColor) =>
                    onChange({ ...settings, backgroundColor })
                  }
                />
              </div>
            </details>
            <details className="settings-group">
              <summary>
                Directions
                <span>{settings.directions.length} of 8 selected</span>
              </summary>
              <div className="mt-4 flex flex-col gap-2">
                <p className="text-sm text-neutral-600">
                  Tap a direction to include it. The layout matches the arrows
                  in your drill.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="press-feedback min-h-11 rounded-xl text-sm"
                    onClick={() =>
                      onChange({ ...settings, directions: [...DIRECTIONS] })
                    }
                  >
                    All 8 directions
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="press-feedback min-h-11 rounded-xl text-sm"
                    onClick={() =>
                      onChange({ ...settings, directions: ["left", "right"] })
                    }
                  >
                    Left &amp; right only
                  </Button>
                </div>
                <div
                  className="grid grid-cols-3 gap-2"
                  role="group"
                  aria-label="Court directions"
                >
                  {DIRECTION_GRID.map(({ direction, icon: Icon }) =>
                    direction ? (
                      <ChoiceButton
                        key={direction}
                        label={directionLabel(direction)}
                        pressed={settings.directions.includes(direction)}
                        onClick={() => toggleDirection(direction)}
                        className="min-h-20 flex-col gap-1"
                      >
                        <Icon className="size-5" aria-hidden />
                        {directionLabel(direction)}
                      </ChoiceButton>
                    ) : (
                      <div
                        key="centre"
                        className="flex flex-col items-center justify-center gap-1 rounded-xl bg-neutral-100 text-sm text-neutral-600"
                      >
                        <Icon className="size-5" aria-hidden />
                        Centre
                      </div>
                    ),
                  )}
                </div>
              </div>
            </details>
            <label className="flex min-h-11 items-center justify-between gap-4 py-1">
              <span>
                <span className="block text-base">Sound</span>
                <span className="block text-sm text-neutral-600">
                  Tick when the real arrow locks in.
                </span>
              </span>
              <Switch
                checked={settings.sound}
                onCheckedChange={(checked) =>
                  onChange({ ...settings, sound: checked })
                }
                aria-label="Sound"
              />
            </label>
            <label className="flex min-h-11 items-center justify-between gap-4 py-1">
              <span>
                <span className="block text-base">
                  Respond with keys or taps
                </span>
                <span className="block text-sm text-neutral-600">
                  Leave off when moving on court. Turn on for a seated reaction
                  test using keys or the on-screen direction buttons.
                </span>
              </span>
              <Switch
                checked={settings.respond}
                onCheckedChange={(checked) =>
                  onChange({ ...settings, respond: checked })
                }
                aria-label="Respond with keys or taps"
              />
            </label>
          </CollapsibleContent>
        </Collapsible>

        {canReview ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-12 rounded-xl text-base"
            onClick={onReview}
          >
            Review saved recordings
          </Button>
        ) : null}
        <p className="text-center text-xs text-neutral-600">
          Your choices are remembered on this device.
        </p>
        <footer className="setup-toolbar fixed inset-x-0 bottom-0 z-20 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
            {block ? (
              <p
                id="start-error"
                className="text-sm font-medium text-red-700"
                role="status"
              >
                {block.message}
              </p>
            ) : null}
            <div className="flex items-center justify-between gap-3 text-sm text-neutral-600">
              <span>
                {settings.mode === "reps"
                  ? `${resolvedReps(settings)} cues`
                  : settings.mode === "timer"
                    ? `${resolvedTimerSeconds(settings)} seconds`
                    : "Open-ended"}{" "}
                · {settings.directions.length} directions
              </span>
              <span>{settings.record ? "Recording on" : "Recording off"}</span>
            </div>
            <Button
              type="button"
              className="press-feedback h-14 w-full gap-2 rounded-2xl text-lg font-semibold"
              disabled={block !== null}
              aria-describedby={block ? "start-error" : undefined}
              onClick={onStart}
            >
              <Play className="size-5" aria-hidden /> Start drill
            </Button>
            <p className="text-center text-xs text-neutral-600">
              5 seconds to get ready
              {settings.respond
                ? " · Keys and taps enabled"
                : " · No tapping needed"}
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
