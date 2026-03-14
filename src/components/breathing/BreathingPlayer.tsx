import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Pause, Play } from "lucide-react";

export interface BreathingExercise {
  id: string;
  name: string;
  subtitle: string;
  emoji: string;
  phases: { label: string; duration: number }[];
  cycles: number;
  color: string;
}

interface Props {
  exercise: BreathingExercise;
  onClose: () => void;
}

export function BreathingPlayer({ exercise, onClose }: Props) {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [currentCycle, setCurrentCycle] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(exercise.phases[0].duration);
  const [paused, setPaused] = useState(false);
  const [completed, setCompleted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const phase = exercise.phases[currentPhase];
  const totalPhases = exercise.phases.length;

  // Compute circle scale
  const isInhale = phase?.label.toLowerCase().includes("in");
  const isExhale = phase?.label.toLowerCase().includes("out");
  const isHold = phase?.label.toLowerCase().includes("hold");

  let circleScale = 0.75;
  if (completed) circleScale = 1;
  else if (isInhale) {
    const progress = 1 - secondsLeft / phase.duration;
    circleScale = 0.5 + progress * 0.5;
  } else if (isExhale) {
    const progress = 1 - secondsLeft / phase.duration;
    circleScale = 1.0 - progress * 0.5;
  } else if (isHold) {
    circleScale = exercise.phases[currentPhase - 1]?.label.toLowerCase().includes("in") ? 1.0 : 0.5;
  }

  const tick = useCallback(() => {
    setSecondsLeft((prev) => {
      if (prev <= 1) {
        // Move to next phase
        const nextPhase = currentPhase + 1;
        if (nextPhase >= totalPhases) {
          // Next cycle
          const nextCycle = currentCycle + 1;
          if (nextCycle > exercise.cycles) {
            setCompleted(true);
            return 0;
          }
          setCurrentCycle(nextCycle);
          setCurrentPhase(0);
          return exercise.phases[0].duration;
        }
        setCurrentPhase(nextPhase);
        return exercise.phases[nextPhase].duration;
      }
      return prev - 1;
    });
  }, [currentPhase, currentCycle, exercise, totalPhases]);

  useEffect(() => {
    if (paused || completed) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(tick, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [paused, completed, tick]);

  // Prefers reduced motion
  const prefersReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-gradient-to-b from-primary-light to-secondary">
      {/* Close */}
      <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
        <X className="h-6 w-6" />
      </button>

      {completed ? (
        <div className="flex flex-col items-center gap-4 text-center animate-scale-in">
          <span className="text-6xl">🌟</span>
          <h2 className="text-2xl font-bold text-foreground">Well done!</h2>
          <p className="text-muted-foreground">You completed {exercise.cycles} cycles of {exercise.name}</p>
          <Button onClick={onClose} className="mt-4 rounded-xl">Done</Button>
        </div>
      ) : (
        <>
          {/* Cycle counter */}
          <p className="mb-6 text-sm font-medium text-muted-foreground">
            Cycle {currentCycle} of {exercise.cycles}
          </p>

          {/* Breathing circle */}
          <div className="relative flex items-center justify-center" style={{ width: 250, height: 250 }}>
            <div
              className="rounded-full bg-gradient-to-br from-primary to-primary-medium shadow-lg shadow-primary/20"
              style={{
                width: 200,
                height: 200,
                transform: `scale(${circleScale})`,
                transition: prefersReduced ? "none" : `transform ${phase.duration}s ease-in-out`,
                opacity: isHold ? 0.85 : 1,
              }}
            />
          </div>

          {/* Phase label */}
          <h2 className="mt-8 text-2xl font-bold text-foreground">{phase.label}...</h2>
          <p className="mt-2 text-4xl font-bold text-primary tabular-nums">{secondsLeft}</p>

          {/* Progress dots */}
          <div className="mt-6 flex gap-2">
            {Array.from({ length: exercise.cycles }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full ${
                  i < currentCycle - 1 ? "bg-primary" : i === currentCycle - 1 ? "bg-primary/60" : "bg-border"
                }`}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="mt-8 flex gap-4">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={() => setPaused(!paused)}
            >
              {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={onClose}>
              Stop
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
