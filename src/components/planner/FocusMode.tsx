import { useState, useEffect } from "react";
import { ArrowLeft, Play, Pause, Square, SkipForward, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { ScheduleWithTask } from "@/hooks/usePlanner";
import { useFocusTimer, formatTime } from "@/hooks/useFocusTimer";
import { DecorativeShapes } from "@/components/DecorativeShapes";

interface FocusModeProps {
  schedule: ScheduleWithTask;
  nextSchedule?: ScheduleWithTask | null;
  onBack: () => void;
  onDone: (scheduleId: string, actualHours: number) => void;
  onSkip: (scheduleId: string) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-success text-success-foreground",
  none: "bg-muted text-muted-foreground",
};

export function FocusMode({ schedule, nextSchedule, onBack, onDone, onSkip }: FocusModeProps) {
  const task = schedule.task;
  const allocatedSeconds = Number(schedule.allocated_hours) * 3600;
  const [timerMode, setTimerMode] = useState<"stopwatch" | "countdown">("countdown");
  const [showDoneAnim, setShowDoneAnim] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  const timer = useFocusTimer({
    countdownSeconds: timerMode === "countdown" ? allocatedSeconds : 0,
    onCountdownEnd: () => {
      // auto-notify when time is up
    },
  });

  const subtasks = task?.subtasks || [];
  const completedSubtasks = subtasks.filter((s) => s.is_completed).length;
  const subtaskProgress = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;

  const handleDone = () => {
    setShowDoneAnim(true);
    const actualHours = timer.elapsedMs / 3600000;
    setTimeout(() => {
      onDone(schedule.id, actualHours > 0 ? Number(actualHours.toFixed(2)) : Number(schedule.allocated_hours));
    }, 800);
  };

  const priority = task?.priority || "none";
  const emoji = task?.icon_emoji || "📋";

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/30" />
      <DecorativeShapes />

      <div className="relative z-10 flex flex-col h-full">
        {/* Top bar */}
        <div className="flex items-center px-4 pt-safe-top pt-4 pb-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Planner
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          <div className="mx-auto max-w-md pt-4 space-y-6">

            {/* Task Card */}
            <div className="rounded-2xl bg-card/90 backdrop-blur-sm border border-border/50 p-6 shadow-lg text-center">
              <div className="text-5xl mb-3">{emoji}</div>
              <h2 className="text-xl font-bold font-heading text-foreground leading-tight">
                {task?.title || "Focus Task"}
              </h2>
              {task?.description && (
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{task.description}</p>
              )}
              <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                <Badge className={cn("text-xs font-semibold uppercase", PRIORITY_COLORS[priority])}>
                  {priority}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {schedule.allocated_hours}h allocated
                </span>
              </div>
              {subtasks.length > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{completedSubtasks}/{subtasks.length} steps done</span>
                    <span>{Math.round(subtaskProgress)}%</span>
                  </div>
                  <Progress value={subtaskProgress} className="h-2" />
                </div>
              )}
            </div>

            {/* Timer */}
            <div className="text-center space-y-3">
              {/* Mode toggle */}
              <div className="inline-flex rounded-xl border border-border p-1 bg-card/80">
                {(["countdown", "stopwatch"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => { timer.reset(); setTimerMode(m); }}
                    className={cn(
                      "rounded-lg px-4 py-1.5 text-xs font-semibold transition-all capitalize",
                      timerMode === m ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Time display */}
              <div className="relative">
                {timerMode === "countdown" && (
                  <svg className="absolute inset-0 m-auto" width={180} height={180} viewBox="0 0 180 180">
                    <circle cx={90} cy={90} r={82} stroke="hsl(var(--border))" strokeWidth={6} fill="none" />
                    <circle
                      cx={90} cy={90} r={82}
                      stroke="hsl(var(--primary))"
                      strokeWidth={6}
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 82}`}
                      strokeDashoffset={`${2 * Math.PI * 82 * timer.progress}`}
                      strokeLinecap="round"
                      transform="rotate(-90 90 90)"
                      className="transition-all duration-200"
                    />
                  </svg>
                )}
                <div className={cn("flex items-center justify-center", timerMode === "countdown" ? "h-[180px]" : "")}>
                  <span className="font-mono text-5xl font-bold text-foreground tabular-nums">
                    {formatTime(timer.elapsedMs)}
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  onClick={timer.reset}
                >
                  <Square className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  className="h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
                  onClick={timer.isRunning ? timer.pause : timer.start}
                >
                  {timer.isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
                </Button>
                <button
                  onClick={() => setShowSkipConfirm(true)}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  <SkipForward className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={handleDone}
                className="w-full rounded-xl bg-success text-success-foreground hover:bg-success/90 h-12 text-base font-semibold"
              >
                ✓ Done — Mark Complete
              </Button>
              <Button
                variant="outline"
                onClick={timer.pause}
                className="w-full rounded-xl border-primary/30 text-primary hover:bg-primary/10 h-11"
              >
                <Coffee className="mr-2 h-4 w-4" />
                Take a Break
              </Button>
            </div>

            {/* Next up */}
            {nextSchedule && (
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Next up</p>
                <p className="text-sm font-medium text-foreground">
                  {nextSchedule.task?.icon_emoji || "📋"} {nextSchedule.task?.title}
                </p>
                <p className="text-xs text-muted-foreground">{nextSchedule.allocated_hours}h</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Done animation overlay */}
      {showDoneAnim && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-200">
          <div className="text-center">
            <div className="text-7xl animate-bounce">🎉</div>
            <p className="mt-3 text-xl font-bold font-heading text-foreground">Task Complete!</p>
          </div>
        </div>
      )}

      {/* Skip confirmation */}
      {showSkipConfirm && (
        <div className="absolute inset-0 z-20 flex items-end justify-center bg-background/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-5 space-y-3 shadow-xl">
            <p className="font-semibold text-foreground">Skip this task?</p>
            <p className="text-sm text-muted-foreground">
              This will mark today's schedule as skipped and move to the next task.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setShowSkipConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  onSkip(schedule.id);
                  setShowSkipConfirm(false);
                }}
              >
                Skip
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
