import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAlarms } from "@/hooks/useAlarms";
import { SOUND_OPTIONS, previewSound, stopAlarmSound } from "@/lib/alarmSounds";
import { X, Check, ChevronRight, ArrowLeft, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";

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
                  ? "text-primary text-2xl font-semibold"
                  : "text-muted-foreground text-lg font-normal opacity-40"
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

/* ─── Bottom Sheet Modal ─── */
function BottomSheet({
  open,
  onClose,
  title,
  children,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg animate-in slide-in-from-bottom duration-300 rounded-t-2xl bg-card" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="px-6 pt-6 pb-2">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-6">{children}</div>
        {actions && (
          <div className="flex items-center justify-end gap-6 border-t border-border px-6 py-4 pb-20 md:pb-4">
            {actions}
          </div>
        )}
        {!actions && <div className="pb-20 md:pb-4" />}
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
      className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-secondary/50"
    >
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className="flex items-center gap-1 text-sm text-muted-foreground">
        {value}
        <ChevronRight className="h-4 w-4" />
      </span>
    </button>
  );
}

/* ─── Radio row for bottom sheets ─── */
function RadioRow({
  label,
  subtitle,
  selected,
  onClick,
}: {
  label: string;
  subtitle?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between py-3.5 text-left"
    >
      <div>
        <span className="text-sm text-foreground">{label}</span>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
          selected
            ? "border-primary bg-primary"
            : "border-muted-foreground"
        )}
      >
        {selected && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
      </div>
    </button>
  );
}

/* ─── Day labels ─── */
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/* ─── Ring duration options ─── */
const RING_DURATION_OPTIONS = [
  { value: 1, label: "1 minute" },
  { value: 5, label: "5 minutes" },
  { value: 10, label: "10 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 20, label: "20 minutes" },
  { value: 30, label: "30 minutes" },
];

export default function AddAlarm() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const { alarms, createAlarm, updateAlarm, deleteAlarm } = useAlarms();
  const isEdit = !!editId;
  const editAlarm = isEdit ? alarms.find((a) => a.id === editId) : null;

  const hours12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const minutes60 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
  const periods = ["am", "pm"];

  // Compute initial values from editAlarm
  const getInitialValues = () => {
    if (editAlarm) {
      const displayTime = (editAlarm as any).original_alarm_time || editAlarm.alarm_time;
      const d = new Date(displayTime);
      const h = d.getHours();
      const h12Val = h % 12 || 12;
      return {
        hourIdx: h12Val - 1,
        minIdx: d.getMinutes(),
        periodIdx: h >= 12 ? 1 : 0,
        customDays: editAlarm.recurrence_days || [],
        soundType: editAlarm.sound_type || "alarm-1",
        label: editAlarm.title || "Alarm",
        snoozeMins: editAlarm.snooze_duration_minutes || 5,
        snoozeCount: editAlarm.max_snoozes || 3,
      };
    }
    return {
      hourIdx: 8, minIdx: 0, periodIdx: 0,
      customDays: [] as number[], soundType: "alarm-1",
      label: "Alarm", snoozeMins: 5, snoozeCount: 3,
    };
  };

  const init = getInitialValues();
  const [hourIdx, setHourIdx] = useState(init.hourIdx);
  const [minIdx, setMinIdx] = useState(init.minIdx);
  const [periodIdx, setPeriodIdx] = useState(init.periodIdx);

  // Settings
  const [customDays, setCustomDays] = useState<number[]>(init.customDays);
  const [soundType, setSoundType] = useState(init.soundType);
  const [label, setLabel] = useState(init.label);
  const [snoozeMins, setSnoozeMins] = useState(init.snoozeMins);
  const [snoozeCount, setSnoozeCount] = useState(init.snoozeCount);
  const [ringDuration, setRingDuration] = useState(5);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Modals
  const [showRepeat, setShowRepeat] = useState(false);
  const [showSound, setShowSound] = useState(false);
  const [showSnooze, setShowSnooze] = useState(false);
  const [showRingDuration, setShowRingDuration] = useState(false);
  const [showLabel, setShowLabel] = useState(false);
  const [tempLabel, setTempLabel] = useState(label);

  // Temp state for snooze modal
  const [tempSnoozeMins, setTempSnoozeMins] = useState(snoozeMins);
  const [tempSnoozeCount, setTempSnoozeCount] = useState(snoozeCount);

  // Temp state for repeat modal
  const [tempDays, setTempDays] = useState<number[]>(customDays);

  const toggleTempDay = (d: number) =>
    setTempDays((prev) =>
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
      const alarmDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour24, minIdx);
      if (alarmDate <= now) alarmDate.setDate(alarmDate.getDate() + 1);

      const isRecurring = customDays.length > 0;

      if (isEdit && editId) {
        await updateAlarm.mutateAsync({
          id: editId,
          title: label.trim() || "Alarm",
          alarm_time: alarmDate.toISOString(),
          original_alarm_time: alarmDate.toISOString(),
          sound_type: soundType,
          is_recurring: isRecurring,
          recurrence_pattern: isRecurring ? "custom" : null,
          recurrence_days: isRecurring ? customDays : null,
          snooze_duration_minutes: snoozeMins,
          max_snoozes: snoozeCount,
          snooze_count: 0,
        } as any);
        toast.success("Alarm updated!");
      } else {
        await createAlarm.mutateAsync({
          title: label.trim() || "Alarm",
          alarm_type: "custom",
          alarm_time: alarmDate.toISOString(),
          sound_type: soundType,
          is_recurring: isRecurring,
          recurrence_pattern: isRecurring ? "custom" : undefined,
          recurrence_days: isRecurring ? customDays : undefined,
          snooze_duration_minutes: snoozeMins,
          max_snoozes: snoozeCount,
        });
        toast.success("Alarm set!");
      }

      navigate("/alarm");
    } catch (err: any) {
      toast.error(err.message || "Failed to save alarm");
    } finally {
      setSaving(false);
    }
  };

  /* ─── Sound sub-screen (full page like reference) ─── */
  if (showSound) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-8">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-background px-4">
          <button onClick={() => { stopAlarmSound(); setShowSound(false); }} className="text-foreground p-1">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-base font-semibold text-foreground">Alarm tone</span>
        </header>

        <div className="mx-auto max-w-lg px-4 pt-2">
          {/* Ringtones section */}
          <p className="px-1 pb-2 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ringtones
          </p>
          <div className="rounded-2xl bg-card overflow-hidden">
            {SOUND_OPTIONS.map((opt, i) => (
              <div key={opt.value}>
                {i > 0 && <div className="mx-4 border-t border-border" />}
                <button
                  onClick={() => {
                    setSoundType(opt.value);
                    previewSound(opt.value);
                  }}
                  className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-secondary/50"
                >
                  <span className="text-sm text-foreground">{opt.label}</span>
                  <div
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
                      soundType === opt.value
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    )}
                  >
                    {soundType === opt.value && (
                      <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                    )}
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ─── Repeat label ─── */
  const repeatLabel =
    customDays.length === 7
      ? "Every day"
      : customDays.length === 5 && [1, 2, 3, 4, 5].every((d) => customDays.includes(d))
        ? "Weekdays"
        : customDays.length > 0
          ? customDays.sort().map((d) => DAY_NAMES[d]?.slice(0, 3)).join(", ")
          : "Only ring once";

  const soundLabel = SOUND_OPTIONS.find((s) => s.value === soundType)?.label || "Alarm 1";

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-background px-4">
        <button onClick={() => navigate("/alarm")} className="text-foreground p-1">
          <X className="h-6 w-6" />
        </button>
        <span className="text-base font-semibold text-foreground">{isEdit ? "Edit alarm" : "Add alarm"}</span>
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

        {/* Settings rows */}
        <div className="mt-4 rounded-2xl bg-card overflow-hidden">
          <SettingRow
            label="Repeat"
            value={repeatLabel}
            onClick={() => { setTempDays([...customDays]); setShowRepeat(true); }}
          />
          <div className="mx-5 border-t border-border" />
          <SettingRow
            label="Alarm tone"
            value={soundLabel}
            onClick={() => setShowSound(true)}
          />
          <div className="mx-5 border-t border-border" />
          <SettingRow
            label="Ring duration"
            value={`${ringDuration} min`}
            onClick={() => setShowRingDuration(true)}
          />
          <div className="mx-5 border-t border-border" />
          <SettingRow
            label="Snooze duration"
            value={`${snoozeMins} min, ${snoozeCount}×`}
            onClick={() => { setTempSnoozeMins(snoozeMins); setTempSnoozeCount(snoozeCount); setShowSnooze(true); }}
          />
          <div className="mx-5 border-t border-border" />
          <SettingRow
            label="Label"
            value={label || "Alarm"}
            onClick={() => { setTempLabel(label); setShowLabel(true); }}
          />
        </div>

        {/* Delete button (edit mode only) */}
        {isEdit && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-destructive/10 py-4 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/20"
          >
            <Trash2 className="h-4 w-4" />
            Delete alarm
          </button>
        )}
      </div>

      {/* ─── Repeat bottom sheet ─── */}
      <BottomSheet
        open={showRepeat}
        onClose={() => setShowRepeat(false)}
        title="Repeat"
        actions={
          <>
            <button onClick={() => setShowRepeat(false)} className="text-sm font-semibold text-primary">
              CANCEL
            </button>
            <button
              onClick={() => { setCustomDays(tempDays); setShowRepeat(false); }}
              className="text-sm font-semibold text-primary"
            >
              OK
            </button>
          </>
        }
      >
        <div className="divide-y divide-border">
          {DAY_NAMES.map((day, i) => (
            <button
              key={i}
              onClick={() => toggleTempDay(i)}
              className="flex w-full items-center justify-between py-3.5 text-left"
            >
              <span className="text-sm text-foreground">{day}</span>
              <Checkbox
                checked={tempDays.includes(i)}
                onCheckedChange={() => toggleTempDay(i)}
                className="border-muted-foreground data-[state=checked]:border-primary data-[state=checked]:bg-primary"
              />
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* ─── Ring Duration bottom sheet ─── */}
      <BottomSheet
        open={showRingDuration}
        onClose={() => setShowRingDuration(false)}
        title="Ring duration"
        actions={
          <button onClick={() => setShowRingDuration(false)} className="text-sm font-semibold text-primary">
            CANCEL
          </button>
        }
      >
        <div className="divide-y divide-border">
          {RING_DURATION_OPTIONS.map((opt) => (
            <RadioRow
              key={opt.value}
              label={opt.label}
              selected={ringDuration === opt.value}
              onClick={() => { setRingDuration(opt.value); setShowRingDuration(false); }}
            />
          ))}
        </div>
      </BottomSheet>

      {/* ─── Snooze Duration bottom sheet ─── */}
      <BottomSheet
        open={showSnooze}
        onClose={() => setShowSnooze(false)}
        title="Snooze duration"
        actions={
          <>
            <button onClick={() => setShowSnooze(false)} className="text-sm font-semibold text-primary">
              CANCEL
            </button>
            <button
              onClick={() => { setSnoozeMins(tempSnoozeMins); setSnoozeCount(tempSnoozeCount); setShowSnooze(false); }}
              className="text-sm font-semibold text-primary"
            >
              OK
            </button>
          </>
        }
      >
        <div className="space-y-6 py-2">
          <div>
            <p className="text-xs text-muted-foreground mb-3">Snooze duration (min)</p>
            <Slider
              value={[tempSnoozeMins]}
              onValueChange={(v) => setTempSnoozeMins(v[0])}
              min={5}
              max={30}
              step={5}
              className="w-full"
            />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              {[5, 10, 15, 20, 25, 30].map((n) => (
                <span key={n} className={cn(tempSnoozeMins === n && "text-primary font-semibold")}>{n}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-3">Number of snoozes</p>
            <Slider
              value={[tempSnoozeCount]}
              onValueChange={(v) => setTempSnoozeCount(v[0])}
              min={0}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              {[0, 1, 3, 5, 10].map((n) => (
                <span key={n} className={cn(tempSnoozeCount === n && "text-primary font-semibold")}>{n}</span>
              ))}
            </div>
          </div>
        </div>
      </BottomSheet>

      {/* ─── Label bottom sheet ─── */}
      <BottomSheet
        open={showLabel}
        onClose={() => setShowLabel(false)}
        title="Label"
        actions={
          <>
            <button onClick={() => setShowLabel(false)} className="text-sm font-semibold text-primary">
              CANCEL
            </button>
            <button
              onClick={() => { setLabel(tempLabel); setShowLabel(false); }}
              className="text-sm font-semibold text-primary"
            >
              OK
            </button>
          </>
        }
      >
        <input
          autoFocus
          value={tempLabel}
          onChange={(e) => setTempLabel(e.target.value)}
          placeholder="Alarm label"
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </BottomSheet>
    </div>
  );
}
