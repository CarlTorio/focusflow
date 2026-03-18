import { useState } from "react";
import { Check, Plus, Trash2, ChevronDown, ChevronRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { QuickTask } from "@/hooks/useQuickTasks";

interface QuickTaskSectionProps {
  quickTasks: QuickTask[];
  onAdd: (title: string) => void;
  onToggle: (id: string, is_completed: boolean) => void;
  onDelete: (id: string) => void;
  isPast?: boolean;
}

export function QuickTaskSection({ quickTasks, onAdd, onToggle, onDelete, isPast }: QuickTaskSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const completedCount = quickTasks.filter(t => t.is_completed).length;

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    onAdd(newTitle.trim());
    setNewTitle("");
    setShowInput(false);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-2 flex items-center gap-2 text-xs">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex flex-1 items-center gap-2"
        >
          <div className="h-2 w-2 rounded-full shrink-0 bg-emerald-500" />
          <span className="font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Quick Tasks ({quickTasks.length})
          </span>
          <div className="flex-1" />
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
        {!isPast && (
          <button
            onClick={() => setShowInput(true)}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="space-y-2 animate-in fade-in-0 duration-150">
          {quickTasks.map(task => (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border-l-4 border-l-emerald-500 bg-card p-3 shadow-sm transition-all duration-200",
                task.is_completed && "opacity-60"
              )}
            >
              {/* Icon */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <Zap className="h-4 w-4 text-emerald-500" />
              </div>

              {/* Title */}
              <span className={cn(
                "flex-1 text-sm font-medium text-foreground",
                task.is_completed && "line-through text-muted-foreground"
              )}>
                {task.title}
              </span>

              {/* Delete */}
              {!isPast && (
                <button
                  onClick={() => onDelete(task.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Checkbox */}
              <button
                onClick={() => onToggle(task.id, !task.is_completed)}
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors",
                  task.is_completed
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-border hover:border-emerald-500"
                )}
              >
                {task.is_completed && <Check className="h-3.5 w-3.5" />}
              </button>
            </div>
          ))}

          {/* Inline add */}
          {showInput && !isPast && (
            <div className="flex items-center gap-2">
              <Input
                autoFocus
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") { setShowInput(false); setNewTitle(""); }
                }}
                placeholder="Quick task name..."
                className="rounded-xl text-sm flex-1"
              />
              <button
                onClick={handleAdd}
                disabled={!newTitle.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}

          {quickTasks.length === 0 && !showInput && !isPast && (
            <button
              onClick={() => setShowInput(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-700 py-2.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950"
            >
              <Plus className="h-3.5 w-3.5" />
              Add a quick task
            </button>
          )}
        </div>
      )}
    </div>
  );
}
