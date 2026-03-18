import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase, db } from "@/lib/supabase";
import { format, addDays } from "date-fns";

const db = supabase as any;

const zoneToY: Record<string, number> = { green: 15, yellow: 55, orange: 75, red: 95 };
const zoneToColor: Record<string, string> = {
  green: "hsl(var(--success))", yellow: "hsl(var(--warning))",
  orange: "hsl(var(--warning))", red: "hsl(var(--destructive))",
};

interface MoodEntry { id: string; mood: string; mood_zone: string; logged_at: string | null; note: string | null; }

export function MoodTimeline() {
  const { user } = useAuth();
  const [dateOffset, setDateOffset] = useState(0);
  const [tooltip, setTooltip] = useState<{ entry: MoodEntry; x: number; y: number } | null>(null);

  const targetDate = dateOffset === 0 ? new Date() : addDays(new Date(), dateOffset);
  const dateStr = format(targetDate, "yyyy-MM-dd");
  const dayLabel = dateOffset === 0 ? "Today" : format(targetDate, "MMM d");

  const { data: entries = [] } = useQuery({
    queryKey: ["mood-timeline", dateStr],
    queryFn: async () => {
      const { data } = await db
        .from("mood_entries")
        .select("id, mood, mood_zone, logged_at, note")
        .gte("logged_at", `${dateStr}T00:00:00`)
        .lt("logged_at", `${dateStr}T23:59:59`)
        .order("logged_at", { ascending: true });
      return (data || []) as MoodEntry[];
    },
    enabled: !!user,
  });

  const getXPercent = (loggedAt: string | null) => {
    if (!loggedAt) return 50;
    const d = new Date(loggedAt);
    return Math.max(5, Math.min(95, ((d.getHours() * 60 + d.getMinutes()) / 1440) * 100));
  };

  const points = entries.map((e) => ({ x: getXPercent(e.logged_at), y: zoneToY[e.mood_zone] || 55 }));

  let pathD = "";
  if (points.length >= 2) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]; const curr = points[i];
      pathD += ` C ${prev.x + (curr.x - prev.x) * 0.4} ${prev.y}, ${prev.x + (curr.x - prev.x) * 0.6} ${curr.y}, ${curr.x} ${curr.y}`;
    }
  }

  return (
    <div className="rounded-2xl bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-medium text-primary-dark">Mood</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setDateOffset(d => d - 1)} className="text-muted-foreground hover:text-foreground"><ChevronLeft className="h-5 w-5" /></button>
          <span className="min-w-[60px] text-center text-sm font-semibold text-foreground">{dayLabel}</span>
          <button onClick={() => setDateOffset(d => Math.min(0, d + 1))} disabled={dateOffset >= 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronRight className="h-5 w-5" /></button>
        </div>
      </div>
      <div className="relative h-36">
        <div className="absolute left-0 top-0 flex h-full flex-col justify-between text-lg"><span>😂</span><span>😐</span><span>😣</span></div>
        <div className="ml-10 h-full border-b border-l border-border">
          {entries.length === 0 ? (
            <div className="flex h-full items-center justify-center"><p className="text-xs text-muted-foreground">No mood entries yet. Tap the mood card above to log how you're feeling.</p></div>
          ) : (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
              {pathD && <path d={pathD} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity="0.5" />}
              {entries.map((entry, i) => (
                <circle key={entry.id} cx={points[i].x} cy={points[i].y} r="3" fill={zoneToColor[entry.mood_zone] || "hsl(var(--primary))"} stroke="hsl(var(--card))" strokeWidth="1" vectorEffect="non-scaling-stroke" className="cursor-pointer"
                  onMouseEnter={(e) => { const rect = (e.target as SVGElement).closest("svg")!.getBoundingClientRect(); setTooltip({ entry, x: rect.left + (points[i].x / 100) * rect.width, y: rect.top + (points[i].y / 100) * rect.height }); }}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => setTooltip(prev => prev?.entry.id === entry.id ? null : { entry, x: points[i].x, y: points[i].y })}
                />
              ))}
            </svg>
          )}
        </div>
        <div className="ml-10 flex justify-between pt-1">{["12am", "6am", "12pm", "6pm", "12am"].map((t) => <span key={t} className="text-[10px] text-muted-foreground">{t}</span>)}</div>
      </div>
      {tooltip && (
        <div className="mt-2 rounded-lg bg-secondary p-2 text-xs">
          <p className="font-medium capitalize text-foreground">{tooltip.entry.mood}</p>
          <p className="text-muted-foreground">{tooltip.entry.logged_at ? format(new Date(tooltip.entry.logged_at), "h:mm a") : "Unknown time"}</p>
          {tooltip.entry.note && <p className="mt-1 text-foreground">{tooltip.entry.note}</p>}
        </div>
      )}
    </div>
  );
}
