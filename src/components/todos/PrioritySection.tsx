import { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskCard } from "./TaskCard";
import type { Task } from "@/hooks/useTasks";

interface PrioritySectionProps {
  label: string;
  color: string;
  dotColor: string;
  tasks: Task[];
  placeholder: string;
  defaultOpen?: boolean;
  onAdd: () => void;
  onComplete: (taskId: string) => void;
  onUncomplete: (taskId: string) => void;
  showAdd?: boolean;
}

export function PrioritySection({
  label,
  dotColor,
  tasks,
  placeholder,
  defaultOpen = true,
  onAdd,
  onComplete,
  onUncomplete,
  showAdd = true,
}: PrioritySectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen(!open)}
          className="flex flex-1 items-center gap-2 py-1"
        >
          <span className={cn("h-2.5 w-2.5 rounded-full")} style={{ backgroundColor: dotColor }} />
          <span className="text-xs font-bold tracking-wider text-foreground uppercase">{label}</span>
          <span className="text-xs text-muted-foreground">({tasks.length})</span>
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </button>
        {showAdd && (
          <button
            onClick={onAdd}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Content */}
      {open && (
        <div className="space-y-2 animate-in fade-in-0 slide-in-from-top-1 duration-150">
          {tasks.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">{placeholder}</p>
            </div>
          ) : (
            tasks.map(task => (
              <TaskCard key={task.id} task={task} onComplete={onComplete} onUncomplete={onUncomplete} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
