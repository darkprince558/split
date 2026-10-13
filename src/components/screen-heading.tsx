"use client";

import { useEffect, useRef, type ComponentProps } from "react";

// Screen changes have an explicit keyboard and screen-reader destination.
export function ScreenHeading(props: ComponentProps<"h1">) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  return <h1 {...props} className={`${props.className ?? ""} outline-none`} ref={ref} tabIndex={-1} />;
}
