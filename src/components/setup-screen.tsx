"use client";

import { ChevronDown } from "lucide-react";
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
  { id: "unlimited", label: "Unlimited", hint: "Keeps going until you hit Stop." },
  { id: "timer", label: "Timer", hint: "Ends when the clock runs out." },
  { id: "reps", label: "Reps", hint: "Ends after the last cue." },
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

const DIRECTION_TOGGLES: Direction[] = [
  "left",
  "right",
  "back",
  "forward",
  "back-left",
  "back-right",
  "forward-left",
  "forward-right",
];

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
        "h-11 text-base",
        pressed && "border-[#FF3B00] text-[#FF3B00]",
        className,
      )}
    >
      {children}
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
    <div className="min-h-dvh overflow-y-auto bg-white text-black" data-screen="setup">
      <main className="mx-auto flex w-full max-w-md flex-col gap-8 px-5 pt-10 pb-10">
        <header>
          <h1 className="text-5xl font-semibold tracking-tight">Split</h1>
          <p className="mt-2 text-lg text-neutral-700">
            Read the shuttle. Split on the cue.
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <Label id="difficulty-label" className="text-base">
              Difficulty
            </Label>
            <span className="text-base tabular-nums">{settings.difficulty}</span>
          </div>
          <Slider
            min={1}
            max={10}
            step={1}
            value={[settings.difficulty]}
            aria-labelledby="difficulty-label"
            onValueChange={(value) => {
              const next = Array.isArray(value) ? value[0] : value;
              if (typeof next === "number") onChange(applyDifficulty(settings, next));
            }}
          />
          <div className="flex justify-between text-sm text-neutral-500">
            <span>1</span>
            <span>10</span>
          </div>
          <p className="text-base">{describeDifficulty(settings.difficulty)}</p>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((item) => (
              <ChoiceButton
                key={item.id}
                pressed={preset === item.id}
                onClick={() => onChange(applyDifficulty(settings, item.level))}
              >
                {item.label}
              </ChoiceButton>
            ))}
          </div>
          {preset === "custom" ? (
            <p className="text-sm text-[#FF3B00]">Custom</p>
          ) : null}
        </section>

        <section className="flex flex-col gap-3">
          <Label className="text-base">Mode</Label>
          <div className="grid grid-cols-3 gap-2">
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
                  onClick={() => onChange({ ...settings, timerChoice: item.id })}
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
                  onClick={() => onChange({ ...settings, repsChoice: item.id })}
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

        <section className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 px-4 py-3">
          <span>
            <span className="block text-lg font-medium">Record reactions</span>
            <span className="block text-sm text-neutral-600">
              The laptop camera films each cue, including the feints. Nothing is uploaded.
            </span>
          </span>
          <Switch
            checked={settings.record}
            onCheckedChange={(checked) => onChange({ ...settings, record: checked })}
            aria-label="Record reactions"
          />
        </section>

        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between py-1 text-left text-base">
            Settings
            <ChevronDown
              className={cn("size-4", settingsOpen && "rotate-180")}
              aria-hidden
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="flex flex-col gap-5 pt-4">
            <p className="text-sm text-neutral-600">
              Moving the difficulty slider overwrites gap, hold, and fakeout.
            </p>
            <div className="flex flex-col gap-5">
              <RangeField
                id="gap-min"
                label="Min gap (ms)"
                min={RANGES.gapMin.min}
                max={RANGES.gapMin.max}
                value={settings.gapMin}
                invalid={block?.code === "gap"}
                onChange={(gapMin) => onChange({ ...settings, gapMin })}
              />
              <RangeField
                id="gap-max"
                label="Max gap (ms)"
                min={RANGES.gapMax.min}
                max={RANGES.gapMax.max}
                value={settings.gapMax}
                invalid={block?.code === "gap"}
                onChange={(gapMax) => onChange({ ...settings, gapMax })}
              />
              <RangeField
                id="hold"
                label="Real arrow stays (ms)"
                min={RANGES.holdMs.min}
                max={RANGES.holdMs.max}
                value={settings.holdMs}
                invalid={block?.code === "hold"}
                onChange={(holdMs) => onChange({ ...settings, holdMs })}
              />
              <RangeField
                id="fake-chance"
                label="Fakeout chance (%)"
                min={RANGES.fakeoutChance.min}
                max={RANGES.fakeoutChance.max}
                value={settings.fakeoutChance}
                invalid={block?.code === "fakeout"}
                onChange={(fakeoutChance) => onChange({ ...settings, fakeoutChance })}
              />
              <RangeField
                id="fake-ms"
                label="Fakeout flash (ms)"
                min={RANGES.fakeoutMs.min}
                max={RANGES.fakeoutMs.max}
                value={settings.fakeoutMs}
                invalid={block?.code === "fakeout-ms"}
                onChange={(fakeoutMs) => onChange({ ...settings, fakeoutMs })}
              />
              <RangeField
                id="feints"
                label="Feints"
                min={RANGES.feintCount.min}
                max={RANGES.feintCount.max}
                value={settings.feintCount}
                onChange={(feintCount) => onChange({ ...settings, feintCount })}
              />
            </div>
            <p className="text-sm text-neutral-600">
              0 is no feint. 3 shows one, two, or three fake arrows. The real arrow is the one
              that counts.
            </p>
            <SwatchRow
              label="Arrow"
              value={settings.arrowColor}
              onChange={(arrowColor) => onChange({ ...settings, arrowColor })}
            />
            <SwatchRow
              label="Background"
              value={settings.backgroundColor}
              onChange={(backgroundColor) => onChange({ ...settings, backgroundColor })}
            />
            <div className="flex flex-col gap-2">
              <Label>Directions</Label>
              <div className="grid grid-cols-2 gap-2">
                {DIRECTION_TOGGLES.map((direction) => (
                  <ChoiceButton
                    key={direction}
                    pressed={settings.directions.includes(direction)}
                    onClick={() => toggleDirection(direction)}
                    className="h-auto min-h-11 whitespace-normal px-2 text-center leading-tight"
                  >
                    {directionLabel(direction)}
                  </ChoiceButton>
                ))}
              </div>
            </div>
            <label className="flex items-center justify-between gap-4 py-1">
              <span>
                <span className="block text-base">Sound</span>
                <span className="block text-sm text-neutral-600">
                  Tick when the real arrow locks in.
                </span>
              </span>
              <Switch
                checked={settings.sound}
                onCheckedChange={(checked) => onChange({ ...settings, sound: checked })}
                aria-label="Sound"
              />
            </label>
            <label className="flex items-center justify-between gap-4 py-1">
              <span>
                <span className="block text-base">Respond with keys or taps</span>
                <span className="block text-sm text-neutral-600">
                  Off for court work. Turn it on to answer with keys or taps. A wrong key is a
                  miss.
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

        <div className="flex flex-col gap-3">
          <p className="min-h-5 text-sm" role="status">
            {block?.message}
          </p>
          <Button
            type="button"
            className="h-14 text-lg font-semibold"
            disabled={block !== null}
            onClick={onStart}
          >
            Start
          </Button>
          {canReview ? (
            <Button type="button" variant="outline" className="h-14 text-lg" onClick={onReview}>
              Review recordings
            </Button>
          ) : null}
          <p className="text-sm text-neutral-500">
            {settings.mode === "reps"
              ? `${resolvedReps(settings)} cues`
              : settings.mode === "timer"
                ? `${resolvedTimerSeconds(settings)} seconds`
                : "No set length"}
            {settings.respond ? ". Answers count." : ". Cues run on their own."}
          </p>
        </div>
      </main>
    </div>
  );
}
