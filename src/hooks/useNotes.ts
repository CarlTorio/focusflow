import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { isOnline, addPendingMutation, getCachedData, setCachedData } from "@/lib/offlineStorage";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export type Note = Tables<"notes">;

const CACHE_KEY = "notes";

export function useNotes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Realtime subscription for cross-device sync
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notes-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notes", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notes"] });
          queryClient.invalidateQueries({ queryKey: ["notes-all"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const notesQuery = useQuery({
    queryKey: ["notes", user?.id],
    queryFn: async () => {
      if (!isOnline()) {
        const cached = await getCachedData<Note[]>(CACHE_KEY + "_" + user!.id);
        return (cached || []).filter((n) => !n.is_archived);
      }
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_archived", false)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const notes = data as Note[];
      await setCachedData(CACHE_KEY + "_" + user!.id, notes);
      return notes;
    },
    enabled: !!user,
    staleTime: 30_000,
    retry: isOnline() ? 3 : 0,
  });

  const allNotesQuery = useQuery({
    queryKey: ["notes-all", user?.id],
    queryFn: async () => {
      if (!isOnline()) {
        const cached = await getCachedData<Note[]>(CACHE_KEY + "_all_" + user!.id);
        return cached || [];
      }
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const notes = data as Note[];
      await setCachedData(CACHE_KEY + "_all_" + user!.id, notes);
      return notes;
    },
    enabled: !!user,
    staleTime: 30_000,
    retry: isOnline() ? 3 : 0,
  });

  const createNote = useMutation({
    mutationFn: async (params: { title?: string; folder?: string }) => {
      const newNote: any = {
        id: crypto.randomUUID(),
        user_id: user!.id,
        title: params.title || "Untitled",
        folder: params.folder || "General",
        content: null,
        is_starred: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (!isOnline()) {
        await addPendingMutation({
          table: "notes",
          operation: "insert",
          data: newNote,
        });
        // Update caches
        const cached = await getCachedData<Note[]>(CACHE_KEY + "_" + user!.id) || [];
        await setCachedData(CACHE_KEY + "_" + user!.id, [newNote, ...cached]);
        const cachedAll = await getCachedData<Note[]>(CACHE_KEY + "_all_" + user!.id) || [];
        await setCachedData(CACHE_KEY + "_all_" + user!.id, [newNote, ...cachedAll]);
        return newNote as Note;
      }

      const { data, error } = await supabase
        .from("notes")
        .insert({
          user_id: user!.id,
          title: params.title || "Untitled",
          folder: params.folder || "General",
        })
        .select()
        .single();
      if (error) throw error;
      return data as Note;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["notes-all"] });
    },
    onError: (error: any) => {
      toast.error("Failed to create note: " + (error?.message || "Unknown error"));
    },
  });

  const updateNote = useMutation({
    mutationFn: async (params: { id: string; title?: string; content?: string; folder?: string; is_starred?: boolean; is_archived?: boolean }) => {
      const { id, ...updates } = params;

      if (!isOnline()) {
        await addPendingMutation({
          table: "notes",
          operation: "update",
          data: { ...updates, updated_at: new Date().toISOString() },
          matchColumn: "id",
          matchValue: id,
        });

        // Update caches optimistically
        const patchFn = (notes: Note[]) =>
          notes.map((n) => (n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n));
        const cached = await getCachedData<Note[]>(CACHE_KEY + "_" + user!.id);
        if (cached) await setCachedData(CACHE_KEY + "_" + user!.id, patchFn(cached));
        const cachedAll = await getCachedData<Note[]>(CACHE_KEY + "_all_" + user!.id);
        if (cachedAll) await setCachedData(CACHE_KEY + "_all_" + user!.id, patchFn(cachedAll));

        return { id, ...updates } as unknown as Note;
      }

      const { data, error } = await supabase
        .from("notes")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
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
    onError: (_err: any, _params, context) => {
      toast.error("Failed to save note. Changes will sync when connection recovers.");
      if (context?.prevNotes) queryClient.setQueryData(["notes", user?.id], context.prevNotes);
      if (context?.prevAllNotes) queryClient.setQueryData(["notes-all", user?.id], context.prevAllNotes);
    },
    onSettled: (_data, error) => {
      // Only refetch on success — on error, optimistic rollback is enough
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ["notes"] });
        queryClient.invalidateQueries({ queryKey: ["notes-all"] });
      }
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      if (!isOnline()) {
        await addPendingMutation({
          table: "notes",
          operation: "delete",
          data: {},
          matchColumn: "id",
          matchValue: id,
        });
        const cached = await getCachedData<Note[]>(CACHE_KEY + "_" + user!.id);
        if (cached) await setCachedData(CACHE_KEY + "_" + user!.id, cached.filter((n) => n.id !== id));
        const cachedAll = await getCachedData<Note[]>(CACHE_KEY + "_all_" + user!.id);
        if (cachedAll) await setCachedData(CACHE_KEY + "_all_" + user!.id, cachedAll.filter((n) => n.id !== id));
        return;
      }

      const { error } = await supabase.from("notes").delete().eq("id", id);
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
