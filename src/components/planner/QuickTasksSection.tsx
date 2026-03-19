import { useState } from "react";
import { Plus, Check, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { isOnline, addPendingMutation, getCachedData, setCachedData } from "@/lib/offlineStorage";

interface QuickTasksSectionProps {
  date: Date;
  readOnly?: boolean;
}

export function QuickTasksSection({ date, readOnly = false }: QuickTasksSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const dateStr = format(date, "yyyy-MM-dd");
  const [newTitle, setNewTitle] = useState("");
  const [showInput, setShowInput] = useState(false);
  const cacheKey = `quick_tasks_${dateStr}`;

  const { data: quickTasks = [] } = useQuery({
    queryKey: ["quick_tasks", dateStr],
    queryFn: async () => {
      if (!isOnline()) {
        const cached = await getCachedData<any[]>(cacheKey);
        return cached || [];
      }
      const { data, error } = await supabase
        .from("quick_tasks")
        .select("*")
        .eq("created_date", dateStr)
        .order("created_at", { ascending: true });
      if (error) throw error;
      await setCachedData(cacheKey, data);
      return data;
    },
    enabled: !!user,
    retry: isOnline() ? 3 : 0,
  });

  const addTask = useMutation({
    mutationFn: async (title: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("quick_tasks").insert({
        title,
        user_id: user.id,
        created_date: dateStr,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick_tasks", dateStr] });
      setNewTitle("");
      setShowInput(false);
    },
  });

  const toggleComplete = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from("quick_tasks")
        .update({ is_completed: completed })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick_tasks", dateStr] });
      queryClient.invalidateQueries({ queryKey: ["progress-today"] });
    },
  });

  const handleSubmit = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    addTask.mutate(trimmed);
  };

  // Don't render anything if no quick tasks
  if (quickTasks.length === 0) return null;

  const pending = quickTasks.filter((t) => !t.is_completed);
  const completed = quickTasks.filter((t) => t.is_completed);

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-2 text-xs">
        <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
        <span className="font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          Quick Tasks ({quickTasks.length})
        </span>
      </div>

      <div className="space-y-1.5">
        {pending.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2.5"
          >
            <button
              onClick={() => !readOnly && toggleComplete.mutate({ id: task.id, completed: true })}
              disabled={readOnly}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-emerald-400 dark:border-emerald-600 transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-900 disabled:opacity-50"
            >
              <span className="sr-only">Complete</span>
            </button>
            <span className="text-sm font-medium text-foreground truncate">
              {task.title}
            </span>
          </div>
        ))}

        {completed.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-2.5 rounded-xl border border-emerald-200/50 dark:border-emerald-800/30 bg-emerald-50/50 dark:bg-emerald-950/20 px-3 py-2.5 opacity-60"
          >
            <button
              onClick={() => !readOnly && toggleComplete.mutate({ id: task.id, completed: false })}
              disabled={readOnly}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"
            >
              <Check className="h-3 w-3" />
            </button>
            <span className="text-sm font-medium text-muted-foreground line-through truncate">
              {task.title}
            </span>
          </div>
        ))}

      </div>
    </div>
  );
}
