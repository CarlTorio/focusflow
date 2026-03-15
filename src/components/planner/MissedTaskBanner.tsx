import { AlertTriangle } from "lucide-react";
import type { ScheduleWithTask } from "@/hooks/usePlanner";

interface MissedTaskBannerProps {
  missed: ScheduleWithTask[];
  onAction: (scheduleId: string, action: "tonight" | "adjust" | "skip") => void;
}

export function MissedTaskBanner({ missed, onAction }: MissedTaskBannerProps) {
  if (missed.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {missed.map((s) => {
        const displayTitle = (s as any).display_title || s.task?.title || "a task";
        const parentTitle = s.task?.title || "";
        const subtaskId = (s as any).subtask_id;
        const showParent = subtaskId && displayTitle !== parentTitle;

        return (
          <div
            key={s.id}
            className="rounded-2xl border border-warning/30 bg-warning/10 p-4"
          >
            <div className="mb-2 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-warning shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  You didn't finish{" "}
                  <span className="text-warning">"{displayTitle}"</span> yesterday
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.allocated_hours}h remaining
                  {s.task?.due_date && ` · Due: ${s.task.due_date}`}
                </p>
                {showParent && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Part of: {parentTitle}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onAction(s.id, "tonight")}
                className="rounded-xl bg-warning text-warning-foreground px-3 py-1.5 text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Tapusin ko tonight
              </button>
              <button
                onClick={() => onAction(s.id, "adjust")}
                className="rounded-xl border border-warning/40 text-warning px-3 py-1.5 text-xs font-semibold hover:bg-warning/10 transition-colors"
              >
                Adjust schedule
              </button>
              <button
                onClick={() => onAction(s.id, "skip")}
                className="rounded-xl border border-border text-muted-foreground px-3 py-1.5 text-xs font-semibold hover:text-foreground transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
