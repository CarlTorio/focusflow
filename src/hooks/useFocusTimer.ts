import { useState, useRef, useCallback, useEffect } from "react";

export type TimerMode = "stopwatch" | "countdown";

interface UseFocusTimerOptions {
  countdownSeconds?: number;
  onCountdownEnd?: () => void;
}

export function useFocusTimer(options: UseFocusTimerOptions = {}) {
  const [mode, setMode] = useState<TimerMode>("stopwatch");
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const countdownTotal = (options.countdownSeconds || 0) * 1000;

  const STORAGE_KEY = "focusflow_timer_start";

  const tick = useCallback(() => {
    if (startTimeRef.current !== null) {
      const now = Date.now();
      setElapsedMs(accumulatedRef.current + (now - startTimeRef.current));
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(() => {
    if (isRunning) return;
    startTimeRef.current = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      startTime: startTimeRef.current,
      accumulated: accumulatedRef.current,
      mode,
    }));
    setIsRunning(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [isRunning, tick, mode]);

  const pause = useCallback(() => {
    if (!isRunning) return;
    if (startTimeRef.current !== null) {
      accumulatedRef.current += Date.now() - startTimeRef.current;
    }
    startTimeRef.current = null;
    setIsRunning(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    localStorage.removeItem(STORAGE_KEY);
  }, [isRunning]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setElapsedMs(0);
    accumulatedRef.current = 0;
    startTimeRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const switchMode = useCallback((newMode: TimerMode) => {
    reset();
    setMode(newMode);
  }, [reset]);

  // Restore timer on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { startTime, accumulated, mode: savedMode } = JSON.parse(stored);
        accumulatedRef.current = accumulated;
        startTimeRef.current = startTime;
        setMode(savedMode);
        setIsRunning(true);
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  // Countdown end detection
  useEffect(() => {
    if (mode === "countdown" && countdownTotal > 0 && elapsedMs >= countdownTotal) {
      pause();
      setElapsedMs(countdownTotal);
      options.onCountdownEnd?.();
    }
  }, [mode, elapsedMs, countdownTotal, pause, options]);

  const displayMs = mode === "countdown"
    ? Math.max(0, countdownTotal - elapsedMs)
    : elapsedMs;

  const progress = mode === "countdown" && countdownTotal > 0
    ? Math.min(1, elapsedMs / countdownTotal)
    : 0;

  return {
    mode,
    switchMode,
    isRunning,
    elapsedMs: displayMs,
    progress,
    start,
    pause,
    reset,
  };
}

export function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
