import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Coffee } from "lucide-react";
import { formatTime } from "@/hooks/useFocusTimer";

interface BreakOverlayProps {
  onResume: () => void;
}

export function BreakOverlay({ onResume }: BreakOverlayProps) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  const rafRef = useRef<number>();

  useEffect(() => {
    const tick = () => {
      setElapsed(Date.now() - startRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="text-center space-y-6 animate-fade-in">
        {/* Breathing circle */}
        <div className="mx-auto w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center animate-[pulse_4s_ease-in-out_infinite]">
          <Coffee className="h-12 w-12 text-primary" />
        </div>

        <h2 className="text-2xl font-bold font-heading text-foreground">Break Time!</h2>
        <p className="text-muted-foreground">Relax for a few minutes. You've earned it.</p>

        <p className="font-mono text-3xl tabular-nums text-foreground">{formatTime(elapsed)}</p>

        <Button onClick={onResume} className="mt-4" size="lg">
          Resume Work
        </Button>
      </div>
    </div>
  );
}
