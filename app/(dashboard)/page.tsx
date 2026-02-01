"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from '@/lib/auth-client';
import Link from 'next/link';

interface Note {
  id: string;
  title: string;
  content: string | null;
  createdAt: string;
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
    return full.length > 80 ? full.slice(0, 80) + "..." : full || "No content";
  } catch {
    return content.length > 80 ? content.slice(0, 80) + "..." : content;
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

export default function Home() {
  const { data: session } = useSession();
  const userName = session?.user?.name?.split(' ')[0] || 'there';
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);

  useEffect(() => {
    async function fetchRecentNotes() {
      try {
        const res = await fetch('/api/notes?limit=6');
        if (!res.ok) return;
        const data = await res.json();
        setRecentNotes(data.notes);
      } catch {
        // silently fail
      } finally {
        setLoadingNotes(false);
      }
    }
    fetchRecentNotes();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };
  const quickActions = [
    {
      title: 'Create New Note',
      description: 'Start capturing your thoughts and ideas instantly.',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      ),
      color: 'bg-blue-50 text-blue-600',
      action: 'Create'
    },
    {
      title: 'Voice Memo',
      description: 'Record your voice and convert it to text notes.',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="22" />
        </svg>
      ),
      color: 'bg-purple-50 text-purple-600',
      action: 'Record'
    },
    {
      title: 'Import Files',
      description: 'Upload PDF, Word or Text files to your library.',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      ),
      color: 'bg-orange-50 text-orange-600',
      action: 'Upload'
    },
    {
      title: 'Search Notes',
      description: 'Quickly find any note by keywords or tags.',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
      color: 'bg-green-50 text-green-600',
      action: 'Search'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto py-16 px-12">
      <header className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-2 text-zinc-900">{getGreeting()}, {userName}</h1>
        <p className="text-lg text-zinc-500">Ready to capture some great ideas today?</p>
      </header>

      <section className="mb-16">
        <h2 className="text-xl font-semibold mb-6 text-zinc-800">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quickActions.map((item, index) => (
            <div
              key={index}
              className="group flex flex-col p-6 rounded-2xl bg-white border border-zinc-200 hover:border-blue-600 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-200 cursor-pointer"
            >
              <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center mb-5 transition-all duration-200 group-hover:scale-110`}>
                {item.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2 text-zinc-900">{item.title}</h3>
              <p className="text-sm text-zinc-500 mb-6 leading-relaxed">{item.description}</p>
              <div className="mt-auto flex items-center text-sm font-semibold text-blue-600 group-hover:gap-2 transition-all">
                {item.action}
                <svg className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-zinc-800">Recent Notes</h2>
          <Link href="/notes" className="text-sm font-medium text-blue-600 hover:underline">View all</Link>
        </div>
        {loadingNotes ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-zinc-100 animate-pulse" />
            ))}
          </div>
        ) : recentNotes.length === 0 ? (
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-10 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-zinc-400 border border-zinc-100">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-zinc-900">No notes yet</h3>
            <p className="text-sm text-zinc-500 max-w-xs mx-auto">
              Create your first note to see it here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentNotes.map((n) => (
              <Link
                key={n.id}
                href={`/notes/${n.id}`}
                className="group flex flex-col p-5 rounded-xl bg-white border border-zinc-200 hover:border-blue-600 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-200"
              >
                <h3 className="text-sm font-semibold text-zinc-900 truncate group-hover:text-blue-600 transition-colors">
                  {n.title}
                </h3>
                <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2 flex-1">
                  {getContentPreview(n.content)}
                </p>
                <span className="text-xs text-zinc-400 mt-3">
                  {formatDate(n.createdAt)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
