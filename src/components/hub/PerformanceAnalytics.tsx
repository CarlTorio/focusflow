import { useState } from "react";
import { TrendingUp, TrendingDown, Flame, Star, Sparkles, Minus } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { usePerformanceAnalytics, PeriodFilter } from "@/hooks/usePerformanceAnalytics";
import { cn } from "@/lib/utils";

// ─── Period Toggle ─────────────────────────────────────────────────────────────
function PeriodToggle({
  value,
  onChange,
}: {
  value: PeriodFilter;
  onChange: (v: PeriodFilter) => void;
}) {
  const options: { label: string; value: PeriodFilter }[] = [
    { label: "This Week", value: "week" },
    { label: "This Month", value: "month" },
    { label: "All Time", value: "all" },
  ];
  return (
    <div className="flex gap-1 rounded-xl bg-secondary p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
            value === o.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Trend Badge ───────────────────────────────────────────────────────────────
function TrendBadge({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  if (Math.abs(diff) < 1) return <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Minus size={10} /> —</span>;
  const up = diff > 0;
  return (
    <span
      className={cn(
        "flex items-center gap-0.5 text-xs font-semibold",
        up ? "text-success" : "text-destructive"
      )}
    >
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {up ? "+" : ""}{Math.round(diff)}%
    </span>
  );
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-muted-foreground">
        {d?.completionRate ?? 0}% ({d?.completed ?? 0}/{d?.total ?? 0} tasks)
      </p>
    </div>
  );
}

// ─── Completion Rate Chart ─────────────────────────────────────────────────────
function CompletionChart({ data, period }: { data: any[]; period: PeriodFilter }) {
  const visible = data.filter((d) => !d.isFuture);
  if (visible.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-center text-sm text-muted-foreground">
        <p>Complete tasks to see your trend here 🚀</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        <defs>
          <linearGradient id="completionGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(262 100% 65%)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="hsl(262 100% 65%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          interval={period === "month" ? 4 : 0}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="completionRate"
          stroke="hsl(262 100% 65%)"
          strokeWidth={2}
          fill="url(#completionGrad)"
          dot={(props: any) => {
            const { cx, cy, payload } = props;
            if (payload.isFuture) return <g key={`dot-${payload.date}`} />;
            return (
              <circle
                key={`dot-${payload.date}`}
                cx={cx}
                cy={cy}
                r={payload.isToday ? 5 : 3.5}
                fill={payload.isToday ? "hsl(262 100% 65%)" : "hsl(var(--card))"}
                stroke="hsl(262 100% 65%)"
                strokeWidth={2}
              />
            );
          }}
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  title,
  value,
  label,
  trend,
  extra,
  color,
}: {
  title: string;
  value: string;
  label: string;
  trend?: React.ReactNode;
  extra?: React.ReactNode;
  color: string;
}) {
  return (
    <div className="min-w-[130px] flex-shrink-0 rounded-2xl bg-card p-4 shadow-sm md:flex-1">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{title}</p>
      <p className={cn("text-3xl font-bold", color)}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {trend && <div className="mt-1.5">{trend}</div>}
      {extra && <div className="mt-1">{extra}</div>}
    </div>
  );
}

// ─── Daily Breakdown Bar ───────────────────────────────────────────────────────
function DailyBreakdown({ data }: { data: any[] }) {
  if (data.every((d) => d.total === 0)) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No tasks scheduled yet this period
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((d) => {
        const barColor =
          d.isFuture
            ? "bg-muted"
            : d.completionRate >= 80
            ? "bg-success"
            : d.completionRate >= 50
            ? "bg-warning"
            : d.total > 0
            ? "bg-destructive"
            : "bg-muted";

        return (
          <div key={d.date} className="flex items-center gap-3">
            <span
              className={cn(
                "w-8 text-right text-xs font-semibold",
                d.isToday ? "text-primary" : "text-muted-foreground"
              )}
            >
              {d.label}
            </span>
            <div
              className={cn(
                "relative h-6 flex-1 overflow-hidden rounded-full bg-secondary",
                d.isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background"
              )}
            >
              <div
                className={cn("h-full rounded-full transition-all duration-500", barColor)}
                style={{ width: `${d.isFuture ? 0 : d.completionRate}%` }}
              />
            </div>
            <span className="w-12 text-right text-xs text-muted-foreground">
              {d.isFuture ? "—" : d.total > 0 ? `${d.completed}/${d.total}` : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function PerformanceAnalytics() {
  const [period, setPeriod] = useState<PeriodFilter>("week");
  const { data, isLoading } = usePerformanceAnalytics(period);

  const rateColor =
    (data?.avgCompletionRate ?? 0) >= 70
      ? "text-success"
      : (data?.avgCompletionRate ?? 0) >= 50
      ? "text-warning"
      : "text-destructive";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground">Your Performance</h3>
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>

      {/* 4A: Completion Rate Trend Chart */}
      <div className="rounded-2xl bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Completion Rate</p>
          {data && (
            <TrendBadge
              current={data.avgCompletionRate}
              previous={data.prevAvgCompletionRate}
            />
          )}
        </div>
        {isLoading ? (
          <div className="h-40 animate-pulse rounded-xl bg-secondary" />
        ) : (
          <CompletionChart data={data?.chartData ?? []} period={period} />
        )}
      </div>

      {/* 4B: Stats Cards Row */}
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none md:grid md:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 min-w-[130px] flex-shrink-0 animate-pulse rounded-2xl bg-secondary md:flex-1" />
          ))
        ) : (
          <>
            <StatCard
              title="Avg Completion"
              value={`${data?.avgCompletionRate ?? 0}%`}
              label="Completion rate"
              color={rateColor}
              trend={
                <TrendBadge
                  current={data?.avgCompletionRate ?? 0}
                  previous={data?.prevAvgCompletionRate ?? 0}
                />
              }
            />
            <StatCard
              title="On-Time"
              value={`${data?.onTimeRate ?? 0}%`}
              label="Tasks on schedule"
              color="text-primary"
              trend={
                <TrendBadge
                  current={data?.onTimeRate ?? 0}
                  previous={data?.prevOnTimeRate ?? 0}
                />
              }
            />
            <StatCard
              title="Streak"
              value={`${data?.streak ?? 0}d`}
              label="Completion streak"
              color="text-warning"
              extra={
                (data?.streak ?? 0) >= 3 ? (
                  <span className="text-base">🔥</span>
                ) : null
              }
            />
            <StatCard
              title="Best Day"
              value={data?.mostProductiveDay ? data.mostProductiveDay.slice(0, 3) : "—"}
              label={data?.mostProductiveDay ? "Your best day" : "Not enough data"}
              color="text-primary"
              extra={
                data?.mostProductiveDay ? (
                  <Star size={12} className="text-warning" />
                ) : null
              }
            />
          </>
        )}
      </div>

      {/* 4C: Daily Breakdown */}
      {period === "week" && (
        <div className="rounded-2xl bg-card p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-foreground">This Week</p>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-6 animate-pulse rounded-full bg-secondary" />
              ))}
            </div>
          ) : (
            <DailyBreakdown data={data?.chartData ?? []} />
          )}
        </div>
      )}

      {/* 4D: Insights Card */}
      <div className="rounded-2xl bg-secondary p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-1.5">
          <Sparkles size={14} className="text-primary" />
          <p className="text-xs font-semibold text-primary">Tip from Focus Buddy</p>
        </div>
        {isLoading ? (
          <div className="h-4 animate-pulse rounded bg-muted" />
        ) : (
          <p className="text-sm text-foreground leading-relaxed">{data?.insight ?? "Loading your insight…"}</p>
        )}
      </div>
    </div>
  );
}
