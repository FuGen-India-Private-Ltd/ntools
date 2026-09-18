import React, { useState, useMemo } from 'react';
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
    subtitleKn: 'ನುಡಿ, ಬರಹ, ಶ್ರೀ-ಲಿಪಿ ಯುುನಿಕೋಡ್ ಪರಿವರ್ತಕ',
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

export const DashboardHome = React.memo(function DashboardHome({
  onNavigate,
  lang,
  onOpenTutorial,
}: DashboardHomeProps) {
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredTools = TOOLS_LIST.filter((tool) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      tool.titleEn.toLowerCase().includes(q) ||
      tool.titleKn.includes(q) ||
      tool.subtitleEn.toLowerCase().includes(q) ||
      tool.keywords.some((k) => k.toLowerCase().includes(q))
    );
  });

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

      {/* Expanded Modern Bento Grid: Full Tool Names with Staggered Fade-in */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {filteredTools.map((tool) => {
          const Icon = tool.icon;
          const title = lang === 'kn' ? tool.titleKn : tool.titleEn;

          return (
            <div
              key={tool.id}
              onClick={() => onNavigate(tool.id)}
              className={`group cursor-pointer rounded-2xl sm:rounded-3xl p-3 sm:p-4 liquid-glass-card liquid-specular ${tool.borderColor} shadow-sm hover:shadow-xl ${tool.glowColor} hover:-translate-y-0.5 transition-all duration-100 flex flex-col justify-between min-h-[92px] sm:min-h-[105px] active:scale-[0.97] select-none animate-fade-in`}
            >
              <div className="flex items-center justify-between w-full">
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${tool.iconBg} ${tool.iconColor} flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-100`}
                >
                  <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2]" />
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-100" />
              </div>

              <div className="mt-2 w-full">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight group-hover:text-black dark:group-hover:text-white transition-colors break-words">
                  {title}
                </h3>
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
