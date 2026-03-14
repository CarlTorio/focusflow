import { useState } from "react";
import type { FocusSchedule } from "@/hooks/useFocusTask";

interface TaskQueueIndicatorProps {
  next: FocusSchedule | null;
  remaining: FocusSchedule[];
}

export function TaskQueueIndicator({ next, remaining }: TaskQueueIndicatorProps) {
  const [open, setOpen] = useState(false);

  if (!next) {
    return (
      <p className="text-sm text-muted-foreground text-center mt-2">
        This is your last task for today!
      </p>
    );
  }

  return (
    <div className="relative text-center mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Next up: <span className="font-medium">{next.task.title}</span>
        {remaining.length > 1 && ` (+${remaining.length - 1} more)`}
      </button>

      {open && remaining.length > 0 && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-2 bg-card rounded-xl border shadow-lg p-3 w-64 z-20 animate-scale-in">
          <ul className="space-y-2 text-left">
            {remaining.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-sm">
                <span className="text-base">{s.task.icon_emoji || "📌"}</span>
                <span className="text-card-foreground truncate">{s.task.title}</span>
                {s.start_time && (
                  <span className="ml-auto text-xs text-muted-foreground">{s.start_time.slice(0, 5)}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
