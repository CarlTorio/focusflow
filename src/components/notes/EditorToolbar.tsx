import { Editor, useEditorState } from "@tiptap/react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, CheckSquare,
  Undo2, Redo2, Heading1, Heading2, Heading3, Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef, useState, useCallback } from "react";

interface EditorToolbarProps {
  editor: Editor;
}

function ToolBtn({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const iconSize = "h-4 w-4";
  const scrollRef = useRef<HTMLDivElement>(null);
  const [atEnd, setAtEnd] = useState(false);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  // Subscribe to editor state so toolbar re-renders instantly on every selection/mark change
  const editorState = useEditorState({
    editor,
    selector: (ctx) => ({
      isBold: ctx.editor.isActive("bold"),
      isItalic: ctx.editor.isActive("italic"),
      isUnderline: ctx.editor.isActive("underline"),
      isStrike: ctx.editor.isActive("strike"),
      isCode: ctx.editor.isActive("code"),
      isH1: ctx.editor.isActive("heading", { level: 1 }),
      isH2: ctx.editor.isActive("heading", { level: 2 }),
      isH3: ctx.editor.isActive("heading", { level: 3 }),
      isBulletList: ctx.editor.isActive("bulletList"),
      isOrderedList: ctx.editor.isActive("orderedList"),
      isTaskList: ctx.editor.isActive("taskList"),
      isAlignLeft: ctx.editor.isActive({ textAlign: "left" }),
      isAlignCenter: ctx.editor.isActive({ textAlign: "center" }),
      isAlignRight: ctx.editor.isActive({ textAlign: "right" }),
      isHighlight: ctx.editor.isActive("highlight"),
    }),
  });

  return (
    <div className="relative border-b border-border">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex items-center gap-0.5 overflow-x-auto px-4 py-1.5 scrollbar-none"
      >
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo2 className={iconSize} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo2 className={iconSize} />
        </ToolBtn>

        <div className="mx-1 h-5 w-px bg-border shrink-0" />

        <ToolBtn active={editorState.isBold} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
          <Bold className={iconSize} />
        </ToolBtn>
        <ToolBtn active={editorState.isItalic} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
          <Italic className={iconSize} />
        </ToolBtn>
        <ToolBtn active={editorState.isUnderline} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
          <UnderlineIcon className={iconSize} />
        </ToolBtn>
        <ToolBtn active={editorState.isStrike} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
          <Strikethrough className={iconSize} />
        </ToolBtn>
        <ToolBtn active={editorState.isCode} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline Code">
          <Code className={iconSize} />
        </ToolBtn>

        <div className="mx-1 h-5 w-px bg-border shrink-0" />

        <ToolBtn active={editorState.isH1} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
          <Heading1 className={iconSize} />
        </ToolBtn>
        <ToolBtn active={editorState.isH2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
          <Heading2 className={iconSize} />
        </ToolBtn>
        <ToolBtn active={editorState.isH3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
          <Heading3 className={iconSize} />
        </ToolBtn>

        <div className="mx-1 h-5 w-px bg-border shrink-0" />

        <ToolBtn active={editorState.isBulletList} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
          <List className={iconSize} />
        </ToolBtn>
        <ToolBtn active={editorState.isOrderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered List">
          <ListOrdered className={iconSize} />
        </ToolBtn>
        <ToolBtn active={editorState.isTaskList} onClick={() => editor.chain().focus().toggleTaskList().run()} title="Task List">
          <CheckSquare className={iconSize} />
        </ToolBtn>

        <div className="mx-1 h-5 w-px bg-border shrink-0" />

        <ToolBtn active={editorState.isAlignLeft} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Align Left">
          <AlignLeft className={iconSize} />
        </ToolBtn>
        <ToolBtn active={editorState.isAlignCenter} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Align Center">
          <AlignCenter className={iconSize} />
        </ToolBtn>
        <ToolBtn active={editorState.isAlignRight} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Align Right">
          <AlignRight className={iconSize} />
        </ToolBtn>

        <div className="mx-1 h-5 w-px bg-border shrink-0" />

        <ToolBtn active={editorState.isHighlight} onClick={() => editor.chain().focus().toggleHighlight().run()} title="Highlight">
          <Minus className={iconSize} />
        </ToolBtn>
      </div>
      {/* Right fade indicator — mobile only, disappears when scrolled to end */}
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent transition-opacity md:hidden",
          atEnd ? "opacity-0" : "opacity-100"
        )}
      />
    </div>
  );
}
