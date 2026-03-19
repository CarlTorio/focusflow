import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { isOnline, addPendingMutation, getCachedData, setCachedData } from "@/lib/offlineStorage";
import { Plus, Check, Bell, Trash2, StickyNote, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";

interface ReminderNote {
  id: string;
  user_id: string;
  title: string;
  is_done: boolean;
  notify_schedule: string | null;
  linked_alarm_id: string | null;
  created_at: string;
}

const SCHEDULE_OPTIONS = [
  { value: "morning", label: "Morning (8 AM)", icon: "🌅" },
  { value: "noon", label: "Noon (12 PM)", icon: "☀️" },
  { value: "afternoon", label: "Afternoon (3 PM)", icon: "🌤️" },
  { value: "evening", label: "Evening (6 PM)", icon: "🌆" },
];

function getNextScheduleTime(schedule: string): Date {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const hours: Record<string, number> = { morning: 8, noon: 12, afternoon: 15, evening: 18 };
  const h = hours[schedule] || 8;
  const target = new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target;
}

export function QuickReminders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [settingAlarmFor, setSettingAlarmFor] = useState<ReminderNote | null>(null);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [customHour, setCustomHour] = useState("09");
  const [customMin, setCustomMin] = useState("00");
  const [customPeriod, setCustomPeriod] = useState<"AM" | "PM">("AM");

  const { data: notes = [] } = useQuery({
    queryKey: ["reminder_notes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reminder_notes")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ReminderNote[];
    },
    enabled: !!user,
  });

  const addNote = useMutation({
    mutationFn: async (title: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("reminder_notes").insert({
        user_id: user.id,
        title,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminder_notes"] });
      setNewTitle("");
      setShowInput(false);
    },
  });

  const toggleDone = useMutation({
    mutationFn: async ({ id, is_done }: { id: string; is_done: boolean }) => {
      const { error } = await supabase
        .from("reminder_notes")
        .update({ is_done } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reminder_notes"] }),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reminder_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminder_notes"] });
      toast.success("Note removed");
    },
  });

  const setAlarmForNote = async (note: ReminderNote, schedule: string) => {
    if (!user) return;

    const isCustom = schedule === "custom";
    const alarmTime = isCustom ? null : getNextScheduleTime(schedule);

    if (isCustom) {
      // Show custom picker
      setShowCustomPicker(true);
      return;
    }

    await createAlarmForNote(note, alarmTime!, schedule, !isCustom);
  };

  const handleCustomAlarmConfirm = async () => {
    if (!settingAlarmFor || !customDate) {
      toast.error("Please select a date");
      return;
    }

    let h = parseInt(customHour);
    if (customPeriod === "PM" && h !== 12) h += 12;
    if (customPeriod === "AM" && h === 12) h = 0;

    const alarmTime = new Date(customDate.getFullYear(), customDate.getMonth(), customDate.getDate(), h, parseInt(customMin));
    
    if (alarmTime <= new Date()) {
      toast.error("Please select a future time");
      return;
    }

    await createAlarmForNote(settingAlarmFor, alarmTime, "custom", false);
    setShowCustomPicker(false);
    setCustomDate(undefined);
  };

  const createAlarmForNote = async (note: ReminderNote, alarmTime: Date, schedule: string, recurring: boolean) => {
    if (!user) return;

    // Create alarm
    const { data: alarm, error: alarmErr } = await supabase
      .from("alarms")
      .insert({
        user_id: user.id,
        title: `📋 ${note.title}`,
        alarm_type: "task_reminder",
        alarm_time: alarmTime.toISOString(),
        original_alarm_time: alarmTime.toISOString(),
        sound_type: "alarm-1",
        is_recurring: recurring,
        recurrence_pattern: recurring ? "daily" : null,
      } as any)
      .select()
      .single();

    if (alarmErr) {
      toast.error("Failed to create alarm");
      return;
    }

    // Link alarm to note
    await supabase
      .from("reminder_notes")
      .update({ linked_alarm_id: alarm.id, notify_schedule: schedule } as any)
      .eq("id", note.id);

    queryClient.invalidateQueries({ queryKey: ["reminder_notes"] });
    queryClient.invalidateQueries({ queryKey: ["alarms"] });
    
    const label = schedule === "custom"
      ? format(alarmTime, "MMM d, h:mm a")
      : SCHEDULE_OPTIONS.find(s => s.value === schedule)?.label;
    toast.success(`Reminder set for ${label}`);
    setSettingAlarmFor(null);
  };

  const pending = notes.filter((n) => !n.is_done);
  const done = notes.filter((n) => n.is_done);

  const handleSubmit = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    addNote.mutate(trimmed);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Quick Reminders</h3>
          {pending.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {pending.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowInput(true)}
          className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Reminder
        </button>
      </div>

      {/* Add input */}
      {showInput && (
        <div className="mb-3 flex gap-2 animate-in fade-in-0 duration-150">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Biglaan mong naisip..."
            className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={handleSubmit}
            disabled={!newTitle.trim()}
            className="shrink-0 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            Add
          </button>
        </div>
      )}

      {/* Notes list */}
      <div className="space-y-1.5">
        {pending.length === 0 && done.length === 0 && !showInput && (
          <button
            onClick={() => setShowInput(true)}
            className="w-full rounded-xl border border-dashed border-border/60 py-6 text-center text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5"
          >
            Tap + to jot down quick reminders
          </button>
        )}

        {pending.map((note) => (
          <div
            key={note.id}
            className="group flex items-center gap-2.5 rounded-xl border border-border/50 bg-card px-3 py-2.5 shadow-sm"
          >
            <button
              onClick={() => toggleDone.mutate({ id: note.id, is_done: true })}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-border transition-colors hover:border-primary"
            />
            <span className="flex-1 min-w-0 truncate text-sm text-foreground">{note.title}</span>
            <div className="flex shrink-0 items-center gap-2.5">
              {note.notify_schedule ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {SCHEDULE_OPTIONS.find(s => s.value === note.notify_schedule)?.icon}{" "}
                  {note.notify_schedule}
                </span>
              ) : (
                <button
                  onClick={() => setSettingAlarmFor(note)}
                  className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                >
                  <Bell className="h-3.5 w-3.5" />
                  Remind Me
                </button>
              )}
              <button
                onClick={() => deleteNote.mutate(note.id)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {done.length > 0 && (
          <div className="pt-2">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Done ({done.length})
            </p>
            {done.slice(0, 3).map((note) => (
              <div
                key={note.id}
                className="group flex items-center gap-2.5 rounded-xl px-3 py-2 opacity-50"
              >
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-primary bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </div>
                <span className="flex-1 min-w-0 truncate text-sm text-foreground line-through">
                  {note.title}
                </span>
                <button
                  onClick={() => deleteNote.mutate(note.id)}
                  className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule picker modal */}
      {settingAlarmFor && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => { setSettingAlarmFor(null); setShowCustomPicker(false); }} />
          <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-card p-6 pb-24 shadow-lg animate-in slide-in-from-bottom duration-200 md:bottom-auto md:left-1/2 md:top-1/2 md:max-w-sm md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:pb-6">
            <h3 className="text-base font-bold text-foreground mb-1">Set Reminder</h3>
            <p className="text-xs text-muted-foreground mb-4 truncate">
              📋 {settingAlarmFor.title}
            </p>

            {!showCustomPicker ? (
              <>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                  When should we remind you?
                </p>
                <div className="space-y-2">
                  {SCHEDULE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setAlarmForNote(settingAlarmFor, opt.value)}
                      className="flex w-full items-center gap-3 rounded-xl border border-border/50 bg-background px-4 py-3 text-left transition-colors hover:bg-primary/5 hover:border-primary/30"
                    >
                      <span className="text-lg">{opt.icon}</span>
                      <span className="text-sm font-medium text-foreground">{opt.label}</span>
                    </button>
                  ))}
                  {/* Custom option */}
                  <button
                    onClick={() => setAlarmForNote(settingAlarmFor, "custom")}
                    className="flex w-full items-center gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-left transition-colors hover:bg-primary/10"
                  >
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-primary">Custom date & time</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                  Pick date & time
                </p>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={customDate}
                    onSelect={setCustomDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    className={cn("p-2 pointer-events-auto rounded-xl border border-border/50")}
                  />
                </div>

                {/* Time picker */}
                <div className="mt-4 flex items-center justify-center gap-2">
                  <select
                    value={customHour}
                    onChange={(e) => setCustomHour(e.target.value)}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                  >
                    {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <span className="text-foreground font-bold">:</span>
                  <select
                    value={customMin}
                    onChange={(e) => setCustomMin(e.target.value)}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                  >
                    {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setCustomPeriod(customPeriod === "AM" ? "PM" : "AM")}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-semibold text-primary"
                  >
                    {customPeriod}
                  </button>
                </div>

                {customDate && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    {format(customDate, "MMM d, yyyy")} at {customHour}:{customMin} {customPeriod}
                  </p>
                )}

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setShowCustomPicker(false)}
                    className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-foreground"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCustomAlarmConfirm}
                    disabled={!customDate}
                    className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-40"
                  >
                    Set Alarm
                  </button>
                </div>
              </>
            )}

            {!showCustomPicker && (
              <button
                onClick={() => { setSettingAlarmFor(null); setShowCustomPicker(false); }}
                className="mt-3 w-full rounded-xl py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancel
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
