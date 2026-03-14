import { useState } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { Task } from "@/hooks/useTasks";

const PRIORITY_BORDER: Record<string, string> = {
  high: "border-l-red-500",
  medium: "border-l-amber-500",
  low: "border-l-emerald-500",
  none: "border-l-gray-400",
};

const DEFAULT_EMOJIS = ["📋", "✏️", "📌", "🎯", "💡", "🔧", "📝", "🚀"];

interface TaskCardProps {
  task: Task;
  onComplete: (taskId: string) => void;
  onUncomplete: (taskId: string) => void;
}

export function TaskCard({ task, onComplete, onUncomplete }: TaskCardProps) {
  const [animating, setAnimating] = useState(false);
  const isCompleted = task.status === "completed";

  const handleToggle = () => {
    setAnimating(true);
    setTimeout(() => {
      if (isCompleted) {
        onUncomplete(task.id);
      } else {
        onComplete(task.id);
      }
      setAnimating(false);
    }, 250);
  };

  const emoji = task.icon_emoji || DEFAULT_EMOJIS[Math.abs(task.title.charCodeAt(0)) % DEFAULT_EMOJIS.length];

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border-l-4 bg-card p-3.5 shadow-sm transition-all duration-200",
        PRIORITY_BORDER[task.priority] || "border-l-gray-400",
        animating && "scale-[1.02] opacity-80",
        isCompleted && "opacity-60"
      )}
    >
      {/* Icon */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
        style={{ backgroundColor: task.icon_color || "hsl(var(--primary-light))" }}
      >
        {emoji}
      </div>

      {/* Title */}
      <span className={cn("flex-1 text-sm font-medium text-foreground", isCompleted && "line-through text-muted-foreground")}>
        {task.title}
      </span>

      {/* Checkbox */}
      <button
        onClick={handleToggle}
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition-colors",
          isCompleted
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border hover:border-primary"
        )}
      >
        {isCompleted && <Check className="h-4 w-4" />}
      </button>
    </div>
  );
}
