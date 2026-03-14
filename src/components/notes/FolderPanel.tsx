import { useState } from "react";
import { Folder, Star, Plus, FileText, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Note } from "@/hooks/useNotes";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface FolderPanelProps {
  notes: Note[];
  folders: string[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (oldName: string, newName: string) => void;
  onDeleteFolder: (name: string) => void;
}

export function FolderPanel({
  notes,
  folders,
  activeFilter,
  onFilterChange,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: FolderPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingFolder, setDeletingFolder] = useState<string | null>(null);

  const handleCreate = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName("");
      setIsCreating(false);
    }
  };

  const handleRename = () => {
    if (renameValue.trim() && renamingFolder) {
      onRenameFolder(renamingFolder, renameValue.trim());
      setRenamingFolder(null);
      setRenameValue("");
    }
  };

  const starredCount = notes.filter((n) => n.is_starred && !n.is_archived).length;
  const nonArchivedNotes = notes.filter((n) => !n.is_archived);

  return (
    <div className="flex h-full flex-col border-r border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          Notebooks
        </h2>
        <button
          onClick={() => setIsCreating(true)}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {/* All Notes */}
        <button
          onClick={() => onFilterChange("All")}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
            activeFilter === "All"
              ? "bg-primary text-primary-foreground font-medium"
              : "text-foreground hover:bg-secondary"
          )}
        >
          <FileText className="h-4 w-4" />
          <span className="relative flex-1 text-left overflow-hidden" style={{ maskImage: "linear-gradient(to right, black 70%, transparent 100%)", WebkitMaskImage: "linear-gradient(to right, black 70%, transparent 100%)" }}>All Notes</span>
          <span className="text-xs opacity-70">{nonArchivedNotes.length}</span>
        </button>

        {/* Starred */}
        <button
          onClick={() => onFilterChange("Starred")}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
            activeFilter === "Starred"
              ? "bg-primary text-primary-foreground font-medium"
              : "text-foreground hover:bg-secondary"
          )}
        >
          <Star className={cn("h-4 w-4", activeFilter === "Starred" ? "fill-current" : "")} />
          <span className="relative flex-1 text-left overflow-hidden" style={{ maskImage: "linear-gradient(to right, black 70%, transparent 100%)", WebkitMaskImage: "linear-gradient(to right, black 70%, transparent 100%)" }}>Starred</span>
          <span className="text-xs opacity-70">{starredCount}</span>
        </button>

        {/* Archived */}
        <button
          onClick={() => onFilterChange("Archived")}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
            activeFilter === "Archived"
              ? "bg-primary text-primary-foreground font-medium"
              : "text-foreground hover:bg-secondary"
          )}
        >
          <Folder className="h-4 w-4" />
          <span className="relative flex-1 text-left overflow-hidden" style={{ maskImage: "linear-gradient(to right, black 70%, transparent 100%)", WebkitMaskImage: "linear-gradient(to right, black 70%, transparent 100%)" }}>Archived</span>
          <span className="text-xs opacity-70">{notes.filter((n) => n.is_archived).length}</span>
        </button>

        <div className="mx-2 my-2 h-px bg-border" />

        {/* User folders */}
        {folders.map((folder) => {
          const count = nonArchivedNotes.filter((n) => n.folder === folder).length;
          if (renamingFolder === folder) {
            return (
              <div key={folder} className="px-2 py-1">
                <Input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename();
                    if (e.key === "Escape") setRenamingFolder(null);
                  }}
                  onBlur={handleRename}
                  className="h-8 text-sm"
                />
              </div>
            );
          }
          return (
            <div key={folder} className="group flex items-center">
              <button
                onClick={() => onFilterChange(folder)}
                className={cn(
                  "flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  activeFilter === folder
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-foreground hover:bg-secondary"
                )}
              >
                <Folder className="h-4 w-4" />
                <span className="flex-1 text-left">{folder}</span>
                <span className="text-xs opacity-70">{count}</span>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="mr-1 rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                    <MoreHorizontal className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setRenamingFolder(folder); setRenameValue(folder); }}>
                    <Pencil className="mr-2 h-3 w-3" /> Rename
                  </DropdownMenuItem>
                  {folder !== "General" && (
                    <DropdownMenuItem onClick={() => setDeletingFolder(folder)} className="text-destructive">
                      <Trash2 className="mr-2 h-3 w-3" /> Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}

        {/* New folder input */}
        {isCreating && (
          <div className="px-2 py-1">
            <Input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") { setIsCreating(false); setNewFolderName(""); }
              }}
              onBlur={handleCreate}
              placeholder="Folder name..."
              className="h-8 text-sm"
            />
          </div>
        )}
      </div>

      <AlertDialog open={!!deletingFolder} onOpenChange={() => setDeletingFolder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingFolder}?</AlertDialogTitle>
            <AlertDialogDescription>
              Notes in this folder will be moved to General.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deletingFolder) onDeleteFolder(deletingFolder); setDeletingFolder(null); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
