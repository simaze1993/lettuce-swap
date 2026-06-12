import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldCheck, IdCard, Camera, Loader2, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/verify")({
  component: VerifyPage,
});

type Step = "intro" | "id-front" | "id-back" | "selfie" | "submitting" | "done";
type Docs = { idFront?: string; idBack?: string; selfie?: string };
type Persisted = { step: Step; docs: Docs };

const STORAGE_KEY = "swapp:verify-progress";

const STEP_ORDER: Step[] = ["intro", "id-front", "id-back", "selfie", "submitting", "done"];
const STEP_LABELS: Record<Step, string> = {
  intro: "Introduction",
  "id-front": "Step 1 of 3 — Front of ID",
  "id-back": "Step 2 of 3 — Back of ID",
  selfie: "Step 3 of 3 — Live selfie",
  submitting: "Verifying",
  done: "Verified",
};

function loadProgress(userId: string): Persisted | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Persisted;
    if (!STEP_ORDER.includes(parsed.step)) return null;
    // Don't resume into transient states
    if (parsed.step === "submitting" || parsed.step === "done") return null;
    return parsed;
  } catch {
    return null;
  }
}

function VerifyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStepState] = useState<Step>("intro");
  const [docs, setDocs] = useState<Docs>({});
  const [resumed, setResumed] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const announceRef = useRef<HTMLDivElement>(null);

  // Restore on mount
  useEffect(() => {
    if (!user) return;
    const saved = loadProgress(user.id);
    if (saved) {
      setStepState(saved.step);
      setDocs(saved.docs);
      setResumed(true);
    }
  }, [user]);

  // Persist on change
  useEffect(() => {
    if (!user) return;
    if (step === "done") {
      localStorage.removeItem(`${STORAGE_KEY}:${user.id}`);
      return;
    }
    if (step === "submitting") return;
    localStorage.setItem(`${STORAGE_KEY}:${user.id}`, JSON.stringify({ step, docs } as Persisted));
  }, [user, step, docs]);

  // Focus step heading on transitions
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const setStep = (s: Step) => setStepState(s);

  const fakeCapture = (key: keyof Docs) => {
    const next = { ...docs, [key]: `captured-${Date.now()}` };
    setDocs(next);
    if (announceRef.current) {
      announceRef.current.textContent = `${key === "idFront" ? "ID front" : key === "idBack" ? "ID back" : "Selfie"} captured.`;
    }
    if (key === "idFront") setStep("id-back");
    else if (key === "idBack") setStep("selfie");
    else if (key === "selfie") submit({ ...next });
  };

  const submit = async (finalDocs: Docs) => {
    setStep("submitting");
    await new Promise((r) => setTimeout(r, 1800));
    const { error } = await supabase.rpc("request_verification");
    if (error) {
      toast.error(error.message);
      setStep("selfie");
      return;
    }
    if (user) localStorage.removeItem(`${STORAGE_KEY}:${user.id}`);
    toast.success("You're verified! 🌳");
    setStep("done");
    void finalDocs;
  };

  const resetFlow = () => {
    setDocs({});
    setStep("intro");
    setResumed(false);
    if (user) localStorage.removeItem(`${STORAGE_KEY}:${user.id}`);
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="flex items-center gap-3 mb-2">
        <ShieldCheck className="h-8 w-8 text-primary" aria-hidden />
        <h1 className="font-serif text-4xl">Get verified</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        Verified members earn the 🌳 badge — a sign of trust in the Lettuce Swap community.
        Identification is powered by our partner (Persona-style flow). This demo uses a simulated
        capture.
      </p>

      {/* Polite live region for capture announcements */}
      <div ref={announceRef} className="sr-only" aria-live="polite" aria-atomic="true" />

      {resumed && step !== "done" && step !== "submitting" && (
        <div
          role="status"
          className="mb-4 p-3 rounded-lg bg-secondary text-sm flex items-center justify-between gap-3"
        >
          <span>Resumed your previous verification at {STEP_LABELS[step]}.</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={resetFlow}
            aria-label="Start verification over from the beginning"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" aria-hidden /> Start over
          </Button>
        </div>
      )}

      <Card
        className="p-6 space-y-6"
        role="region"
        aria-labelledby="verify-step-heading"
        aria-busy={step === "submitting"}
      >
        {step === "intro" && (
          <div className="space-y-4">
            <h2
              ref={headingRef}
              id="verify-step-heading"
              tabIndex={-1}
              className="font-serif text-2xl outline-none"
            >
              What we'll need
            </h2>
            <ul className="text-sm space-y-2 text-muted-foreground list-disc pl-5">
              <li>A photo of the front of your passport or ID card</li>
              <li>A photo of the back of your ID card (skip for passport)</li>
              <li>A live selfie for biometric matching</li>
            </ul>
            <Button onClick={() => setStep("id-front")} className="w-full" autoFocus={!resumed}>
              Start verification
            </Button>
          </div>
        )}

        {step === "id-front" && (
          <CaptureStep
            headingRef={headingRef}
            stepLabel={STEP_LABELS["id-front"]}
            icon={<IdCard className="h-10 w-10" aria-hidden />}
            title="Front of your ID"
            description="Position your passport or ID card so all corners are visible."
            action="Capture front"
            onCapture={() => fakeCapture("idFront")}
          />
        )}

        {step === "id-back" && (
          <CaptureStep
            headingRef={headingRef}
            stepLabel={STEP_LABELS["id-back"]}
            icon={<IdCard className="h-10 w-10" aria-hidden />}
            title="Back of your ID"
            description="If you're using a passport, you can capture the same page again."
            action="Capture back"
            onCapture={() => fakeCapture("idBack")}
          />
        )}

        {step === "selfie" && (
          <CaptureStep
            headingRef={headingRef}
            stepLabel={STEP_LABELS.selfie}
            icon={<Camera className="h-10 w-10" aria-hidden />}
            title="Live selfie"
            description="Look at the camera. We'll match your face to your ID."
            action="Take selfie"
            onCapture={() => fakeCapture("selfie")}
          />
        )}

        {step === "submitting" && (
          <div className="text-center py-10 space-y-3" aria-live="polite">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" aria-hidden />
            <h2
              ref={headingRef}
              id="verify-step-heading"
              tabIndex={-1}
              className="sr-only outline-none"
            >
              Verifying your identity
            </h2>
            <p className="text-muted-foreground">Verifying your identity…</p>
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-6 space-y-4" aria-live="polite">
            <div className="text-6xl" aria-hidden>
              🌳
            </div>
            <h2
              ref={headingRef}
              id="verify-step-heading"
              tabIndex={-1}
              className="font-serif text-2xl outline-none"
            >
              You're a verified member
            </h2>
            <p className="text-muted-foreground">Your badge is now visible on your profile.</p>
            <Button onClick={() => navigate({ to: "/me" })} className="w-full">
              Back to profile
            </Button>
          </div>
        )}

        {(step === "id-front" || step === "id-back" || step === "selfie") && (
          <p className="text-xs text-muted-foreground text-center">
            Demo mode — no real document is captured or stored.
          </p>
        )}
      </Card>

      {docs.idFront && step !== "done" && step !== "submitting" && (
        <ul className="mt-4 text-xs text-muted-foreground space-y-1" aria-label="Capture progress">
          <li>✓ ID front captured</li>
          {docs.idBack && <li>✓ ID back captured</li>}
          {docs.selfie && <li>✓ Selfie captured</li>}
        </ul>
      )}
    </div>
  );
}

function CaptureStep({
  icon,
  title,
  description,
  action,
  onCapture,
  headingRef,
  stepLabel,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  onCapture: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  stepLabel: string;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Allow Enter or Space to trigger capture from anywhere in the step
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Don't hijack when focus is already on the button (default behavior handles it)
    if (target.tagName === "BUTTON") return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      buttonRef.current?.click();
    }
  };

  return (
    <div
      className="space-y-4 text-center focus:outline-none"
      onKeyDown={onKeyDown}
      tabIndex={-1}
      aria-label={stepLabel}
    >
      <div className="flex justify-center text-primary" aria-hidden>
        {icon}
      </div>
      <h2
        ref={headingRef}
        id="verify-step-heading"
        tabIndex={-1}
        className="font-serif text-2xl outline-none"
      >
        {title}
      </h2>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div
        role="img"
        aria-label="Simulated camera preview"
        className="aspect-video rounded-lg border-2 border-dashed border-border bg-muted/30 flex items-center justify-center text-muted-foreground text-sm"
      >
        Camera preview (simulated)
      </div>
      <Button
        ref={buttonRef}
        onClick={onCapture}
        className="w-full"
        aria-keyshortcuts="Enter Space"
      >
        {action}
      </Button>
      <p className="text-[11px] text-muted-foreground">Tip: press Enter or Space to capture.</p>
    </div>
  );
}
