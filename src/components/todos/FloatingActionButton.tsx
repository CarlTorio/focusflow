import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FABProps {
  onClick: () => void;
  className?: string;
}

export function FloatingActionButton({ onClick, className }: FABProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95",
        "bottom-24 right-5 md:bottom-8 md:right-8",
        className
      )}
    >
      <Plus className="h-6 w-6" />
    </button>
  );
}
