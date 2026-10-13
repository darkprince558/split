"use client";

import { DirectionPresets } from "@/components/direction-presets";
import { ScreenHeading } from "@/components/screen-heading";
import Image from "next/image";

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
import { useEffect, useState, type ReactNode } from "react";
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
  feelMatches,
  timingSnapshot,
  colorsAreReadable,
  swatchHex,
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

function secondsLabel(ms: number) {
  return `${Number((ms / 1000).toFixed(2))} s`;
}

function RangeField({
  id, label, min, max, value, onChange, format = String, step = 1, disabled = false,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  step?: number;
  disabled?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-1", disabled && "opacity-50")} data-range={id}>
      <div className="flex items-baseline justify-between gap-3">
        <Label id={`${id}-label`}>{label}</Label>
        <output className="shrink-0 text-sm font-semibold text-primary tabular-nums">
          {format(value)}
        </output>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        value={[Math.min(max, Math.max(min, value))]}
        aria-labelledby={`${id}-label`}
        getAriaValueText={(_, next) => format(next)}
        onValueChange={(next) => {
          const picked = Array.isArray(next) ? next[0] : next;
          if (typeof picked === "number") onChange(picked);
        }}
      />
      <div className="flex justify-between text-xs text-neutral-600" aria-hidden>
        <span>{format(min)}</span><span>{format(max)}</span>
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
  const [previousTiming, setPreviousTiming] = useState<ReturnType<typeof timingSnapshot> | null>(null);
  const chooseDifficulty = (level: number) => {
    if (!feelMatches(settings)) setPreviousTiming(timingSnapshot(settings));
    onChange(applyDifficulty(settings, level));
  };
  const changeTiming = (next: Settings) => {
    setPreviousTiming(null);
    onChange(next);
  };
  const readable = colorsAreReadable(settings.arrowColor, settings.backgroundColor);
  const feintsOff = settings.feintCount === 0 || settings.directions.length < 2;
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
      className="screen-enter min-h-dvh overflow-y-auto bg-[#f5f5f7] text-[#1d1d1f]"
      data-screen="setup"
    >
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 pt-7 pb-[calc(10rem+env(safe-area-inset-bottom))]">
        <header>
          <ScreenHeading className="flex items-center gap-3 text-4xl font-semibold tracking-tight">
            <Image src="/icon.svg" width={44} height={44} alt="" aria-hidden className="size-11 shrink-0" />
            <span>Split</span>
          </ScreenHeading>
          <p className="mt-2 text-base leading-relaxed text-neutral-600">
            Place your laptop facing the court. Follow the arrow that stays;
            ignore the brief feints.
          </p>
        </header>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))] gap-4">
          <section
            className="setup-panel flex flex-col gap-3"
            aria-labelledby="difficulty-label"
          >
            <div className="flex items-baseline justify-between gap-3">
              <Label id="difficulty-label" tabIndex={-1} className="text-base">
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
                    chooseDifficulty(item.level)
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
                  chooseDifficulty(next);
              }}
            />
            <div className="flex justify-between text-sm text-neutral-500">
              <span>Slower</span>
              <span>Faster</span>
            </div>
            <p className="text-sm text-neutral-600">
              {describeDifficulty(settings.difficulty)}
            </p>
            {!feelMatches(settings) ? (
              <p className="text-sm text-primary">Custom timing · Choosing a difficulty replaces it.</p>
            ) : null}
            {previousTiming ? (
              <div className="flex flex-wrap items-center justify-between gap-1 text-sm" role="status">
                <span className="text-neutral-600">Timing updated.</span>
                <Button variant="ghost" className="min-h-11 text-primary" onClick={() => {
                  onChange({ ...settings, ...previousTiming });
                  setPreviousTiming(null);
                  document.getElementById("difficulty-label")?.focus({ preventScroll: true });
                }}>Undo timing change</Button>
              </div>
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
                <Button
                  key={item.id}
                  type="button"
                  variant="ghost"
                  aria-pressed={settings.mode === item.id}
                  className={cn("press-feedback min-h-11 rounded-lg", settings.mode === item.id && "bg-white shadow-sm hover:bg-white")}
                  onClick={() => onChange({ ...settings, mode: item.id })}
                >
                  {item.label}
                </Button>
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
            {settings.record ? <section className="space-y-3 border-t border-neutral-200 pt-3" aria-labelledby="clip-length-label">
              <Label id="clip-length-label" className="text-base">Clip length</Label>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-neutral-100 p-1">
                {(["standard", "longer"] as const).map((length) => <Button key={length} variant="ghost" aria-pressed={settings.clipLength === length}
                  className={cn("press-feedback min-h-11 rounded-lg", settings.clipLength === length && "bg-white shadow-sm hover:bg-white")}
                  onClick={() => onChange({ ...settings, clipLength: length })}>{length === "standard" ? "Standard" : "Longer"}</Button>)}
              </div>
              <p className="text-sm text-neutral-600">Clips save automatically. {settings.clipLength === "longer" ? "Keeps about 3 seconds after the real cue for more of your movement." : "Keeps about 1.2 seconds after the real cue."} Ending a drill stops recording immediately.</p>
            </section> : null}
            <details className="settings-group">
              <summary>
                Timing &amp; feints<span>Fine-tune the pace</span>
              </summary>
              <p className="mt-3 text-sm text-neutral-600">
                Drag to adjust. Choosing a difficulty resets these values.
              </p>
              <div className="mt-4 flex flex-col gap-5">
                <div className="flex flex-col gap-1" data-range="cue-spacing">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Label id="cue-spacing-label">Wait between cues</Label>
                    <output className="text-sm font-semibold text-primary tabular-nums">
                      {secondsLabel(settings.gapMin)} – {secondsLabel(settings.gapMax)}
                    </output>
                  </div>
                  <Slider
                    min={RANGES.gapMin.min}
                    max={RANGES.gapMax.max}
                    step={10}
                    value={[settings.gapMin, settings.gapMax]}
                    thumbCollisionBehavior="none"
                    thumbLabels={["Shortest wait between cues", "Longest wait between cues"]}
                    getAriaValueText={(_, next) => secondsLabel(next)}
                    onValueChange={(next) => {
                      if (!Array.isArray(next) || next.length !== 2) return;
                      changeTiming({ ...settings, gapMin: next[0], gapMax: next[1] });
                    }}
                  />
                  <p className="text-xs text-neutral-600">
                    Drag either end. Each cue waits a random time in this range.
                  </p>
                </div>
                <RangeField
                  id="hold"
                  step={10}
                  label="Arrow stays visible"
                  min={RANGES.holdMs.min}
                  max={RANGES.holdMs.max}
                  value={settings.holdMs}
                  format={secondsLabel}
                  onChange={(holdMs) => changeTiming({ ...settings, holdMs })}
                />
                <RangeField
                  id="feints"
                  label="Maximum feints per cue"
                  min={RANGES.feintCount.min}
                  max={RANGES.feintCount.max}
                  value={settings.feintCount}
                  format={(value) => value === 0 ? "Off" : `Up to ${value}`}
                  onChange={(feintCount) =>
                    changeTiming({ ...settings, feintCount })
                  }
                />
                {feintsOff || settings.fakeoutChance === 0 ? (
                  <p className="text-sm text-neutral-600" role="status">
                    {settings.feintCount === 0 ? "Feints are off. Raise the limit to add them."
                      : settings.directions.length < 2 ? "Choose at least two directions to use feints."
                      : "Feints are off at 0%. Raise the chance to use them."}
                  </p>
                ) : null}
                <RangeField
                  id="fake-chance"
                  disabled={feintsOff}
                  label="Chance of feints"
                  min={RANGES.fakeoutChance.min}
                  max={RANGES.fakeoutChance.max}
                  value={settings.fakeoutChance}
                  format={(value) => `${value}%`}
                  onChange={(fakeoutChance) =>
                    changeTiming({ ...settings, fakeoutChance })
                  }
                />
                <RangeField
                  id="fake-ms"
                  step={10}
                  disabled={feintsOff || settings.fakeoutChance === 0}
                  label="Feint flash time"
                  min={RANGES.fakeoutMs.min}
                  max={RANGES.fakeoutMs.max}
                  value={settings.fakeoutMs}
                  format={secondsLabel}
                  onChange={(fakeoutMs) => changeTiming({ ...settings, fakeoutMs })}
                />
              </div>
              <p className="mt-4 text-sm text-neutral-600">
                Feints are brief fake arrows. Follow the arrow that stays.
              </p>
            </details>
            <details className="settings-group">
              <summary>
                Arrow &amp; background<span>Make the cue easy to see</span>
              </summary>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-center rounded-xl border border-neutral-200 p-4" style={{ backgroundColor: swatchHex(settings.backgroundColor) }} role="img" aria-label="Arrow colour preview">
                  <ArrowRight className="size-16" strokeWidth={3} style={{ color: swatchHex(settings.arrowColor) }} />
                </div>
                {!readable ? <p className="text-sm font-medium text-red-700" role="status">The arrow is hard to see. Choose colours with more contrast.</p> : null}
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
                <DirectionPresets directions={settings.directions} onApply={(directions) => onChange({ ...settings, directions })} />
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
              {settings.record ? "Check your camera, then 5 seconds to get ready" : "5 seconds to get ready"}
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
