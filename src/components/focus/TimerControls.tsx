import { Play, Pause, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimerControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSkip: () => void;
}

export function TimerControls({ isRunning, onStart, onPause, onReset, onSkip }: TimerControlsProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          className="h-14 w-14 rounded-full border-muted-foreground/30"
          onClick={onReset}
        >
          <Square className="h-5 w-5" />
        </Button>

        <Button
          size="icon"
          className="h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
          onClick={isRunning ? onPause : onStart}
        >
          {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
        </Button>

        <Button
          variant="ghost"
          className="text-sm text-muted-foreground hover:text-foreground"
          onClick={onSkip}
        >
          Skip →
        </Button>
      </div>
    </div>
  );
}
