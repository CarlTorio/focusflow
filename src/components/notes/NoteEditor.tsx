import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { useEffect, useRef, useState, useCallback } from "react";
import { Note } from "@/hooks/useNotes";
import { EditorToolbar } from "./EditorToolbar";
import { Star, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface NoteEditorProps {
  note: Note | null;
  onUpdate: (params: { id: string; title?: string; content?: string; is_starred?: boolean }) => void;
  onBack?: () => void;
  isMobile?: boolean;
}

export function NoteEditor({ note, onUpdate, onBack, isMobile }: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title || "");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const currentNoteId = useRef(note?.id);
  const pendingSave = useRef<{ title?: string; content?: string } | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Placeholder.configure({ placeholder: "Start writing..." }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
    ],
    content: note?.content || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-1",
      },
    },
    onUpdate: ({ editor }) => {
      if (!note) return;
      const html = editor.getHTML();
      scheduleSave({ content: html });
    },
  });

  const scheduleSave = useCallback(
    (updates: { title?: string; content?: string }) => {
      if (!note) return;
      pendingSave.current = { ...pendingSave.current, ...updates };
      setSaveStatus("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        onUpdate({ id: note.id, ...updates });
        pendingSave.current = null;
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 1500);
      }, 1500);
    },
    [note, onUpdate]
  );

  const flushSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (note && pendingSave.current) {
      onUpdate({ id: note.id, ...pendingSave.current });
      pendingSave.current = null;
    }
  }, [note, onUpdate]);

  useEffect(() => {
    if (note && note.id !== currentNoteId.current) {
      currentNoteId.current = note.id;
      setTitle(note.title);
      editor?.commands.setContent(note.content || "");
    }
  }, [note, editor]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (note && pendingSave.current) {
        onUpdate({ id: note.id, ...pendingSave.current });
        pendingSave.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id]);

  if (!note) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p>Select a note or create a new one</p>
      </div>
    );
  }

  const toggleStar = () => {
    onUpdate({ id: note.id, is_starred: !note.is_starred });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    scheduleSave({ title: e.target.value });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        {isMobile && onBack && (
          <button onClick={onBack} className="mr-3 rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background">
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        {!isMobile && onBack && (
          <button onClick={onBack} className="rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background">
            Go Back
          </button>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground">
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "saved" && "Saved ✓"}
          </span>
          <button
            onClick={toggleStar}
            className={cn(
              "transition-transform hover:scale-110 active:scale-125",
              note.is_starred ? "text-warning" : "text-muted-foreground"
            )}
          >
            <Star className={cn("h-5 w-5", note.is_starred && "fill-current")} />
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="px-4 pt-4">
        <input
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled"
          className="w-full border-none bg-transparent text-2xl font-bold text-foreground outline-none placeholder:text-muted-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        />
      </div>

      {/* Toolbar */}
      {editor && <EditorToolbar editor={editor} />}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
