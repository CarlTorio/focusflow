import { useState, useRef, useEffect, useCallback } from "react";
import { useAlarms } from "@/hooks/useAlarms";
import { SOUND_OPTIONS, previewSound, stopAlarmSound } from "@/lib/alarmSounds";
import { X, Check, ChevronDown, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

/* ─── Compact scroll-wheel picker ─── */
const ITEM_H = 40;
const VISIBLE = 3;
const CENTER = Math.floor(VISIBLE / 2);

function WheelColumn({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: number;
  onChange: (i: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (ref.current && !isScrolling.current) {
      ref.current.scrollTop = value * ITEM_H;
    }
  }, [value]);

  const handleScroll = useCallback(() => {
    isScrolling.current = true;
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      if (!ref.current) return;
      const idx = Math.round(ref.current.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      ref.current.scrollTo({ top: clamped * ITEM_H, behavior: "smooth" });
      onChange(clamped);
      isScrolling.current = false;
    }, 80);
  }, [items.length, onChange]);

  return (
    <div className="relative" style={{ height: ITEM_H * VISIBLE }}>
      <div
        className="pointer-events-none absolute inset-x-0 z-10 border-y border-primary/20"
        style={{ top: CENTER * ITEM_H, height: ITEM_H }}
      />
      <div
        ref={ref}
        onScroll={handleScroll}
        className="h-full snap-y snap-mandatory overflow-y-auto scrollbar-none"
        style={{ scrollSnapType: "y mandatory" }}
      >
        <div style={{ height: CENTER * ITEM_H }} />
        {items.map((item, i) => {
          const isActive = i === value;
          return (
            <div
              key={i}
              className={cn(
                "flex items-center justify-center snap-center transition-all duration-150",
                isActive
                  ? "text-primary text-lg font-semibold"
                  : "text-muted-foreground text-sm font-normal opacity-40"
              )}
              style={{ height: ITEM_H }}
              onClick={() => {
                onChange(i);
                ref.current?.scrollTo({ top: i * ITEM_H, behavior: "smooth" });
              }}
            >
              {item}
            </div>
          );
        })}
        <div style={{ height: CENTER * ITEM_H }} />
      </div>
    </div>
  );
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface InlineAlarmFormProps {
  onClose: () => void;
  onSaved: () => void;
}

export function InlineAlarmForm({ onClose, onSaved }: InlineAlarmFormProps) {
  const { createAlarm } = useAlarms();

  const hours12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const minutes60 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
  const periods = ["am", "pm"];

  const [hourIdx, setHourIdx] = useState(8);
  const [minIdx, setMinIdx] = useState(0);
  const [periodIdx, setPeriodIdx] = useState(0);
  const [label, setLabel] = useState("Alarm");
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [soundType, setSoundType] = useState("alarm-1");
  const [saving, setSaving] = useState(false);

  // Collapsible sections
  const [showRepeat, setShowRepeat] = useState(false);
  const [showSound, setShowSound] = useState(false);

  const toggleDay = (d: number) =>
    setCustomDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );

  const repeatLabel =
    customDays.length === 7
      ? "Every day"
      : customDays.length === 5 && [1, 2, 3, 4, 5].every((d) => customDays.includes(d))
        ? "Weekdays"
        : customDays.length > 0
          ? customDays.sort().map((d) => DAY_NAMES[d]).join(", ")
          : "Only ring once";

  const soundLabel = SOUND_OPTIONS.find((s) => s.value === soundType)?.label || "Alarm 1";

  const handleSave = async () => {
    setSaving(true);
    try {
      const hour24 =
        periodIdx === 1
          ? (hourIdx + 1) === 12 ? 12 : (hourIdx + 1) + 12
          : (hourIdx + 1) === 12 ? 0 : hourIdx + 1;

      const now = new Date();
      const alarmDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour24, minIdx);
      if (alarmDate <= now) alarmDate.setDate(alarmDate.getDate() + 1);

      const isRecurring = customDays.length > 0;

      await createAlarm.mutateAsync({
        title: label.trim() || "Alarm",
        alarm_type: "custom",
        alarm_time: alarmDate.toISOString(),
        sound_type: soundType,
        is_recurring: isRecurring,
        recurrence_pattern: isRecurring ? "custom" : undefined,
        recurrence_days: isRecurring ? customDays : undefined,
        snooze_duration_minutes: 5,
        max_snoozes: 3,
      });
      toast.success("Alarm set!");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to create alarm");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-foreground">New Alarm</h3>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Label input */}
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Alarm label"
        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring mb-4"
      />

      {/* Compact time picker */}
      <div className="flex items-center justify-center gap-1 mb-4">
        <div className="w-16">
          <WheelColumn items={hours12} value={hourIdx} onChange={setHourIdx} />
        </div>
        <span className="text-lg font-semibold text-muted-foreground">:</span>
        <div className="w-16">
          <WheelColumn items={minutes60} value={minIdx} onChange={setMinIdx} />
        </div>
        <div className="w-14">
          <WheelColumn items={periods} value={periodIdx} onChange={setPeriodIdx} />
        </div>
      </div>

      {/* Repeat section */}
      <button
        onClick={() => setShowRepeat(!showRepeat)}
        className="flex w-full items-center justify-between rounded-xl bg-secondary/50 px-3 py-2.5 text-sm transition-colors hover:bg-secondary"
      >
        <span className="font-medium text-foreground">Repeat</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {repeatLabel}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showRepeat && "rotate-180")} />
        </span>
      </button>
      {showRepeat && (
        <div className="mt-2 flex flex-wrap gap-1.5 px-1">
          {DAY_NAMES.map((day, i) => (
            <button
              key={i}
              onClick={() => toggleDay(i)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors",
                customDays.includes(i)
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground"
              )}
            >
              {day.charAt(0)}
            </button>
          ))}
        </div>
      )}

      {/* Sound section */}
      <button
        onClick={() => { setShowSound(!showSound); if (showSound) stopAlarmSound(); }}
        className="mt-2 flex w-full items-center justify-between rounded-xl bg-secondary/50 px-3 py-2.5 text-sm transition-colors hover:bg-secondary"
      >
        <span className="font-medium text-foreground">Sound</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {soundLabel}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showSound && "rotate-180")} />
        </span>
      </button>
      {showSound && (
        <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-border bg-background">
          {SOUND_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setSoundType(opt.value);
                previewSound(opt.value);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors",
                soundType === opt.value
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground hover:bg-secondary/50"
              )}
            >
              <div
                className={cn(
                  "h-3.5 w-3.5 rounded-full border-2 shrink-0",
                  soundType === opt.value
                    ? "border-primary bg-primary"
                    : "border-muted-foreground"
                )}
              />
              <span className="flex-1 text-left">{opt.label}</span>
              <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        <Check className="h-4 w-4" />
        {saving ? "Saving…" : "Set Alarm"}
      </button>
    </div>
  );
}
