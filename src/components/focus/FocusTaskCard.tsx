import type { FocusSchedule } from "@/hooks/useFocusTask";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const priorityColors: Record<string, string> = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-success text-success-foreground",
  none: "bg-muted text-muted-foreground",
};

interface FocusTaskCardProps {
  schedule: FocusSchedule;
  className?: string;
}

export function FocusTaskCard({ schedule, className = "" }: FocusTaskCardProps) {
  const { task, subtasks } = schedule;
  const completedSubtasks = subtasks.filter((s) => s.is_completed).length;
  const subtaskProgress = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;

  return (
    <div className={`bg-card rounded-2xl p-6 md:p-8 shadow-lg border border-border/50 max-w-[500px] w-full ${className}`}>
      {task.icon_emoji && (
        <div className="text-center mb-3">
          <span className="text-5xl">{task.icon_emoji}</span>
        </div>
      )}

      <h2 className="text-xl md:text-2xl font-bold text-card-foreground text-center font-heading line-clamp-2">
        {task.title}
      </h2>

      {task.description && (
        <p className="mt-2 text-sm text-muted-foreground text-center line-clamp-3">
          {task.description}
        </p>
      )}

      <div className="flex justify-center mt-3">
        <Badge className={`text-xs uppercase font-semibold ${priorityColors[task.priority] || priorityColors.none}`}>
          {task.priority}
        </Badge>
      </div>

      <p className="mt-3 text-sm text-muted-foreground text-center">
        {schedule.allocated_hours} {schedule.allocated_hours === 1 ? "hour" : "hours"} allocated
      </p>

      {subtasks.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{completedSubtasks}/{subtasks.length} subtasks done</span>
            <span>{Math.round(subtaskProgress)}%</span>
          </div>
          <Progress value={subtaskProgress} className="h-2" />
        </div>
      )}
    </div>
  );
}
