import { useEffect, useRef, useState } from "react";
import { SwapItLogo } from "@/components/logo";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

function sizeFor(w: number, h: number): Size {
  const min = Math.min(w, h);
  if (min < 360) return "xs";
  if (min < 640) return "sm";
  if (min < 1024) return "md";
  if (min < 1600) return "lg";
  return "xl";
}

// Per-variant sizing presets. `splash` fills the viewport prominently.
// `hero` is the subtle background watermark behind hero copy.
// Logo asset is square (1024x1024). Keep wrapper square so the <img> and
// the shine mask occupy the exact same box — otherwise the mask drifts and
// the reflection bleeds outside the logo silhouette.
const PRESETS: Record<"splash" | "hero", Record<Size, { size: string }>> = {
  splash: {
    xs: { size: "min(92vw, 60vh, 320px)" },
    sm: { size: "min(86vw, 66vh, 520px)" },
    md: { size: "min(80vw, 72vh, 720px)" },
    lg: { size: "min(72vw, 78vh, 880px)" },
    xl: { size: "min(60vw, 82vh, 1100px)" },
  },
  hero: {
    xs: { size: "min(86vw, 55vh, 280px)" },
    sm: { size: "min(72vw, 60vh, 380px)" },
    md: { size: "min(60vw, 65vh, 520px)" },
    lg: { size: "min(48vw, 70vh, 600px)" },
    xl: { size: "min(40vw, 72vh, 720px)" },
  },
};

/**
 * Renders the Lettuce Swap logo as a responsive backdrop/hero element.
 * Uses ResizeObserver against the nearest sized ancestor (or window)
 * to pick a size bucket so the artwork stays proportioned across
 * very small phones and very large displays.
 */
export function LogoBackdrop({
  variant = "hero",
  className,
  innerClassName,
  children,
  ariaHidden = true,
}: {
  variant?: "splash" | "hero";
  className?: string;
  innerClassName?: string;
  children?: React.ReactNode;
  ariaHidden?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>("md");

  useEffect(() => {
    const update = () => {
      const el = wrapRef.current;
      const w = el?.parentElement?.clientWidth ?? window.innerWidth;
      const h = window.innerHeight;
      setSize(sizeFor(w, h));
    };
    update();
    const ro = new ResizeObserver(update);
    if (wrapRef.current?.parentElement) ro.observe(wrapRef.current.parentElement);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const preset = PRESETS[variant][size];

  return (
    <div
      ref={wrapRef}
      aria-hidden={ariaHidden || undefined}
      className={["splash-logo-wrap", className].filter(Boolean).join(" ")}
      style={{ width: preset.size, height: preset.size, aspectRatio: "1 / 1" }}
      data-logo-size={size}
    >
      <SwapItLogo
        className={["block w-full h-auto object-contain", innerClassName].filter(Boolean).join(" ")}
      />
      {children}
    </div>
  );
}
