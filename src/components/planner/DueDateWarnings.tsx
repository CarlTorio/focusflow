import { AlertTriangle, AlertOctagon, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface DueSoonTask {
  id: string;
  title: string;
  due_date: string;
  remainingHours: number;
  daysUntilDue: number;
  isOverdue: boolean;
  isDueToday: boolean;
  isDueTomorrow: boolean;
}

interface DueDateWarningsProps {
  tasks: DueSoonTask[];
}

export function DueDateWarnings({ tasks }: DueDateWarningsProps) {
  // Only show urgent ones (today, tomorrow, overdue)
  const urgent = tasks.filter((t) => t.isOverdue || t.isDueToday || t.isDueTomorrow);
  if (urgent.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {urgent.map((t) => {
        const isOverdue = t.isOverdue;
        const isDueToday = t.isDueToday;

        return (
          <div
            key={t.id}
            className={cn(
              "rounded-2xl p-3 flex items-start gap-2",
              isOverdue
                ? "border border-destructive/30 bg-destructive/10"
                : isDueToday
                ? "border border-destructive/20 bg-destructive/5"
                : "border border-warning/20 bg-warning/5"
            )}
          >
            {isOverdue ? (
              <AlertOctagon className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
            ) : isDueToday ? (
              <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
            ) : (
              <Calendar className="h-4 w-4 mt-0.5 text-warning shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">
                {isOverdue
                  ? `🚨 "${t.title}" is overdue by ${Math.abs(t.daysUntilDue)} day(s)`
                  : isDueToday
                  ? `🚨 "${t.title}" is due TODAY!`
                  : `⚠️ "${t.title}" is due TOMORROW!`}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {t.remainingHours}h remaining
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
