import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/supabase";
import { getNudgeMessage, NudgeType } from "@/lib/nudgeTemplates";
import { useQuery } from "@tanstack/react-query";

export interface ActiveNudge {
  id: string;
  type: NudgeType;
  title: string;
  message: string;
  emoji: string;
  actions: NudgeAction[];
  persistent?: boolean;
}

export interface NudgeAction {
  label: string;
  response: "acted" | "dismissed" | "snoozed";
  variant?: "default" | "outline" | "ghost";
  onClick?: () => void;
}

interface NudgeContextType {
  currentNudge: ActiveNudge | null;
  showNudge: (nudge: ActiveNudge) => void;
  dismissNudge: (response: string) => void;
  nudgeEnabled: boolean;
}

const NudgeContext = createContext<NudgeContextType | undefined>(undefined);

export function NudgeProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [queue, setQueue] = useState<ActiveNudge[]>([]);
  const [currentNudge, setCurrentNudge] = useState<ActiveNudge | null>(null);

  const nudgeEnabled = (profile as any)?.nudge_enabled !== false;

  const showNudge = useCallback((nudge: ActiveNudge) => {
    if (!nudgeEnabled) return;
    setQueue(prev => [...prev, nudge]);
  }, [nudgeEnabled]);

  const dismissNudge = useCallback(async (response: string) => {
    if (currentNudge && user) {
      await db.from("nudge_logs").insert({
        user_id: user.id,
        nudge_type: currentNudge.type,
        message: currentNudge.message,
        user_response: response,
      });
    }
    setCurrentNudge(null);
  }, [currentNudge, user]);

  // Process queue
  useEffect(() => {
    if (!currentNudge && queue.length > 0) {
      setCurrentNudge(queue[0]);
      setQueue(prev => prev.slice(1));
    }
  }, [currentNudge, queue]);

  // Auto-dismiss non-persistent nudges
  useEffect(() => {
    if (currentNudge && !currentNudge.persistent) {
      const timer = setTimeout(() => dismissNudge("dismissed"), 10000);
      return () => clearTimeout(timer);
    }
  }, [currentNudge, dismissNudge]);

  // Check for overwhelm (overdue tasks)
  const _now = new Date();
  const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;
  const { data: overdueCount } = useQuery({
    queryKey: ["overdue-count", today],
    queryFn: async () => {
      const { count } = await db
        .from("task_schedules")
        .select("id", { count: "exact", head: true })
        .lt("scheduled_date", today)
        .eq("status", "scheduled");
      return count || 0;
    },
    enabled: !!user && nudgeEnabled,
    refetchInterval: 300000, // 5 min
  });

  // Fire overwhelm nudge
  useEffect(() => {
    if (overdueCount && overdueCount >= 3 && nudgeEnabled) {
      const template = getNudgeMessage("overwhelm", { count: overdueCount });
      showNudge({
        id: `overwhelm-${Date.now()}`,
        type: "overwhelm",
        title: template.title,
        message: template.message,
        emoji: template.emoji,
        persistent: true,
        actions: [
          { label: "I'll handle it", response: "dismissed", variant: "outline" },
          { label: "Dismiss", response: "dismissed", variant: "ghost" },
        ],
      });
    }
  }, [overdueCount]);

  // Celebration helper is exposed via showNudge - callers build the nudge

  return (
    <NudgeContext.Provider value={{ currentNudge, showNudge, dismissNudge, nudgeEnabled }}>
      {children}
    </NudgeContext.Provider>
  );
}

export const useNudgeContext = () => {
  const context = useContext(NudgeContext);
  if (!context) throw new Error("useNudgeContext must be used within NudgeProvider");
  return context;
};
