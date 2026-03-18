import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Plus, X, MessageSquare, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { DbTask, DbSubtask } from "@/types/database";

const PRIORITIES = [
  { value: "high", label: "Main Task", color: "bg-destructive text-destructive-foreground" },
  { value: "medium", label: "Other Task", color: "bg-primary text-primary-foreground" },
];

interface EditProjectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: DbTask & { subtasks?: DbSubtask[] };
  onSave: (input: {
    taskId: string;
    title?: string;
    priority?: string;
    due_date?: string;
    description?: string;
    addSubtasks?: { title: string }[];
    removeSubtaskIds?: string[];
  }) => void;
  onDelete?: (taskId: string) => void;
  isSaving?: boolean;
}

export function EditProjectSheet({ open, onOpenChange, task, onSave, onDelete, isSaving }: EditProjectSheetProps) {
  const [title, setTitle] = useState(task.title);
  const [priority, setPriority] = useState(task.priority === "high" ? "high" : "medium");
  const [dueDate, setDueDate] = useState<Date>(parseISO(task.due_date));
  const [description, setDescription] = useState(task.description || "");
  const [showNotes, setShowNotes] = useState(false);
  const [newSubtasks, setNewSubtasks] = useState<string[]>([]);
  const [removeIds, setRemoveIds] = useState<string[]>([]);

  const existingSubtasks = (task.subtasks || []).filter((st) => !removeIds.includes(st.id));

  useEffect(() => {
    setTitle(task.title);
    setPriority(task.priority === "high" ? "high" : "medium");
    setDueDate(parseISO(task.due_date));
    setDescription(task.description || "");
    setNewSubtasks([]);
    setRemoveIds([]);
    setShowNotes(false);
  }, [task, open]);

  const handleSave = () => {
    const changes: Parameters<typeof onSave>[0] = { taskId: task.id };
    if (title !== task.title) changes.title = title;
    if (priority !== task.priority) changes.priority = priority;
    if (format(dueDate, "yyyy-MM-dd") !== task.due_date) changes.due_date = format(dueDate, "yyyy-MM-dd");
    if (description !== (task.description || "")) changes.description = description;
    if (newSubtasks.filter((s) => s.trim()).length > 0) {
      changes.addSubtasks = newSubtasks.filter((s) => s.trim()).map((s) => ({ title: s.trim() }));
    }
    if (removeIds.length > 0) changes.removeSubtaskIds = removeIds;
    onSave(changes);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl pb-8">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base font-bold">Edit Project</SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Project Name</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl text-base"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Task Type</label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPriority(p.value)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-bold border-2 transition-all",
                    priority === p.value
                      ? `${p.color} border-transparent`
                      : "border-border text-muted-foreground"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Due Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start rounded-xl font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dueDate, "MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[200]" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(d) => d && setDueDate(d)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Subtasks */}
          {existingSubtasks.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Subtasks ({existingSubtasks.length})
              </label>
              <div className="space-y-1.5 rounded-xl border border-border p-3">
                {existingSubtasks.map((st) => (
                  <div key={st.id} className="flex items-center gap-2">
                    <span className={cn(
                      "flex-1 text-sm truncate",
                      st.is_completed && "line-through text-muted-foreground"
                    )}>
                      {st.title}
                    </span>
                    {!st.is_completed && (
                      <button
                        onClick={() => setRemoveIds((prev) => [...prev, st.id])}
                        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add new subtasks */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Add Subtasks</label>
            <div className="space-y-2">
              {newSubtasks.map((st, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={st}
                    onChange={(e) => {
                      const arr = [...newSubtasks];
                      arr[i] = e.target.value;
                      setNewSubtasks(arr);
                    }}
                    placeholder={`New subtask ${i + 1}`}
                    className="rounded-xl text-sm flex-1"
                  />
                  <button
                    onClick={() => setNewSubtasks((prev) => prev.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNewSubtasks((prev) => [...prev, ""])}
                className="w-full rounded-xl border-dashed"
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Subtask
              </Button>
            </div>
          </div>

          {/* Notes toggle + Delete button */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="flex items-center gap-2 text-sm font-semibold text-primary"
            >
              <MessageSquare className="h-4 w-4" />
              {showNotes ? "Hide Notes" : description ? "Edit Notes" : "Add Notes"}
            </button>

            {onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="flex items-center gap-1.5 text-sm font-semibold text-destructive hover:text-destructive/80 transition-colors">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete project?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{task.title}" and all its subtasks. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => {
                        onDelete(task.id);
                        onOpenChange(false);
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {showNotes && (
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this project..."
              className="rounded-xl min-h-[80px] text-sm"
            />
          )}

          {/* Save */}
          <Button
            onClick={handleSave}
            disabled={!title.trim() || isSaving}
            className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
