import { ChevronLeft, ChevronRight } from "lucide-react";

export function MoodTimeline() {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <span className="mr-2 rounded-full bg-primary-light px-3 py-1 text-xs font-medium text-primary-dark">
            Mood
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-foreground">Today</span>
          <button className="text-muted-foreground hover:text-foreground">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="relative h-32">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 flex h-full flex-col justify-between text-lg">
          <span>😂</span>
          <span>😐</span>
          <span>😣</span>
        </div>
        {/* Chart area */}
        <div className="ml-10 flex h-full items-end justify-between border-b border-l border-border pl-2">
          {["12am", "6am", "12pm", "6pm", "12pm"].map((t) => (
            <span key={t} className="text-[10px] text-muted-foreground">{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
