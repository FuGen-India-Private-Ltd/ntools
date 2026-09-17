import React, { useState, useEffect, useRef, useTransition, useCallback } from 'react';
import { translations, Language } from './lib/i18n';
import { CircularArcNavigator, AppModule } from './components/CircularArcNavigator';
import { DashboardHome } from './components/DashboardHome';
import { ToastMessage } from './lib/fileDownloader';
import { Capacitor } from '@capacitor/core';
import {
  triggerSyncAllWidgets,
  syncAlarmsToNative,
  checkOverlayPermissionNative,
  requestOverlayPermissionNative,
  checkExactAlarmPermissionNative,
  requestExactAlarmPermissionNative,
  checkBatteryOptimizationExemptNative,
  requestBatteryOptimizationExemptionNative,
  checkAllStartupPermissionsNative,
  requestNotificationPermissionNative,
  requestAudioPermissionNative,
  testAlarmPopupNative,
  dismissAlarmNative,
  snoozeAlarmNative,
  getPendingRouteNative,
  clearPendingRouteNative,
} from './lib/widgetSyncBridge';
import { parseDeepLinkRoute, dispatchRouteFeatureEvents } from './lib/widgetRouting';
import { AlarmItem, getStoredAlarms, saveStoredAlarms } from './lib/timeAndClock';
import { audioAlerts } from './lib/audioAlerts';
import { ActiveAlarmRingingModal } from './components/ActiveAlarmRingingModal';
import { TasksTab } from './components/TasksTab';
import { ClockSuiteTab } from './components/ClockSuiteTab';
import { SmartCalculatorTab } from './components/SmartCalculatorTab';

import { DualPaneConverter } from './components/DualPaneConverter';
import { FilesHubTab } from './components/FilesHubTab';
import { RichNotesTab } from './components/RichNotesTab';
import { CalendarPlannerTab } from './components/CalendarPlannerTab';
import { WidgetStudioTab } from './components/WidgetStudioTab';
import { SettingsPage } from './components/SettingsPage';
import { VoiceRecorderTab } from './components/VoiceRecorderTab';
import { CompassTab } from './components/CompassTab';
import { ArcSliderTutorialModal } from './components/ArcSliderTutorialModal';
import {
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  Zap,
  Play,
  Sparkles,
  AlarmClock,
  Languages,
  FileText,
  StickyNote,
  Calculator,
  Calendar,
  Sliders,
  Settings,
  Mic,
  Compass,
  Bell,
  BatteryCharging,
  Layers,
} from 'lucide-react';
import { getNextActiveAlarmDetails } from './lib/timeAndClock';

const MODULE_METADATA: Record<
  AppModule,
  { titleEn: string; titleKn: string; icon: React.ComponentType<{ className?: string }>; colorClass: string }
> = {
  dashboard: { titleEn: 'Suite Overview', titleKn: 'ಮುಖ್ಯ ಪುಟ', icon: Sparkles, colorClass: 'text-indigo-500' },
  converter: { titleEn: 'Kannada Converter', titleKn: 'ಕನ್ನಡ ಪರಿವರ್ತಕ', icon: Languages, colorClass: 'text-indigo-500' },
  files: { titleEn: 'Files & PDF Studio', titleKn: 'ದಾಖಲೆಗಳು & PDF', icon: FileText, colorClass: 'text-rose-500' },
  tasks: { titleEn: 'Task Planner', titleKn: 'ಕಾರ್ಯ ಯೋಜನೆ', icon: CheckCircle2, colorClass: 'text-teal-500' },
  clock: { titleEn: 'Alarms & Clock', titleKn: 'ಅಲಾರಾಂ & ಗಡಿಯಾರ', icon: AlarmClock, colorClass: 'text-amber-500' },
  notes: { titleEn: 'Notes Studio', titleKn: 'ಟಿಪ್ಪಣಿಗಳು', icon: StickyNote, colorClass: 'text-purple-500' },
  calc: { titleEn: 'Smart Calculator', titleKn: 'ಕ್ಯಾಲ್ಕುಲೇಟರ್', icon: Calculator, colorClass: 'text-emerald-500' },
  calendar: { titleEn: 'Planner & Holidays', titleKn: 'ಕ್ಯಾಲೆಂಡರ್', icon: Calendar, colorClass: 'text-sky-500' },
  widgets: { titleEn: 'Widget Studio', titleKn: 'ವಿಜೆಟ್ ಸ್ಟುಡಿಯೋ', icon: Sliders, colorClass: 'text-pink-500' },
  settings: { titleEn: 'Preferences', titleKn: 'ಸೆಟ್ಟಿಂಗ್ಸ್', icon: Settings, colorClass: 'text-slate-500' },
  recorder: { titleEn: 'Voice Recorder', titleKn: 'ಧ್ವನಿ ರೆಕಾರ್ಡರ್', icon: Mic, colorClass: 'text-rose-500' },
  compass: { titleEn: 'Compass & Level', titleKn: 'ದಿಕ್ಸೂಚಿ & ಮಟ್ಟ', icon: Compass, colorClass: 'text-emerald-500' },
};

const TAB_ORDER: AppModule[] = [
  'dashboard',
  'converter',
  'files',
  'tasks',
  'clock',
  'notes',
  'calc',
  'calendar',
  'widgets',
  'settings',
  'recorder',
  'compass',
];

export function App() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('kannada_lang');
    return saved === 'kn' ? 'kn' : 'en';
  });

  const [slideDirection, setSlideDirection] = useState<'right' | 'left' | 'fade'>('fade');

  const [activeModule, setActiveModule] = useState<AppModule>(() => {
    const raw = window.location.hash.replace(/^#\/?/, '');
    const hash = raw.split('?')[0] as AppModule;
    if (hash && TAB_ORDER.includes(hash)) {
      return hash;
    }
    return 'dashboard';
  });

  const activeModuleRef = useRef(activeModule);
  activeModuleRef.current = activeModule;
  const isInternalNavRef = useRef(false);
  const pendingNavRafRef = useRef<number | null>(null);


  const [, startTransition] = useTransition();

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('kannada_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [defaultTool, setDefaultTool] = useState<'converter' | 'pdf'>(() => {
    const saved = localStorage.getItem('kannada_default_tool');
    return saved === 'pdf' ? 'pdf' : 'converter';
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [activeRingingAlarm, setActiveRingingAlarm] = useState<AlarmItem | null>(null);
  const lastTriggeredMinuteRef = useRef<string>('');

  const [showEntrancePermissionModal, setShowEntrancePermissionModal] = useState<boolean>(false);
  const [hasOverlayPermission, setHasOverlayPermission] = useState<boolean>(true);
  const [hasExactAlarmPermission, setHasExactAlarmPermission] = useState<boolean>(true);
  const [startupPerms, setStartupPerms] = useState<{
    exactAlarm: boolean;
    batteryExempt: boolean;
    overlay: boolean;
    notifications: boolean;
    audioRecord: boolean;
    allEssentialGranted: boolean;
  }>({
    exactAlarm: true,
    batteryExempt: true,
    overlay: true,
    notifications: true,
    audioRecord: true,
    allEssentialGranted: true,
  });
  const [isTestingModalPopup, setIsTestingModalPopup] = useState<boolean>(false);
  const [isDialTutorialOpen, setIsDialTutorialOpen] = useState<boolean>(false);

  // Live active alarm preview for the top navigation bar
  const [activeAlarmPreview, setActiveAlarmPreview] = useState<{
    time: string;
    countdown: string;
    label: string;
  } | null>(null);

  useEffect(() => {
    const updatePreview = () => {
      const stored = getStoredAlarms();
      const enabled = stored.filter((a) => a.isEnabled);
      if (enabled.length === 0) {
        setActiveAlarmPreview(null);
        return;
      }
      let earliest: { alarm: AlarmItem; details: ReturnType<typeof getNextActiveAlarmDetails> } | null = null;
      for (const a of enabled) {
        const details = getNextActiveAlarmDetails(a);
        if (!earliest || details.diffMs < earliest.details.diffMs) {
          earliest = { alarm: a, details };
        }
      }
      if (earliest) {
        setActiveAlarmPreview({
          time: `${earliest.details.time12.time} ${earliest.details.time12.period}`,
          countdown: earliest.details.text,
          label: earliest.alarm.label || 'Alarm',
        });
      } else {
        setActiveAlarmPreview(null);
      }
    };

    updatePreview();
    const interval = setInterval(updatePreview, 25000);
    window.addEventListener('focus', updatePreview);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', updatePreview);
    };
  }, []);

  useEffect(() => {
    const handleRouteString = (rawRoute: string) => {
      const parsed = parseDeepLinkRoute(rawRoute);
      if (parsed.module) {
        setActiveModule(parsed.module);
        dispatchRouteFeatureEvents(parsed);
      }
    };

    // 1. Initial hash route
    handleRouteString(window.location.hash);

    // 2. Cold-launch pending route check from Android MainActivity
    getPendingRouteNative().then((pRoute) => {
      if (pRoute) {
        handleRouteString(pRoute);
        clearPendingRouteNative();
      }
    });

    // 3. Listen to browser hash changes
    const onHashChange = () => {
      handleRouteString(window.location.hash);
    };
    window.addEventListener('hashchange', onHashChange);

    // 4. Listen to native deep-link custom event dispatched by MainActivity
    const onNativeRouteNav = (e: any) => {
      const r = e.detail?.route;
      if (r) handleRouteString(r);
    };
    window.addEventListener('app-route-navigate', onNativeRouteNav);

    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('app-route-navigate', onNativeRouteNav);
    };
  }, []);

  useEffect(() => {
    const checkEntrancePermissions = async () => {
      const perms = await checkAllStartupPermissionsNative();
      setStartupPerms(perms);
      setHasOverlayPermission(perms.overlay);
      setHasExactAlarmPermission(perms.exactAlarm);

      const userDismissed = localStorage.getItem('entrance_permissions_v2_dismissed') === 'true';
      if (!userDismissed && !perms.allEssentialGranted) {
        setShowEntrancePermissionModal(true);
      }
    };

    const timer = setTimeout(checkEntrancePermissions, 300);

    const onFocus = async () => {
      const perms = await checkAllStartupPermissionsNative();
      setStartupPerms(perms);
      setHasOverlayPermission(perms.overlay);
      setHasExactAlarmPermission(perms.exactAlarm);
      if (perms.allEssentialGranted) {
        setShowEntrancePermissionModal(false);
      }
    };

    window.addEventListener('focus', onFocus);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const t = translations[lang];

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('kannada_theme', 'dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Deep linking listener for Android AppWidget shortcut clicks
  useEffect(() => {
    const handleHashChange = () => {
      if (isInternalNavRef.current) return;
      const raw = window.location.hash.replace(/^#\/?/, '');
      const route = raw.split('?')[0] as AppModule;
      if (route && TAB_ORDER.includes(route) && route !== activeModuleRef.current) {
        const currentIdx = TAB_ORDER.indexOf(activeModuleRef.current);
        const newIdx = TAB_ORDER.indexOf(route);
        const dir = currentIdx !== -1 && newIdx !== -1 ? (newIdx > currentIdx ? 'right' : 'left') : 'fade';
        startTransition(() => {
          setSlideDirection(dir);
          setActiveModule(route);
        });
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [startTransition]);

  // Sync widgets on mount
  useEffect(() => {
    triggerSyncAllWidgets();
  }, []);

  // Toast message listener - Fast auto-dismiss (1.6s)
  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<ToastMessage>;
      if (customEvent.detail) {
        setToasts((prev) => [customEvent.detail, ...prev.slice(0, 2)]);
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== customEvent.detail.id));
        }, 1600);
      }
    };
    window.addEventListener('app-toast', handleToast);
    return () => window.removeEventListener('app-toast', handleToast);
  }, []);

  // --------------------------------------------------------------------------
  // Native Android Alarm Bridge Listener (Unifies Native & Web Popups)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handleNativeAlarmStarted = () => {
      // Android native overlay is handling the ringing on screen; stop any duplicate web audio
      audioAlerts.stopCurrentAlarm();
      setActiveRingingAlarm(null);
    };

    const handleNativeAlarmDismissed = () => {
      // Native alarm was dismissed or snoozed on screen; immediately stop audio and dismiss web modal
      audioAlerts.stopCurrentAlarm();
      setActiveRingingAlarm(null);
    };

    window.addEventListener('native-alarm-started', handleNativeAlarmStarted);
    window.addEventListener('native-alarm-dismissed', handleNativeAlarmDismissed);
    return () => {
      window.removeEventListener('native-alarm-started', handleNativeAlarmStarted);
      window.removeEventListener('native-alarm-dismissed', handleNativeAlarmDismissed);
    };
  }, []);

  // --------------------------------------------------------------------------
  // Web Fallback Live Alarm Monitor & Trigger Loop (Only on pure Web / Non-Native)
  // --------------------------------------------------------------------------
  useEffect(() => {
    // On native Android, native AlarmManager and AlarmReceiver handle the alarm wake-up
    if (Capacitor.isNativePlatform()) {
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMins = now.getMinutes().toString().padStart(2, '0');
      const currentDay = now.getDay();
      const currentMinuteKey = `${now.toDateString()}-${currentHours}:${currentMins}`;

      // Check if we've already triggered an alarm in this exact minute
      if (lastTriggeredMinuteRef.current === currentMinuteKey) {
        return;
      }

      const storedAlarms = getStoredAlarms();
      const matchingAlarm = storedAlarms.find(
        (a) =>
          a.isEnabled &&
          a.time === `${currentHours}:${currentMins}` &&
          (a.days.length === 0 || a.days.includes(currentDay))
      );

      if (matchingAlarm) {
        lastTriggeredMinuteRef.current = currentMinuteKey;
        setActiveRingingAlarm(matchingAlarm);

        // Start continuous loud alarm sound & phone vibration
        audioAlerts.playAlarm(
          matchingAlarm.soundType || 'twin_bell',
          matchingAlarm.customDataUrl,
          matchingAlarm.id
        );

        if (matchingAlarm.vibrate !== false && typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate([500, 250, 500, 250, 500, 250, 500]);
          } catch {}
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleDismissAlarm = () => {
    audioAlerts.stopCurrentAlarm();
    setActiveRingingAlarm(null);
    dismissAlarmNative();
    setToasts((prev) => [
      {
        id: `alarm-dismiss-${Date.now()}`,
        type: 'info',
        title: '🔔 Alarm Dismissed',
        description: 'Alarm has been stopped.',
      },
      ...prev,
    ]);
  };

  const handleSnoozeAlarm = (alarm: AlarmItem) => {
    audioAlerts.stopCurrentAlarm();
    setActiveRingingAlarm(null);

    const snoozeMins = alarm.snoozeMinutes || 10;
    snoozeAlarmNative(snoozeMins);

    const now = new Date();
    const snoozeTime = new Date(now.getTime() + snoozeMins * 60000);
    const snoozeHours = snoozeTime.getHours().toString().padStart(2, '0');
    const snoozeMinutes = snoozeTime.getMinutes().toString().padStart(2, '0');

    // Create a one-time snoozed alarm
    const snoozedAlarm: AlarmItem = {
      ...alarm,
      id: `snoozed-${Date.now()}`,
      time: `${snoozeHours}:${snoozeMinutes}`,
      label: `${alarm.label} (Snoozed)`,
      days: [0, 1, 2, 3, 4, 5, 6],
      isEnabled: true,
    };

    const currentAlarms = getStoredAlarms();
    const updatedAlarms = [snoozedAlarm, ...currentAlarms];
    saveStoredAlarms(updatedAlarms);
    syncAlarmsToNative(updatedAlarms);

    setToasts((prev) => [
      {
        id: `alarm-snooze-${Date.now()}`,
        type: 'info',
        title: '⏰ Alarm Snoozed',
        description: `Will ring again in ${snoozeMins} minutes (${snoozeHours}:${snoozeMinutes}).`,
      },
      ...prev,
    ]);
  };

  const handleSelectModule = useCallback((mod: AppModule) => {
    const current = activeModuleRef.current;
    if (mod === current) return;
    const currentIdx = TAB_ORDER.indexOf(current);
    const newIdx = TAB_ORDER.indexOf(mod);
    const dir = currentIdx !== -1 && newIdx !== -1 ? (newIdx > currentIdx ? 'right' : 'left') : 'fade';

    if (pendingNavRafRef.current) {
      cancelAnimationFrame(pendingNavRafRef.current);
    }

    isInternalNavRef.current = true;
    try {
      window.history.replaceState(null, '', '#' + mod);
    } catch (_) {
      window.location.hash = mod;
    }
    setTimeout(() => {
      isInternalNavRef.current = false;
    }, 120);

    // Defer the heavy tab render to the next animation frame so the slider starts its 120 FPS motion instantly
    pendingNavRafRef.current = requestAnimationFrame(() => {
      startTransition(() => {
        setSlideDirection(dir);
        setActiveModule(mod);
      });
    });
  }, [startTransition]);

  // --------------------------------------------------------------------------
  // Android Hardware / Gesture Back Navigation & Double-Tap Exit
  // --------------------------------------------------------------------------
  const lastBackPressRef = useRef<number>(0);

  useEffect(() => {
    (window as any).handleAppBackButton = () => {
      // 1. Close Dial Tutorial modal if open
      if (isDialTutorialOpen) {
        try {
          localStorage.setItem('has_seen_dial_tutorial', 'true');
        } catch (_) {}
        setIsDialTutorialOpen(false);
        return true;
      }

      // 2. Close active ringing alarm modal if open
      if (activeRingingAlarm) {
        setActiveRingingAlarm(null);
        return true;
      }

      // 3. If on any tool / subpage, navigate back to 'dashboard' (Home)
      if (activeModuleRef.current !== 'dashboard') {
        handleSelectModule('dashboard');
        return true;
      }

      // 4. If already on dashboard, check for double-tap to exit within 2000ms
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        return false; // Let Android exit / minimize
      }
      lastBackPressRef.current = now;
      setToasts((prev) => [
        {
          id: `exit-toast-${now}`,
          type: 'info',
          title: lang === 'kn' ? 'ನಿರ್ಗಮಿಸಲು ಮತ್ತೆ ಹಿಂದಕ್ಕೆ ಒತ್ತಿರಿ' : 'Press back again to exit',
          description: '',
        },
        ...prev.slice(0, 1),
      ]);
      return true;
    };
  }, [isDialTutorialOpen, activeRingingAlarm, handleSelectModule, lang]);

  const tabAnimClass =
    slideDirection === 'right'
      ? 'animate-page-slide-right'
      : slideDirection === 'left'
      ? 'animate-page-slide-left'
      : 'animate-tab-switch';

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-black text-[#1d1d1f] dark:text-[#f5f5f7] flex flex-col font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black relative overflow-x-hidden">
      {/* Zero-Overhead Hardware-Accelerated Ambient Light Gradient (Hidden in Dark Mode for Pure OLED Black) */}
      <div
        className="fixed inset-0 pointer-events-none -z-10 select-none dark:hidden opacity-70"
        style={{
          background:
            'radial-gradient(circle at 10% 10%, rgba(99, 102, 241, 0.08) 0%, transparent 45%), radial-gradient(circle at 90% 25%, rgba(245, 158, 11, 0.08) 0%, transparent 45%), radial-gradient(circle at 35% 85%, rgba(16, 185, 129, 0.07) 0%, transparent 45%)',
        }}
      />

      {/* Active Ringing Alarm Overlay Modal (Foreground In-App) */}
      {activeRingingAlarm && (
        <ActiveAlarmRingingModal
          alarm={activeRingingAlarm}
          onDismiss={handleDismissAlarm}
          onSnooze={handleSnoozeAlarm}
        />
      )}

      {/* Onboarding / Entrance Permission Modal for All Required System Access */}
      {showEntrancePermissionModal && (
        <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-md my-auto rounded-3xl liquid-glass liquid-specular border border-white/30 dark:border-white/15 shadow-2xl overflow-hidden p-5 sm:p-6 space-y-4 animate-scale-up max-h-[92vh] flex flex-col">
            <div className="flex items-start justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shadow-lg shrink-0 font-bold">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                    System Permissions
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    Ensure alarms, voice recorder &amp; widgets work reliably
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEntrancePermissionModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed shrink-0">
              For on-time alarms, background audio recording, and uninterrupted widget sync, please grant the following permissions:
            </p>

            <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 min-h-0">
              {/* 1. Exact Alarm Permission */}
              <div className="flex items-center justify-between p-3 rounded-2xl liquid-glass-card border border-white/20 dark:border-white/10">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <AlarmClock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate">
                      Exact Alarms &amp; Wakeups
                    </span>
                    <span className="text-[10.5px] text-slate-500 block truncate">
                      Precise alarms without OS delays
                    </span>
                  </div>
                </div>

                {startupPerms.exactAlarm ? (
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 shrink-0">
                    ✓ Active
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      await requestExactAlarmPermissionNative();
                    }}
                    className="px-3.5 py-1.5 rounded-xl liquid-glass-accent text-xs font-bold active:scale-95 transition shrink-0"
                  >
                    Enable
                  </button>
                )}
              </div>

              {/* 2. Battery Optimization Exemption */}
              <div className="flex items-center justify-between p-3 rounded-2xl liquid-glass-card border border-white/20 dark:border-white/10">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <BatteryCharging className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate">
                      Unrestricted Battery
                    </span>
                    <span className="text-[10.5px] text-slate-500 block truncate">
                      Rings even during Android Doze mode
                    </span>
                  </div>
                </div>

                {startupPerms.batteryExempt ? (
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 shrink-0">
                    ✓ Active
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      await requestBatteryOptimizationExemptionNative();
                    }}
                    className="px-3.5 py-1.5 rounded-xl liquid-glass-accent text-xs font-bold active:scale-95 transition shrink-0"
                  >
                    Enable
                  </button>
                )}
              </div>

              {/* 3. Overlay Permission */}
              <div className="flex items-center justify-between p-3 rounded-2xl liquid-glass-card border border-white/20 dark:border-white/10">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate">
                      Display Over Other Apps
                    </span>
                    <span className="text-[10.5px] text-slate-500 block truncate">
                      Full-screen popup over lock &amp; apps
                    </span>
                  </div>
                </div>

                {startupPerms.overlay ? (
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 shrink-0">
                    ✓ Active
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      await requestOverlayPermissionNative();
                    }}
                    className="px-3.5 py-1.5 rounded-xl liquid-glass-accent text-xs font-bold active:scale-95 transition shrink-0"
                  >
                    Enable
                  </button>
                )}
              </div>

              {/* 4. Notification Permission */}
              <div className="flex items-center justify-between p-3 rounded-2xl liquid-glass-card border border-white/20 dark:border-white/10">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate">
                      Push Notifications
                    </span>
                    <span className="text-[10.5px] text-slate-500 block truncate">
                      Countdown timers &amp; alert banners
                    </span>
                  </div>
                </div>

                {startupPerms.notifications ? (
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 shrink-0">
                    ✓ Active
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      await requestNotificationPermissionNative();
                    }}
                    className="px-3.5 py-1.5 rounded-xl liquid-glass-accent text-xs font-bold active:scale-95 transition shrink-0"
                  >
                    Enable
                  </button>
                )}
              </div>

              {/* 5. Microphone Permission */}
              <div className="flex items-center justify-between p-3 rounded-2xl liquid-glass-card border border-white/20 dark:border-white/10">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate">
                      Microphone Access
                    </span>
                    <span className="text-[10.5px] text-slate-500 block truncate">
                      Voice notes &amp; live waveform visualizer
                    </span>
                  </div>
                </div>

                {startupPerms.audioRecord ? (
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 shrink-0">
                    ✓ Active
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      await requestAudioPermissionNative();
                    }}
                    className="px-3.5 py-1.5 rounded-xl liquid-glass-accent text-xs font-bold active:scale-95 transition shrink-0"
                  >
                    Enable
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 space-y-2 shrink-0">
              <button
                type="button"
                onClick={async () => {
                  setIsTestingModalPopup(true);
                  await testAlarmPopupNative();
                  window.dispatchEvent(
                    new CustomEvent('app-toast', {
                      detail: {
                        id: `modal-test-alarm-${Date.now()}`,
                        type: 'info',
                        title: '⏰ Test Alarm Set for 1.5s!',
                        description: 'Switch to home screen or another app now to see it pop up right on top!',
                      },
                    })
                  );
                  setTimeout(() => setIsTestingModalPopup(false), 3000);
                }}
                disabled={isTestingModalPopup}
                className="w-full py-2.5 rounded-2xl liquid-glass-btn text-slate-900 dark:text-slate-100 text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <Play className="w-4 h-4" />
                <span>{isTestingModalPopup ? 'Firing in 1.5s...' : 'Test On-Screen Pop-up (1.5s)'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('entrance_permissions_v2_dismissed', 'true');
                    setShowEntrancePermissionModal(false);
                  }}
                  className="w-1/2 py-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold transition text-center"
                >
                  Don't Ask Again
                </button>
                <button
                  type="button"
                  onClick={() => setShowEntrancePermissionModal(false)}
                  className="w-1/2 py-2 rounded-xl liquid-glass-accent text-xs font-bold active:scale-95 transition text-center"
                >
                  Continue to App
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Apple Floating Capsule Navigation Island (Curved Pill, Not a Flat Rectangle) */}
      <div className="sticky top-2 sm:top-3 z-40 w-full px-3 sm:px-4 max-w-6xl mx-auto safe-top pointer-events-none">
        <header className="w-full rounded-2xl sm:rounded-full liquid-glass liquid-specular border border-black/10 dark:border-white/15 px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2 shadow-lg shadow-black/5 dark:shadow-black/70 pointer-events-auto transition-all">
          {/* Left: App Logo & Contextual Screen Breadcrumb */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div
              onClick={() => handleSelectModule('dashboard')}
              className="flex items-center gap-2 cursor-pointer select-none active:scale-95 transition-transform shrink-0"
              title="Return to Home Dashboard"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center shrink-0">
                <img
                  src="/ntools-logo.png"
                  alt="nTools"
                  className="w-full h-full object-contain filter drop-shadow-[0_2px_10px_rgba(6,182,212,0.45)]"
                />
              </div>
              <div className="hidden xs:block">
                <h1 className="text-sm font-black tracking-tight leading-none text-slate-900 dark:text-slate-100">
                  nTools
                </h1>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  Liquid Glass
                </span>
              </div>
            </div>

            {/* Contextual Screen Title Badge (Apple Breadcrumb Pill) */}
            {activeModule !== 'dashboard' && (
              <div className="flex items-center gap-1 pl-1.5 sm:pl-2.5 border-l border-black/10 dark:border-white/10 min-w-0">
                <div className="px-2.5 py-1 rounded-xl sm:rounded-full text-xs font-extrabold liquid-glass-card flex items-center gap-1.5 text-slate-800 dark:text-slate-200 border border-white/40 dark:border-white/10 shadow-sm min-w-0">
                  {React.createElement(MODULE_METADATA[activeModule].icon, {
                    className: `w-3.5 h-3.5 shrink-0 ${MODULE_METADATA[activeModule].colorClass}`,
                  })}
                  <span className="truncate max-w-[120px] sm:max-w-none">
                    {lang === 'kn'
                      ? MODULE_METADATA[activeModule].titleKn
                      : MODULE_METADATA[activeModule].titleEn}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Center: Live Active Upcoming Alarm Dynamic Pill */}
          {activeAlarmPreview && (
            <button
              type="button"
              onClick={() => handleSelectModule('clock')}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 rounded-full liquid-glass-card border border-amber-500/35 text-amber-700 dark:text-amber-300 text-[10px] sm:text-xs font-bold transition hover:scale-105 active:scale-95 shadow-sm shrink-0 cursor-pointer"
              title={`Next Alarm: ${activeAlarmPreview.time} (${activeAlarmPreview.countdown}) - Tap to open Clock`}
            >
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <AlarmClock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 shrink-0" />
              <span>{activeAlarmPreview.time}</span>
              <span className="hidden xs:inline opacity-75 font-medium text-[10px] sm:text-[11px]">({activeAlarmPreview.countdown})</span>
            </button>
          )}

          {/* Right: Permission Alert, Language Pill & Theme Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {!hasOverlayPermission && (localStorage.getItem('kannada_onscreen_popups') !== 'false') && (
              <button
                type="button"
                onClick={() => setShowEntrancePermissionModal(true)}
                className="px-2.5 py-1.5 rounded-xl sm:rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/35 text-amber-700 dark:text-amber-300 hover:bg-amber-500 hover:text-white transition flex items-center gap-1.5 active:scale-95 shadow-sm"
                title="Enable On-Screen Popups so alarms ring over other apps"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Pop-ups</span>
              </button>
            )}

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl sm:rounded-full liquid-glass-btn text-slate-700 dark:text-slate-200 transition-colors active:scale-90 cursor-pointer"
              aria-label="Toggle Theme"
              title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-500 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
              )}
            </button>
          </div>
        </header>
      </div>

      {/* Floating Toast Notification Stack — Instant Tap to Dismiss & Fast Exit */}
      <div className="fixed top-16 sm:top-18 left-3 right-3 sm:left-auto sm:right-4 z-50 flex flex-col gap-2 max-w-md w-auto pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="pointer-events-auto p-3.5 rounded-2xl shadow-2xl border border-black/10 dark:border-white/15 flex items-start gap-3 animate-toast-in liquid-glass liquid-specular text-slate-900 dark:text-white cursor-pointer active:scale-95 transition-all select-none"
            title="Tap to dismiss instantly"
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />}

            <div className="flex-1 min-w-0">
              <h4 className="text-xs sm:text-sm font-bold leading-tight">{toast.title}</h4>
              {toast.description && (
                <p className="text-[11.5px] sm:text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed break-words whitespace-normal">
                  {toast.description}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setToasts((prev) => prev.filter((t) => t.id !== toast.id));
              }}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition p-1 shrink-0"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Master Workspace View — Only Active Module Mounted for Minimal DOM & Peak 120 FPS Performance */}
      <main
        className={`flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-6 pt-3 sm:pt-4 ${
          activeModule === 'calc' ? 'py-1 pb-24' : 'pb-36 space-y-4'
        }`}
      >
        <div key={activeModule} className={tabAnimClass}>
          {activeModule === 'dashboard' && (
            <DashboardHome
              lang={lang}
              onNavigate={handleSelectModule}
              onOpenTutorial={() => setIsDialTutorialOpen(true)}
            />
          )}
          {activeModule === 'converter' && <DualPaneConverter t={t} />}
          {activeModule === 'files' && <FilesHubTab />}
          {activeModule === 'tasks' && <TasksTab />}
          {activeModule === 'clock' && <ClockSuiteTab />}
          {activeModule === 'notes' && <RichNotesTab />}
          {activeModule === 'calc' && <SmartCalculatorTab />}
          {activeModule === 'calendar' && <CalendarPlannerTab />}
          {activeModule === 'widgets' && <WidgetStudioTab />}
          {activeModule === 'recorder' && <VoiceRecorderTab />}
          {activeModule === 'compass' && <CompassTab />}
          {activeModule === 'settings' && (
            <SettingsPage
              currentLang={lang}
              onLanguageChange={(l) => {
                setLang(l);
                localStorage.setItem('kannada_lang', l);
              }}
              isDarkMode={isDarkMode}
              onThemeChange={setIsDarkMode}
              defaultTool={defaultTool}
              onDefaultToolChange={(tool) => {
                setDefaultTool(tool);
                localStorage.setItem('kannada_default_tool', tool);
              }}
              onOpenTutorial={() => setIsDialTutorialOpen(true)}
            />
          )}
        </div>
      </main>

      {/* Sleek Low-Profile Circular Arc Navigation Dial */}
      <CircularArcNavigator
        activeModule={activeModule}
        onSelectModule={handleSelectModule}
        lang={lang}
      />

      {/* Arc Slider Interactive Tutorial Modal */}
      <ArcSliderTutorialModal
        isOpen={isDialTutorialOpen}
        onClose={() => {
          try {
            localStorage.setItem('has_seen_dial_tutorial', 'true');
          } catch (_) {}
          setIsDialTutorialOpen(false);
        }}
      />
    </div>
  );
}

export default App;
