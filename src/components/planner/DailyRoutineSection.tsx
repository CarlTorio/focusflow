import { useState, useEffect, useMemo, useCallback } from "react";
import { ChevronDown, ChevronUp, GripVertical, Clock, MoreHorizontal, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRoutines, Routine } from "@/hooks/useRoutines";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DailyRoutineSectionProps {
  onEditRoutine: (routine: Routine) => void;
}

function isExpired(deadlineTime: string | null): boolean {
  if (!deadlineTime) return false;
  const now = new Date();
  const [h, m] = deadlineTime.split(":").map(Number);
  const deadline = new Date();
  deadline.setHours(h, m, 0, 0);
  return now > deadline;
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ─── Sortable Routine Item ────────────────────────────────────────────────────
function SortableRoutineItem({
  routine,
  isCompleted,
  expired,
  onToggle,
  onEdit,
  onRemove,
}: {
  routine: Routine;
  isCompleted: boolean;
  expired: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: routine.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const canToggle = !expired || isCompleted;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-start gap-2 rounded-xl px-3 py-2.5 transition-all group",
        isDragging && "shadow-lg bg-card z-50 opacity-90",
        !isDragging && "bg-card/50"
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="mt-1 shrink-0 cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Checkbox */}
      <button
        onClick={canToggle ? onToggle : undefined}
        disabled={!canToggle}
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all",
          isCompleted
            ? "border-primary bg-primary text-primary-foreground"
            : expired
            ? "border-muted-foreground/30 bg-muted/50 cursor-not-allowed"
            : "border-border hover:border-primary"
        )}
      >
        {isCompleted && <Check className="h-4 w-4" />}
      </button>

      {/* Text area */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => routine.description && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-medium transition-all",
              isCompleted && "line-through opacity-50",
              expired && !isCompleted && "opacity-40"
            )}
          >
            {routine.title}
          </span>
          {expired && !isCompleted && (
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
              Expired
            </span>
          )}
        </div>

        {routine.description && !expanded && (
          <p className={cn(
            "text-xs text-muted-foreground truncate mt-0.5",
            (isCompleted || (expired && !isCompleted)) && "opacity-50"
          )}>
            {routine.description}
          </p>
        )}

        {routine.description && expanded && (
          <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
            {routine.description}
          </p>
        )}

        {routine.deadline_time && (
          <div className={cn(
            "flex items-center gap-1 mt-1",
            (isCompleted || (expired && !isCompleted)) && "opacity-50"
          )}>
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">
              Before {formatTime(routine.deadline_time)}
            </span>
          </div>
        )}
      </div>

      {/* Options menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={onRemove} className="text-destructive">Remove</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────
export function DailyRoutineSection({ onEditRoutine }: DailyRoutineSectionProps) {
  const { routines, completions, toggleCompletion, removeRoutine, reorderRoutines } = useRoutines();
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("routine_collapsed");
    return saved === "true";
  });
  const [removeTarget, setRemoveTarget] = useState<Routine | null>(null);
  const [, setTick] = useState(0);

  // Re-check expired state every minute
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem("routine_collapsed", String(collapsed));
  }, [collapsed]);

  const completionSet = useMemo(
    () => new Set(completions.map((c) => c.routine_id)),
    [completions]
  );

  const completedCount = useMemo(
    () => routines.filter((r) => completionSet.has(r.id)).length,
    [routines, completionSet]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = routines.findIndex((r) => r.id === active.id);
      const newIndex = routines.findIndex((r) => r.id === over.id);
      const newOrder = arrayMove(routines, oldIndex, newIndex);
      reorderRoutines.mutate(newOrder.map((r) => r.id));
    },
    [routines, reorderRoutines]
  );

  if (routines.length === 0) return null;

  return (
    <>
      <div className="mb-4 rounded-2xl border border-border/50 bg-secondary/30 overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-between px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">Daily Routine</span>
            <span className="text-xs text-muted-foreground">
              {collapsed
                ? `${completedCount}/${routines.length} done`
                : `${routines.length} items`}
            </span>
          </div>
          {collapsed ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Routine list */}
        {!collapsed && (
          <div className="px-2 pb-2 space-y-1 animate-in fade-in-0 duration-150">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={routines.map((r) => r.id)}
                strategy={verticalListSortingStrategy}
              >
                {routines.map((routine) => {
                  const completed = completionSet.has(routine.id);
                  const expired = isExpired(routine.deadline_time) && !completed;
                  return (
                    <SortableRoutineItem
                      key={routine.id}
                      routine={routine}
                      isCompleted={completed}
                      expired={expired}
                      onToggle={() =>
                        toggleCompletion.mutate({
                          routineId: routine.id,
                          isCompleted: completed,
                        })
                      }
                      onEdit={() => onEditRoutine(routine)}
                      onRemove={() => setRemoveTarget(routine)}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>

      {/* Remove confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeTarget?.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove this from your daily routine? Historical data will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeTarget) removeRoutine.mutate(removeTarget.id);
                setRemoveTarget(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
