"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
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
  applyDifficulty,
  describeDifficulty,
  directionLabel,
  presetForLevel,
  resolvedReps,
  resolvedTimerSeconds,
  startBlockReason,
  type Direction,
  type Mode,
  type RepsChoice,
  type Settings,
  type TimerChoice,
} from "@/lib/drill";

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

function ChoiceButton({
  pressed,
  children,
  onClick,
}: {
  pressed: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "h-11 text-base",
        pressed && "border-[#FF3B00] text-[#FF3B00]",
      )}
    >
      {children}
    </Button>
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
}: {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onStart: () => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const block = startBlockReason(settings);
  const preset = presetForLevel(settings.difficulty);
  const mode = MODES.find((item) => item.id === settings.mode) ?? MODES[2];

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
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="gap-min">Min gap (ms)</Label>
                <Input
                  id="gap-min"
                  type="number"
                  inputMode="numeric"
                  min={40}
                  value={settings.gapMin}
                  aria-invalid={block?.code === "gap"}
                  className="h-11 text-base md:text-base"
                  onChange={(event) =>
                    onChange({ ...settings, gapMin: wholeNumber(event.target.value) })
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="gap-max">Max gap (ms)</Label>
                <Input
                  id="gap-max"
                  type="number"
                  inputMode="numeric"
                  min={40}
                  value={settings.gapMax}
                  aria-invalid={block?.code === "gap"}
                  className="h-11 text-base md:text-base"
                  onChange={(event) =>
                    onChange({ ...settings, gapMax: wholeNumber(event.target.value) })
                  }
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="hold">Real arrow stays (ms)</Label>
              <Input
                id="hold"
                type="number"
                inputMode="numeric"
                min={50}
                value={settings.holdMs}
                aria-invalid={block?.code === "hold"}
                className="h-11 text-base md:text-base"
                onChange={(event) =>
                  onChange({ ...settings, holdMs: wholeNumber(event.target.value) })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="fake-chance">Fakeout chance (%)</Label>
                <Input
                  id="fake-chance"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  value={settings.fakeoutChance}
                  aria-invalid={block?.code === "fakeout"}
                  className="h-11 text-base md:text-base"
                  onChange={(event) =>
                    onChange({
                      ...settings,
                      fakeoutChance: wholeNumber(event.target.value),
                    })
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="fake-ms">Fakeout flash (ms)</Label>
                <Input
                  id="fake-ms"
                  type="number"
                  inputMode="numeric"
                  min={30}
                  value={settings.fakeoutMs}
                  aria-invalid={block?.code === "fakeout-ms"}
                  className="h-11 text-base md:text-base"
                  onChange={(event) =>
                    onChange({
                      ...settings,
                      fakeoutMs: wholeNumber(event.target.value),
                    })
                  }
                />
              </div>
            </div>
            <p className="text-sm text-neutral-600">
              A feint flashes, then the real arrow. Only the real one counts.
            </p>
            <div className="flex flex-col gap-2">
              <Label>Directions</Label>
              <div className="grid grid-cols-3 gap-2">
                {DIRECTIONS.map((direction) => (
                  <ChoiceButton
                    key={direction}
                    pressed={settings.directions.includes(direction)}
                    onClick={() => toggleDirection(direction)}
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
                  Arrows or A, D, W. Wrong key is a miss.
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
