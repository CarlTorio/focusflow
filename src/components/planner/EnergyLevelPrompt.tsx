import { useState } from "react";
import { Zap, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const ENERGY_STORAGE_KEY = "energy_level_today";

export type EnergyLevel = "high" | "low";

export function getStoredEnergy(): EnergyLevel | null {
  try {
    const stored = localStorage.getItem(ENERGY_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed.date !== format(new Date(), "yyyy-MM-dd")) {
      localStorage.removeItem(ENERGY_STORAGE_KEY);
      return null;
    }
    return parsed.level as EnergyLevel;
  } catch {
    return null;
  }
}

export function setStoredEnergy(level: EnergyLevel) {
  localStorage.setItem(
    ENERGY_STORAGE_KEY,
    JSON.stringify({ date: format(new Date(), "yyyy-MM-dd"), level })
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

interface EnergyLevelPromptProps {
  onSelect: (level: EnergyLevel) => void;
}

export function EnergyLevelPrompt({ onSelect }: EnergyLevelPromptProps) {
  const greeting = getGreeting();

  return (
    <div className="mb-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/10 p-5 animate-in fade-in-0 slide-in-from-top-4 duration-500">
      <h3 className="text-lg font-bold text-foreground mb-1">
        {greeting}! 👋
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        How's your energy today?
      </p>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            setStoredEnergy("high");
            onSelect("high");
          }}
          className={cn(
            "flex flex-col items-center gap-2 rounded-xl border-2 border-border p-4 transition-all",
            "hover:border-amber-500 hover:bg-amber-500/5 hover:shadow-md active:scale-[0.97]"
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
            <Zap className="h-6 w-6 text-amber-500" />
          </div>
          <span className="text-sm font-bold text-foreground">High Energy</span>
          <span className="text-[11px] text-muted-foreground">Tackle the hard stuff</span>
        </button>

        <button
          onClick={() => {
            setStoredEnergy("low");
            onSelect("low");
          }}
          className={cn(
            "flex flex-col items-center gap-2 rounded-xl border-2 border-border p-4 transition-all",
            "hover:border-emerald-500 hover:bg-emerald-500/5 hover:shadow-md active:scale-[0.97]"
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
            <Leaf className="h-6 w-6 text-emerald-500" />
          </div>
          <span className="text-sm font-bold text-foreground">Low Energy</span>
          <span className="text-[11px] text-muted-foreground">Easy wins today</span>
        </button>
      </div>
    </div>
  );
}
