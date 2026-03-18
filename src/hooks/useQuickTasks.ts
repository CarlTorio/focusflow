import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

export interface QuickTask {
  id: string;
  title: string;
  is_completed: boolean;
  created_date: string;
  created_at: string;
  user_id: string;
}

export function useQuickTasks(dateStr: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["quick_tasks", dateStr];

  const { data: quickTasks = [], isLoading } = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quick_tasks")
        .select("*")
        .eq("user_id", user!.id)
        .eq("created_date", dateStr)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as QuickTask[];
    },
  });

  const addQuickTask = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase.from("quick_tasks").insert({
        title,
        user_id: user!.id,
        created_date: dateStr,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quick_tasks"] }),
  });

  const toggleQuickTask = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from("quick_tasks")
        .update({ is_completed: completed })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quick_tasks"] }),
  });

  const deleteQuickTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quick_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quick_tasks"] }),
  });

  return { quickTasks, isLoading, addQuickTask, toggleQuickTask, deleteQuickTask };
}
