import React from 'react';
import {
  Code2,
  ArrowRightLeft,
  Binary,
  Sparkles,
  Search,
  Globe,
  Sun,
  Moon,
  Languages,
} from 'lucide-react';

export type TabId = 'text-to-unicode' | 'unicode-to-text' | 'ascii-studio' | 'kannada' | 'fancy-text' | 'character-inspector' | 'web-encoders';

interface NavbarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  isDarkMode,
  onToggleTheme,
}) => {
  const tabs = [
    { id: 'text-to-unicode' as TabId, label: 'Text ➔ Unicode', icon: Code2 },
    { id: 'unicode-to-text' as TabId, label: 'Unicode ➔ Text', icon: ArrowRightLeft },
    { id: 'ascii-studio' as TabId, label: 'ASCII Studio', icon: Binary },
    { id: 'kannada' as TabId, label: 'ಕನ್ನಡ (Nudi)', icon: Languages },
    { id: 'fancy-text' as TabId, label: 'Fancy Text', icon: Sparkles },
    { id: 'character-inspector' as TabId, label: 'Inspector', icon: Search },
    { id: 'web-encoders' as TabId, label: 'Web Encoders', icon: Globe },
  ];

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-white/70 dark:bg-black/75 border-b border-black/[0.08] dark:border-white/[0.12] transition-colors shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 border border-white/20">
              <span className="font-mono font-black text-lg tracking-tighter">U⇄A</span>
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Unicode ↔ ASCII <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/30">PRO</span>
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Client-Side Code Point, Byte Inspector & Stylizer
              </p>
            </div>
          </div>

          {/* Desktop Tab Navigation */}
          <nav className="hidden lg:flex items-center gap-1 p-1 rounded-2xl liquid-glass-dock border border-black/10 dark:border-white/15">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'liquid-glass-accent shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Actions & Theme Toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleTheme}
              className="w-10 h-10 rounded-2xl liquid-glass-btn flex items-center justify-center text-slate-700 dark:text-slate-200 transition active:scale-95"
              aria-label="Toggle dark/light mode"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-500" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile / Tablet Horizontal Scrolling Tab Bar */}
      <div className="lg:hidden px-4 pb-2.5 pt-1 overflow-x-auto scrollbar-none flex items-center gap-1.5 border-t border-black/5 dark:border-white/10">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition shrink-0 ${
                isActive
                  ? 'liquid-glass-accent shadow-sm'
                  : 'liquid-glass-card text-black/70 dark:text-white/70'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
