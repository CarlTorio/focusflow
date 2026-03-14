import { useState, useMemo } from "react";
import { format, addDays } from "date-fns";
import { CalendarIcon, Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CreatePlannerInput } from "@/hooks/usePlanner";

interface AddPlannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: CreatePlannerInput) => void;
  defaultDate?: Date;
  defaultTime?: string;
  isSaving?: boolean;
}

export function AddPlannerModal({ open, onOpenChange, onSave, defaultDate, defaultTime, isSaving }: AddPlannerModalProps) {
  const isMobile = useIsMobile();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"anytime" | "planned">(defaultTime ? "planned" : "anytime");
  const [scheduledDate, setScheduledDate] = useState<Date>(defaultDate || new Date());
  const [startTime, setStartTime] = useState(defaultTime || "");
  const [endTime, setEndTime] = useState("");
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [showMore, setShowMore] = useState(false);

  const duration = useMemo(() => {
    if (!startTime || !endTime) return null;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins <= 0) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return { hours: h + m / 60, label: h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m` };
  }, [startTime, endTime]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setType(defaultTime ? "planned" : "anytime");
    setScheduledDate(defaultDate || new Date());
    setStartTime(defaultTime || "");
    setEndTime("");
    setSubtasks([]);
    setShowMore(false);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    const allocatedHours = type === "planned" && duration ? duration.hours : 1;
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      scheduled_date: format(scheduledDate, "yyyy-MM-dd"),
      start_time: type === "planned" && startTime ? startTime : undefined,
      end_time: type === "planned" && endTime ? endTime : undefined,
      allocated_hours: allocatedHours,
      subtasks: subtasks.filter(s => s.trim()).length > 0 ? subtasks.filter(s => s.trim()) : undefined,
    });
    resetForm();
  };

  const canSave = title.trim();

  const formContent = (
    <div className="space-y-5 px-1">
      {/* Title */}
      <Input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="What do you need to do?"
        className="rounded-xl border-border text-base focus-visible:ring-primary"
        autoFocus
      />

      {/* Type Toggle */}
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">Type</label>
        <div className="flex rounded-xl border border-border p-1">
          <button
            type="button"
            onClick={() => setType("anytime")}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium transition-all",
              type === "anytime" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
            )}
          >
            Anytime
          </button>
          <button
            type="button"
            onClick={() => setType("planned")}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium transition-all",
              type === "planned" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
            )}
          >
            Planned
          </button>
        </div>
      </div>

      {/* Date */}
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start rounded-xl text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(scheduledDate, "MMM d, yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={scheduledDate}
              onSelect={d => d && setScheduledDate(d)}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Time fields (only for planned) */}
      {type === "planned" && (
        <div className="space-y-4 rounded-xl border border-border p-4 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Starts</label>
              <Input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="rounded-lg"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Ends</label>
              <Input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="rounded-lg"
              />
            </div>
          </div>
          {duration && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Duration:</span>
              <span className="rounded-md bg-primary-light px-2 py-0.5 text-xs font-medium text-foreground">{duration.label}</span>
            </div>
          )}
        </div>
      )}

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
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Extra Details..."
            className="min-h-[80px] rounded-xl border-border bg-amber-50/30 dark:bg-amber-950/10"
          />
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

      {/* Save */}
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
            <DrawerTitle className="font-heading">Add to Planner</DrawerTitle>
            <DrawerDescription>Lives in your daily plan</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6">{formContent}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">Add to Planner</DialogTitle>
          <DialogDescription>Lives in your daily plan</DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
