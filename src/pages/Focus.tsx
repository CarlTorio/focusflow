import { useState, useCallback } from "react";
import { ArrowLeft, Check, Coffee } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MobileHeader } from "@/components/navigation/MobileHeader";
import { Button } from "@/components/ui/button";
import { DecorativeShapes } from "@/components/DecorativeShapes";
import { useFocusTask } from "@/hooks/useFocusTask";
import { useFocusTimer } from "@/hooks/useFocusTimer";
import { FocusTaskCard } from "@/components/focus/FocusTaskCard";
import { TimerDisplay } from "@/components/focus/TimerDisplay";
import { TimerControls } from "@/components/focus/TimerControls";
import { TaskQueueIndicator } from "@/components/focus/TaskQueueIndicator";
import { BreakOverlay } from "@/components/focus/BreakOverlay";
import { EmptyFocusState } from "@/components/focus/EmptyFocusState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function Focus() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentSchedule, nextSchedule, remainingSchedules, allDone, isLoading, completeSchedule, skipSchedule } = useFocusTask();
  const [onBreak, setOnBreak] = useState(false);
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  const [transitioning, setTransitioning] = useState<"left" | "right" | null>(null);

  const countdownSeconds = currentSchedule ? currentSchedule.allocated_hours * 3600 : 0;

  const timer = useFocusTimer({
    countdownSeconds,
    onCountdownEnd: () => {
      toast({ title: `Time's up! Great work on ${currentSchedule?.task.title}` });
    },
  });

  const triggerTransition = useCallback((cb: () => void) => {
    setTransitioning("left");
    setTimeout(() => {
      timer.reset();
      cb();
      setTransitioning("right");
      setTimeout(() => setTransitioning(null), 400);
    }, 400);
  }, [timer]);

  const handleComplete = () => {
    if (!currentSchedule) return;
    triggerTransition(() => completeSchedule.mutate(currentSchedule.id));
  };

  const handleSkipConfirm = () => {
    if (!currentSchedule) return;
    setSkipDialogOpen(false);
    triggerTransition(() => skipSchedule.mutate(currentSchedule.id));
  };

  const handleBreak = () => {
    timer.pause();
    setOnBreak(true);
  };

  const handleResume = () => {
    setOnBreak(false);
    timer.start();
  };

  const now = new Date();
  const currentTime = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-5rem)] md:min-h-screen overflow-hidden"
      style={{ background: "linear-gradient(180deg, hsl(264 100% 97%) 0%, hsl(264 60% 93%) 100%)" }}
    >
      <DecorativeShapes opacity={0.06} />

      {/* Minimal top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-4 md:pt-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-card/60 transition-colors text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-xs text-muted-foreground tabular-nums">{currentTime}</span>
      </div>

      <MobileHeader title="Focus" />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 py-6 md:py-12 min-h-[calc(100vh-12rem)] md:min-h-[calc(100vh-8rem)]">
        {allDone ? (
          <EmptyFocusState />
        ) : currentSchedule ? (
          <div className={`flex flex-col items-center gap-6 md:gap-8 w-full transition-all duration-400 ${
            transitioning === "left" ? "animate-slide-out-left" : transitioning === "right" ? "animate-slide-in-right" : "animate-fade-in"
          }`}>
            <FocusTaskCard schedule={currentSchedule} />

            <TimerDisplay
              elapsedMs={timer.elapsedMs}
              mode={timer.mode}
              progress={timer.progress}
              isCountdown={timer.mode === "countdown"}
              onModeChange={timer.switchMode}
            />

            <TimerControls
              isRunning={timer.isRunning}
              onStart={timer.start}
              onPause={timer.pause}
              onReset={timer.reset}
              onSkip={() => setSkipDialogOpen(true)}
            />

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-[500px]">
              <Button
                onClick={handleComplete}
                className="flex-1 bg-success text-success-foreground hover:bg-success/90 h-12 text-base"
              >
                <Check className="h-5 w-5 mr-2" />
                Done — Complete Task
              </Button>
              <Button
                variant="outline"
                onClick={handleBreak}
                className="flex-1 border-primary text-primary hover:bg-primary/5 h-12 text-base"
              >
                <Coffee className="h-5 w-5 mr-2" />
                Take a Break
              </Button>
            </div>

            <TaskQueueIndicator next={nextSchedule} remaining={remainingSchedules} />
          </div>
        ) : null}
      </div>

      {/* Break overlay */}
      {onBreak && <BreakOverlay onResume={handleResume} />}

      {/* Skip confirmation */}
      <AlertDialog open={skipDialogOpen} onOpenChange={setSkipDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skip this task?</AlertDialogTitle>
            <AlertDialogDescription>
              {currentSchedule?.task.title} will be marked as skipped. You can find it in your Planner.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSkipConfirm}>Skip</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
