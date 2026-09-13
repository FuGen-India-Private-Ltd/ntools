import React, { useState, useEffect } from 'react';
import { Language } from '../lib/i18n';
import {
  checkOverlayPermissionNative,
  requestOverlayPermissionNative,
  checkExactAlarmPermissionNative,
  requestExactAlarmPermissionNative,
} from '../lib/widgetSyncBridge';
import {
  Settings,
  Moon,
  Sun,
  CheckCircle2,
  Sliders,
  Bell,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

interface SettingsPageProps {
  currentLang?: Language;
  onLanguageChange?: (lang: Language) => void;
  isDarkMode: boolean;
  onThemeChange: (dark: boolean) => void;
  defaultTool?: 'converter' | 'pdf';
  onDefaultToolChange?: (tool: 'converter' | 'pdf') => void;
}

export function SettingsPage({
  currentLang,
  onLanguageChange,
  isDarkMode,
  onThemeChange,
  defaultTool,
  onDefaultToolChange,
}: SettingsPageProps) {
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>(() => {
    return (localStorage.getItem('kannada_fontsize') as 'sm' | 'md' | 'lg') || 'md';
  });

  const [savedBadge, setSavedBadge] = useState(false);
  const [overlayGranted, setOverlayGranted] = useState<boolean>(true);
  const [exactAlarmGranted, setExactAlarmGranted] = useState<boolean>(true);

  // User preference toggle for On-Screen Popups (defaults to true)
  const [overlayEnabled, setOverlayEnabled] = useState<boolean>(() => {
    return localStorage.getItem('kannada_onscreen_popups') !== 'false';
  });

  const refreshPermissions = async () => {
    const overlay = await checkOverlayPermissionNative();
    const exact = await checkExactAlarmPermissionNative();
    setOverlayGranted(overlay);
    setExactAlarmGranted(exact);
  };

  useEffect(() => {
    refreshPermissions();
    window.addEventListener('focus', refreshPermissions);
    return () => window.removeEventListener('focus', refreshPermissions);
  }, []);

  const showSavedBadge = () => {
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 2000);
  };

  const handleFontSizeChange = (size: 'sm' | 'md' | 'lg') => {
    setFontSize(size);
    localStorage.setItem('kannada_fontsize', size);
    showSavedBadge();
  };

  const handleToggleOverlay = async () => {
    const nextState = !overlayEnabled;
    setOverlayEnabled(nextState);
    localStorage.setItem('kannada_onscreen_popups', nextState ? 'true' : 'false');
    showSavedBadge();

    if (nextState) {
      if (!overlayGranted) {
        await requestOverlayPermissionNative();
      }
      if (!exactAlarmGranted) {
        await requestExactAlarmPermissionNative();
      }
      refreshPermissions();
    }
  };

  const handleRequestPermissions = async () => {
    await requestOverlayPermissionNative();
    await requestExactAlarmPermissionNative();
    refreshPermissions();
  };

  const handleReset = () => {
    if (window.confirm('Reset all app settings and preferences to default?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-28 select-none animate-fade-in">
      {/* Header */}
      <div className="rounded-3xl p-5 sm:p-6 liquid-glass liquid-specular border border-white/40 dark:border-white/10 flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl liquid-glass-accent flex items-center justify-center font-bold shadow-sm">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
              Settings
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Theme, text size, and alarm popup preferences
            </p>
          </div>
        </div>

        {savedBadge && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-500/30 animate-fade-in">
            <CheckCircle2 className="w-3.5 h-3.5" /> Saved
          </span>
        )}
      </div>

      {/* 1. Appearance Settings */}
      <div className="rounded-3xl liquid-glass-card border border-black/10 dark:border-white/10 p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 pb-2 border-b border-black/5 dark:border-white/10">
          <Sliders className="w-4 h-4 text-indigo-500" />
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            Appearance
          </h3>
        </div>

        {/* Theme Switcher */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block">
              Color Theme
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Switch between Light and Pure OLED Dark mode
            </span>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-2xl liquid-glass-dock border border-black/10 dark:border-white/10">
            <button
              type="button"
              onClick={() => {
                onThemeChange(false);
                showSavedBadge();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                !isDarkMode
                  ? 'liquid-glass-accent shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Light</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onThemeChange(true);
                showSavedBadge();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                isDarkMode
                  ? 'liquid-glass-accent shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark</span>
            </button>
          </div>
        </div>

        {/* Text Size */}
        <div className="flex items-center justify-between gap-4 pt-2 border-t border-black/5 dark:border-white/10">
          <div>
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block">
              Text Size
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Font size in converter and notes
            </span>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-2xl liquid-glass-dock border border-black/10 dark:border-white/10">
            {(['sm', 'md', 'lg'] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => handleFontSizeChange(size)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition capitalize cursor-pointer ${
                  fontSize === size
                    ? 'liquid-glass-accent shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                }`}
              >
                {size === 'sm' ? 'Small' : size === 'md' ? 'Default' : 'Large'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Alarm & On-Screen Pop-ups Settings with Interactive Toggle */}
      <div className="rounded-3xl liquid-glass-card border border-black/10 dark:border-white/10 p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 pb-2 border-b border-black/5 dark:border-white/10">
          <Bell className="w-4 h-4 text-emerald-500" />
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            Alarm &amp; Reminders
          </h3>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                On-Screen Pop-ups
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  overlayEnabled
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                {overlayEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
              Rings directly over locked screen &amp; other apps
            </span>
          </div>

          {/* Interactive Toggle Switch (Sliding Knob) */}
          <button
            type="button"
            role="switch"
            aria-checked={overlayEnabled}
            onClick={handleToggleOverlay}
            className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer flex items-center shrink-0 border focus:outline-none ${
              overlayEnabled
                ? 'bg-emerald-500 border-emerald-600 shadow-inner'
                : 'bg-slate-300 dark:bg-slate-700 border-slate-400/40 dark:border-slate-600'
            }`}
            title={overlayEnabled ? 'Click to Disable On-Screen Popups' : 'Click to Enable On-Screen Popups'}
          >
            <div
              className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out flex items-center justify-center ${
                overlayEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            >
              {overlayEnabled ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-slate-400" />
              )}
            </div>
          </button>
        </div>

        {/* Permission Status & Request Button if Enabled */}
        {overlayEnabled && (!overlayGranted || !exactAlarmGranted) && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-amber-800 dark:text-amber-200 text-[11px] font-medium leading-tight">
                System overlay permission required to show popups over other apps.
              </span>
            </div>
            <button
              type="button"
              onClick={handleRequestPermissions}
              className="px-3 py-1.5 rounded-xl bg-amber-500 text-white font-bold text-xs shadow-sm hover:bg-amber-600 active:scale-95 transition cursor-pointer shrink-0"
            >
              Grant
            </button>
          </div>
        )}

        {overlayEnabled && overlayGranted && exactAlarmGranted && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-[11.5px] font-semibold">
              System permission active. Alarms will pop up smoothly on top of all screens.
            </span>
          </div>
        )}
      </div>

      {/* 3. Reset Settings */}
      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl liquid-glass-btn text-xs font-bold text-rose-500 hover:bg-rose-500/15 transition active:scale-95 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset All Settings</span>
        </button>
      </div>
    </div>
  );
}
