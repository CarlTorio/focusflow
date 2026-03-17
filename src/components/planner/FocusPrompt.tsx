import { Target, Sparkles, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScheduleWithTask } from "@/hooks/usePlanner";
import { format, parseISO } from "date-fns";

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
  none: "bg-muted-foreground/40",
};

interface FocusPromptProps {
  userName: string;
  projects: ScheduleWithTask[];
  isWhatsNext: boolean;
  onSelect: (taskId: string) => void;
}

export function FocusPrompt({ userName, projects, isWhatsNext, onSelect }: FocusPromptProps) {
  const firstName = userName.split(" ")[0] || "there";

  return (
    <div className="mb-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10 p-5 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          {isWhatsNext ? (
            <Sparkles className="h-5 w-5 text-primary" />
          ) : (
            <Target className="h-5 w-5 text-primary" />
          )}
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">
            {isWhatsNext ? "Great job! What's next?" : `What to focus on today, ${firstName}?`}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isWhatsNext
              ? "Pick your next priority to keep the momentum going"
              : "Choose one project to focus on — one at a time"}
          </p>
        </div>
      </div>

      {/* Project choices */}
      <div className="space-y-2">
        {projects.map((s) => {
          const task = s.task!;
          const allSubtasks = task.subtasks || [];
          const doneCount = allSubtasks.filter((st) => st.is_completed).length;
          const totalCount = allSubtasks.length;
          const progressPct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
          const dueDate = task.due_date;

          return (
            <button
              key={s.task_id}
              onClick={() => onSelect(s.task_id)}
              className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-md hover:bg-primary/5 active:scale-[0.98]"
            >
              <div className={cn("h-3 w-3 rounded-full shrink-0", PRIORITY_DOT[task.priority || "none"])} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{task.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-muted-foreground">
                    {doneCount}/{totalCount} subtasks done
                  </span>
                  {dueDate && (
                    <>
                      <span className="text-[11px] text-muted-foreground">·</span>
                      <span className="text-[11px] text-muted-foreground">
                        Due {format(parseISO(dueDate), "MMM d")}
                      </span>
                    </>
                  )}
                </div>
                {/* Mini progress */}
                <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      progressPct > 60 ? "bg-emerald-500" : progressPct >= 30 ? "bg-amber-500" : "bg-red-500"
                    )}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
