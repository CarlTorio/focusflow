import { useState, useRef } from "react";
import { format, addDays } from "date-fns";
import {
  CalendarIcon, Plus, X, GripVertical, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { RoutineForm } from "@/components/planner/RoutineForm";
import type { CreateTaskInput, SubtaskInput } from "@/hooks/usePlanner";
import type { Routine } from "@/hooks/useRoutines";

// ─── Constants ─────────────────────────────────────────────────────────────────
const SIMPLE_HOURS = [0.25, 0.5, 1, 1.5, 2, 3];
const RECURRING_DURATIONS = [0.5, 1, 1.5, 2, 3, 4];
const PRIORITIES = [
  { value: "high", label: "HIGH", color: "bg-destructive text-destructive-foreground" },
  { value: "medium", label: "MED", color: "bg-warning text-warning-foreground" },
  { value: "low", label: "LOW", color: "bg-success text-success-foreground" },
];
const DAYS_OF_WEEK = [
  { label: "S", value: 0 }, { label: "M", value: 1 }, { label: "T", value: 2 },
  { label: "W", value: 3 }, { label: "T", value: 4 }, { label: "F", value: 5 },
  { label: "S", value: 6 },
];

// ─── Sub-components ────────────────────────────────────────────────────────────
function HourPills({
  options, value, onChange,
}: { options: number[]; value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((h) => (
        <button
          key={h}
          type="button"
          onClick={() => onChange(h)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold border transition-all",
            value === h
              ? "bg-primary border-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:border-primary/50"
          )}
        >
          {h < 1 ? `${h * 60}m` : `${h}h`}
        </button>
      ))}
    </div>
  );
}

function PriorityPills({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {PRIORITIES.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(p.value)}
          className={cn(
            "rounded-xl px-3 py-1.5 text-xs font-bold border-2 transition-all",
            value === p.value
              ? `${p.color} border-transparent`
              : "border-border text-muted-foreground"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ─── Project Tab (Simplified) ─────────────────────────────────────────────────
function ProjectTab({ onSave, defaultDate }: { onSave: (i: CreateTaskInput) => void; defaultDate: Date }) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [priority, setPriority] = useState("low");
  const [subtasks, setSubtasks] = useState<SubtaskInput[]>([{ title: "" }]);
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const dragIdx = useRef<number | null>(null);

  const addSubtask = () => {
    if (subtasks.length >= 30) return;
    setSubtasks((prev) => [...prev, { title: "" }]);
  };
  const removeSubtask = (i: number) =>
    setSubtasks((prev) => prev.filter((_, j) => j !== i));
  const updateSubtask = (i: number, val: string) =>
    setSubtasks((prev) => prev.map((s, j) => (j === i ? { ...s, title: val } : s)));

  const handleDragStart = (i: number) => { dragIdx.current = i; };
  const handleDrop = (i: number) => {
    if (dragIdx.current === null || dragIdx.current === i) return;
    const arr = [...subtasks];
    const [moved] = arr.splice(dragIdx.current, 1);
    arr.splice(i, 0, moved);
    setSubtasks(arr);
    dragIdx.current = null;
  };

  const validSubtasks = subtasks.filter((s) => s.title.trim());
  const canSave = title.trim() && validSubtasks.length >= 1;

  const save = () => {
    setError("");
    if (!title.trim()) return;
    if (validSubtasks.length === 0) {
      setError("Add at least one step to your project.");
      return;
    }
    onSave({
      kind: "project",
      title: title.trim(),
      estimated_hours: 0,
      due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : format(addDays(new Date(), 365), "yyyy-MM-dd"),
      priority,
      subtasks: validSubtasks,
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-muted-foreground mb-3">Task with a deadline — we'll schedule it for you</p>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's the project?"
          className="rounded-xl text-base focus-visible:ring-primary"
          autoFocus
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">Due Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full justify-start rounded-xl font-normal", !dueDate && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dueDate ? format(dueDate, "MMM d, yyyy") : "No due date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-[200]" align="start">
            <Calendar
              mode="single"
              selected={dueDate}
              onSelect={(d) => d && setDueDate(d)}
              disabled={(d) => d <= new Date()}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">Priority</label>
        <PriorityPills value={priority} onChange={setPriority} />
      </div>

      {/* Subtasks */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold">Break it down into steps</p>
          <p className="text-xs text-muted-foreground">Each step gets scheduled on a different day</p>
          {subtasks.length > 1 && (
            <p className="text-[10px] text-primary mt-1 font-medium">↕ Drag to reorder. First step = first day.</p>
          )}
        </div>
        {subtasks.map((st, i) => (
          <div
            key={i}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(i)}
            className="flex items-center gap-2"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />
            <Input
              value={st.title}
              onChange={(e) => updateSubtask(i, e.target.value)}
              placeholder={`Step ${i + 1}`}
              className="rounded-xl flex-1 text-sm"
            />
            <button
              type="button"
              onClick={() => removeSubtask(i)}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        {subtasks.length < 30 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSubtask}
            className="rounded-xl w-full border-dashed"
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add Step
          </Button>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive font-medium">{error}</p>
      )}

      <Button
        onClick={save}
        disabled={!canSave}
        className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
      >
        Schedule Project
      </Button>
    </div>
  );
}

// ─── Recurring Tab ─────────────────────────────────────────────────────────────
function RecurringTab({ onSave }: { onSave: (i: CreateTaskInput) => void }) {
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState<number | null>(null);
  const [pattern, setPattern] = useState<"daily" | "weekly">("daily");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [preferredTime, setPreferredTime] = useState("");
  const [priority, setPriority] = useState("low");

  const toggleDay = (d: number) =>
    setSelectedDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );

  const canSave = title.trim() && duration !== null && (pattern === "daily" || selectedDays.length > 0);

  const save = () => {
    if (!canSave) return;
    onSave({
      kind: "recurring",
      title: title.trim(),
      duration_hours: duration!,
      recurrence_pattern: pattern,
      recurrence_days: pattern === "weekly" ? selectedDays : undefined,
      preferred_time: preferredTime || undefined,
      priority,
    });
  };

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">Repeats automatically — set it and forget it</p>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What's the routine?"
        className="rounded-xl text-base focus-visible:ring-primary"
        autoFocus
      />

      <div>
        <label className="mb-2 block text-sm font-semibold">Duration per session</label>
        <HourPills options={RECURRING_DURATIONS} value={duration} onChange={setDuration} />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">Repeat</label>
        <div className="flex gap-2 mb-3">
          {(["daily", "weekly"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPattern(p)}
              className={cn(
                "rounded-xl px-4 py-1.5 text-sm font-medium border-2 capitalize transition-all",
                pattern === p ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
              )}
            >
              {p}
            </button>
          ))}
        </div>
        {pattern === "weekly" && (
          <div className="flex gap-1.5">
            {DAYS_OF_WEEK.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                className={cn(
                  "h-9 w-9 rounded-full text-xs font-bold border-2 transition-all",
                  selectedDays.includes(d.value)
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-border text-muted-foreground"
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold">Preferred Time (optional)</label>
        <Input type="time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} className="rounded-xl w-36" />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">Priority</label>
        <PriorityPills value={priority} onChange={setPriority} />
      </div>

      <Button
        onClick={save}
        disabled={!canSave}
        className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
      >
        Add Recurring Task
      </Button>
    </div>
  );
}

// ─── Simple Tab ────────────────────────────────────────────────────────────────
function SimpleTab({ onSave, defaultDate }: { onSave: (i: CreateTaskInput) => void; defaultDate: Date }) {
  const today = new Date();
  const [title, setTitle] = useState("");
  const [hours, setHours] = useState<number | null>(null);
  const [priority, setPriority] = useState("low");
  const [when, setWhen] = useState<"today" | "tomorrow" | "pick">("today");
  const [pickedDate, setPickedDate] = useState<Date>(defaultDate);

  const dateStr = when === "today"
    ? format(today, "yyyy-MM-dd")
    : when === "tomorrow"
    ? format(addDays(today, 1), "yyyy-MM-dd")
    : format(pickedDate, "yyyy-MM-dd");

  const canSave = title.trim() && hours !== null;

  const save = () => {
    if (!canSave) return;
    onSave({
      kind: "simple",
      title: title.trim(),
      estimated_hours: hours!,
      priority,
      scheduled_date: dateStr,
    });
  };

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">Simple to-do — just get it done</p>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What do you need to do?"
        className="rounded-xl text-base focus-visible:ring-primary"
        autoFocus
      />

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
            <button
              key={w}
              type="button"
              onClick={() => setWhen(w)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-sm font-medium border-2 capitalize transition-all",
                when === w ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
              )}
            >
              {w === "pick" ? "Pick date" : w.charAt(0).toUpperCase() + w.slice(1)}
            </button>
          ))}
        </div>
        {when === "pick" && (
          <div className="mt-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="rounded-xl font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(pickedDate, "MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[200]" align="start">
                <Calendar
                  mode="single"
                  selected={pickedDate}
                  onSelect={(d) => d && setPickedDate(d)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      <Button
        onClick={save}
        disabled={!canSave}
        className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
      >
        Add Task
      </Button>
    </div>
  );
}

// ─── Main Modal ────────────────────────────────────────────────────────────────
interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: CreateTaskInput) => void;
  onSaveRoutine: (input: { id?: string; title: string; description?: string; deadline_time?: string }) => void;
  defaultDate?: Date;
  defaultTime?: string;
  defaultTab?: "project" | "recurring" | "routine" | "simple";
  editRoutine?: Routine | null;
  isSaving?: boolean;
}

export function AddTaskModal({
  open, onOpenChange, onSave, onSaveRoutine, defaultDate, isSaving, defaultTab, editRoutine,
}: AddTaskModalProps) {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<"project" | "recurring" | "routine" | "simple">(defaultTab || "project");
  const resolvedDate = defaultDate || new Date();

  const [prevDefaultTab, setPrevDefaultTab] = useState(defaultTab);
  if (defaultTab !== prevDefaultTab) {
    setPrevDefaultTab(defaultTab);
    if (defaultTab) setTab(defaultTab);
  }

  const handleSave = (input: CreateTaskInput) => {
    onSave(input);
    onOpenChange(false);
  };

  const handleSaveRoutine = (input: { id?: string; title: string; description?: string; deadline_time?: string }) => {
    onSaveRoutine(input);
    onOpenChange(false);
  };

  const tabs = [
    { id: "project" as const, label: "Project" },
    { id: "routine" as const, label: "Routine" },
    { id: "simple" as const, label: "Quick" },
  ];

  const content = (
    <div className="space-y-5 px-1">
      <div className="flex rounded-xl border border-border p-1 bg-muted/30">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-semibold transition-all",
              tab === t.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "project" && <ProjectTab onSave={handleSave} defaultDate={resolvedDate} />}
      {tab === "recurring" && <RecurringTab onSave={handleSave} />}
      {tab === "routine" && (
        <RoutineForm
          onSave={handleSaveRoutine}
          editRoutine={editRoutine}
          isSaving={isSaving}
        />
      )}
      {tab === "simple" && <SimpleTab onSave={handleSave} defaultDate={resolvedDate} />}
    </div>
  );

  const modalTitle = editRoutine ? "Edit Routine" : "Add Task";

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader className="pb-0">
            <DrawerTitle className="font-heading">{modalTitle}</DrawerTitle>
            <DrawerDescription className="sr-only">Create a new task or routine</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-8 pt-2">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">{modalTitle}</DialogTitle>
          <DialogDescription className="sr-only">Create a new task or routine</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
