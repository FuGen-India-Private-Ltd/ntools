import React, { useState, useMemo, useRef, useCallback } from 'react';
import { AppModule } from './FloatingDock';
import {
  FileCode,
  FolderArchive,
  StickyNote,
  Clock,
  Calculator,
  Calendar,
  Layers,
  Settings,
  Search,
  ArrowUpRight,
  ListTodo,
  Mic,
  Compass,
  CalendarDays,
  ChevronRight,
  ChevronLeft,
  GripVertical,
  RotateCcw,
  Check,
} from 'lucide-react';
import { getStoredCalendarEvents, getHolidayForDate } from '../lib/calendarStorage';

interface DashboardHomeProps {
  onNavigate: (module: AppModule) => void;
  lang: 'en' | 'kn';
  onOpenTutorial?: () => void;
}

interface ToolCard {
  id: AppModule;
  titleEn: string;
  titleKn: string;
  subtitleEn: string;
  subtitleKn: string;
  keywords: string[];
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  glowColor: string;
}

const TOOLS_LIST: ToolCard[] = [
  {
    id: 'files',
    titleEn: 'PDF & Documents Hub',
    titleKn: 'PDF & ದಾಖಲೆಗಳು',
    subtitleEn: 'Merge, Compress, Split, Docx, Pptx & Photos to PDF',
    subtitleKn: 'ವಿಲೀನಗೊಳಿಸಿ, ಸಂಕುಚಿತಗೊಳಿಸಿ, ವಿಭಜಿಸಿ',
    keywords: ['merge', 'combine', 'compress', 'split', 'extract', 'pdf', 'docx', 'pptx', 'word', 'powerpoint', 'excel', 'photos', 'scanner', 'ilovepdf', 'smallpdf'],
    icon: FolderArchive,
    iconBg: 'bg-rose-500/15 dark:bg-rose-500/20',
    iconColor: 'text-rose-500',
    borderColor: 'hover:border-rose-500/50',
    glowColor: 'group-hover:shadow-rose-500/20',
  },
  {
    id: 'calc',
    titleEn: 'Smart Calculator & Finance',
    titleKn: 'ಕ್ಯಾಲ್ಕುಲೇಟರ್ & ಹಣಕಾಸು',
    subtitleEn: 'Scientific, 9-Unit Converter, GST, Loan EMI & Age',
    subtitleKn: 'ವೈಜ್ಞಾನಿಕ, ಜಿಎಸ್‌ಟಿ, ಇಎಂಐ & ವಯಸ್ಸು',
    keywords: ['calculator', 'scientific', 'units', 'gst', 'emi', 'loan', 'age', 'discount', 'tip', 'bmi', 'currency', 'tax'],
    icon: Calculator,
    iconBg: 'bg-emerald-500/15 dark:bg-emerald-500/20',
    iconColor: 'text-emerald-500',
    borderColor: 'hover:border-emerald-500/50',
    glowColor: 'group-hover:shadow-emerald-500/20',
  },
  {
    id: 'clock',
    titleEn: 'Clock, Alarms & Wakeup',
    titleKn: 'ಗಡಿಯಾರ & ಅಲಾರಾಂ',
    subtitleEn: 'Math Missions, Multi-Timers, Stopwatch & Sleep',
    subtitleKn: 'ಮಿಷನ್‌ಗಳು, ಟೈಮರ್‌ಗಳು, ಸ್ಟಾಪ್‌ವಾಚ್',
    keywords: ['alarm', 'clock', 'wakeup', 'math mission', 'shake', 'timer', 'stopwatch', 'world clock', 'sleep cycle', 'alarmy'],
    icon: Clock,
    iconBg: 'bg-amber-500/15 dark:bg-amber-500/20',
    iconColor: 'text-amber-500',
    borderColor: 'hover:border-amber-500/50',
    glowColor: 'group-hover:shadow-amber-500/20',
  },
  {
    id: 'calendar',
    titleEn: 'Calendar & Agenda Planner',
    titleKn: 'ಕ್ಯಾಲೆಂಡರ್ & ಪ್ಲಾನರ್',
    subtitleEn: 'Month & Agenda, Karnataka Holidays, Birthdays & Tasks',
    subtitleKn: 'ರಜಾದಿನಗಳು, ಜನ್ಮದಿನಗಳು & ಕಾರ್ಯಗಳು',
    keywords: ['calendar', 'agenda', 'holidays', 'karnataka', 'panchang', 'birthday', 'anniversary', 'events', 'schedule'],
    icon: Calendar,
    iconBg: 'bg-sky-500/15 dark:bg-sky-500/20',
    iconColor: 'text-sky-500',
    borderColor: 'hover:border-sky-500/50',
    glowColor: 'group-hover:shadow-sky-500/20',
  },
  {
    id: 'converter',
    titleEn: 'Kannada Sanka & ASCII',
    titleKn: 'ಕನ್ನಡ ಸಂಕ & ಅಸ್ಕಿ',
    subtitleEn: 'Nudi, Baraha, Shree-Lipi ⇄ Unicode with Font Detection',
    subtitleKn: 'ನುಡಿ, ಬರಹ, ಶ್ರೀ-ಲಿಪಿ ಯೂನಿಕೋಡ್ ಪರಿವರ್ತಕ',
    keywords: ['kannada', 'sanka', 'nudi', 'baraha', 'shree-lipi', 'shree', 'ascii', 'unicode', 'converter', 'kannada font'],
    icon: FileCode,
    iconBg: 'bg-indigo-500/15 dark:bg-indigo-500/20',
    iconColor: 'text-indigo-500',
    borderColor: 'hover:border-indigo-500/50',
    glowColor: 'group-hover:shadow-indigo-500/20',
  },
  {
    id: 'tasks',
    titleEn: 'Tasks & Focus Pomodoro',
    titleKn: 'ಕಾರ್ಯಗಳು & ಪೊಮೊಡೊರೊ',
    subtitleEn: 'Interactive Checklists, Priority Deadlines & Focus Sessions',
    subtitleKn: 'ಚೆಕ್‌ಲಿಸ್ಟ್ & ಫೋಕಸ್ ಟೈಮರ್',
    keywords: ['tasks', 'todo', 'checklist', 'pomodoro', 'focus', 'deadlines', 'priorities'],
    icon: ListTodo,
    iconBg: 'bg-teal-500/15 dark:bg-teal-500/20',
    iconColor: 'text-teal-500',
    borderColor: 'hover:border-teal-500/50',
    glowColor: 'group-hover:shadow-teal-500/20',
  },
  {
    id: 'notes',
    titleEn: 'Rich Notes & Markdown',
    titleKn: 'ಟಿಪ್ಪಣಿಗಳು & ಮಾರ್ಕ್‌ಡೌನ್',
    subtitleEn: 'Fast Notes, Headings, Checklists & Instant PDF Export',
    subtitleKn: 'ತ್ವರಿತ ಟಿಪ್ಪಣಿಗಳು & ರಫ್ತು',
    keywords: ['notes', 'memo', 'markdown', 'notepad', 'export pdf'],
    icon: StickyNote,
    iconBg: 'bg-purple-500/15 dark:bg-purple-500/20',
    iconColor: 'text-purple-500',
    borderColor: 'hover:border-purple-500/50',
    glowColor: 'group-hover:shadow-purple-500/20',
  },
  {
    id: 'widgets',
    titleEn: 'Widget Customizer Studio',
    titleKn: 'ವಿಜೆಟ್ ಸ್ಟುಡಿಯೋ',
    subtitleEn: 'Customize Home Screen Widgets, Glass Opacity & Themes',
    subtitleKn: 'ಹೋಮ್ ಸ್ಕ್ರೀನ್ ವಿಜೆಟ್‌ಗಳು',
    keywords: ['widgets', 'home screen', 'customizer', 'launcher'],
    icon: Layers,
    iconBg: 'bg-gradient-to-tr from-pink-500/20 via-purple-500/20 to-indigo-500/20',
    iconColor: 'text-pink-500',
    borderColor: 'hover:border-pink-500/50',
    glowColor: 'group-hover:shadow-pink-500/20',
  },
  {
    id: 'recorder',
    titleEn: 'Voice Recorder & Audio',
    titleKn: 'ಧ್ವನಿ ರೆಕಾರ್ಡರ್',
    subtitleEn: 'HD Audio Notes, Real-Time Waveform & Instant Export',
    subtitleKn: 'ಧ್ವನಿ ರೆಕಾರ್ಡಿಂಗ್ & ಹಂಚಿಕೆ',
    keywords: ['voice', 'recorder', 'audio', 'mic', 'recording', 'notes', 'sound', 'dictaphone'],
    icon: Mic,
    iconBg: 'bg-rose-500/15 dark:bg-rose-500/20',
    iconColor: 'text-rose-500',
    borderColor: 'hover:border-rose-500/50',
    glowColor: 'group-hover:shadow-rose-500/20',
  },
  {
    id: 'compass',
    titleEn: 'Digital Compass & Level',
    titleKn: 'ದಿಕ್ಸೂಚಿ & ಮಟ್ಟ',
    subtitleEn: '360° Magnetic Heading, Direction & Spirit Level',
    subtitleKn: 'ದಿಕ್ಸೂಚಿ & ಮೇಲ್ಮೈ ಮಟ್ಟ',
    keywords: ['compass', 'direction', 'north', 'level', 'spirit level', 'heading', 'degrees', 'navigation'],
    icon: Compass,
    iconBg: 'bg-emerald-500/15 dark:bg-emerald-500/20',
    iconColor: 'text-emerald-500',
    borderColor: 'hover:border-emerald-500/50',
    glowColor: 'group-hover:shadow-emerald-500/20',
  },
  {
    id: 'settings',
    titleEn: 'Settings & Privacy Hub',
    titleKn: 'ಸೆಟ್ಟಿಂಗ್ಸ್ & ಗೌಪ್ಯತೆ',
    subtitleEn: '100% Offline Mode, Storage Management & Themes',
    subtitleKn: 'ಆಫ್‌ಲೈನ್ & ಡೇಟಾ ನಿರ್ವಹಣೆ',
    keywords: ['settings', 'privacy', 'theme', 'dark mode', 'offline', 'storage'],
    icon: Settings,
    iconBg: 'bg-slate-500/15 dark:bg-slate-400/20',
    iconColor: 'text-slate-500 dark:text-slate-300',
    borderColor: 'hover:border-slate-500/50',
    glowColor: 'group-hover:shadow-slate-500/20',
  },
];

const STORAGE_KEY = 'ntools_home_tools_order';
const DEFAULT_TOOL_IDS: AppModule[] = TOOLS_LIST.map((t) => t.id);

function getInitialToolOrder(): AppModule[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const validIds = parsed.filter((id) =>
          DEFAULT_TOOL_IDS.includes(id as AppModule)
        ) as AppModule[];
        for (const defaultId of DEFAULT_TOOL_IDS) {
          if (!validIds.includes(defaultId)) {
            validIds.push(defaultId);
          }
        }
        return validIds;
      }
    }
  } catch (e) {
    console.warn('Failed to load home tools order:', e);
  }
  return [...DEFAULT_TOOL_IDS];
}

export const DashboardHome = React.memo(function DashboardHome({
  onNavigate,
  lang,
  onOpenTutorial,
}: DashboardHomeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [toolOrder, setToolOrder] = useState<AppModule[]>(getInitialToolOrder);
  const [isReordering, setIsReordering] = useState(false);
  const [draggedId, setDraggedId] = useState<AppModule | null>(null);

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressTriggeredRef = useRef(false);
  const touchDragTargetRef = useRef<AppModule | null>(null);

  const today = useMemo(() => new Date(), []);
  const todayDateStr = useMemo(() => {
    const y = today.getFullYear();
    const m = (today.getMonth() + 1).toString().padStart(2, '0');
    const d = today.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [today]);

  const todayHoliday = useMemo(() => {
    return getHolidayForDate(today.getFullYear(), today.getMonth(), today.getDate());
  }, [today]);

  const todayEvents = useMemo(() => {
    const all = getStoredCalendarEvents();
    return all.filter((e) => e.date === todayDateStr && !e.isCompleted);
  }, [todayDateStr]);

  const todayFormatted = useMemo(() => {
    return today.toLocaleDateString(lang === 'kn' ? 'kn-IN' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }, [today, lang]);

  // Sort tools according to custom toolOrder
  const orderedTools = useMemo(() => {
    const toolMap = new Map<AppModule, ToolCard>();
    for (const tool of TOOLS_LIST) {
      toolMap.set(tool.id, tool);
    }
    const result: ToolCard[] = [];
    for (const id of toolOrder) {
      const tool = toolMap.get(id);
      if (tool) {
        result.push(tool);
        toolMap.delete(id);
      }
    }
    for (const remaining of toolMap.values()) {
      result.push(remaining);
    }
    return result;
  }, [toolOrder]);

  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return orderedTools;
    const q = searchQuery.toLowerCase();
    return orderedTools.filter((tool) => {
      return (
        tool.titleEn.toLowerCase().includes(q) ||
        tool.titleKn.includes(q) ||
        tool.subtitleEn.toLowerCase().includes(q) ||
        tool.keywords.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [orderedTools, searchQuery]);

  const moveTool = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    setToolOrder((prev) => {
      if (toIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to save tool order:', e);
      }
      return next;
    });
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(20); } catch {}
    }
  }, []);

  const resetToolOrder = useCallback(() => {
    setToolOrder([...DEFAULT_TOOL_IDS]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([25, 25]); } catch {}
    }
  }, []);

  // Long press timer management for card interactions
  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
  }, []);

  const handleTouchStart = useCallback(() => {
    if (isReordering) return;
    isLongPressTriggeredRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      setIsReordering(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([40, 30, 40]); } catch {}
      }
    }, 450);
  }, [isReordering]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isReordering) return;
    if (!touchStartPosRef.current) {
      const touch = e.touches[0];
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
      return;
    }
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    if (dx > 12 || dy > 12) {
      clearLongPress();
    }
  }, [isReordering, clearLongPress]);

  const handleTouchEnd = useCallback(() => {
    clearLongPress();
  }, [clearLongPress]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isReordering || e.button !== 0) return;
    touchStartPosRef.current = { x: e.clientX, y: e.clientY };
    isLongPressTriggeredRef.current = false;

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      setIsReordering(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(35); } catch {}
      }
    }, 450);
  }, [isReordering]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isReordering || !touchStartPosRef.current) return;
    const dx = Math.abs(e.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(e.clientY - touchStartPosRef.current.y);
    if (dx > 12 || dy > 12) {
      clearLongPress();
    }
  }, [isReordering, clearLongPress]);

  const handleMouseUp = useCallback(() => {
    clearLongPress();
  }, [clearLongPress]);

  const handleCardClick = useCallback((toolId: AppModule) => {
    if (isLongPressTriggeredRef.current) {
      isLongPressTriggeredRef.current = false;
      return;
    }
    if (isReordering) return;
    onNavigate(toolId);
  }, [isReordering, onNavigate]);

  // Touch drag-and-drop while in reordering mode
  const handleReorderTouchStart = useCallback((toolId: AppModule) => {
    if (!isReordering) return;
    setDraggedId(toolId);
    touchDragTargetRef.current = toolId;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(25); } catch {}
    }
  }, [isReordering]);

  const handleReorderTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isReordering || !draggedId) return;
    const touch = e.touches[0];
    if (!touch) return;

    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const cardEl = el?.closest('[data-tool-id]') as HTMLElement | null;
    if (!cardEl) return;

    const targetId = cardEl.getAttribute('data-tool-id') as AppModule | null;
    if (targetId && targetId !== touchDragTargetRef.current) {
      setToolOrder((prev) => {
        const fromIdx = prev.indexOf(draggedId);
        const toIdx = prev.indexOf(targetId);
        if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
          const next = [...prev];
          const [moved] = next.splice(fromIdx, 1);
          next.splice(toIdx, 0, moved);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch {}
          touchDragTargetRef.current = targetId;
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(20); } catch {}
          }
          return next;
        }
        return prev;
      });
    }
  }, [isReordering, draggedId]);

  const handleReorderTouchEnd = useCallback(() => {
    setDraggedId(null);
    touchDragTargetRef.current = null;
  }, []);

  // HTML5 Drag and Drop handlers
  const handleDragStart = useCallback((toolId: AppModule, e: React.DragEvent) => {
    if (!isReordering) return;
    setDraggedId(toolId);
    e.dataTransfer.setData('text/plain', toolId);
    e.dataTransfer.effectAllowed = 'move';
  }, [isReordering]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!isReordering) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, [isReordering]);

  const handleDrop = useCallback((targetId: AppModule, e: React.DragEvent) => {
    if (!isReordering) return;
    e.preventDefault();
    const sourceId = draggedId || (e.dataTransfer.getData('text/plain') as AppModule);
    if (sourceId && sourceId !== targetId) {
      const fromIdx = toolOrder.indexOf(sourceId);
      const toIdx = toolOrder.indexOf(targetId);
      if (fromIdx !== -1 && toIdx !== -1) {
        moveTool(fromIdx, toIdx);
      }
    }
    setDraggedId(null);
  }, [isReordering, draggedId, toolOrder, moveTool]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
  }, []);

  return (
    <div className="space-y-3.5 pb-32 max-w-6xl mx-auto">
      {/* Real-time Search / Filter Bar with Prominent Magnifying Glass Icon */}
      <div className="relative flex items-center">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex items-center pointer-events-none text-slate-400 dark:text-slate-400">
          <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 stroke-[2.5]" />
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            lang === 'kn'
              ? 'ಸಾಧನಗಳನ್ನು ಹುಡುಕಿ (ಉದಾ: Sanka, PDF, Tasks, Notes)...'
              : 'Search tools (e.g. Sanka, PDF, Tasks, Notes)...'
          }
          className="w-full pl-11 pr-14 py-2.5 sm:py-3 rounded-2xl liquid-glass-input liquid-specular text-xs sm:text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 shadow-sm transition-all duration-200"
        />

        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold px-1 py-0.5"
          >
            Clear
          </button>
        )}
      </div>

      {/* Today's Events & Schedule Card (Always Visible on Main Screen Above Fold) */}
      {!searchQuery && (
        <div
          onClick={() => onNavigate('calendar')}
          className="cursor-pointer rounded-2xl p-3 sm:p-3.5 liquid-glass-card liquid-specular border border-sky-500/25 hover:border-sky-500/50 shadow-sm transition-all duration-150 active:scale-[0.98] select-none"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-500 flex items-center justify-center shrink-0 border border-sky-500/20">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    {lang === 'kn' ? 'ಇಂದಿನ ವೇಳಾಪಟ್ಟಿ' : "Today's Schedule"}
                  </span>
                  <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                    • {todayFormatted}
                  </span>
                </div>
                {todayHoliday && (
                  <div className="text-[10.5px] font-bold text-amber-600 dark:text-amber-400 truncate">
                    🎉 {todayHoliday.name}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0 text-xs font-bold text-sky-500">
              <span>{todayEvents.length > 0 ? `${todayEvents.length} ${todayEvents.length === 1 ? 'event' : 'events'}` : (lang === 'kn' ? 'ತೆರೆಯಿರಿ' : 'View')}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Today's Event Pills preview */}
          {todayEvents.length > 0 ? (
            <div className="mt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
              {todayEvents.slice(0, 4).map((evt) => (
                <span
                  key={evt.id}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-black/5 dark:bg-white/10 text-slate-800 dark:text-slate-200 border border-black/5 dark:border-white/10 whitespace-nowrap flex items-center gap-1"
                >
                  {evt.startTime && <span className="text-sky-500 font-mono">{evt.startTime}</span>}
                  <span className="truncate max-w-[120px]">{evt.title}</span>
                </span>
              ))}
              {todayEvents.length > 4 && (
                <span className="text-[10px] font-bold text-slate-400 pl-1">
                  +{todayEvents.length - 4} more
                </span>
              )}
            </div>
          ) : !todayHoliday ? (
            <div className="mt-1 text-[10.5px] text-slate-400 dark:text-slate-500 font-medium">
              {lang === 'kn' ? 'ಇಂದು ಯಾವುದೇ ಕಾರ್ಯಕ್ರಮಗಳಿಲ್ಲ • ಸೇರಿಸಲು ಟ್ಯಾಪ್ ಮಾಡಿ' : 'No events scheduled for today • Tap to add'}
            </div>
          ) : null}
        </div>
      )}

      {/* Reordering Mode Active Bar OR All Tools Header Bar */}
      {isReordering ? (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-primary-500/15 to-purple-500/20 border border-amber-500/40 backdrop-blur-md shadow-md animate-fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/25 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/30">
              <GripVertical className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 truncate">
                <span>{lang === 'kn' ? 'ಸಾಧನಗಳನ್ನು ಮರುಹೊಂದಿಸಿ' : 'Arrange Home Tools'}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  {lang === 'kn' ? 'ಸಕ್ರಿಯ' : 'Active'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {lang === 'kn' ? 'ಕಾರ್ಡ್‌ಗಳನ್ನು ಎಳೆಯಿರಿ ಅಥವಾ ಬಾಣಗಳನ್ನು ಬಳಸಿ' : 'Drag cards or tap arrows to reorder'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={resetToolOrder}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-1 transition-colors"
              title="Reset to default order"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang === 'kn' ? 'ಮರುಹೊಂದಿಸಿ' : 'Reset'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsReordering(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1 shadow-sm transition-all active:scale-95"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.8]" />
              <span>{lang === 'kn' ? 'ಆಯ್ತು' : 'Done'}</span>
            </button>
          </div>
        </div>
      ) : !searchQuery && (
        <div className="flex items-center justify-between px-1 pt-1">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {lang === 'kn' ? 'ಸಾಧನಗಳು' : 'All Tools'}
          </span>
          <button
            type="button"
            onClick={() => {
              setIsReordering(true);
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                try { navigator.vibrate(30); } catch {}
              }
            }}
            className="text-[10.5px] font-semibold text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 flex items-center gap-1 transition-colors py-0.5 px-2 rounded-lg hover:bg-amber-500/10 active:scale-95"
            title="Press and hold any tool card to rearrange"
          >
            <GripVertical className="w-3 h-3" />
            <span>{lang === 'kn' ? 'ಮರುಹೊಂದಿಸಿ' : 'Reorder'}</span>
          </button>
        </div>
      )}

      {/* Expanded Modern Bento Grid: Reorderable with Long-Press or Drag */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {filteredTools.map((tool) => {
          const Icon = tool.icon;
          const title = lang === 'kn' ? tool.titleKn : tool.titleEn;
          const currentIndex = toolOrder.indexOf(tool.id);
          const isCurrentlyDragged = draggedId === tool.id;

          return (
            <div
              key={tool.id}
              data-tool-id={tool.id}
              draggable={isReordering}
              onDragStart={(e) => handleDragStart(tool.id, e)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(tool.id, e)}
              onDragEnd={handleDragEnd}
              onTouchStart={isReordering ? undefined : handleTouchStart}
              onTouchMove={isReordering ? undefined : handleTouchMove}
              onTouchEnd={isReordering ? undefined : handleTouchEnd}
              onMouseDown={isReordering ? undefined : handleMouseDown}
              onMouseMove={isReordering ? undefined : handleMouseMove}
              onMouseUp={isReordering ? undefined : handleMouseUp}
              onClick={() => handleCardClick(tool.id)}
              className={`group select-none rounded-2xl sm:rounded-3xl p-3 sm:p-4 liquid-glass-card liquid-specular transition-all duration-150 transform-gpu flex flex-col justify-between min-h-[92px] sm:min-h-[105px] animate-fade-in relative ${
                isReordering
                  ? 'cursor-grab active:cursor-grabbing border-amber-500/40 bg-amber-500/[0.04] ring-1 ring-amber-500/30 shadow-md'
                  : `cursor-pointer ${tool.borderColor} shadow-sm hover:shadow-xl ${tool.glowColor} hover:-translate-y-0.5 active:scale-[0.97]`
              } ${isCurrentlyDragged ? 'opacity-40 scale-95 ring-2 ring-amber-500' : ''}`}
            >
              {/* Card Header: Icon + Normal Arrow or Reordering Controls */}
              <div className="flex items-center justify-between w-full">
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${tool.iconBg} ${tool.iconColor} flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-100`}
                >
                  <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2]" />
                </div>

                {isReordering ? (
                  <div
                    className="flex items-center gap-1 bg-black/10 dark:bg-white/10 p-0.5 rounded-lg border border-white/10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Shift Left/Up Button */}
                    <button
                      type="button"
                      disabled={currentIndex <= 0}
                      onClick={() => moveTool(currentIndex, currentIndex - 1)}
                      className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-amber-500 disabled:opacity-20 disabled:hover:text-slate-500 transition-colors"
                      title="Move left"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>

                    {/* Drag Handle with touch-none for flawless mobile touch drag */}
                    <div
                      className="touch-none px-0.5 py-0.5 cursor-grab active:cursor-grabbing text-amber-500"
                      onTouchStart={() => handleReorderTouchStart(tool.id)}
                      onTouchMove={handleReorderTouchMove}
                      onTouchEnd={handleReorderTouchEnd}
                      title="Hold and drag to reorder"
                    >
                      <GripVertical className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>

                    {/* Shift Right/Down Button */}
                    <button
                      type="button"
                      disabled={currentIndex >= toolOrder.length - 1}
                      onClick={() => moveTool(currentIndex, currentIndex + 1)}
                      className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-amber-500 disabled:opacity-20 disabled:hover:text-slate-500 transition-colors"
                      title="Move right"
                    >
                      <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                ) : (
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-100" />
                )}
              </div>

              {/* Card Footer: Tool Title & Subtitle */}
              <div className="mt-2 w-full">
                <div className="flex items-center justify-between gap-1">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight group-hover:text-black dark:group-hover:text-white transition-colors break-words">
                    {title}
                  </h3>
                  {isReordering && (
                    <span className="text-[9px] font-mono font-bold text-amber-500/80 px-1 rounded bg-amber-500/10 shrink-0">
                      #{currentIndex + 1}
                    </span>
                  )}
                </div>
                <p className="text-[9.5px] sm:text-[10.5px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                  {lang === 'kn' ? tool.subtitleKn : tool.subtitleEn}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTools.length === 0 && (
        <div className="p-8 text-center text-xs text-slate-400 liquid-glass rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
          No tools found matching "{searchQuery}".
        </div>
      )}
    </div>
  );
});
