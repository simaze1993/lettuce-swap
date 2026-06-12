import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { LogoBackdrop } from "@/components/logo-backdrop";
import logoSvg from "@/assets/logo.svg";

export const Route = createFileRoute("/")({
  component: Splash,
  head: () => ({
    meta: [
      { title: "Lettuce Swap — Swapping is the New Shopping" },
      { name: "description", content: "Welcome to Lettuce Swap — Swapping is the New Shopping." },
    ],
  }),
});

const EXIT_MS = 450;

function Splash() {
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);

  const enter = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(() => {
      navigate({ to: "/home" });
    }, EXIT_MS);
  }, [leaving, navigate]);

  useEffect(() => {
    const el = document.getElementById("splash-enter");
    el?.focus();
  }, []);

  const maskSrc = logoSvg;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="splash-title"
      aria-describedby="splash-desc"
      className="fixed inset-0 z-[60] bg-background overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70 motion-reduce:opacity-40"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, color-mix(in oklab, var(--color-primary) 22%, transparent), transparent 55%), radial-gradient(circle at 70% 70%, color-mix(in oklab, var(--color-primary) 14%, transparent), transparent 60%)",
        }}
      />
      <button
        id="splash-enter"
        type="button"
        onClick={enter}
        aria-label="Enter Lettuce Swap — Swapping is the New Shopping"
        aria-busy={leaving || undefined}
        data-leaving={leaving ? "true" : undefined}
        className={[
          "splash-enter relative group h-full w-full flex items-center justify-center px-6 cursor-pointer",
          "transition-all ease-out motion-reduce:transition-none",
          "focus:outline-none focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:ring-offset-0",
          leaving
            ? "opacity-0 scale-[1.06] duration-[450ms]"
            : "opacity-100 scale-100 duration-[450ms] animate-in fade-in zoom-in-95",
        ].join(" ")}
      >
        <div className="flex flex-col items-center gap-10">
          <LogoBackdrop
            variant="splash"
            ariaHidden={false}
            className="transition-transform duration-500 ease-out motion-reduce:transition-none group-hover:scale-[1.03] group-focus-visible:scale-[1.03]"
          >
            <span
              aria-hidden="true"
              className="splash-logo-aura"
              style={{
                WebkitMaskImage: `url(${maskSrc})`,
                maskImage: `url(${maskSrc})`,
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskPosition: "center",
                maskPosition: "center",
              }}
            />
            <span
              aria-hidden="true"
              className="splash-logo-shine"
              style={{
                WebkitMaskImage: `url(${maskSrc})`,
                maskImage: `url(${maskSrc})`,
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskPosition: "center",
                maskPosition: "center",
              }}
            />
          </LogoBackdrop>
          <h1 id="splash-title" className="sr-only splash-heading">
            Lettuce Swap — Swapping is the New Shopping
          </h1>
          <p
            id="splash-desc"
            className="splash-caption text-sm sm:text-base font-semibold uppercase tracking-[0.28em]"
          >
            Tap, click or press Enter or Space to continue
          </p>
          <span role="status" aria-live="polite" className="sr-only">
            {leaving ? "Loading Lettuce Swap" : ""}
          </span>
        </div>
      </button>
    </div>
  );
}
