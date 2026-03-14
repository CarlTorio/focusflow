import { useNudgeContext } from "@/contexts/NudgeContext";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function NudgeBanner() {
  const { currentNudge, dismissNudge } = useNudgeContext();

  if (!currentNudge) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-[90] animate-fade-in">
      <div className="mx-auto max-w-lg p-3">
        <div className="overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-2xl shadow-primary/10">
          <div className="bg-primary/5 px-4 py-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{currentNudge.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">{currentNudge.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{currentNudge.message}</p>
              </div>
              <button
                onClick={() => dismissNudge("dismissed")}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          {currentNudge.actions.length > 0 && (
            <div className="flex gap-2 px-4 py-3">
              {currentNudge.actions.map((action) => (
                <Button
                  key={action.label}
                  variant={action.variant || "default"}
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    action.onClick?.();
                    dismissNudge(action.response);
                  }}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
