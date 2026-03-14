import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { subDays, format } from "date-fns";

const zoneLabels: Record<string, string> = {
  green: "positive 😊",
  yellow: "neutral 😐",
  orange: "uneasy 😟",
  red: "tough 😣",
};

export function MoodInsights() {
  const { user } = useAuth();
  const weekAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");

  const { data } = useQuery({
    queryKey: ["mood-insights", weekAgo],
    queryFn: async () => {
      const { data: entries } = await supabase
        .from("mood_entries")
        .select("mood_zone, logged_at")
        .gte("logged_at", `${weekAgo}T00:00:00`)
        .order("logged_at", { ascending: true });

      if (!entries || entries.length < 3) return null;

      // Count zones
      const zoneCounts: Record<string, number> = {};
      entries.forEach((e: any) => {
        zoneCounts[e.mood_zone] = (zoneCounts[e.mood_zone] || 0) + 1;
      });

      const dominant = Object.entries(zoneCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "yellow";

      // Best/worst time of day
      let morningScore = 0, morningCount = 0;
      let afternoonScore = 0, afternoonCount = 0;
      const zoneScore: Record<string, number> = { green: 3, yellow: 2, orange: 1, red: 0 };

      entries.forEach((e: any) => {
        if (!e.logged_at) return;
        const hour = new Date(e.logged_at).getHours();
        const score = zoneScore[e.mood_zone] ?? 2;
        if (hour < 12) { morningScore += score; morningCount++; }
        else { afternoonScore += score; afternoonCount++; }
      });

      const morningAvg = morningCount > 0 ? morningScore / morningCount : null;
      const afternoonAvg = afternoonCount > 0 ? afternoonScore / afternoonCount : null;

      let timeInsight: string | null = null;
      if (morningAvg !== null && afternoonAvg !== null && entries.length >= 7) {
        if (morningAvg > afternoonAvg + 0.5) timeInsight = "You tend to feel better in the mornings 🌅";
        else if (afternoonAvg > morningAvg + 0.5) timeInsight = "Your mood picks up in the afternoon ☀️";
      }

      return { dominant, count: entries.length, timeInsight };
    },
    enabled: !!user,
  });

  if (!data) return null;

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <p className="text-xs font-medium text-primary">Weekly Insight</p>
      <p className="mt-1 text-sm text-foreground">
        This week you felt <span className="font-semibold">{zoneLabels[data.dominant] || "mixed"}</span> most often
        <span className="text-muted-foreground"> ({data.count} entries)</span>
      </p>
      {data.timeInsight && (
        <p className="mt-1 text-xs text-muted-foreground">{data.timeInsight}</p>
      )}
    </div>
  );
}
