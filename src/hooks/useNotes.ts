import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { DbNote } from "@/types/database";

export type Note = DbNote;

export function useNotes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const notesQuery = useQuery({
    queryKey: ["notes", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("notes")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_archived", false)
        .order("updated_at", { ascending: false }) as any);
      if (error) throw error;
      return data as Note[];
    },
    enabled: !!user,
  });

  const allNotesQuery = useQuery({
    queryKey: ["notes-all", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("notes")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false }) as any);
      if (error) throw error;
      return data as Note[];
    },
    enabled: !!user,
  });

  const createNote = useMutation({
    mutationFn: async (params: { title?: string; folder?: string }) => {
      const { data, error } = await (supabase
        .from("notes")
        .insert({
          user_id: user!.id,
          title: params.title || "Untitled",
          folder: params.folder || "General",
        })
        .select()
        .single() as any);
      if (error) throw error;
      return data as Note;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["notes-all"] });
    },
  });

  const updateNote = useMutation({
    mutationFn: async (params: { id: string; title?: string; content?: string; folder?: string; is_starred?: boolean; is_archived?: boolean }) => {
      const { id, ...updates } = params;
      const { data, error } = await (supabase
        .from("notes")
        .update(updates)
        .eq("id", id)
        .select()
        .single() as any);
      if (error) throw error;
      return data as Note;
    },
    onMutate: async (params) => {
      const { id, ...updates } = params;
      await queryClient.cancelQueries({ queryKey: ["notes", user?.id] });
      await queryClient.cancelQueries({ queryKey: ["notes-all", user?.id] });

      const prevNotes = queryClient.getQueryData<Note[]>(["notes", user?.id]);
      const prevAllNotes = queryClient.getQueryData<Note[]>(["notes-all", user?.id]);

      const patchNote = (note: Note) =>
        note.id === id ? { ...note, ...updates } : note;

      queryClient.setQueryData<Note[]>(["notes", user?.id], (old) =>
        old ? old.map(patchNote) : old
      );
      queryClient.setQueryData<Note[]>(["notes-all", user?.id], (old) =>
        old ? old.map(patchNote) : old
      );

      return { prevNotes, prevAllNotes };
    },
    onError: (_err, _params, context) => {
      if (context?.prevNotes) queryClient.setQueryData(["notes", user?.id], context.prevNotes);
      if (context?.prevAllNotes) queryClient.setQueryData(["notes-all", user?.id], context.prevAllNotes);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["notes-all"] });
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from("notes")
        .delete()
        .eq("id", id) as any);
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
