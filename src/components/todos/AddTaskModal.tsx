import { useState } from "react";
import { format, addDays } from "date-fns";
import { CalendarIcon, Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CreateTaskInput } from "@/hooks/useTasks";

const HOUR_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 12];

const PRIORITY_OPTIONS = [
  { value: "high" as const, label: "HIGH", color: "bg-red-500", textColor: "text-red-500", bgLight: "bg-red-50 dark:bg-red-950" },
  { value: "medium" as const, label: "MED", color: "bg-amber-500", textColor: "text-amber-500", bgLight: "bg-amber-50 dark:bg-amber-950" },
  { value: "low" as const, label: "LOW", color: "bg-emerald-500", textColor: "text-emerald-500", bgLight: "bg-emerald-50 dark:bg-emerald-950" },
];

interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: CreateTaskInput) => void;
  defaultPriority?: "high" | "medium";
  isSaving?: boolean;
}

export function AddTaskModal({ open, onOpenChange, onSave, defaultPriority = "medium", isSaving }: AddTaskModalProps) {
  const isMobile = useIsMobile();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedHours, setEstimatedHours] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState<Date>(addDays(new Date(), 3));
  const [preferredTime, setPreferredTime] = useState("");
  const [priority, setPriority] = useState<"high" | "medium">(defaultPriority);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [showMore, setShowMore] = useState(false);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setEstimatedHours(null);
    setDueDate(addDays(new Date(), 3));
    setPreferredTime("");
    setPriority(defaultPriority);
    setTags([]);
    setTagInput("");
    setSubtasks([]);
    setShowMore(false);
  };

  const handleSave = () => {
    if (!title.trim() || !estimatedHours || !dueDate) return;
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      estimated_hours: estimatedHours,
      due_date: format(dueDate, "yyyy-MM-dd"),
      preferred_time: preferredTime || undefined,
      priority,
      tags: tags.length > 0 ? tags : undefined,
      subtasks: subtasks.filter(s => s.trim()) || undefined,
    });
    resetForm();
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const canSave = title.trim() && estimatedHours && dueDate;

  const formContent = (
    <div className="space-y-5 px-1">
      {/* Title */}
      <div>
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="What do you need to do?"
          className="rounded-xl border-border text-base focus-visible:ring-primary"
          autoFocus
        />
      </div>

      {/* Estimated Hours */}
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">Estimated Hours</label>
        <div className="flex flex-wrap gap-2">
          {HOUR_OPTIONS.map(h => (
            <button
              key={h}
              type="button"
              onClick={() => setEstimatedHours(h)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                estimatedHours === h
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground hover:bg-muted/80"
              )}
            >
              {h}h
            </button>
          ))}
        </div>
      </div>

      {/* Due Date */}
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">Due Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full justify-start rounded-xl text-left font-normal", !dueDate && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dueDate ? format(dueDate, "MMM d, yyyy") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dueDate}
              onSelect={d => d && setDueDate(d)}
              disabled={date => date <= new Date()}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Priority */}
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">Priority</label>
        <div className="flex gap-2">
          {PRIORITY_OPTIONS.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPriority(p.value)}
              className={cn(
                "flex-1 rounded-lg py-2 text-sm font-bold transition-colors",
                priority === p.value
                  ? `${p.color} text-white`
                  : `${p.bgLight} ${p.textColor}`
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* More Options Toggle */}
      <button
        type="button"
        onClick={() => setShowMore(!showMore)}
        className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {showMore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {showMore ? "Less options" : "More options"}
      </button>

      {showMore && (
        <div className="space-y-5 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          {/* Description */}
          <div>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Extra Details..."
              className="min-h-[80px] rounded-xl border-border bg-amber-50/30 dark:bg-amber-950/10"
            />
          </div>

          {/* Preferred Time */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Preferred Time</label>
            <Input
              type="time"
              value={preferredTime}
              onChange={e => setPreferredTime(e.target.value)}
              placeholder="Any time"
              className="rounded-xl"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-primary-light px-3 py-1 text-sm text-foreground">
                  {tag}
                  <button type="button" onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <Input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Add tags (press Enter)"
              className="rounded-xl"
            />
          </div>

          {/* Subtasks */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Subtasks</label>
            {subtasks.map((st, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <Input
                  value={st}
                  onChange={e => {
                    const updated = [...subtasks];
                    updated[i] = e.target.value;
                    setSubtasks(updated);
                  }}
                  placeholder={`Subtask ${i + 1}`}
                  className="rounded-xl"
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => setSubtasks(subtasks.filter((_, j) => j !== i))}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setSubtasks([...subtasks, ""])} className="rounded-xl">
              <Plus className="mr-1 h-4 w-4" /> Add Subtask
            </Button>
          </div>
        </div>
      )}

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={!canSave || isSaving}
        className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary-dark"
      >
        {isSaving ? "Saving..." : "Save"}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={v => { if (!v) resetForm(); onOpenChange(v); }}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle className="font-heading">Add Task</DrawerTitle>
            <DrawerDescription>Create a new task and let FocusFlow schedule it for you</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6">
            {formContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">Add Task</DialogTitle>
          <DialogDescription>Create a new task and let FocusFlow schedule it for you</DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
