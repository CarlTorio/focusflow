import { Button } from "@/components/ui/button";
import { DecorativeShapes } from "@/components/DecorativeShapes";
import { useNavigate } from "react-router-dom";

export function BreathingCTA() {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden rounded-2xl bg-primary-light p-6 shadow-sm">
      <DecorativeShapes opacity={0.06} />
      <div className="relative z-10 flex flex-col items-center text-center">
        <span className="mb-4 text-5xl">🧘</span>
        <h3 className="text-lg font-bold text-foreground">Improve Your Focus</h3>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Our breathing exercises help you improve your ability to focus in as little as 1 minute.
        </p>
        <Button
          onClick={() => navigate("/breathing")}
          className="rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-primary-dark"
        >
          Explore Breathing Exercises
        </Button>
      </div>
    </div>
  );
}
