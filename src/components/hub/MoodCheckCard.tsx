import { useState } from "react";
import { MoodSelectorModal } from "./MoodSelectorModal";

export function MoodCheckCard() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
      >
        <div className="h-12 w-1 rounded-full bg-primary" />
        <div className="text-left">
          <p className="font-semibold text-foreground">How are you feeling?</p>
          <p className="text-sm text-muted-foreground">Tap to update mood</p>
        </div>
      </button>
      <p className="mt-1 text-right text-xs text-muted-foreground">0/3 free updates today</p>
      <MoodSelectorModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
