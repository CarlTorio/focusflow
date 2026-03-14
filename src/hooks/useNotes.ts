import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  folder: string;
  is_starred: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export function useNotes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const notesQuery = useQuery({
    queryKey: ["notes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes" as any)
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_archived", false)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) as Note[];
    },
    enabled: !!user,
  });

  const allNotesQuery = useQuery({
    queryKey: ["notes-all", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) as Note[];
    },
    enabled: !!user,
  });

  const createNote = useMutation({
    mutationFn: async (params: { title?: string; folder?: string }) => {
      const { data, error } = await supabase
        .from("notes" as any)
        .insert({
          user_id: user!.id,
          title: params.title || "Untitled",
          folder: params.folder || "General",
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Note;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["notes-all"] });
    },
  });

  const updateNote = useMutation({
    mutationFn: async (params: { id: string; title?: string; content?: string; folder?: string; is_starred?: boolean; is_archived?: boolean }) => {
      const { id, ...updates } = params;
      const { data, error } = await supabase
        .from("notes" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Note;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["notes-all"] });
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notes" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["notes-all"] });
    },
  });

  return {
    notes: notesQuery.data || [],
    allNotes: allNotesQuery.data || [],
    isLoading: notesQuery.isLoading,
    createNote,
    updateNote,
    deleteNote,
  };
}
