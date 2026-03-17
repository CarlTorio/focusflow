import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, GripVertical, MoreHorizontal, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
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
import { useRoutines, Routine } from "@/hooks/useRoutines";
import { usePlanner, CreateTaskInput, SubtaskInput } from "@/hooks/usePlanner";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { RoutineForm } from "@/components/planner/RoutineForm";
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
import { CalendarIcon, Plus, X } from "lucide-react";

// ─── Constants ─────────────────────────────────────────────────────────────────
const SIMPLE_HOURS = [0.25, 0.5, 1, 1.5, 2, 3];
const PRIORITIES = [
  { value: "high", label: "HIGH", color: "bg-destructive text-destructive-foreground" },
  { value: "medium", label: "MED", color: "bg-warning text-warning-foreground" },
  { value: "low", label: "LOW", color: "bg-success text-success-foreground" },
];

function HourPills({ options, value, onChange }: { options: number[]; value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((h) => (
        <button key={h} type="button" onClick={() => onChange(h)}
          className={cn("rounded-full px-3 py-1 text-xs font-semibold border transition-all",
            value === h ? "bg-primary border-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/50"
          )}>{h < 1 ? `${h * 60}m` : `${h}h`}</button>
      ))}
    </div>
  );
}

function PriorityPills({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {PRIORITIES.map((p) => (
        <button key={p.value} type="button" onClick={() => onChange(p.value)}
          className={cn("rounded-xl px-3 py-1.5 text-xs font-bold border-2 transition-all",
            value === p.value ? `${p.color} border-transparent` : "border-border text-muted-foreground"
          )}>{p.label}</button>
      ))}
    </div>
  );
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ─── Sortable Subtask Item ────────────────────────────────────────────────────
function SortableSubtaskItem({
  id,
  index,
  title,
  onUpdate,
  onRemove,
}: {
  id: string;
  index: number;
  title: string;
  onUpdate: (val: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style}
      className={cn("flex items-center gap-2", isDragging && "opacity-50 z-50")}>
      <button {...attributes} {...listeners}
        className="shrink-0 cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground">
        <GripVertical className="h-4 w-4" />
      </button>
      <Input
        value={title}
        onChange={(e) => onUpdate(e.target.value)}
        placeholder={`Subtask ${index + 1}`}
        className="rounded-xl flex-1 text-sm"
      />
      <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Sortable Routine Management Item ─────────────────────────────────────────
function SortableManageItem({
  routine,
  onEdit,
  onRemove,
}: {
  routine: Routine;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: routine.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style}
      className={cn("flex items-center gap-2 rounded-xl px-3 py-2.5 transition-all group",
        isDragging && "shadow-lg bg-card z-50 opacity-90", !isDragging && "bg-card/50"
      )}>
      <button {...attributes} {...listeners}
        className="shrink-0 cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground">
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium block truncate">{routine.title}</span>
        {routine.deadline_time && (
          <div className="flex items-center gap-1 mt-0.5">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">Before {formatTime(routine.deadline_time)}</span>
          </div>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
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

// ─── Routine Tab with Management ──────────────────────────────────────────────
function RoutineTabWithManagement({
  onSaveRoutine,
  editRoutine,
  onEditRoutine,
  isSaving,
}: {
  onSaveRoutine: (input: { id?: string; title: string; description?: string; deadline_time?: string }) => void;
  editRoutine: Routine | null;
  onEditRoutine: (routine: Routine) => void;
  isSaving?: boolean;
}) {
  const { routines, removeRoutine, reorderRoutines } = useRoutines();
  const [removeTarget, setRemoveTarget] = useState<Routine | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = routines.findIndex((r) => r.id === active.id);
    const newIndex = routines.findIndex((r) => r.id === over.id);
    const newOrder = arrayMove(routines, oldIndex, newIndex);
    reorderRoutines.mutate(newOrder.map((r) => r.id));
  }, [routines, reorderRoutines]);

  return (
    <>
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-bold mb-3">{editRoutine ? "Edit Routine" : "Add New Routine"}</h3>
          <RoutineForm onSave={onSaveRoutine} editRoutine={editRoutine} isSaving={isSaving} />
        </div>

        {routines.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-sm font-bold mb-3">Your Routines ({routines.length})</h3>
              <p className="text-xs text-muted-foreground mb-3">Drag to reorder. This order is used on your planner.</p>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={routines.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1">
                    {routines.map((routine) => (
                      <SortableManageItem
                        key={routine.id}
                        routine={routine}
                        onEdit={() => onEditRoutine(routine)}
                        onRemove={() => setRemoveTarget(routine)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </>
        )}
      </div>

      <AlertDialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeTarget?.title}?</AlertDialogTitle>
            <AlertDialogDescription>Remove this from your daily routine? Historical data will be preserved.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (removeTarget) removeRoutine.mutate(removeTarget.id); setRemoveTarget(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Project Tab (Simplified) ─────────────────────────────────────────────────
function ProjectTab({ onSave, defaultDate }: { onSave: (i: CreateTaskInput) => void; defaultDate: Date }) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(addDays(new Date(), 3));
  const [priority, setPriority] = useState("low");
  const [subtasks, setSubtasks] = useState<SubtaskInput[]>([{ title: "" }]);
  const [error, setError] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const subtaskIds = subtasks.map((_, i) => `subtask-${i}`);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = subtaskIds.indexOf(active.id as string);
    const newIndex = subtaskIds.indexOf(over.id as string);
    setSubtasks((prev) => arrayMove(prev, oldIndex, newIndex));
  }, [subtaskIds]);

  const addSubtask = () => {
    if (subtasks.length >= 30) return;
    setSubtasks((prev) => [...prev, { title: "" }]);
  };
  const removeSubtask = (i: number) => setSubtasks((prev) => prev.filter((_, j) => j !== i));
  const updateSubtask = (i: number, val: string) =>
    setSubtasks((prev) => prev.map((s, j) => (j === i ? { ...s, title: val } : s)));

  const validSubtasks = subtasks.filter((s) => s.title.trim());
  const canSave = !!title.trim();

  const save = () => {
    setError("");
    if (!title.trim()) return;
    onSave({
      kind: "project",
      title: title.trim(),
      estimated_hours: 0,
      due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : undefined,
      priority,
      subtasks: validSubtasks,
    });
  };

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">Task with a deadline — we'll schedule it for you</p>
      
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's the project?" className="rounded-xl text-base focus-visible:ring-primary" autoFocus />

      <div>
        <label className="mb-2 block text-sm font-semibold">Due Date</label>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("flex-1 justify-start rounded-xl font-normal", !dueDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />{dueDate ? format(dueDate, "MMM d, yyyy") : "No due date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[200]" align="start">
              <Calendar mode="single" selected={dueDate ?? undefined} onSelect={(d) => d && setDueDate(d)} disabled={(d) => d <= new Date()} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          {dueDate && (
            <Button variant="ghost" size="icon" className="shrink-0 rounded-xl text-muted-foreground hover:text-destructive" onClick={() => setDueDate(null)}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">Priority</label>
        <PriorityPills value={priority} onChange={setPriority} />
      </div>

      {/* Subtasks with drag-to-reorder */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold">Break it down into subtasks</p>
          <p className="text-xs text-muted-foreground">Each subtask gets scheduled on a different day</p>
          {subtasks.length > 1 && (
            <p className="text-[10px] text-primary mt-1 font-medium">↕ Drag to reorder. First subtask = first day.</p>
          )}
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={subtaskIds} strategy={verticalListSortingStrategy}>
            {subtasks.map((st, i) => (
              <SortableSubtaskItem
                key={subtaskIds[i]}
                id={subtaskIds[i]}
                index={i}
                title={st.title}
                onUpdate={(val) => updateSubtask(i, val)}
                onRemove={() => removeSubtask(i)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {subtasks.length < 30 && (
          <Button type="button" variant="outline" size="sm" onClick={addSubtask} className="rounded-xl w-full border-dashed">
            <Plus className="mr-1 h-3.5 w-3.5" /> Add Subtask
          </Button>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive font-medium">{error}</p>
      )}

      <Button onClick={save} disabled={!canSave} className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
        Schedule Project
      </Button>
    </div>
  );
}

// ─── Simple Tab ───────────────────────────────────────────────────────────────
function SimpleTab({ onSave, defaultDate }: { onSave: (i: CreateTaskInput) => void; defaultDate: Date }) {
  const today = new Date();
  const [title, setTitle] = useState("");
  const [hours, setHours] = useState<number | null>(null);
  const [priority, setPriority] = useState("low");
  const [when, setWhen] = useState<"today" | "tomorrow" | "pick">("today");
  const [pickedDate, setPickedDate] = useState<Date>(defaultDate);

  const dateStr = when === "today" ? format(today, "yyyy-MM-dd") : when === "tomorrow" ? format(addDays(today, 1), "yyyy-MM-dd") : format(pickedDate, "yyyy-MM-dd");
  const canSave = title.trim() && hours !== null;

  const save = () => {
    if (!canSave) return;
    onSave({ kind: "simple", title: title.trim(), estimated_hours: hours!, priority, scheduled_date: dateStr });
  };

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">Simple to-do — just get it done</p>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What do you need to do?" className="rounded-xl text-base focus-visible:ring-primary" autoFocus />
      <div>
        <label className="mb-2 block text-sm font-semibold">Estimated Time</label>
        <HourPills options={SIMPLE_HOURS} value={hours} onChange={setHours} />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold">Priority</label>
        <PriorityPills value={priority} onChange={setPriority} />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold">When</label>
        <div className="flex gap-2 flex-wrap">
          {(["today", "tomorrow", "pick"] as const).map((w) => (
            <button key={w} type="button" onClick={() => setWhen(w)}
              className={cn("rounded-xl px-3 py-1.5 text-sm font-medium border-2 capitalize transition-all",
                when === w ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
              )}>{w === "pick" ? "Pick date" : w.charAt(0).toUpperCase() + w.slice(1)}</button>
          ))}
        </div>
        {when === "pick" && (
          <div className="mt-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="rounded-xl font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{format(pickedDate, "MMM d, yyyy")}</Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[200]" align="start">
                <Calendar mode="single" selected={pickedDate} onSelect={(d) => d && setPickedDate(d)} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
      <Button onClick={save} disabled={!canSave} className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">Add Task</Button>
    </div>
  );
}

// ─── Full-Page Add Task ───────────────────────────────────────────────────────
export default function AddTask() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const defaultDateStr = searchParams.get("date");
  const defaultTab = (searchParams.get("tab") as "project" | "routine" | "simple") || "project";
  const editRoutineId = searchParams.get("editRoutine");

  const defaultDate = defaultDateStr ? new Date(defaultDateStr) : new Date();

  const { addRoutine, updateRoutine, routines } = useRoutines();
  const { createTask } = usePlanner(format(defaultDate, "yyyy-MM-dd"), format(defaultDate, "yyyy-MM-dd"));

  const [tab, setTab] = useState<"project" | "routine" | "simple">(defaultTab);
  const [editRoutine, setEditRoutine] = useState<Routine | null>(() => {
    if (editRoutineId) {
      return routines.find((r) => r.id === editRoutineId) || null;
    }
    return null;
  });

  const tabs = [
    { id: "project" as const, label: "Project" },
    { id: "routine" as const, label: "Routine" },
    { id: "simple" as const, label: "Quick" },
  ];

  const handleSaveTask = (input: CreateTaskInput) => {
    createTask.mutate(input, {
      onSuccess: () => {
        toast({ title: "Task created!" });
        navigate(-1);
      },
    });
  };

  const handleSaveRoutine = (input: { id?: string; title: string; description?: string; deadline_time?: string }) => {
    if (input.id) {
      updateRoutine.mutate({ id: input.id, ...input }, {
        onSuccess: () => {
          toast({ title: "Routine updated!" });
          setEditRoutine(null);
        },
      });
    } else {
      addRoutine.mutate(input, {
        onSuccess: () => {
          toast({ title: "Routine added!" });
        },
      });
    }
  };

  const handleEditRoutine = (routine: Routine) => {
    setEditRoutine(routine);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <h1 className="text-base font-bold">{editRoutine ? "Edit Routine" : "Add Task"}</h1>
          <div className="w-16" />
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 pb-28">
        <div className="flex rounded-xl border border-border p-1 bg-muted/30 mb-6">
          {tabs.map((t) => (
            <button key={t.id} type="button" onClick={() => { setTab(t.id); setEditRoutine(null); }}
              className={cn("flex-1 rounded-lg py-2 text-sm font-semibold transition-all",
                tab === t.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              )}>{t.label}</button>
          ))}
        </div>

        {tab === "project" && <ProjectTab onSave={handleSaveTask} defaultDate={defaultDate} />}
        {tab === "routine" && (
          <RoutineTabWithManagement
            onSaveRoutine={handleSaveRoutine}
            editRoutine={editRoutine}
            onEditRoutine={handleEditRoutine}
            isSaving={addRoutine.isPending || updateRoutine.isPending}
          />
        )}
        {tab === "simple" && <SimpleTab onSave={handleSaveTask} defaultDate={defaultDate} />}
      </div>
    </div>
  );
}
