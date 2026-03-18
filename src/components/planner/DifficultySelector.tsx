import { cn } from "@/lib/utils";

interface DifficultySelectorProps {
  value: number;
  onChange: (v: number) => void;
}

function getBarColor(level: number, isActive: boolean): string {
  if (!isActive) return "bg-muted";
  if (level <= 3) return "bg-emerald-500";
  if (level <= 6) return "bg-amber-500";
  return "bg-red-500";
}

function getDifficultyLabel(level: number): { text: string; color: string } {
  if (level <= 3) return { text: "Easy", color: "text-emerald-500" };
  if (level <= 6) return { text: "Medium", color: "text-amber-500" };
  return { text: "Hard", color: "text-red-500" };
}

export function DifficultySelector({ value, onChange }: DifficultySelectorProps) {
  const label = getDifficultyLabel(value);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold">How hard is this project?</label>
        <span className={cn("text-xs font-bold", label.color)}>
          {value}/10 · {label.text}
        </span>
      </div>
      <div className="flex items-end gap-1.5">
        {Array.from({ length: 10 }, (_, i) => {
          const level = i + 1;
          const isActive = level <= value;
          const height = 12 + level * 2.5; // bars grow taller

          return (
            <button
              key={level}
              type="button"
              onClick={() => onChange(level)}
              className={cn(
                "flex-1 rounded-sm transition-all duration-150 hover:opacity-80 active:scale-y-90",
                getBarColor(level, isActive)
              )}
              style={{ height: `${height}px` }}
              aria-label={`Difficulty ${level}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-muted-foreground">Easy</span>
        <span className="text-[10px] text-muted-foreground">Hard</span>
      </div>
    </div>
  );
}
