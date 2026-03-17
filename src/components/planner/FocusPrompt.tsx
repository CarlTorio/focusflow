import { useState } from "react";
import { Target, Sparkles, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScheduleWithTask } from "@/hooks/usePlanner";
import { format, parseISO } from "date-fns";

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
};

interface FocusPromptProps {
  userName: string;
  projects: ScheduleWithTask[];
  otherProjects: ScheduleWithTask[];
  isWhatsNext: boolean;
  onSelect: (taskId: string) => void;
}

function ProjectButton({ s, onSelect }: { s: ScheduleWithTask; onSelect: (taskId: string) => void }) {
  const task = s.task!;
  const allSubtasks = task.subtasks || [];
  const doneCount = allSubtasks.filter((st) => st.is_completed).length;
  const totalCount = allSubtasks.length;
  const progressPct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
  const dueDate = task.due_date;

  return (
    <button
      onClick={() => onSelect(s.task_id)}
      className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-md hover:bg-primary/5 active:scale-[0.98]"
    >
      <div className={cn("h-3 w-3 rounded-full shrink-0", PRIORITY_DOT[task.priority || "none"])} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{task.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {totalCount > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {doneCount}/{totalCount} subtasks done
            </span>
          )}
          {dueDate && (
            <>
              {totalCount > 0 && <span className="text-[11px] text-muted-foreground">·</span>}
              <span className="text-[11px] text-muted-foreground">
                Due {format(parseISO(dueDate), "MMM d")}
              </span>
            </>
          )}
        </div>
        {totalCount > 0 && (
          <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                progressPct > 60 ? "bg-emerald-500" : progressPct >= 30 ? "bg-amber-500" : "bg-red-500"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
    </button>
  );
}

export function FocusPrompt({ userName, projects, otherProjects, isWhatsNext, onSelect }: FocusPromptProps) {
  const firstName = userName.split(" ")[0] || "there";
  const [showOthers, setShowOthers] = useState(false);

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
            {isWhatsNext ? `Great job! What's next, ${firstName}?` : `What to focus on today, ${firstName}?`}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isWhatsNext
              ? "Pick your next priority to keep the momentum going"
              : "Choose one project to focus on — one at a time"}
          </p>
        </div>
      </div>

      {/* High-priority project choices */}
      {projects.length > 0 && (
        <div className="space-y-2">
          {projects.map((s) => (
            <ProjectButton key={s.task_id} s={s} onSelect={onSelect} />
          ))}
        </div>
      )}

      {/* Other priority choices (collapsible) */}
      {otherProjects.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowOthers((p) => !p)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs transition-colors hover:bg-muted/50"
          >
            {showOthers ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="font-medium text-muted-foreground">
              {showOthers ? "Hide other projects" : `${otherProjects.length} other project${otherProjects.length > 1 ? "s" : ""} available`}
            </span>
          </button>

          {showOthers && (
            <div className="space-y-2 mt-2 animate-in fade-in-0 duration-150">
              <p className="text-[11px] text-muted-foreground px-1 mb-1">
                Not feeling a high-priority project? Pick one of these instead.
              </p>
              {otherProjects.map((s) => (
                <ProjectButton key={s.task_id} s={s} onSelect={onSelect} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
