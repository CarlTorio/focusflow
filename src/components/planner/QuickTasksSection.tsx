import { useState } from "react";
import { Check, Trash2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuickTask } from "@/hooks/useQuickTasks";

interface QuickTasksSectionProps {
  tasks: QuickTask[];
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}

export function QuickTasksSection({ tasks, onToggle, onDelete }: QuickTasksSectionProps) {
  if (tasks.length === 0) return null;

  const pending = tasks.filter((t) => !t.is_completed);
  const done = tasks.filter((t) => t.is_completed);

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-2 text-xs">
        <Zap className="h-3.5 w-3.5 text-emerald-500" />
        <span className="font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          Quick Tasks ({tasks.length})
        </span>
      </div>
      <div className="space-y-1.5">
        {pending.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 group"
          >
            <button
              onClick={() => onToggle(t.id, true)}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500/40 transition-colors hover:border-emerald-500 hover:bg-emerald-500/10"
            >
              <Check className="h-3 w-3 text-transparent" />
            </button>
            <span className="text-sm font-medium text-foreground flex-1 truncate">
              {t.title}
            </span>
            <button
              onClick={() => onDelete(t.id)}
              className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {done.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5 group opacity-60"
          >
            <button
              onClick={() => onToggle(t.id, false)}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 border-2 border-emerald-500"
            >
              <Check className="h-3 w-3 text-white" />
            </button>
            <span className="text-sm font-medium text-muted-foreground flex-1 truncate line-through">
              {t.title}
            </span>
            <button
              onClick={() => onDelete(t.id)}
              className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
