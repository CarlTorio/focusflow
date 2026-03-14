import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const challenges = [
  { id: "focus", emoji: "🎯", label: "Focus", desc: "Staying focused on one task" },
  { id: "time", emoji: "⏰", label: "Time Management", desc: "Estimating and managing time" },
  { id: "decisions", emoji: "🤔", label: "Decision Making", desc: "Deciding what to do first" },
  { id: "routines", emoji: "📋", label: "Routines", desc: "Building and keeping routines" },
  { id: "overwhelm", emoji: "😰", label: "Overwhelm", desc: "Feeling overwhelmed by tasks" },
  { id: "memory", emoji: "🧠", label: "Memory", desc: "Remembering what I need to do" },
];

export default function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedChallenges, setSelectedChallenges] = useState<string[]>([]);
  const [dailyHours, setDailyHours] = useState(8);
  const [workStart, setWorkStart] = useState("08:00");
  const [workEnd, setWorkEnd] = useState("18:00");
  const [saving, setSaving] = useState(false);

  const toggleChallenge = (id: string) => {
    setSelectedChallenges(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const finishOnboarding = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").update({
      onboarding_completed: true,
      challenges: selectedChallenges.length > 0 ? selectedChallenges : null,
      daily_hour_limit: dailyHours,
      working_hours_start: workStart,
      working_hours_end: workEnd,
    } as any).eq("id", user.id);
    await refreshProfile();
    setSaving(false);
    navigate("/hub");
  };

  const skipOnboarding = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ onboarding_completed: true } as any).eq("id", user.id);
    await refreshProfile();
    navigate("/hub", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary-light to-background px-4">
      <div className="w-full max-w-md">
        {/* Progress dots */}
        <div className="mb-8 flex justify-center gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className={cn("h-2 w-2 rounded-full transition-colors", i === step ? "bg-primary w-6" : i < step ? "bg-primary" : "bg-border")} />
          ))}
        </div>

        {step === 0 && (
          <div className="animate-fade-in space-y-6 text-center">
            <span className="text-6xl">👋</span>
            <h1 className="text-3xl font-bold text-foreground text-heading">Welcome to FocusFlow!</h1>
            <p className="text-muted-foreground">
              Let's set up your personal ADHD management system. Just 3 quick questions.
            </p>
            <Button onClick={() => setStep(1)} className="w-full rounded-xl py-3 text-base">
              Get Started
            </Button>
            <button onClick={skipOnboarding} className="text-sm text-muted-foreground hover:text-foreground">
              Skip for now
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="animate-fade-in space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground text-heading">What's hardest for you?</h2>
              <p className="mt-1 text-sm text-muted-foreground">Select all that apply — this helps us customize your experience</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {challenges.map(c => (
                <button
                  key={c.id}
                  onClick={() => toggleChallenge(c.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all",
                    selectedChallenges.includes(c.id)
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <span className="text-2xl">{c.emoji}</span>
                  <p className="text-sm font-semibold text-foreground">{c.label}</p>
                  <p className="text-[11px] text-muted-foreground">{c.desc}</p>
                </button>
              ))}
            </div>
            <Button
              onClick={() => setStep(2)}
              disabled={selectedChallenges.length === 0}
              className="w-full rounded-xl py-3"
            >
              Continue
            </Button>
            <button onClick={skipOnboarding} className="block mx-auto text-sm text-muted-foreground hover:text-foreground">
              Skip for now
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground text-heading">Set your daily basics</h2>
              <p className="mt-1 text-sm text-muted-foreground">You can always change these later in Settings</p>
            </div>

            <div className="space-y-4 rounded-2xl bg-card p-5 shadow-sm">
              <div className="space-y-2">
                <Label className="text-sm font-medium">How many hours can you work per day?</Label>
                <div className="flex flex-wrap gap-2">
                  {[4, 5, 6, 7, 8, 10, 12].map(h => (
                    <button key={h} onClick={() => setDailyHours(h)} className={cn(
                      "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                      dailyHours === h ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                    )}>
                      {h}h
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Start time</Label>
                  <Input type="time" value={workStart} onChange={e => setWorkStart(e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">End time</Label>
                  <Input type="time" value={workEnd} onChange={e => setWorkEnd(e.target.value)} className="rounded-xl" />
                </div>
              </div>
            </div>

            <Button onClick={finishOnboarding} disabled={saving} className="w-full rounded-xl py-3 text-base">
              {saving ? "Setting up..." : "Finish Setup"}
            </Button>
            <button onClick={skipOnboarding} className="block mx-auto text-sm text-muted-foreground hover:text-foreground">
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
