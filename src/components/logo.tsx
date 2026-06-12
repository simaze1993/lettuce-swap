import { BRAND_LOGO_URL } from "@/lib/brand";

export function SwapItLogo({ className }: { className?: string }) {
  // The brand mark is full-colour artwork on a transparent background, so it
  // sits cleanly on both the light and dark themes. We render it as a plain
  // <img> (rather than a tinted CSS mask) to preserve the green gradient of the
  // leaf and the "swap" wordmark. The drop-shadow utility lifts it slightly on
  // dark backgrounds for legibility without altering the artwork's colours.
  return (
    <img
      src={BRAND_LOGO_URL}
      alt="Lettuce Swap"
      draggable={false}
      className={[
        "select-none object-contain dark:drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ aspectRatio: "1 / 1" }}
    />
  );
}
