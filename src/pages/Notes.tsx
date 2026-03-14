import { useState, useMemo, useCallback } from "react";
import { useNotes, Note } from "@/hooks/useNotes";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileHeader } from "@/components/navigation/MobileHeader";
import { FolderPanel } from "@/components/notes/FolderPanel";
import { NotesListPanel } from "@/components/notes/NotesListPanel";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { Plus, Star, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Notes() {
  const isMobile = useIsMobile();
  const { notes, allNotes, isLoading, createNote, updateNote, deleteNote } = useNotes();
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "editor">("list");
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [folderVersion, setFolderVersion] = useState(0);

  // Derive folders from notes
  const folders = useMemo(() => {
    const set = new Set<string>();
    set.add("General");
    allNotes.forEach((n) => set.add(n.folder));
    return Array.from(set);
  }, [allNotes]);

  // Filter notes based on active filter
  const filteredNotes = useMemo(() => {
    if (activeFilter === "All") return notes;
    if (activeFilter === "Starred") return notes.filter((n) => n.is_starred);
    if (activeFilter === "Archived") return allNotes.filter((n) => n.is_archived);
    return notes.filter((n) => n.folder === activeFilter);
  }, [notes, allNotes, activeFilter]);

  const handleCreateNote = useCallback(async () => {
    const folder = activeFilter !== "All" && activeFilter !== "Starred" && activeFilter !== "Archived" ? activeFilter : "General";
    const newNote = await createNote.mutateAsync({ folder });
    setSelectedNote(newNote);
    if (isMobile) setMobileView("editor");
  }, [createNote, activeFilter, isMobile]);

  const handleSelectNote = useCallback((note: Note) => {
    setSelectedNote(note);
    if (isMobile) setMobileView("editor");
  }, [isMobile]);

  const handleUpdate = useCallback((params: { id: string; title?: string; content?: string; is_starred?: boolean }) => {
    updateNote.mutate(params);
    // Optimistically update the selected note
    if (selectedNote && params.id === selectedNote.id) {
      setSelectedNote((prev) => prev ? { ...prev, ...params } : prev);
    }
  }, [updateNote, selectedNote]);

  const handleToggleStar = useCallback((note: Note) => {
    updateNote.mutate({ id: note.id, is_starred: !note.is_starred });
  }, [updateNote]);

  const handleArchive = useCallback((note: Note) => {
    updateNote.mutate({ id: note.id, is_archived: !note.is_archived });
    if (selectedNote?.id === note.id) setSelectedNote(null);
    toast.success(note.is_archived ? "Note restored" : "Note archived");
  }, [updateNote, selectedNote]);

  const handleDelete = useCallback((note: Note) => {
    setDeleteTarget(note);
  }, []);

  const confirmDelete = useCallback(() => {
    if (deleteTarget) {
      deleteNote.mutate(deleteTarget.id);
      if (selectedNote?.id === deleteTarget.id) setSelectedNote(null);
      setDeleteTarget(null);
      toast.success("Note deleted");
    }
  }, [deleteTarget, deleteNote, selectedNote]);

  const handleMoveToFolder = useCallback((note: Note, folder: string) => {
    updateNote.mutate({ id: note.id, folder });
    toast.success(`Moved to ${folder}`);
  }, [updateNote]);

  const handleCreateFolder = useCallback((name: string) => {
    const stored = JSON.parse(localStorage.getItem("note-folders") || "[]") as string[];
    if (!stored.includes(name) && !folders.includes(name)) {
      localStorage.setItem("note-folders", JSON.stringify([...stored, name]));
      setFolderVersion((v) => v + 1);
      setActiveFilter(name);
    }
  }, [folders]);

  const handleRenameFolder = useCallback((oldName: string, newName: string) => {
    allNotes.filter((n) => n.folder === oldName).forEach((n) => {
      updateNote.mutate({ id: n.id, folder: newName });
    });
    const stored = JSON.parse(localStorage.getItem("note-folders") || "[]") as string[];
    const updated = stored.map((f) => (f === oldName ? newName : f));
    localStorage.setItem("note-folders", JSON.stringify(updated));
    setFolderVersion((v) => v + 1);
    if (activeFilter === oldName) setActiveFilter(newName);
    toast.success("Folder renamed");
  }, [allNotes, updateNote, activeFilter]);

  const handleDeleteFolder = useCallback((name: string) => {
    allNotes.filter((n) => n.folder === name).forEach((n) => {
      updateNote.mutate({ id: n.id, folder: "General" });
    });
    const stored = JSON.parse(localStorage.getItem("note-folders") || "[]") as string[];
    localStorage.setItem("note-folders", JSON.stringify(stored.filter((f) => f !== name)));
    setFolderVersion((v) => v + 1);
    if (activeFilter === name) setActiveFilter("All");
    toast.success("Folder deleted, notes moved to General");
  }, [allNotes, updateNote, activeFilter]);

  // Merge localStorage folders with DB-derived folders
  // folderVersion is included so the memo re-runs whenever localStorage changes
  const allFolders = useMemo(() => {
    const stored = JSON.parse(localStorage.getItem("note-folders") || "[]") as string[];
    const set = new Set([...folders, ...stored]);
    return Array.from(set);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folders, folderVersion]);

  // MOBILE LAYOUT
  if (isMobile) {
    // Editor view (full screen, no bottom nav)
    if (mobileView === "editor" && selectedNote) {
      return (
        <div className="fixed inset-0 z-50 bg-background">
          <NoteEditor
            note={selectedNote}
            onUpdate={handleUpdate}
            onBack={() => setMobileView("list")}
            isMobile
          />
        </div>
      );
    }

    // List view
    return (
      <div className="pb-20">
        <MobileHeader title="Notes" />

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-none">
          {["All", "Starred", ...allFolders].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                activeFilter === filter
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground"
              )}
            >
              {filter === "Starred" && <Star className="h-3 w-3" />}
              {filter}
            </button>
          ))}
          <button
            onClick={() => {
              const name = prompt("New folder name:");
              if (name) handleCreateFolder(name);
            }}
            className="shrink-0 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground"
          >
            + New Folder
          </button>
        </div>

        <div className="px-2">
          <NotesListPanel
            notes={filteredNotes}
            selectedNoteId={selectedNote?.id}
            activeFilter={activeFilter}
            onSelectNote={handleSelectNote}
            onToggleStar={handleToggleStar}
            onDelete={handleDelete}
            onArchive={handleArchive}
            onMoveToFolder={handleMoveToFolder}
            folders={allFolders}
          />
        </div>

        {/* FAB */}
        <button
          onClick={handleCreateNote}
          className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          <Plus className="h-6 w-6" />
        </button>

        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this note?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // DESKTOP LAYOUT — 3 panels
  return (
    <div className="flex h-screen">
      {/* Left Panel — Folders */}
      <div className="w-[220px] shrink-0">
        <FolderPanel
          notes={allNotes}
          folders={allFolders}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
        />
      </div>

      {/* Middle Panel — Notes List */}
      <div className="flex h-full w-[300px] shrink-0 flex-col border-r border-border">
        <div className="min-h-0 flex-1">
          <NotesListPanel
            notes={filteredNotes}
            selectedNoteId={selectedNote?.id}
            onSelectNote={handleSelectNote}
            onToggleStar={handleToggleStar}
            onDelete={handleDelete}
            onArchive={handleArchive}
            onMoveToFolder={handleMoveToFolder}
            folders={allFolders}
          />
        </div>
        {/* Create note button — always visible, pinned at bottom */}
        <div className="shrink-0 border-t border-border p-3">
          <button
            onClick={handleCreateNote}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Note
          </button>
        </div>
      </div>

      {/* Right Panel — Editor */}
      <div className="flex-1">
        <NoteEditor
          note={selectedNote}
          onUpdate={handleUpdate}
          onBack={() => setSelectedNote(null)}
        />
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
