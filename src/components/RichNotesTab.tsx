import React, { useState, useEffect, useMemo } from 'react';
import {
  NoteItem,
  NOTE_CATEGORIES,
  getStoredNotes,
  saveStoredNotes,
  searchAndFilterNotes,
  exportNoteAsPdf,
} from '../lib/notesStorage';
import { syncNotesToNative } from '../lib/widgetSyncBridge';
import {
  StickyNote,
  Plus,
  Search,
  Pin,
  Trash2,
  Sparkles,
  Copy,
  Check,
  X,
  ArrowLeft,
  FileDown,
  CheckSquare,
  List,
  Bold,
  Smartphone,
} from 'lucide-react';

function formatRelativeTime(timestamp: number): string {
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function RichNotesTab() {
  const [notes, setNotes] = useState<NoteItem[]>(() => getStoredNotes());
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [widgetPinnedNoteId, setWidgetPinnedNoteId] = useState<string | null>(() => {
    return localStorage.getItem('notes_widget_pinned_id');
  });

  useEffect(() => {
    saveStoredNotes(notes);
    syncNotesToNative(notes);
  }, [notes]);

  useEffect(() => {
    const handleOpenNote = (e: any) => {
      const targetId = e.detail?.noteId;
      if (targetId) {
        setActiveNoteId(targetId);
      }
    };
    window.addEventListener('open-specific-note', handleOpenNote);
    return () => window.removeEventListener('open-specific-note', handleOpenNote);
  }, []);

  const handleToggleWidgetPin = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextId = widgetPinnedNoteId === id ? null : id;
    setWidgetPinnedNoteId(nextId);
    if (nextId) {
      localStorage.setItem('notes_widget_pinned_id', nextId);
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            id: `pin-note-${Date.now()}`,
            type: 'success',
            title: '📌 Pinned to Home Screen Widget',
            description: 'This note is now actively displayed on your home screen Notes widget.',
          },
        })
      );
    } else {
      localStorage.removeItem('notes_widget_pinned_id');
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            id: `unpin-note-${Date.now()}`,
            type: 'info',
            title: '📌 Removed from Home Screen Widget',
            description: 'Default latest note will now be displayed on the Notes widget.',
          },
        })
      );
    }
    setTimeout(() => {
      syncNotesToNative(notes);
    }, 50);
  };

  const activeNote = useMemo(() => {
    return notes.find((n) => n.id === activeNoteId) || null;
  }, [notes, activeNoteId]);

  const filteredNotes = useMemo(() => {
    return searchAndFilterNotes(notes, searchQuery, selectedCategory);
  }, [notes, searchQuery, selectedCategory]);

  const pinnedNotes = useMemo(() => {
    return filteredNotes.filter((n) => n.isPinned);
  }, [filteredNotes]);

  const regularNotes = useMemo(() => {
    return filteredNotes.filter((n) => !n.isPinned);
  }, [filteredNotes]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: notes.length };
    notes.forEach((n) => {
      counts[n.category] = (counts[n.category] || 0) + 1;
    });
    return counts;
  }, [notes]);

  const handleCreateNote = () => {
    const newNote: NoteItem = {
      id: `note-${Date.now()}`,
      title: '',
      content: '',
      category: selectedCategory !== 'all' ? (selectedCategory as NoteItem['category']) : 'personal',
      isPinned: false,
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
  };

  const handleUpdateActiveNote = (updates: Partial<NoteItem>) => {
    if (!activeNoteId) return;
    setNotes((prevNotes) =>
      prevNotes.map((n) =>
        n.id === activeNoteId ? { ...n, ...updates, updatedAt: Date.now() } : n
      )
    );
  };

  const handleDeleteNote = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm('Delete this note permanently?')) {
      const remaining = notes.filter((n) => n.id !== id);
      setNotes(remaining);
      if (activeNoteId === id) {
        setActiveNoteId(null);
      }
    }
  };

  const handleTogglePin = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n))
    );
  };

  const handleInsertText = (prefix: string, suffix: string = '') => {
    if (!activeNote) return;
    const textarea = document.getElementById('noteContentArea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = activeNote.content.substring(start, end);
    const replacement = `${prefix}${selected || ''}${suffix}`;

    const newContent =
      activeNote.content.substring(0, start) +
      replacement +
      activeNote.content.substring(end);

    handleUpdateActiveNote({ content: newContent });

    setTimeout(() => {
      textarea.focus();
      const cursorTarget = start + prefix.length + (selected ? selected.length : 0);
      textarea.setSelectionRange(cursorTarget, cursorTarget);
    }, 10);
  };

  const handleCopyNote = async () => {
    if (!activeNote) return;
    try {
      await navigator.clipboard.writeText(`${activeNote.title}\n\n${activeNote.content}`);
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 2000);
    } catch (e) {
      console.error('Failed to copy note', e);
    }
  };

  // --------------------------------------------------------------------------
  // 1. FOCUSED NOTE EDITOR VIEW (Clean, Distraction-free)
  // --------------------------------------------------------------------------
  if (activeNote) {
    const cat = NOTE_CATEGORIES[activeNote.category] || NOTE_CATEGORIES.personal;

    return (
      <div className="space-y-3 pb-24 max-w-4xl mx-auto animate-fade-in select-none">
        {/* Top Action Bar */}
        <div className="rounded-2xl liquid-glass liquid-specular p-3 border border-white/40 dark:border-white/10 flex items-center justify-between gap-2 shadow-md">
          <button
            type="button"
            onClick={() => setActiveNoteId(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl liquid-glass-btn text-xs font-bold text-slate-800 dark:text-slate-200 active:scale-95 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Notes</span>
          </button>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Category Dropdown */}
            <select
              value={activeNote.category}
              onChange={(e) =>
                handleUpdateActiveNote({
                  category: e.target.value as NoteItem['category'],
                })
              }
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold liquid-glass-btn text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            >
              {Object.entries(NOTE_CATEGORIES).map(([k, v]) => (
                <option key={k} value={k} className="bg-slate-900 text-white">
                  {v.label}
                </option>
              ))}
            </select>

            {/* Pin Toggle */}
            <button
              type="button"
              onClick={() => handleUpdateActiveNote({ isPinned: !activeNote.isPinned })}
              className={`p-2 rounded-xl liquid-glass-btn transition active:scale-95 cursor-pointer ${
                activeNote.isPinned ? 'text-amber-500 font-black' : 'text-slate-400'
              }`}
              title={activeNote.isPinned ? 'Unpin Note' : 'Pin Note'}
            >
              <Pin className={`w-4 h-4 ${activeNote.isPinned ? 'fill-current' : ''}`} />
            </button>

            {/* Pin to Home Screen Widget */}
            <button
              type="button"
              onClick={(e) => handleToggleWidgetPin(activeNote.id, e)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                widgetPinnedNoteId === activeNote.id
                  ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400/40'
                  : 'liquid-glass-btn text-slate-700 dark:text-slate-300'
              }`}
              title={
                widgetPinnedNoteId === activeNote.id
                  ? 'Pinned to Home Screen Widget (Tap to unpin)'
                  : 'Pin to Home Screen Widget'
              }
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{widgetPinnedNoteId === activeNote.id ? '📱 On Widget' : 'Pin to Widget'}</span>
            </button>

            {/* Copy Note */}
            <button
              type="button"
              onClick={handleCopyNote}
              className="p-2 rounded-xl liquid-glass-btn text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition active:scale-95 cursor-pointer"
              title="Copy entire note"
            >
              {copiedFeedback ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* PDF Export */}
            <button
              type="button"
              onClick={() => exportNoteAsPdf(activeNote)}
              className="p-2 rounded-xl liquid-glass-btn text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition active:scale-95 cursor-pointer"
              title="Export as PDF"
            >
              <FileDown className="w-4 h-4" />
            </button>

            {/* Delete Note */}
            <button
              type="button"
              onClick={() => handleDeleteNote(activeNote.id)}
              className="p-2 rounded-xl liquid-glass-btn text-rose-500 hover:bg-rose-500/15 transition active:scale-95 cursor-pointer"
              title="Delete note"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Note Writing Surface */}
        <div className="rounded-3xl liquid-glass-card liquid-specular p-5 sm:p-6 border border-white/40 dark:border-white/10 space-y-4 shadow-xl flex flex-col min-h-[500px]">
          {/* Note Title Input */}
          <input
            type="text"
            value={activeNote.title}
            onChange={(e) => handleUpdateActiveNote({ title: e.target.value })}
            placeholder="Note Title..."
            className="w-full bg-transparent text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none pb-2 border-b border-black/5 dark:border-white/10"
          />

          {/* Quick Writing Shortcuts */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs">
            <button
              type="button"
              onClick={() => handleInsertText('**', '**')}
              className="px-2.5 py-1 rounded-lg liquid-glass-btn text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1"
            >
              <Bold className="w-3.5 h-3.5" />
              <span>Bold</span>
            </button>
            <button
              type="button"
              onClick={() => handleInsertText('- ')}
              className="px-2.5 py-1 rounded-lg liquid-glass-btn text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1"
            >
              <List className="w-3.5 h-3.5" />
              <span>Bullet</span>
            </button>
            <button
              type="button"
              onClick={() => handleInsertText('- [ ] ')}
              className="px-2.5 py-1 rounded-lg liquid-glass-btn text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Task</span>
            </button>
            <button
              type="button"
              onClick={() => handleInsertText('# ')}
              className="px-2.5 py-1 rounded-lg liquid-glass-btn text-slate-700 dark:text-slate-300 font-bold"
            >
              H1
            </button>
            <button
              type="button"
              onClick={() => handleInsertText('## ')}
              className="px-2.5 py-1 rounded-lg liquid-glass-btn text-slate-700 dark:text-slate-300 font-bold"
            >
              H2
            </button>
          </div>

          {/* Note Content Textarea */}
          <textarea
            id="noteContentArea"
            value={activeNote.content}
            onChange={(e) => handleUpdateActiveNote({ content: e.target.value })}
            placeholder="Type your notes, markdown, tasks, or Kannada text here..."
            className="w-full flex-1 min-h-[360px] bg-transparent text-sm sm:text-base text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none leading-relaxed resize-none font-sans"
          />

          {/* Footer Metadata */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-black/5 dark:border-white/10">
            <span className="flex items-center gap-1.5 font-semibold">
              <span className={`w-2 h-2 rounded-full ${cat.dotColor}`} />
              {cat.label}
            </span>
            <span>
              Updated {formatRelativeTime(activeNote.updatedAt)} • {activeNote.content.length} chars
            </span>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 2. NOTES LIST VIEW (Easily Accessible, Fast Search & Categorized Cards)
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-4 pb-24 max-w-5xl mx-auto select-none">
      {/* Top Header & Search Hero */}
      <div className="rounded-3xl liquid-glass liquid-specular p-4 sm:p-5 border border-white/40 dark:border-white/10 shadow-lg space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0">
              <StickyNote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                Notes
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {notes.length} notes saved • Offline &amp; Widget Synced
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreateNote}
            className="px-4 py-2 rounded-2xl liquid-glass-accent text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Note</span>
          </button>
        </div>

        {/* Live Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes by title, keywords, or Kannada text..."
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl liquid-glass-input border border-black/10 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 shadow-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              selectedCategory === 'all'
                ? 'liquid-glass-accent shadow-sm'
                : 'liquid-glass-btn text-slate-600 dark:text-slate-400'
            }`}
          >
            <span>All</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/15">
              {categoryCounts.all || 0}
            </span>
          </button>

          {Object.entries(NOTE_CATEGORIES).map(([key, cat]) => {
            const isSelected = selectedCategory === key;
            const count = categoryCounts[key] || 0;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedCategory(key)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? `${cat.badgeBg} ${cat.textColor} ring-1.5 ${cat.borderColor} shadow-sm font-black`
                    : 'liquid-glass-btn text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${cat.dotColor}`} />
                <span>{cat.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/15">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {filteredNotes.length === 0 && (
        <div className="text-center py-16 rounded-3xl liquid-glass-card border border-white/40 dark:border-white/10 p-6 space-y-3">
          <StickyNote className="w-12 h-12 mx-auto text-slate-400 stroke-[1.5]" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {searchQuery ? 'No Matching Notes' : 'No Notes Yet'}
          </h4>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {searchQuery
              ? `No notes matched "${searchQuery}". Try clearing search.`
              : 'Tap "+ New Note" above to write your first note or thought.'}
          </p>
        </div>
      )}

      {/* Pinned Notes Grid */}
      {pinnedNotes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 px-2 text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            <Pin className="w-3.5 h-3.5 fill-current" />
            <span>Pinned Notes</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pinnedNotes.map((note) => {
              const cat = NOTE_CATEGORIES[note.category] || NOTE_CATEGORIES.personal;
              return (
                <div
                  key={note.id}
                  onClick={() => setActiveNoteId(note.id)}
                  className="rounded-2xl liquid-glass-card border border-amber-500/35 dark:border-amber-400/25 p-4 space-y-2 cursor-pointer hover:border-amber-500 transition-all hover:-translate-y-0.5 shadow-sm active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">
                        {note.title || 'Untitled Note'}
                      </h3>
                      {widgetPinnedNoteId === note.id && (
                        <span className="px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-[9px] font-black shrink-0">
                          📱 Widget
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleToggleWidgetPin(note.id, e)}
                        className={`p-1 transition ${
                          widgetPinnedNoteId === note.id
                            ? 'text-purple-600 dark:text-purple-400'
                            : 'text-slate-400 hover:text-purple-500'
                        }`}
                        title={widgetPinnedNoteId === note.id ? 'Unpin from Widget' : 'Pin to Home Screen Widget'}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleTogglePin(note.id, e)}
                        className="p-1 text-amber-500 hover:text-amber-600"
                        title="Unpin Note"
                      >
                        <Pin className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                    {note.content || '(Empty note)'}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[10.5px]">
                    <span className={`px-2 py-0.5 rounded-md font-bold ${cat.badgeBg} ${cat.textColor}`}>
                      {cat.label}
                    </span>
                    <span className="text-slate-400 font-medium">
                      {formatRelativeTime(note.updatedAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Regular Notes Grid */}
      {regularNotes.length > 0 && (
        <div className="space-y-2">
          {pinnedNotes.length > 0 && (
            <div className="px-2 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <span>All Notes</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {regularNotes.map((note) => {
              const cat = NOTE_CATEGORIES[note.category] || NOTE_CATEGORIES.personal;
              return (
                <div
                  key={note.id}
                  onClick={() => setActiveNoteId(note.id)}
                  className="rounded-2xl liquid-glass-card border border-black/10 dark:border-white/10 p-4 space-y-2 cursor-pointer hover:border-indigo-500/50 transition-all hover:-translate-y-0.5 shadow-sm active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">
                        {note.title || 'Untitled Note'}
                      </h3>
                      {widgetPinnedNoteId === note.id && (
                        <span className="px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-[9px] font-black shrink-0">
                          📱 Widget
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleToggleWidgetPin(note.id, e)}
                        className={`p-1 transition ${
                          widgetPinnedNoteId === note.id
                            ? 'text-purple-600 dark:text-purple-400'
                            : 'text-slate-400 hover:text-purple-500'
                        }`}
                        title={widgetPinnedNoteId === note.id ? 'Unpin from Widget' : 'Pin to Home Screen Widget'}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleTogglePin(note.id, e)}
                        className="p-1 text-slate-400 hover:text-amber-500 transition"
                        title="Pin Note"
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition"
                        title="Delete Note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                    {note.content || '(Empty note)'}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[10.5px]">
                    <span className={`px-2 py-0.5 rounded-md font-bold ${cat.badgeBg} ${cat.textColor}`}>
                      {cat.label}
                    </span>
                    <span className="text-slate-400 font-medium">
                      {formatRelativeTime(note.updatedAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
