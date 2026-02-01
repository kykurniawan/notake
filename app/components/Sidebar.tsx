"use client";

import React, { useState } from 'react';
import { useSession, signOut } from '@/lib/auth-client';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const Sidebar = () => {
    const { data: session } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const handleLogout = async () => {
        await signOut();
        router.push('/login');
    };

    const handleCreateNote = async () => {
        try {
            const res = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'Untitled' }),
            });
            if (!res.ok) return;
            const note = await res.json();
            router.push(`/notes/${note.id}`);
        } catch (err) {
            console.error('Failed to create note:', err);
        }
    };

    return (
        <aside className="w-72 bg-zinc-50 border-r border-zinc-200 flex flex-col p-6 h-full overflow-y-auto">
            <div className="flex items-center gap-3 mb-10">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold tracking-tight text-zinc-900">Notake</h2>
            </div>

            <button
                onClick={handleCreateNote}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mb-8 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors duration-200 cursor-pointer"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                </svg>
                New Note
            </button>

            <nav className="flex-1">
                <div className="mb-8">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4 px-2">Menu</h3>
                    <ul className="space-y-1">
                        <li>
                            <Link
                                href="/"
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${pathname === '/'
                                        ? 'bg-white shadow-sm text-blue-600 font-medium'
                                        : 'text-zinc-600 hover:bg-white hover:shadow-sm'
                                    }`}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                    <polyline points="9 22 9 12 15 12 15 22" />
                                </svg>
                                Dashboard
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/notes"
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${pathname.startsWith('/notes')
                                        ? 'bg-white shadow-sm text-blue-600 font-medium'
                                        : 'text-zinc-600 hover:bg-white hover:shadow-sm'
                                    }`}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5z" />
                                    <path d="M8 6h9M8 10h9M8 14h9" />
                                </svg>
                                All Notes
                            </Link>
                        </li>
                        <li className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-600 hover:bg-white hover:shadow-sm cursor-pointer transition-all duration-200">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                            Favorites
                        </li>
                        <li className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-600 hover:bg-white hover:shadow-sm cursor-pointer transition-all duration-200">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <line x1="3" y1="9" x2="21" y2="9" />
                                <line x1="9" y1="21" x2="9" y2="9" />
                            </svg>
                            Archive
                        </li>
                        <li>
                            <Link
                                href="/trash"
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${pathname === '/trash'
                                        ? 'bg-white shadow-sm text-red-600 font-medium'
                                        : 'text-red-600 hover:bg-white hover:shadow-sm'
                                    }`}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    <line x1="10" y1="11" x2="10" y2="17" />
                                    <line x1="14" y1="11" x2="14" y2="17" />
                                </svg>
                                Trash
                            </Link>
                        </li>
                    </ul>
                </div>
            </nav>

            <div className="mt-auto pt-6 border-t border-zinc-200 space-y-2">
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-600 hover:bg-white hover:shadow-sm cursor-pointer transition-all duration-200">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    <span className="text-sm font-medium">Settings</span>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-zinc-200 hover:shadow-sm cursor-pointer transition-all duration-200"
                    >
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                            {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-zinc-900 truncate">{session?.user?.name || 'User'}</p>
                            <p className="text-xs text-zinc-500 truncate">{session?.user?.email}</p>
                        </div>
                        <svg
                            className={`w-4 h-4 text-zinc-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>

                    {showProfileMenu && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-zinc-200 rounded-lg shadow-lg overflow-hidden">
                            <button
                                onClick={() => {
                                    setShowProfileMenu(false);
                                    // TODO: Navigate to profile page
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-zinc-700 hover:bg-zinc-50 transition-colors text-left"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                <span className="text-sm font-medium">Profile</span>
                            </button>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors text-left border-t border-zinc-200"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                    <polyline points="16 17 21 12 16 7"></polyline>
                                    <line x1="21" y1="12" x2="9" y2="12"></line>
                                </svg>
                                <span className="text-sm font-medium">Logout</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
