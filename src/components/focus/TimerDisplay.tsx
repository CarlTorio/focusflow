import { formatTime } from "@/hooks/useFocusTimer";
import { CountdownRing } from "./CountdownRing";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TimerMode } from "@/hooks/useFocusTimer";

interface TimerDisplayProps {
  elapsedMs: number;
  mode: TimerMode;
  progress: number;
  isCountdown: boolean;
  onModeChange: (mode: TimerMode) => void;
}

export function TimerDisplay({ elapsedMs, mode, progress, isCountdown, onModeChange }: TimerDisplayProps) {
  const timeStr = formatTime(elapsedMs);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex items-center justify-center">
        {isCountdown && (
          <CountdownRing
            progress={progress}
            size={220}
            strokeWidth={6}
          />
        )}
        <span
          className={`font-mono font-bold text-foreground tabular-nums tracking-tight ${
            isCountdown ? "absolute" : ""
          } text-5xl md:text-7xl lg:text-8xl`}
        >
          {timeStr}
        </span>
      </div>

      <Tabs value={mode} onValueChange={(v) => onModeChange(v as TimerMode)} className="mt-2">
        <TabsList className="h-8">
          <TabsTrigger value="stopwatch" className="text-xs px-3 py-1">Stopwatch</TabsTrigger>
          <TabsTrigger value="countdown" className="text-xs px-3 py-1">Countdown</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
