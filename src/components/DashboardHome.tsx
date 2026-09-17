import React, { useState } from 'react';
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
  Sparkles,
} from 'lucide-react';

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
    <div className="space-y-4 pb-32 max-w-6xl mx-auto">
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
          className="w-full pl-11 pr-14 py-3 rounded-2xl liquid-glass-input liquid-specular text-xs sm:text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 shadow-sm transition-all duration-200"
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

      {/* Expanded Modern Bento Grid: Full Tool Names with Staggered Fade-in */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-3.5">
        {filteredTools.map((tool) => {
          const Icon = tool.icon;
          const title = lang === 'kn' ? tool.titleKn : tool.titleEn;

          return (
            <div
              key={tool.id}
              onClick={() => onNavigate(tool.id)}
              className={`group cursor-pointer rounded-3xl p-4 sm:p-5 liquid-glass-card liquid-specular ${tool.borderColor} shadow-sm hover:shadow-2xl ${tool.glowColor} hover:-translate-y-0.5 transition-all duration-100 flex flex-col justify-between min-h-[108px] sm:min-h-[120px] active:scale-[0.97] select-none animate-fade-in`}
            >
              <div className="flex items-center justify-between w-full">
                <div
                  className={`w-10 h-10 rounded-2xl ${tool.iconBg} ${tool.iconColor} flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-100`}
                >
                  <Icon className="w-5 h-5 stroke-[2.2]" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-100" />
              </div>

              <div className="mt-2.5 w-full">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug group-hover:text-black dark:group-hover:text-white transition-colors break-words">
                  {title}
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
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
