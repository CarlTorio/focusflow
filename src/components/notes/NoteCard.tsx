import { Star, MoreHorizontal, Trash2, Archive, FolderInput } from "lucide-react";
import { Note } from "@/hooks/useNotes";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NoteCardProps {
  note: Note;
  isActive?: boolean;
  onSelect: () => void;
  onToggleStar: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onMoveToFolder?: (folder: string) => void;
  folders?: string[];
}

function formatNoteDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
  if (diffHours < 24) return formatDistanceToNow(d, { addSuffix: true });
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d, yyyy");
}

function stripHtml(html: string | null) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").slice(0, 120);
}

export function NoteCard({
  note,
  isActive,
  onSelect,
  onToggleStar,
  onDelete,
  onArchive,
  onMoveToFolder,
  folders,
}: NoteCardProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "group cursor-pointer rounded-xl border border-transparent p-4 shadow-sm transition-all hover:shadow-md",
        isActive ? "bg-primary-light border-primary/20" : "bg-card hover:bg-secondary/50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold text-foreground">{note.title}</h4>
          <p className="mt-1 truncate text-xs text-muted-foreground">{stripHtml(note.content) || "No content"}</p>
          <div className="mt-2 flex items-center gap-2 overflow-hidden">
            <span className="shrink-0 text-[10px] text-muted-foreground whitespace-nowrap">{formatNoteDate(note.updated_at)}</span>
            <span className="min-w-0 truncate rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-medium text-primary-dark whitespace-nowrap">
              {note.folder}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleStar(); }}
            className={cn(
              "transition-all hover:scale-110 active:scale-125",
              note.is_starred ? "text-warning" : "text-muted-foreground/30 hover:text-muted-foreground"
            )}
          >
            <Star className={cn("h-4 w-4", note.is_starred && "fill-current")} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="mr-2 h-4 w-4" />
                {note.is_archived ? "Restore" : "Archive"}
              </DropdownMenuItem>
              {folders && onMoveToFolder && (
                folders.filter(f => f !== note.folder).map(f => (
                  <DropdownMenuItem key={f} onClick={() => onMoveToFolder(f)}>
                    <FolderInput className="mr-2 h-4 w-4" />
                    Move to {f}
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
