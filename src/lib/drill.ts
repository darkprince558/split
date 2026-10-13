export const DIRECTIONS = [
  "left",
  "right",
  "back",
  "back-left",
  "back-right",
  "forward",
  "forward-left",
  "forward-right",
] as const;

export type Direction = (typeof DIRECTIONS)[number];

export const SWATCHES = [
  { id: "black", label: "Black", hex: "#000000" },
  { id: "white", label: "White", hex: "#FFFFFF" },
  { id: "orange", label: "Orange", hex: "#FF3B00" },
  { id: "blue", label: "Blue", hex: "#0057FF" },
  { id: "green", label: "Green", hex: "#128A2E" },
  { id: "yellow", label: "Yellow", hex: "#FFD400" },
] as const;

export type SwatchId = (typeof SWATCHES)[number]["id"];

const MIN_CONTRAST = 3;

export type Mode = "unlimited" | "timer" | "reps";

export type TimerChoice = 30 | 60 | 120 | 300 | "custom";

export type RepsChoice = 20 | 50 | 100 | 200 | "custom";

export type Settings = {
  difficulty: number;
  mode: Mode;
  timerChoice: TimerChoice;
  timerCustomSeconds: number;
  repsChoice: RepsChoice;
  repsCustom: number;
  gapMin: number;
  gapMax: number;
  holdMs: number;
  fakeoutChance: number;
  fakeoutMs: number;
  feintCount: number;
  directions: Direction[];
  arrowColor: SwatchId;
  backgroundColor: SwatchId;
  sound: boolean;
  respond: boolean;
  record: boolean;
};

export type Feel = {
  gapMin: number;
  gapMax: number;
  holdMs: number;
  fakeoutChance: number;
  fakeoutMs: number;
  feintCount: number;
  burstChance: number;
};

export const RANGES = {
  gapMin: { min: 40, max: 4000 },
  gapMax: { min: 40, max: 6000 },
  holdMs: { min: 50, max: 3000 },
  fakeoutChance: { min: 0, max: 100 },
  fakeoutMs: { min: 30, max: 800 },
  feintCount: { min: 0, max: 3 },
} as const;

export const PRESETS = [
  { id: "warmup", label: "Warm-up", level: 2 },
  { id: "club", label: "Club", level: 5 },
  { id: "match", label: "Match", level: 8 },
] as const;

export type PresetId = (typeof PRESETS)[number]["id"] | "custom";

const DIFFICULTY_LINES = [
  "Slow cues, almost no feints",
  "Slow cues, rare feints",
  "Easy pace, a few feints",
  "Steady pace, light feints",
  "Club pace, occasional feints",
  "Quicker gaps, regular feints",
  "Match pace, frequent feints",
  "Tight gaps, frequent feints",
  "Fast bursts, lots of feints",
  "Full speed, feints in the rush",
] as const;

export type BlockCode =
  | "directions"
  | "reps"
  | "timer"
  | "gap"
  | "hold"
  | "fakeout"
  | "fakeout-ms"
  | "contrast";

export type StartBlock = {
  code: BlockCode;
  message: string;
};

export type CuePlan = {
  real: Direction;
  feints: Direction[];
};

export type GapPlan = {
  gapMs: number;
  burstLeft: number;
};

export type Summary = {
  reps: number;
  respond: boolean;
  averageMs: number | null;
  bestMs: number | null;
  misses: number;
  feints: number;
  stoppedEarly: boolean;
};

export type Rng = () => number;

function lerp(start: number, end: number, t: number) {
  return start + (end - start) * t;
}

export function clampDifficulty(level: number) {
  return Math.min(10, Math.max(1, Math.round(level)));
}

export function feintCountForLevel(level: number) {
  const clamped = clampDifficulty(level);
  if (clamped <= 1) return 0;
  if (clamped <= 4) return 1;
  if (clamped <= 7) return 2;
  return 3;
}

export function feelForLevel(level: number): Feel {
  const t = (clampDifficulty(level) - 1) / 9;
  return {
    gapMin: Math.round(lerp(1800, 220, t)),
    gapMax: Math.round(lerp(3400, 900, t)),
    holdMs: Math.round(lerp(1400, 450, t)),
    fakeoutChance: Math.round(lerp(5, 55, t)),
    fakeoutMs: Math.round(lerp(300, 70, t)),
    feintCount: feintCountForLevel(level),
    burstChance: lerp(0, 0.48, t),
  };
}

export function describeDifficulty(level: number) {
  return DIFFICULTY_LINES[clampDifficulty(level) - 1];
}

export function presetForLevel(level: number): PresetId {
  const match = PRESETS.find((preset) => preset.level === clampDifficulty(level));
  return match ? match.id : "custom";
}

export function feelMatches(
  settings: Pick<
    Settings,
    "difficulty" | "gapMin" | "gapMax" | "holdMs" | "fakeoutChance" | "fakeoutMs" | "feintCount"
  >,
) {
  const feel = feelForLevel(settings.difficulty);
  return (
    settings.gapMin === feel.gapMin &&
    settings.gapMax === feel.gapMax &&
    settings.holdMs === feel.holdMs &&
    settings.fakeoutChance === feel.fakeoutChance &&
    settings.fakeoutMs === feel.fakeoutMs &&
    settings.feintCount === feel.feintCount
  );
}

export function activePreset(settings: Settings): PresetId {
  const named = presetForLevel(settings.difficulty);
  if (named === "custom" || !feelMatches(settings)) return "custom";
  return named;
}

export function applyDifficulty(settings: Settings, level: number): Settings {
  const feel = feelForLevel(level);
  return {
    ...settings,
    difficulty: clampDifficulty(level),
    gapMin: feel.gapMin,
    gapMax: feel.gapMax,
    holdMs: feel.holdMs,
    fakeoutChance: feel.fakeoutChance,
    fakeoutMs: feel.fakeoutMs,
    feintCount: feel.feintCount,
  };
}

export function createDefaultSettings(): Settings {
  return applyDifficulty(
    {
      difficulty: 5,
      mode: "reps",
      timerChoice: 60,
      timerCustomSeconds: 90,
      repsChoice: 20,
      repsCustom: 30,
      gapMin: 1,
      gapMax: 1,
      holdMs: 1,
      fakeoutChance: 0,
      fakeoutMs: 1,
      feintCount: 0,
      directions: [...DIRECTIONS],
      arrowColor: "black",
      backgroundColor: "white",
      sound: true,
      respond: false,
      record: true,
    },
    5,
  );
}

export function resolvedTimerSeconds(settings: Settings) {
  return settings.timerChoice === "custom"
    ? settings.timerCustomSeconds
    : settings.timerChoice;
}

export function resolvedReps(settings: Settings) {
  return settings.repsChoice === "custom" ? settings.repsCustom : settings.repsChoice;
}

export function burstChanceFor(settings: Settings) {
  return feelForLevel(settings.difficulty).burstChance;
}

export function startBlockReason(settings: Settings): StartBlock | null {
  if (settings.directions.length === 0) {
    return { code: "directions", message: "Pick at least one direction." };
  }

  if (settings.mode === "reps") {
    const reps = resolvedReps(settings);
    if (!Number.isInteger(reps) || reps < 1) {
      return { code: "reps", message: "Choose at least 1 cue." };
    }
  }

  if (settings.mode === "timer") {
    const seconds = resolvedTimerSeconds(settings);
    if (!Number.isInteger(seconds) || seconds < 1) {
      return { code: "timer", message: "Time must be at least 1 second." };
    }
  }

  if (!Number.isFinite(settings.gapMin) || settings.gapMin < 40) {
    return { code: "gap", message: "Minimum gap must be at least 40 ms." };
  }

  if (!Number.isFinite(settings.gapMax) || settings.gapMax < settings.gapMin) {
    return {
      code: "gap",
      message: "Minimum gap can't be longer than the maximum.",
    };
  }

  if (!Number.isFinite(settings.holdMs) || settings.holdMs < 50) {
    return { code: "hold", message: "The real arrow needs at least 50 ms." };
  }

  if (
    !Number.isFinite(settings.fakeoutChance) ||
    settings.fakeoutChance < 0 ||
    settings.fakeoutChance > 100
  ) {
    return { code: "fakeout", message: "Fakeout chance stays between 0 and 100." };
  }

  if (
    settings.fakeoutChance > 0 &&
    (!Number.isFinite(settings.fakeoutMs) || settings.fakeoutMs < 30)
  ) {
    return { code: "fakeout-ms", message: "Fakeout flash needs at least 30 ms." };
  }

  if (!colorsAreReadable(settings.arrowColor, settings.backgroundColor)) {
    return {
      code: "contrast",
      message: "That arrow is too close to the background.",
    };
  }

  return null;
}

export function swatchHex(id: SwatchId) {
  return SWATCHES.find((swatch) => swatch.id === id)?.hex ?? "#000000";
}

function linearChannel(value: number) {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

export function contrastRatio(foreground: string, background: string) {
  const luminance = (hex: string) => {
    const normalized = hex.replace("#", "");
    const red = linearChannel(parseInt(normalized.slice(0, 2), 16));
    const green = linearChannel(parseInt(normalized.slice(2, 4), 16));
    const blue = linearChannel(parseInt(normalized.slice(4, 6), 16));
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

export function colorsAreReadable(arrow: SwatchId, background: SwatchId) {
  return contrastRatio(swatchHex(arrow), swatchHex(background)) >= MIN_CONTRAST;
}

export function inkForBackground(background: SwatchId) {
  const hex = swatchHex(background);
  const black = contrastRatio("#000000", hex);
  const white = contrastRatio("#ffffff", hex);
  return black >= white ? "#000000" : "#ffffff";
}

export function directionFromKey(key: string): Direction | null {
  switch (key) {
    case "ArrowLeft":
    case "a":
    case "A":
      return "left";
    case "ArrowRight":
    case "d":
    case "D":
      return "right";
    case "ArrowUp":
    case "w":
    case "W":
      return "back";
    case "q":
    case "Q":
      return "back-left";
    case "e":
    case "E":
      return "back-right";
    case "ArrowDown":
    case "s":
    case "S":
      return "forward";
    case "z":
    case "Z":
      return "forward-left";
    case "c":
    case "C":
      return "forward-right";
    default:
      return null;
  }
}

export function directionLabel(direction: Direction) {
  switch (direction) {
    case "left":
      return "Left";
    case "right":
      return "Right";
    case "back":
      return "Back";
    case "back-left":
      return "Back left";
    case "back-right":
      return "Back right";
    case "forward":
      return "Forward";
    case "forward-left":
      return "Forward left";
    case "forward-right":
      return "Forward right";
  }
}

export function directionCueWord(direction: Direction) {
  switch (direction) {
    case "left":
    case "right":
      return null;
    case "back":
      return "BACK";
    case "back-left":
      return "BACK LEFT";
    case "back-right":
      return "BACK RIGHT";
    case "forward":
      return "FORWARD";
    case "forward-left":
      return "FORWARD LEFT";
    case "forward-right":
      return "FORWARD RIGHT";
  }
}

export function directionRotation(direction: Direction) {
  switch (direction) {
    case "right":
      return 0;
    case "forward-right":
      return 45;
    case "forward":
      return 90;
    case "forward-left":
      return 135;
    case "left":
      return 180;
    case "back-left":
      return -135;
    case "back":
      return -90;
    case "back-right":
      return -45;
  }
}

export function planCue(
  directions: Direction[],
  fakeoutChance: number,
  feintCount: number,
  rng: Rng,
): CuePlan {
  const pool = directions.length > 0 ? directions : DIRECTIONS;
  const real = pool[Math.floor(rng() * pool.length)] ?? "left";
  const max = Math.max(0, Math.min(3, Math.floor(feintCount)));
  if (max === 0 || pool.length < 2 || rng() * 100 >= fakeoutChance) {
    return { real, feints: [] };
  }

  const count = 1 + Math.floor(rng() * max);
  const feints: Direction[] = [];
  let previous: Direction | null = null;
  for (let index = 0; index < count; index += 1) {
    const last = index === count - 1;
    const choices = pool.filter((direction) => {
      if (previous !== null && direction === previous) return false;
      if (last && direction === real) return false;
      return true;
    });
    if (choices.length === 0) break;
    const next = choices[Math.floor(rng() * choices.length)];
    if (!next) break;
    feints.push(next);
    previous = next;
  }

  if (feints.length === 0 || feints[feints.length - 1] === real) {
    return { real, feints: [] };
  }
  return { real, feints };
}

export function planGap(input: {
  gapMin: number;
  gapMax: number;
  burstChance: number;
  burstLeft: number;
  rng: Rng;
}): GapPlan {
  if (input.burstLeft > 0) {
    const loose = 70 + input.rng() * 110;
    const gapMs = Math.max(40, Math.round(Math.min(loose, input.gapMin)));
    return { gapMs, burstLeft: input.burstLeft - 1 };
  }

  const span = Math.max(0, input.gapMax - input.gapMin);
  const gapMs = Math.max(40, Math.round(input.gapMin + input.rng() * span));
  if (input.rng() >= input.burstChance) {
    return { gapMs, burstLeft: 0 };
  }

  const roll = input.rng();
  const length = roll < 0.34 ? 2 : roll < 0.67 ? 3 : 4;
  return { gapMs, burstLeft: length - 1 };
}

export function scoreLiveAnswer(input: {
  pressed: Direction;
  real: Direction;
  feints: Direction[];
  fellDuringFake: boolean;
  rt: number;
}) {
  const correct = input.pressed === input.real;
  const matchedFake = !correct && input.feints.includes(input.pressed);
  return {
    hit: correct ? Math.max(0, Math.round(input.rt)) : null,
    miss: !correct,
    feint: input.fellDuringFake || matchedFake,
  };
}

export function scoreTimeout(fellDuringFake: boolean, respond: boolean) {
  if (!respond) return { miss: false, feint: false };
  return { miss: true, feint: fellDuringFake };
}

export function summarize(input: {
  hits: number[];
  misses: number;
  feints: number;
  reps: number;
  respond: boolean;
  stoppedEarly: boolean;
}): Summary {
  if (input.hits.length === 0) {
    return {
      reps: input.reps,
      respond: input.respond,
      averageMs: null,
      bestMs: null,
      misses: input.misses,
      feints: input.feints,
      stoppedEarly: input.stoppedEarly,
    };
  }

  const total = input.hits.reduce((sum, hit) => sum + hit, 0);
  return {
    reps: input.reps,
    respond: input.respond,
    averageMs: Math.round(total / input.hits.length),
    bestMs: Math.round(Math.min(...input.hits)),
    misses: input.misses,
    feints: input.feints,
    stoppedEarly: input.stoppedEarly,
  };
}

export function formatClock(seconds: number, mode: "up" | "down") {
  const safe = Math.max(0, seconds);
  const whole = mode === "down" ? Math.ceil(safe - 1e-9) : Math.floor(safe);
  const minutes = Math.floor(whole / 60);
  const remainder = whole % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export function progressLabel(input: {
  mode: Mode;
  reps: number;
  repTarget: number;
  elapsedSeconds: number;
  timerSeconds: number;
}) {
  if (input.mode === "reps") return `${input.reps}/${input.repTarget}`;
  if (input.mode === "timer") {
    return formatClock(input.timerSeconds - input.elapsedSeconds, "down");
  }
  return formatClock(input.elapsedSeconds, "up");
}

export function clipFilename(index: number, direction: Direction, feints: Direction[], mime = "video/webm") {
  const extension = mime.split(";")[0].trim().toLowerCase() === "video/mp4" ? "mp4" : "webm";
  const number = String(Math.max(0, Math.trunc(index))).padStart(2, "0");
  if (feints.length === 0) return `${number}-${direction}.${extension}`;
  return `${number}-${direction}-feints-${feints.join("-")}.${extension}`;
}

export function clipsCsv(
  rows: { filename: string; direction: Direction; feints: Direction[] }[],
) {
  const lines = ["clip,real,feints"];
  for (const row of rows) {
    const feints = row.feints.map((direction) => directionLabel(direction)).join("; ");
    lines.push([row.filename, directionLabel(row.direction), feints].join(","));
  }
  return `${lines.join("\n")}\n`;
}
