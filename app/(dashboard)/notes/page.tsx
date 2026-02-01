"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Note {
  id: string;
  title: string;
  content: string | null;
  createdAt: string;
  updatedAt: string;
}

function getContentPreview(content: string | null): string {
  if (!content) return "No content";
  try {
    const json = JSON.parse(content);
    const texts: string[] = [];
    function extractText(node: any) {
      if (node.text) texts.push(node.text);
      if (node.content) node.content.forEach(extractText);
    }
    extractText(json);
    const full = texts.join(" ").trim();
    return full.length > 120 ? full.slice(0, 120) + "..." : full || "No content";
  } catch {
    return content.length > 120 ? content.slice(0, 120) + "..." : content;
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export default function NotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleCreateNote = async () => {
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled" }),
      });
      if (!res.ok) return;
      const note = await res.json();
      router.push(`/notes/${note.id}`);
    } catch (err) {
      console.error("Failed to create note:", err);
    }
  };

  const fetchNotes = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: "20" });
        if (cursor) params.set("cursor", cursor);

        const res = await fetch(`/api/notes?${params}`);
        if (!res.ok) throw new Error("Failed to fetch notes");

        const data = await res.json();
        setNotes((prev) => (cursor ? [...prev, ...data.notes] : data.notes));
        setNextCursor(data.nextCursor);
        setHasMore(data.nextCursor !== null);
      } catch (err) {
        console.error("Failed to fetch notes:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && nextCursor) {
          fetchNotes(nextCursor);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, nextCursor, fetchNotes]);

  return (
    <div className="max-w-4xl mx-auto py-12 px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            All Notes
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Browse and manage your notes
          </p>
        </div>
        <button
          onClick={handleCreateNote}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Note
        </button>
      </div>

      {!loading && notes.length === 0 ? (
        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-10 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-zinc-400 border border-zinc-100">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2 text-zinc-900">
            No notes yet
          </h3>
          <p className="text-sm text-zinc-500 max-w-xs mx-auto mb-6">
            Create your first note to get started.
          </p>
          <button
            onClick={handleCreateNote}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Create Note
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <Link
              key={n.id}
              href={`/notes/${n.id}`}
              className="group block p-5 rounded-xl bg-white border border-zinc-200 hover:border-blue-600 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-zinc-900 truncate group-hover:text-blue-600 transition-colors">
                    {n.title}
                  </h3>
                  <p className="text-sm text-zinc-500 mt-1 line-clamp-2">
                    {getContentPreview(n.content)}
                  </p>
                </div>
                <span className="text-xs text-zinc-400 whitespace-nowrap mt-1">
                  {formatDate(n.createdAt)}
                </span>
              </div>
            </Link>
          ))}

          <div ref={sentinelRef} className="py-4 flex justify-center">
            {loading && (
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Loading...
              </div>
            )}
            {!hasMore && notes.length > 0 && (
              <p className="text-sm text-zinc-400">No more notes</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
