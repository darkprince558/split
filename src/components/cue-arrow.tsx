import {
  directionCueWord,
  directionLabel,
  directionRotation,
  type Direction,
} from "@/lib/drill";

export function CueArrow({
  direction,
  announce,
  color,
}: {
  direction: Direction;
  announce: boolean;
  color: string;
}) {
  const word = directionCueWord(direction);
  const rotation = directionRotation(direction);

  return (
    <div
      className="flex h-full max-h-full w-full flex-col items-center justify-center gap-[1vmin] px-3"
      role={announce ? "img" : undefined}
      aria-label={announce ? directionLabel(direction) : undefined}
      aria-hidden={announce ? undefined : true}
      data-direction={direction}
    >
      <svg
        viewBox="-18 -18 196 196"
        className={
          word
            ? "h-auto w-[min(78vw,50dvh)]"
            : "h-auto w-[min(86vw,64dvh)]"
        }
      >
        <polygon
          points="8,68 90,68 90,40 152,80 90,120 90,92 8,92"
          fill={color}
          transform={`rotate(${rotation} 80 80)`}
        />
      </svg>
      {word ? (
        <p
          data-cue-word={word}
          className="max-w-full text-center leading-[0.9] font-semibold tracking-tight text-[clamp(2.5rem,12vw,7rem)]"
          style={{ color }}
        >
          {word}
        </p>
      ) : null}
    </div>
  );
}
