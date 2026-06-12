import logoSvg from "@/assets/logo.svg";

export function SwapItLogo({ className }: { className?: string }) {
  // Render the SVG as a mask so we can tint it with the theme's primary color
  // (works identically in light and dark — the primary token already adapts).
  return (
    <span
      role="img"
      aria-label="Lettuce Swap logo"
      className={className}
      style={{
        display: "inline-block",
        backgroundColor: "var(--color-primary)",
        WebkitMaskImage: `url(${logoSvg})`,
        maskImage: `url(${logoSvg})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        aspectRatio: "1649 / 1520",
      }}
    />
  );
}
