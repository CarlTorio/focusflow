import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export interface Routine {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  deadline_time: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

export interface RoutineCompletion {
  id: string;
  routine_id: string;
  user_id: string;
  completed_date: string;
  completed_at: string;
}

export function useRoutines() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const routinesQuery = useQuery({
    queryKey: ["routines"],
    queryFn: async () => {
      console.log("[Routines] Fetching routines...");
      const { data, error } = await supabase
        .from("routines")
        .select("*")
        .eq("is_active", true)
        .order("order_index", { ascending: true });
      if (error) {
        console.error("[Routines] Fetch error:", error);
        toast({ title: "Failed to load routines", description: "Please try again.", variant: "destructive" });
        throw error;
      }
      console.log("[Routines] Loaded", data?.length, "routines");
      return data as Routine[];
    },
    enabled: !!user,
  });

  const completionsQuery = useQuery({
    queryKey: ["routine_completions", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routine_completions")
        .select("*")
        .eq("completed_date", today);
      if (error) throw error;
      return data as RoutineCompletion[];
    },
    enabled: !!user,
  });

  const addRoutine = useMutation({
    mutationFn: async (input: { title: string; description?: string; deadline_time?: string }) => {
      if (!user) throw new Error("Not authenticated");
      // Get max order_index
      const maxOrder = (routinesQuery.data || []).reduce((max, r) => Math.max(max, r.order_index), -1);
      const { data, error } = await supabase
        .from("routines")
        .insert({
          user_id: user.id,
          title: input.title,
          description: input.description || null,
          deadline_time: input.deadline_time || null,
          order_index: maxOrder + 1,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routines"] });
      toast({ title: "Routine added!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateRoutine = useMutation({
    mutationFn: async (input: { id: string; title: string; description?: string; deadline_time?: string }) => {
      const { error } = await supabase
        .from("routines")
        .update({
          title: input.title,
          description: input.description || null,
          deadline_time: input.deadline_time || null,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routines"] });
      toast({ title: "Routine updated!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const removeRoutine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("routines")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routines"] });
      toast({ title: "Routine removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleCompletion = useMutation({
    mutationFn: async ({ routineId, isCompleted }: { routineId: string; isCompleted: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      if (isCompleted) {
        // Uncheck - delete completion
        const { error } = await supabase
          .from("routine_completions")
          .delete()
          .eq("routine_id", routineId)
          .eq("completed_date", today);
        if (error) throw error;
      } else {
        // Check - insert completion
        const { error } = await supabase
          .from("routine_completions")
          .insert({
            routine_id: routineId,
            user_id: user.id,
            completed_date: today,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routine_completions", today] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const reorderRoutines = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) =>
        supabase.from("routines").update({ order_index: index }).eq("id", id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routines"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const getCompletionsForDate = (dateStr: string) => {
    if (dateStr === today) return completionsQuery.data || [];
    // For other dates, we return undefined — caller should use a separate query
    return undefined;
  };

  return {
    routines: routinesQuery.data || [],
    completions: completionsQuery.data || [],
    isLoading: routinesQuery.isLoading || completionsQuery.isLoading,
    addRoutine,
    updateRoutine,
    removeRoutine,
    toggleCompletion,
    reorderRoutines,
    getCompletionsForDate,
  };
}
