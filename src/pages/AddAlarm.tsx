import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAlarms } from "@/hooks/useAlarms";
import { SOUND_OPTIONS, previewSound, stopAlarmSound } from "@/lib/alarmSounds";
import { X, Check, ChevronRight, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ─── Scroll-wheel picker ─── */
const ITEM_H = 48;
const VISIBLE = 5;
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
      {/* Selection highlight */}
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
        {/* Padding so first/last items can center */}
        <div style={{ height: CENTER * ITEM_H }} />
        {items.map((item, i) => {
          const isActive = i === value;
          return (
            <div
              key={i}
              className={cn(
                "flex items-center justify-center snap-center transition-all duration-150",
                isActive
                  ? "text-primary text-2xl font-semibold"
                  : "text-muted-foreground text-lg font-normal opacity-40"
              )}
              style={{
                height: ITEM_H,
                fontFamily: "var(--font-heading)",
              }}
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

/* ─── Setting row ─── */
function SettingRow({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl bg-card px-4 py-3.5 text-left transition-colors hover:bg-secondary"
    >
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className="flex items-center gap-1 text-sm text-muted-foreground">
        {value}
        <ChevronRight className="h-4 w-4" />
      </span>
    </button>
  );
}

/* ─── Repeat picker ─── */
const REPEAT_OPTIONS = [
  { key: "once", label: "Only ring once" },
  { key: "daily", label: "Every day" },
  { key: "weekdays", label: "Weekdays" },
  { key: "weekly", label: "Weekly" },
  { key: "custom", label: "Custom days" },
];

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

/* ─── Sound picker uses SOUND_OPTIONS from alarmSounds ─── */

/* ─── Snooze options ─── */
const SNOOZE_OPTIONS = [
  { mins: 5, max: 3, label: "5 minutes, 3×" },
  { mins: 10, max: 3, label: "10 minutes, 3×" },
  { mins: 5, max: 99, label: "5 minutes, unlimited" },
  { mins: 10, max: 99, label: "10 minutes, unlimited" },
];

type SubScreen = null | "repeat" | "sound" | "label" | "snooze";

export default function AddAlarm() {
  const navigate = useNavigate();
  const { createAlarm } = useAlarms();

  // Time picker state
  const hours12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const minutes60 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
  const periods = ["am", "pm"];

  const [hourIdx, setHourIdx] = useState(8); // 09
  const [minIdx, setMinIdx] = useState(0);
  const [periodIdx, setPeriodIdx] = useState(0);

  // Settings
  const [repeatKey, setRepeatKey] = useState("once");
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [soundType, setSoundType] = useState("alarm-1");
  const [label, setLabel] = useState("Alarm");
  const [snoozeIdx, setSnoozeIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  // Sub-screens
  const [subScreen, setSubScreen] = useState<SubScreen>(null);

  const toggleDay = (d: number) =>
    setCustomDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );

  const handleSave = async () => {
    setSaving(true);
    try {
      const hour24 =
        periodIdx === 1
          ? (hourIdx + 1) === 12 ? 12 : (hourIdx + 1) + 12
          : (hourIdx + 1) === 12 ? 0 : hourIdx + 1;

      const now = new Date();
      const alarmDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hour24,
        minIdx
      );
      // If time already passed today, set for tomorrow
      if (alarmDate <= now) {
        alarmDate.setDate(alarmDate.getDate() + 1);
      }

      const isRecurring = repeatKey !== "once";
      const snooze = SNOOZE_OPTIONS[snoozeIdx];

      await createAlarm.mutateAsync({
        title: label.trim() || "Alarm",
        alarm_type: "custom",
        alarm_time: alarmDate.toISOString(),
        sound_type: soundType,
        is_recurring: isRecurring,
        recurrence_pattern: isRecurring ? repeatKey : undefined,
        recurrence_days: repeatKey === "custom" ? customDays : undefined,
        snooze_duration_minutes: snooze.mins,
        max_snoozes: snooze.max,
      });

      toast.success("Alarm set!");
      navigate("/alarm");
    } catch (err: any) {
      toast.error(err.message || "Failed to set alarm");
    } finally {
      setSaving(false);
    }
  };

  /* ─── Sub-screen: Repeat ─── */
  if (subScreen === "repeat") {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-8">
        <Header
          title="Repeat"
          onBack={() => setSubScreen(null)}
        />
        <div className="mx-auto max-w-lg px-4 pt-4 space-y-2">
          {REPEAT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => {
                setRepeatKey(opt.key);
                if (opt.key !== "custom") setSubScreen(null);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-sm font-medium transition-colors",
                repeatKey === opt.key
                  ? "bg-primary/10 text-primary"
                  : "bg-card text-foreground hover:bg-secondary"
              )}
            >
              {opt.label}
              {repeatKey === opt.key && <Check className="h-4 w-4" />}
            </button>
          ))}

          {repeatKey === "custom" && (
            <div className="flex justify-center gap-2 pt-4">
              {DAY_LABELS.map((d, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                    customDays.includes(i)
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ─── Sub-screen: Sound ─── */
  if (subScreen === "sound") {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-8">
        <Header title="Sound" onBack={() => { stopAlarmSound(); setSubScreen(null); }} />
        <div className="mx-auto max-w-lg px-4 pt-4 space-y-2">
          {SOUND_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setSoundType(opt.value);
                stopAlarmSound();
                setSubScreen(null);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-sm font-medium transition-colors",
                soundType === opt.value
                  ? "bg-primary/10 text-primary"
                  : "bg-card text-foreground hover:bg-secondary"
              )}
            >
              <span>{opt.label}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    previewSound(opt.value);
                  }}
                  className="text-muted-foreground hover:text-primary"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
                {soundType === opt.value && <Check className="h-4 w-4" />}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ─── Sub-screen: Label ─── */
  if (subScreen === "label") {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-8">
        <Header
          title="Label"
          onBack={() => setSubScreen(null)}
        />
        <div className="mx-auto max-w-lg px-4 pt-6">
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Alarm label"
            className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
    );
  }

  /* ─── Sub-screen: Snooze ─── */
  if (subScreen === "snooze") {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-8">
        <Header title="Snooze duration" onBack={() => setSubScreen(null)} />
        <div className="mx-auto max-w-lg px-4 pt-4 space-y-2">
          {SNOOZE_OPTIONS.map((opt, i) => (
            <button
              key={i}
              onClick={() => {
                setSnoozeIdx(i);
                setSubScreen(null);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-sm font-medium transition-colors",
                snoozeIdx === i
                  ? "bg-primary/10 text-primary"
                  : "bg-card text-foreground hover:bg-secondary"
              )}
            >
              {opt.label}
              {snoozeIdx === i && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ─── Main screen ─── */
  const repeatLabel = REPEAT_OPTIONS.find((r) => r.key === repeatKey)?.label || "Only ring once";
  const soundLabel = SOUND_LABELS[soundType] || "Default Chime";
  const snoozeLabel = SNOOZE_OPTIONS[snoozeIdx].label;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-background px-4">
        <button onClick={() => navigate("/alarm")} className="text-foreground p-1">
          <X className="h-6 w-6" />
        </button>
        <span
          className="text-base font-semibold text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Add alarm
        </span>
        <button
          onClick={handleSave}
          disabled={saving}
          className="p-1 text-primary disabled:opacity-50"
        >
          <Check className="h-6 w-6" />
        </button>
      </header>

      <div className="mx-auto max-w-lg px-4">
        {/* Scroll-wheel time picker */}
        <div className="flex items-center justify-center gap-2 py-6">
          <div className="w-20">
            <WheelColumn items={hours12} value={hourIdx} onChange={setHourIdx} />
          </div>
          <div className="w-20">
            <WheelColumn items={minutes60} value={minIdx} onChange={setMinIdx} />
          </div>
          <div className="w-16">
            <WheelColumn items={periods} value={periodIdx} onChange={setPeriodIdx} />
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-2 pt-4">
          <SettingRow
            label="Repeat"
            value={repeatLabel}
            onClick={() => setSubScreen("repeat")}
          />
        </div>

        <div className="mt-4 space-y-px rounded-2xl bg-card overflow-hidden">
          <SettingRow
            label="Sound"
            value={soundLabel}
            onClick={() => setSubScreen("sound")}
          />
          <div className="mx-4 border-t border-border" />
          <SettingRow
            label="Label"
            value={label || "Alarm"}
            onClick={() => setSubScreen("label")}
          />
          <div className="mx-4 border-t border-border" />
          <SettingRow
            label="Snooze duration"
            value={snoozeLabel}
            onClick={() => setSubScreen("snooze")}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Shared sub-screen header ─── */
function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-background px-4">
      <button onClick={onBack} className="text-foreground p-1">
        <X className="h-5 w-5" />
      </button>
      <span
        className="text-base font-semibold text-foreground"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {title}
      </span>
    </header>
  );
}
