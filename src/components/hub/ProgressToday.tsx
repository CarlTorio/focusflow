import { CheckCircle2, CalendarX2, ListChecks, BookOpen } from "lucide-react";

const cards = [
  { label: "Completed", sub: "Activities", count: 0, icon: CheckCircle2, color: "text-success" },
  { label: "Outstanding", sub: "Activities", count: 0, icon: CalendarX2, color: "text-destructive" },
  { label: "Todos", sub: "Outstanding", count: 0, icon: ListChecks, color: "text-primary" },
  { label: "Journal", sub: "Entries", count: 0, icon: BookOpen, color: "text-primary-dark" },
];

export function ProgressToday() {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-foreground">Progress Today</h3>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <button
            key={card.label}
            className="flex flex-col items-center rounded-2xl bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <card.icon className={`mb-2 h-8 w-8 ${card.color}`} />
            <p className="text-2xl font-bold text-foreground">{card.count}</p>
            <p className="text-sm font-medium text-foreground">{card.label}</p>
            <p className="text-xs text-muted-foreground">{card.sub}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
