import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function EmptyFocusState() {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center text-center space-y-5 animate-fade-in px-4">
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-5%`,
                backgroundColor: ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--accent))"][i % 4],
                animation: `confetti-fall ${1.5 + Math.random()}s ease-out forwards`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="text-8xl md:text-9xl">🎉</div>

      <h2 className="text-2xl md:text-3xl font-bold font-heading text-foreground">
        No activities left today
      </h2>
      <p className="text-muted-foreground max-w-sm">
        Bravo! You've cleared the day. Time to relax.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        <Button variant="outline" onClick={() => navigate("/planner")} className="border-primary text-primary">
          Plan Tomorrow
        </Button>
        <Button variant="ghost" onClick={() => navigate("/todos")} className="text-muted-foreground">
          Add a quick task
        </Button>
      </div>
    </div>
  );
}
