import { directionLabel, type Direction } from "@/lib/drill";

export function CueArrow({
  direction,
  announce,
}: {
  direction: Direction;
  announce: boolean;
}) {
  const rotation = direction === "left" ? 180 : direction === "back" ? -90 : 0;

  return (
    <div
      className="flex flex-col items-center justify-center gap-[1.5vmin]"
      role={announce ? "img" : undefined}
      aria-label={announce ? directionLabel(direction) : undefined}
      aria-hidden={announce ? undefined : true}
      data-direction={direction}
    >
      <svg
        viewBox="0 0 160 160"
        className={
          direction === "back"
            ? "h-auto w-[min(68vw,42dvh)]"
            : "h-auto w-[min(84vw,68dvh)]"
        }
      >
        <polygon
          points="8,68 90,68 90,40 152,80 90,120 90,92 8,92"
          fill="#000000"
          transform={`rotate(${rotation} 80 80)`}
        />
      </svg>
      {direction === "back" ? (
        <p className="text-[min(18vw,12dvh)] leading-none font-semibold tracking-tight text-black">
          BACK
        </p>
      ) : null}
    </div>
  );
}
