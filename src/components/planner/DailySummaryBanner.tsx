import { useState } from "react";
import { CalendarCheck, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DailySummaryBannerProps {
  totalToday: number;
  carriedCount: number;
}

export function DailySummaryBanner({ totalToday, carriedCount }: DailySummaryBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || (totalToday === 0 && carriedCount === 0)) return null;

  return (
    <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 animate-in fade-in-0 slide-in-from-top-2 duration-300">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <CalendarCheck className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">
            Good morning! You have {totalToday} {totalToday === 1 ? "task" : "tasks"} today
          </p>
          {carriedCount > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
              <ArrowRight className="h-3 w-3" />
              {carriedCount} carried over from yesterday
            </p>
          )}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
