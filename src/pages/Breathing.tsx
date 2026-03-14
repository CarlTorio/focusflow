import { useState } from "react";
import { MobileHeader } from "@/components/navigation/MobileHeader";
import { BreathingPlayer, BreathingExercise } from "@/components/breathing/BreathingPlayer";
import { Wind, Square, Heart } from "lucide-react";

const exercises: BreathingExercise[] = [
  {
    id: "478",
    name: "4-7-8 Breathing",
    subtitle: "Calm your nervous system in 1 minute",
    emoji: "🌊",
    phases: [
      { label: "Breathe In", duration: 4 },
      { label: "Hold", duration: 7 },
      { label: "Breathe Out", duration: 8 },
    ],
    cycles: 4,
    color: "from-primary to-primary-medium",
  },
  {
    id: "box",
    name: "Box Breathing",
    subtitle: "Reset your focus with even breaths",
    emoji: "⬜",
    phases: [
      { label: "Breathe In", duration: 4 },
      { label: "Hold", duration: 4 },
      { label: "Breathe Out", duration: 4 },
      { label: "Hold", duration: 4 },
    ],
    cycles: 4,
    color: "from-success to-success/70",
  },
  {
    id: "55",
    name: "Simple Breathing",
    subtitle: "Quick and easy for beginners",
    emoji: "🧘",
    phases: [
      { label: "Breathe In", duration: 5 },
      { label: "Breathe Out", duration: 5 },
    ],
    cycles: 6,
    color: "from-warning to-destructive/50",
  },
];

const iconMap: Record<string, React.ReactNode> = {
  "478": <Wind className="h-6 w-6" />,
  box: <Square className="h-6 w-6" />,
  "55": <Heart className="h-6 w-6" />,
};

export default function Breathing() {
  const [activeExercise, setActiveExercise] = useState<BreathingExercise | null>(null);

  return (
    <div className="pb-20 md:pb-8">
      <MobileHeader title="Breathing" />
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground text-heading hidden md:block">Breathing Exercises</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Improve your focus and calm your mind with guided breathing
          </p>
        </div>

        <div className="space-y-4">
          {exercises.map((ex) => (
            <button
              key={ex.id}
              onClick={() => setActiveExercise(ex)}
              className="w-full rounded-2xl bg-card p-5 shadow-sm transition-shadow hover:shadow-md text-left"
            >
              <div className="flex items-center gap-4">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${ex.color} text-primary-foreground`}>
                  <span className="text-2xl">{ex.emoji}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground">{ex.name}</h3>
                  <p className="text-sm text-muted-foreground">{ex.subtitle}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {ex.phases.map(p => `${p.label} ${p.duration}s`).join(" → ")} · {ex.cycles} cycles
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {activeExercise && (
        <BreathingPlayer exercise={activeExercise} onClose={() => setActiveExercise(null)} />
      )}
    </div>
  );
}
