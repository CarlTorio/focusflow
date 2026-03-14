import { useState, useEffect } from "react";
import { Search, ChevronDown } from "lucide-react";
import { Note } from "@/hooks/useNotes";
import { NoteCard } from "./NoteCard";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

interface NotesListPanelProps {
  notes: Note[];
  selectedNoteId?: string;
  onSelectNote: (note: Note) => void;
  onToggleStar: (note: Note) => void;
  onDelete: (note: Note) => void;
  onArchive: (note: Note) => void;
  onMoveToFolder: (note: Note, folder: string) => void;
  folders: string[];
}

type SortMode = "lastModified" | "newest";

export function NotesListPanel({
  notes,
  selectedNoteId,
  onSelectNote,
  onToggleStar,
  onDelete,
  onArchive,
  onMoveToFolder,
  folders,
}: NotesListPanelProps) {
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("lastModified");
  const [starredFirst, setStarredFirst] = useState(true);
  // Stable ordered IDs — only re-sorted when note set, starred status, or sort settings change
  const [stableIds, setStableIds] = useState<string[]>([]);

  // Key that changes only when notes are added/removed
  const noteIdsKey = notes.map((n) => n.id).sort().join(",");
  // Key that changes only when starred status changes
  const starredKey = notes.filter((n) => n.is_starred).map((n) => n.id).sort().join(",");

  useEffect(() => {
    if (notes.length === 0) {
      setStableIds([]);
      return;
    }
    const sorted = [...notes].sort((a, b) => {
      if (starredFirst) {
        if (a.is_starred && !b.is_starred) return -1;
        if (!a.is_starred && b.is_starred) return 1;
      }
      const dateA = new Date(sortMode === "newest" ? a.created_at : a.updated_at).getTime();
      const dateB = new Date(sortMode === "newest" ? b.created_at : b.updated_at).getTime();
      return dateB - dateA;
    });
    setStableIds(sorted.map((n) => n.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteIdsKey, starredKey, sortMode, starredFirst]);

  // Build display list using the stable order, then apply search filter
  const orderedNotes = stableIds
    .map((id) => notes.find((n) => n.id === id))
    .filter((n): n is Note => !!n);

  const filtered = orderedNotes.filter((n) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      (n.content || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Search */}
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="h-9 rounded-xl bg-secondary border-none pl-9 text-sm"
          />
        </div>
      </div>

      {/* Sort */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            {sortMode === "lastModified" ? "Last Modified" : "Newest First"}
            <ChevronDown className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setSortMode("lastModified")}>Last Modified</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortMode("newest")}>Newest First</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">★ first</span>
          <Switch checked={starredFirst} onCheckedChange={setStarredFirst} className="scale-75" />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">No notes found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {search ? "Try a different search term" : "Tap + to create your first note"}
            </p>
          </div>
        ) : (
          filtered.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              isActive={note.id === selectedNoteId}
              onSelect={() => onSelectNote(note)}
              onToggleStar={() => onToggleStar(note)}
              onDelete={() => onDelete(note)}
              onArchive={() => onArchive(note)}
              onMoveToFolder={(folder) => onMoveToFolder(note, folder)}
              folders={folders}
            />
          ))
        )}
      </div>
    </div>
  );
}

