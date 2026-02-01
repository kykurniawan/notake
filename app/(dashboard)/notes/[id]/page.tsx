"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  EditorRoot,
  EditorContent,
  EditorCommand,
  EditorCommandList,
  EditorCommandItem,
  EditorCommandEmpty,
  EditorBubble,
  EditorBubbleItem,
  StarterKit,
  TiptapLink,
  TiptapUnderline,
  TaskList,
  TaskItem,
  Placeholder,
  Command,
  createSuggestionItems,
  renderItems,
  handleCommandNavigation,
  useEditor,
  type JSONContent,
} from "novel";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";

const suggestionItems = createSuggestionItems([
  {
    title: "Heading 1",
    description: "Large section heading",
    icon: <span className="text-base font-bold">H1</span>,
    searchTerms: ["h1", "heading", "title"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: <span className="text-base font-bold">H2</span>,
    searchTerms: ["h2", "heading", "subtitle"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: <span className="text-base font-bold">H3</span>,
    searchTerms: ["h3", "heading"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run();
    },
  },
  {
    title: "Bullet List",
    description: "Create a simple bullet list",
    icon: <span className="text-base">•</span>,
    searchTerms: ["unordered", "list", "bullet"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Numbered List",
    description: "Create a numbered list",
    icon: <span className="text-base">1.</span>,
    searchTerms: ["ordered", "list", "number"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "Task List",
    description: "Create a task list with checkboxes",
    icon: <span className="text-base">☑</span>,
    searchTerms: ["todo", "task", "checklist"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: "Blockquote",
    description: "Add a quote block",
    icon: <span className="text-base">"</span>,
    searchTerms: ["quote", "blockquote"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: "Code Block",
    description: "Add a code block",
    icon: <span className="text-base font-mono">{"<>"}</span>,
    searchTerms: ["code", "codeblock"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: "Table",
    description: "Insert a table",
    icon: <span className="text-base">⊞</span>,
    searchTerms: ["table", "grid", "rows", "columns"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
]);

const extensions = [
  StarterKit,
  TiptapLink.configure({ HTMLAttributes: { class: "text-blue-600 underline" } }),
  TiptapUnderline,
  TaskList,
  TaskItem.configure({ nested: true }),
  Table.configure({ resizable: true }),
  TableRow,
  TableCell,
  TableHeader,
  Command.configure({
    suggestion: {
      items: () => suggestionItems,
      render: renderItems,
    },
  }),
  Placeholder.configure({ placeholder: "Start writing, or type '/' for commands..." }),
];

function TableMenu() {
  const { editor } = useEditor();
  if (!editor) return null;

  const isInTable = editor.isActive("table");
  if (!isInTable) return null;

  const btn = "px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded-md transition-colors whitespace-nowrap";
  const sep = "w-px h-5 bg-zinc-200";

  return (
    <div className="flex items-center gap-1 mb-3 px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg w-fit flex-wrap">
      <button className={btn} onClick={() => editor.chain().focus().addRowBefore().run()}>
        Add row above
      </button>
      <button className={btn} onClick={() => editor.chain().focus().addRowAfter().run()}>
        Add row below
      </button>
      <div className={sep} />
      <button className={btn} onClick={() => editor.chain().focus().addColumnBefore().run()}>
        Add col left
      </button>
      <button className={btn} onClick={() => editor.chain().focus().addColumnAfter().run()}>
        Add col right
      </button>
      <div className={sep} />
      <button className={`${btn} text-red-500 hover:bg-red-50`} onClick={() => editor.chain().focus().deleteRow().run()}>
        Delete row
      </button>
      <button className={`${btn} text-red-500 hover:bg-red-50`} onClick={() => editor.chain().focus().deleteColumn().run()}>
        Delete col
      </button>
      <div className={sep} />
      <button className={`${btn} text-red-500 hover:bg-red-50`} onClick={() => editor.chain().focus().deleteTable().run()}>
        Delete table
      </button>
    </div>
  );
}

export default function NoteDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState("");
  const [initialContent, setInitialContent] = useState<JSONContent | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestContentRef = useRef<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function fetchNote() {
      try {
        const res = await fetch(`/api/notes/${id}`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setTitle(data.title);

        // Check if note is deleted
        if (data.deletedAt) {
          setIsDeleted(true);
        } else {
          setIsDeleted(false);
          if (data.content) {
            try {
              setInitialContent(JSON.parse(data.content));
            } catch {
              setInitialContent(undefined);
            }
          }
          latestContentRef.current = data.content;
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchNote();
  }, [id]);

  const saveNote = useCallback(
    async (updates: { title?: string; content?: string | null }) => {
      setSaving(true);
      try {
        await fetch(`/api/notes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
      } catch (err) {
        console.error("Failed to save note:", err);
      } finally {
        setSaving(false);
      }
    },
    [id]
  );

  const debouncedSave = useCallback(
    (updates: { title?: string; content?: string | null }) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => saveNote(updates), 500);
    },
    [saveNote]
  );

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    debouncedSave({ title: newTitle });
  };

  const handleContentChange = (editor: any) => {
    const json = JSON.stringify(editor.getJSON());
    latestContentRef.current = json;
    debouncedSave({ content: json });
  };

  const handleMoveToTrash = async () => {
    setShowMenu(false);
    setDeleting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete note");
      }

      // Show success message briefly before redirecting
      setSuccessMessage("Note moved to trash");
      setTimeout(() => {
        router.push("/notes");
      }, 1000);
    } catch (err) {
      console.error("Failed to delete note:", err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to delete note");
      setTimeout(() => setErrorMessage(null), 5000);
      setDeleting(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/notes/${id}/restore`, {
        method: "POST",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to restore note");
      }

      // Show success message and reload the note
      setSuccessMessage("Note restored successfully");

      // Reload the note to show it in the editor
      const noteRes = await fetch(`/api/notes/${id}`);
      if (noteRes.ok) {
        const data = await noteRes.json();
        setTitle(data.title);
        setIsDeleted(false);
        if (data.content) {
          try {
            setInitialContent(JSON.parse(data.content));
          } catch {
            setInitialContent(undefined);
          }
        }
        latestContentRef.current = data.content;
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Failed to restore note:", err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to restore note");
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setRestoring(false);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMenu]);

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-8">
        <div className="flex items-center gap-2 text-zinc-400">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading note...
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-8 text-center">
        <h2 className="text-xl font-semibold text-zinc-900 mb-2">Note not found</h2>
        <p className="text-sm text-zinc-500 mb-6">This note may have been deleted or you don&apos;t have access.</p>
        <button
          onClick={() => router.push("/notes")}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Back to Notes
        </button>
      </div>
    );
  }

  // Show special UI for deleted notes
  if (isDeleted) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 rounded-xl bg-green-50 border border-green-200 flex items-center gap-3">
            <svg
              className="w-5 h-5 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-sm font-medium text-green-800">
              {successMessage}
            </span>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
            <svg
              className="w-5 h-5 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <span className="text-sm font-medium text-red-800">
              {errorMessage}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push("/trash")}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Trash
          </button>
        </div>

        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 mb-6">
            <svg
              className="w-8 h-8 text-orange-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-zinc-900 mb-3">Note in trash</h2>
          <p className="text-sm text-zinc-600 mb-2">
            <span className="font-medium">{title || "Untitled"}</span>
          </p>
          <p className="text-sm text-zinc-500 mb-8">
            This note has been moved to trash. Restore it to continue editing.
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleRestore}
              disabled={restoring}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {restoring ? "Restoring..." : "Restore Note"}
            </button>

            <button
              onClick={() => router.push("/trash")}
              className="px-6 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-semibold rounded-xl transition-colors"
            >
              Back to Trash
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-8">
      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 rounded-xl bg-green-50 border border-green-200 flex items-center gap-3">
          <svg
            className="w-5 h-5 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="text-sm font-medium text-green-800">
            {successMessage}
          </span>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
          <svg
            className="w-5 h-5 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <span className="text-sm font-medium text-red-800">
            {errorMessage}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => router.push("/notes")}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          All Notes
        </button>
        <div className="flex items-center gap-4">
          <span className="text-xs text-zinc-400">
            {saving ? "Saving..." : "Saved"}
          </span>
          {/* Three-dot menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              disabled={deleting}
              className="p-2 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Note options"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-zinc-200 rounded-lg shadow-lg overflow-hidden z-10">
                <button
                  onClick={handleMoveToTrash}
                  disabled={deleting}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  {deleting ? "Moving to trash..." : "Move to Trash"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        placeholder="Untitled"
        className="w-full text-4xl font-bold text-zinc-900 placeholder:text-zinc-300 outline-none mb-8 bg-transparent"
        autoFocus
      />

      <EditorRoot>
        <EditorContent
          extensions={extensions}
          initialContent={initialContent}
          onUpdate={({ editor }) => handleContentChange(editor)}
          className="prose prose-zinc max-w-none min-h-[50vh] focus:outline-none [&_.tiptap]:outline-none [&_.tiptap]:min-h-[50vh]"
        >
          <TableMenu />
          <EditorCommand
            className="z-50 w-72 rounded-xl border border-zinc-200 bg-white shadow-lg transition-all"
            onKeyDown={(e) => handleCommandNavigation(e.nativeEvent)}
          >
            <EditorCommandEmpty className="px-4 py-2 text-sm text-zinc-500">
              No results
            </EditorCommandEmpty>
            <EditorCommandList>
              {suggestionItems.map((item) => (
                <EditorCommandItem
                  key={item.title}
                  value={item.title}
                  onCommand={(val) => item.command?.(val)}
                  className="flex items-start gap-3 px-4 py-2.5 text-sm hover:bg-zinc-50 cursor-pointer rounded-lg mx-1 aria-selected:bg-zinc-100"
                >
                  <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900">{item.title}</p>
                    <p className="text-xs text-zinc-500">{item.description}</p>
                  </div>
                </EditorCommandItem>
              ))}
            </EditorCommandList>
          </EditorCommand>

          <EditorBubble className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-1 py-1 shadow-lg">
            <EditorBubbleItem onSelect={(editor) => editor.chain().focus().toggleBold().run()}>
              <button className="px-2 py-1 text-sm font-bold text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors">B</button>
            </EditorBubbleItem>
            <EditorBubbleItem onSelect={(editor) => editor.chain().focus().toggleItalic().run()}>
              <button className="px-2 py-1 text-sm italic text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors">I</button>
            </EditorBubbleItem>
            <EditorBubbleItem onSelect={(editor) => editor.chain().focus().toggleStrike().run()}>
              <button className="px-2 py-1 text-sm line-through text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors">S</button>
            </EditorBubbleItem>
            <EditorBubbleItem onSelect={(editor) => editor.chain().focus().toggleCode().run()}>
              <button className="px-2 py-1 text-sm font-mono text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors">{"<>"}</button>
            </EditorBubbleItem>
          </EditorBubble>
        </EditorContent>
      </EditorRoot>
    </div>
  );
}
