import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface QuickTask {
  id: string;
  user_id: string;
  title: string;
  is_completed: boolean;
  created_date: string;
  created_at: string;
}

export function useQuickTasks(date: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["quick_tasks", date],
    queryFn: async () => {
      const { data, error } = await db
        .from("quick_tasks")
        .select("*")
        .eq("user_id", user!.id)
        .eq("created_date", date)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as QuickTask[];
    },
    enabled: !!user,
  });

  const addQuickTask = useMutation({
    mutationFn: async (title: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await db
        .from("quick_tasks")
        .insert({ user_id: user.id, title, created_date: date } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick_tasks", date] });
    },
  });

  const toggleQuickTask = useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const { error } = await db
        .from("quick_tasks")
        .update({ is_completed } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick_tasks", date] });
    },
  });

  const deleteQuickTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("quick_tasks")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick_tasks", date] });
    },
  });

  return {
    quickTasks: query.data || [],
    isLoading: query.isLoading,
    addQuickTask,
    toggleQuickTask,
    deleteQuickTask,
  };
}
