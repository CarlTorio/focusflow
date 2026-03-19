import { useState, useRef } from "react";
import { useAlarms } from "@/hooks/useAlarms";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { previewSound, SOUND_OPTIONS, stopAlarmSound } from "@/lib/alarmSounds";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Volume2, Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const SNOOZE_OPTIONS = [
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
];

const MAX_SNOOZE_OPTIONS = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 99, label: "Unlimited" },
];

interface CreateAlarmModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateAlarmModal({ open, onClose }: CreateAlarmModalProps) {
  const { user } = useAuth();
  const { createAlarm } = useAlarms();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`; });
  const [time, setTime] = useState("09:00");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState("daily");
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [soundType, setSoundType] = useState("alarm-1");
  const [customSoundUrl, setCustomSoundUrl] = useState<string | null>(null);
  const [customSoundName, setCustomSoundName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [snoozeDuration, setSnoozeDuration] = useState(5);
  const [maxSnoozes, setMaxSnoozes] = useState(3);
  const [saving, setSaving] = useState(false);

  const toggleDay = (day: number) => {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Max 5MB.");
      return;
    }

    const allowed = ["audio/mpeg", "audio/wav", "audio/ogg"];
    if (!allowed.includes(file.type)) {
      toast.error("Only MP3, WAV, or OGG files allowed.");
      return;
    }

    setUploading(true);
    const filePath = `${user.id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage
      .from("alarm-sounds")
      .upload(filePath, file);

    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("alarm-sounds")
      .getPublicUrl(filePath);

    setCustomSoundUrl(urlData.publicUrl);
    setCustomSoundName(file.name);
    setSoundType("custom");
    setUploading(false);
    toast.success("Sound uploaded!");
  };

  const removeCustomSound = async () => {
    setCustomSoundUrl(null);
    setCustomSoundName("");
    if (soundType === "custom") setSoundType("default");
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    setSaving(true);
    const alarmTime = new Date(`${date}T${time}:00`).toISOString();

    try {
      await createAlarm.mutateAsync({
        title: title.trim(),
        alarm_type: "custom",
        alarm_time: alarmTime,
        sound_type: soundType,
        custom_sound_url: customSoundUrl || undefined,
        is_recurring: isRecurring,
        recurrence_pattern: isRecurring ? recurrencePattern : undefined,
        recurrence_days: isRecurring && recurrencePattern === "custom" ? customDays : undefined,
        snooze_duration_minutes: snoozeDuration,
        max_snoozes: maxSnoozes,
      });
      toast.success("Alarm set!");
      onClose();
      // Reset form
      setTitle("");
      { const n = new Date(); setDate(`${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`); }
      setTime("09:00");
      setIsRecurring(false);
      setSoundType("default");
      setCustomSoundUrl(null);
      setCustomSoundName("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create alarm");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-heading">Set New Alarm</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Alarm name (e.g., Meeting, Take meds)"
              className="rounded-xl"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Time</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          {/* Recurring */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Repeat this alarm</Label>
              <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
            </div>
            {isRecurring && (
              <div className="space-y-3 pl-1">
                <div className="flex flex-wrap gap-2">
                  {["daily", "weekdays", "weekly", "custom"].map((p) => (
                    <button
                      key={p}
                      onClick={() => setRecurrencePattern(p)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                        recurrencePattern === p
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                {recurrencePattern === "custom" && (
                  <div className="flex gap-1.5">
                    {DAY_LABELS.map((label, i) => (
                      <button
                        key={i}
                        onClick={() => toggleDay(i)}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium transition-colors",
                          customDays.includes(i)
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-foreground"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sound */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Alarm Sound</Label>
            <div className="space-y-1.5">
              {SOUND_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSoundType(opt.value)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                    soundType === opt.value
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-secondary"
                  )}
                >
                  <div className={cn(
                    "h-4 w-4 rounded-full border-2",
                    soundType === opt.value
                      ? "border-primary bg-primary"
                      : "border-muted-foreground"
                  )} />
                  <span className="flex-1 text-left">{opt.label}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      previewSound(opt.value);
                    }}
                    className="text-muted-foreground hover:text-primary"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                </button>
              ))}
            </div>

            {/* Custom upload */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Upload your own sound</p>
              {customSoundUrl ? (
                <div className="flex items-center gap-2 rounded-xl bg-secondary p-3">
                  <Volume2 className="h-4 w-4 text-primary" />
                  <span className="flex-1 truncate text-sm">{customSoundName}</span>
                  <button onClick={removeCustomSound} className="text-muted-foreground hover:text-destructive">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-4 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      <span>Tap to upload MP3, WAV, or OGG (max 5MB)</span>
                    </>
                  )}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/mpeg,audio/wav,audio/ogg"
                className="hidden"
                onChange={handleUpload}
              />
            </div>
          </div>

          {/* Snooze */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Snooze duration</Label>
              <div className="flex flex-wrap gap-1.5">
                {SNOOZE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSnoozeDuration(opt.value)}
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                      snoozeDuration === opt.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Max snoozes</Label>
              <div className="flex flex-wrap gap-1.5">
                {MAX_SNOOZE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setMaxSnoozes(opt.value)}
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                      maxSnoozes === opt.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Save */}
          <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Set Alarm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
