import { useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Routine } from "@/hooks/useRoutines";

interface RoutineFormProps {
  onSave: (input: { id?: string; title: string; description?: string; deadline_time?: string }) => void;
  editRoutine?: Routine | null;
  isSaving?: boolean;
}

export function RoutineForm({ onSave, editRoutine, isSaving }: RoutineFormProps) {
  const [title, setTitle] = useState(editRoutine?.title || "");
  const [description, setDescription] = useState(editRoutine?.description || "");
  const [deadlineTime, setDeadlineTime] = useState(editRoutine?.deadline_time?.slice(0, 5) || "");

  const canSave = title.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      id: editRoutine?.id,
      title: title.trim(),
      description: description.trim() || undefined,
      deadline_time: deadlineTime || undefined,
    });
  };

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">Repeats every day in your daily routine</p>

      <div>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's the routine? (e.g., Morning exercise, Read 30 min)"
          className="rounded-xl text-base focus-visible:ring-primary"
          autoFocus
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">Description (optional)</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add details or notes about this routine"
          className="min-h-[80px] rounded-xl"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold">
          <Clock className="inline h-4 w-4 mr-1" />
          Deadline time (optional)
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          After this time, the routine can't be checked off for the day.
        </p>
        <Input
          type="time"
          value={deadlineTime}
          onChange={(e) => setDeadlineTime(e.target.value)}
          className="rounded-xl w-36"
        />
      </div>

      <Button
        onClick={handleSave}
        disabled={!canSave || isSaving}
        className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {isSaving ? "Saving..." : editRoutine ? "Save Changes" : "Add to Daily Routine"}
      </Button>
    </div>
  );
}
