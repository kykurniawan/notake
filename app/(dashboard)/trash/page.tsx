"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

interface Note {
    id: string;
    title: string;
    content: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
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

function formatDeletionDate(dateString: string | null): string {
    if (!dateString) return "Unknown";

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Deleted just now";
    if (diffMins < 60) return `Deleted ${diffMins}m ago`;
    if (diffHours < 24) return `Deleted ${diffHours}h ago`;
    if (diffDays < 7) return `Deleted ${diffDays}d ago`;
    return `Deleted ${date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    })}`;
}

export default function TrashPage() {
    const [notes, setNotes] = useState<Note[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
    const [restoring, setRestoring] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);

    const fetchNotes = useCallback(
        async (cursor?: string) => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    limit: "20",
                    deleted: "true"
                });
                if (cursor) params.set("cursor", cursor);

                const res = await fetch(`/api/notes?${params}`);
                if (!res.ok) throw new Error("Failed to fetch deleted notes");

                const data = await res.json();
                setNotes((prev) => (cursor ? [...prev, ...data.notes] : data.notes));
                setNextCursor(data.nextCursor);
                setHasMore(data.nextCursor !== null);
            } catch (err) {
                console.error("Failed to fetch deleted notes:", err);
            } finally {
                setLoading(false);
            }
        },
        []
    );

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    // Infinite scroll observer
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

    // Handle individual checkbox toggle
    const handleCheckboxChange = (noteId: string) => {
        setSelectedNotes((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(noteId)) {
                newSet.delete(noteId);
            } else {
                newSet.add(noteId);
            }
            return newSet;
        });
    };

    // Handle "Select All" checkbox
    const handleSelectAll = () => {
        if (selectedNotes.size === notes.length && notes.length > 0) {
            // If all are selected, deselect all
            setSelectedNotes(new Set());
        } else {
            // Otherwise, select all visible notes
            setSelectedNotes(new Set(notes.map((n) => n.id)));
        }
    };

    // Check if all notes are selected
    const allSelected = notes.length > 0 && selectedNotes.size === notes.length;
    // Check if some (but not all) notes are selected
    const someSelected = selectedNotes.size > 0 && selectedNotes.size < notes.length;

    // Handle single note restore
    const handleRestoreNote = async (noteId: string) => {
        setRestoring(true);
        setErrorMessage(null);
        try {
            const res = await fetch(`/api/notes/${noteId}/restore`, {
                method: "POST",
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to restore note");
            }

            // Remove the restored note from the list
            setNotes((prev) => prev.filter((n) => n.id !== noteId));
            // Remove from selected notes if it was selected
            setSelectedNotes((prev) => {
                const newSet = new Set(prev);
                newSet.delete(noteId);
                return newSet;
            });
            // Show success message
            setSuccessMessage("Note restored successfully");
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            console.error("Failed to restore note:", err);
            setErrorMessage(err instanceof Error ? err.message : "Failed to restore note");
            setTimeout(() => setErrorMessage(null), 5000);
        } finally {
            setRestoring(false);
        }
    };

    // Handle bulk restore
    const handleRestoreSelected = async () => {
        if (selectedNotes.size === 0) return;

        setRestoring(true);
        setErrorMessage(null);
        const noteIds = Array.from(selectedNotes);

        try {
            const res = await fetch("/api/notes/restore", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ noteIds }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to restore notes");
            }

            const data = await res.json();
            const restoredCount = data.restored;

            // Remove all restored notes from the list
            setNotes((prev) => prev.filter((n) => !selectedNotes.has(n.id)));
            // Clear selections
            setSelectedNotes(new Set());
            // Show success message with count
            setSuccessMessage(
                `${restoredCount} ${restoredCount === 1 ? "note" : "notes"} restored successfully`
            );
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            console.error("Failed to restore notes:", err);
            setErrorMessage(err instanceof Error ? err.message : "Failed to restore notes");
            setTimeout(() => setErrorMessage(null), 5000);
        } finally {
            setRestoring(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-12 px-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                    Trash
                </h1>
                <p className="text-sm text-zinc-500 mt-1">
                    Deleted notes can be restored
                </p>
            </div>

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
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-zinc-900">
                        Trash is empty
                    </h3>
                    <p className="text-sm text-zinc-500 max-w-xs mx-auto">
                        Deleted notes will appear here and can be restored.
                    </p>
                </div>
            ) : (
                <>
                    {notes.length > 0 && (
                        <div className="mb-4 p-4 rounded-xl bg-white border border-zinc-200 flex items-center justify-between">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    ref={(input) => {
                                        if (input) {
                                            input.indeterminate = someSelected;
                                        }
                                    }}
                                    onChange={handleSelectAll}
                                    className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 focus:ring-2 cursor-pointer"
                                />
                                <span className="text-sm font-medium text-zinc-700">
                                    Select All
                                </span>
                            </label>
                            <div className="flex items-center gap-3">
                                {selectedNotes.size > 0 && (
                                    <>
                                        <span className="text-sm text-zinc-500">
                                            {selectedNotes.size} selected
                                        </span>
                                        <button
                                            onClick={handleRestoreSelected}
                                            disabled={restoring}
                                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            <svg
                                                className="w-4 h-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                                />
                                            </svg>
                                            {restoring ? "Restoring..." : `Restore Selected (${selectedNotes.size})`}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        {notes.map((n) => (
                            <div
                                key={n.id}
                                className="block p-5 rounded-xl bg-white border border-zinc-200 transition-all duration-200"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <input
                                            type="checkbox"
                                            checked={selectedNotes.has(n.id)}
                                            onChange={() => handleCheckboxChange(n.id)}
                                            className="mt-1 w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 focus:ring-2 cursor-pointer"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-semibold text-zinc-900 truncate">
                                                {n.title}
                                            </h3>
                                            <p className="text-sm text-zinc-500 mt-1 line-clamp-2">
                                                {getContentPreview(n.content)}
                                            </p>
                                            <span className="text-xs text-zinc-400 mt-2 block">
                                                {formatDeletionDate(n.deletedAt)}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRestoreNote(n.id)}
                                        disabled={restoring}
                                        className="px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
                                        title="Restore note"
                                    >
                                        <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                            />
                                        </svg>
                                        Restore
                                    </button>
                                </div>
                            </div>
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
                </>
            )}
        </div>
    );
}
