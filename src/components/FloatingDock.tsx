import React from 'react';
import {
  LayoutDashboard,
  FileCode,
  FolderArchive,
  StickyNote,
  Clock,
  Calculator,
  Calendar,
  Layers,
  Settings,
  ListTodo,
  Sparkles,
} from 'lucide-react';

export type AppModule =
  | 'dashboard'
  | 'converter'
  | 'files'
  | 'tasks'
  | 'clock'
  | 'notes'
  | 'calc'
  | 'calendar'
  | 'widgets'
  | 'settings'
  | 'recorder'
  | 'compass';

interface FloatingDockProps {
  activeModule: AppModule;
  onSelectModule: (module: AppModule) => void;
  lang: 'en' | 'kn';
  onOpenOrbit?: () => void;
}

export interface DockItem {
  id: AppModule;
  labelEn: string;
  labelKn: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  glowColor: string;
}

export const DOCK_ITEMS: DockItem[] = [
  { id: 'dashboard', labelEn: 'Home', labelKn: 'ಮುಖಪುಟ', icon: LayoutDashboard, color: 'text-indigo-500', glowColor: 'shadow-indigo-500/30' },
  { id: 'converter', labelEn: 'Sanka', labelKn: 'ಸಂಕ', icon: FileCode, color: 'text-blue-500', glowColor: 'shadow-blue-500/30' },
  { id: 'files', labelEn: 'Files', labelKn: 'ಫೈಲ್‌ಗಳು', icon: FolderArchive, color: 'text-rose-500', glowColor: 'shadow-rose-500/30' },
  { id: 'tasks', labelEn: 'Tasks', labelKn: 'ಕಾರ್ಯಗಳು', icon: ListTodo, color: 'text-teal-500', glowColor: 'shadow-teal-500/30' },
  { id: 'clock', labelEn: 'Clock', labelKn: 'ಗಡಿಯಾರ', icon: Clock, color: 'text-amber-500', glowColor: 'shadow-amber-500/30' },
  { id: 'notes', labelEn: 'Notes', labelKn: 'ಟಿಪ್ಪಣಿ', icon: StickyNote, color: 'text-purple-500', glowColor: 'shadow-purple-500/30' },
  { id: 'calc', labelEn: 'Calculator', labelKn: 'ಕ್ಯಾಲ್ಕ್', icon: Calculator, color: 'text-emerald-500', glowColor: 'shadow-emerald-500/30' },
  { id: 'calendar', labelEn: 'Calendar', labelKn: 'ಕ್ಯಾಲೆಂಡರ್', icon: Calendar, color: 'text-sky-500', glowColor: 'shadow-sky-500/30' },
  { id: 'widgets', labelEn: 'Widgets', labelKn: 'ವಿಜೆಟ್', icon: Layers, color: 'text-pink-500', glowColor: 'shadow-pink-500/30' },
  { id: 'settings', labelEn: 'Settings', labelKn: 'ಸೆಟ್ಟಿಂಗ್ಸ್', icon: Settings, color: 'text-slate-400', glowColor: 'shadow-slate-500/30' },
];

export function FloatingDock({ activeModule, onSelectModule, lang, onOpenOrbit }: FloatingDockProps) {
  return (
    <div className="fixed bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-40 w-[96%] max-w-2xl select-none flex items-center justify-center gap-2">
      <nav className="relative flex-1 flex items-center justify-between px-2 sm:px-3 py-1.5 sm:py-2 rounded-3xl liquid-glass-dock liquid-specular overflow-x-auto no-scrollbar gap-1">
        {DOCK_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          const label = lang === 'kn' ? item.labelKn : item.labelEn;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectModule(item.id)}
              className={`relative flex flex-col items-center justify-center min-w-[2.85rem] sm:min-w-[3.4rem] py-1 px-1 rounded-2xl transition-all duration-100 group active:scale-90 ${
                isActive
                  ? 'liquid-glass-accent shadow-sm'
                  : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400'
              }`}
              title={label}
            >
              {/* Active Indicator Glowing Top Dot */}
              {isActive && (
                <span className="absolute -top-1 w-4 h-1 rounded-full bg-white opacity-80 animate-pulse shadow-sm shadow-white" />
              )}

              <div
                className={`p-1 rounded-xl transition-all duration-100 ${
                  isActive
                    ? 'scale-110 -translate-y-0.5 text-white'
                    : `group-hover:scale-105 group-hover:-translate-y-0.5 ${item.color}`
                }`}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>

              <span
                className={`text-[8.5px] sm:text-[9.5px] tracking-tight truncate max-w-[3.2rem] mt-0.5 transition-colors duration-100 ${
                  isActive
                    ? 'font-bold text-white'
                    : 'font-medium text-slate-500 dark:text-slate-400'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* 3D Circular Orbit Switcher Quick Launcher */}
      {onOpenOrbit && (
        <button
          type="button"
          onClick={onOpenOrbit}
          className="p-3 sm:p-3.5 rounded-3xl liquid-glass-accent shadow-lg hover:scale-105 active:scale-90 transition-all duration-100 flex items-center justify-center shrink-0"
          title="3D Circular Orbit Wheel"
          aria-label="3D Orbit"
        >
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
        </button>
      )}
    </div>
  );
}
