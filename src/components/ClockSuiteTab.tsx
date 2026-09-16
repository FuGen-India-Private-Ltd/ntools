import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  AlarmItem,
  getStoredAlarms,
  saveStoredAlarms,
  formatTimeDigits,
  formatStopwatchTime,
  LapTime,
  formatAlarmTime12h,
  getNextActiveAlarmDetails,
} from '../lib/timeAndClock';
import {
  audioAlerts,
  BUILTIN_ALARM_SOUNDS,
  BuiltinAlarmSound,
} from '../lib/audioAlerts';
import {
  saveCustomAudioTrack,
  getAllCustomAudioTracks,
  CustomAudioTrack,
} from '../lib/customAudioStorage';
import {
  syncAlarmsToNative,
  syncPomodoroToNative,
  checkOverlayPermissionNative,
  requestOverlayPermissionNative,
  checkExactAlarmPermissionNative,
  requestExactAlarmPermissionNative,
  scheduleTimerAlarmToNative,
  cancelTimerAlarmFromNative,
  testAlarmPopupNative,
  requestBatteryOptimizationExemptionNative,
  checkBatteryOptimizationExemptNative,
  openAppDetailsSettingsNative,
} from '../lib/widgetSyncBridge';
import {
  Clock as ClockIcon,
  AlarmClock,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Flag,
  Bell,
  Check,
  X,
  Volume2,
  Globe,
  Moon,
  Zap,
  ChevronDown,
  ChevronUp,
  Music,
  Upload,
  Square,
  Sparkles,
  Target,
  PhoneCall,
  VolumeX,
  ShieldCheck,
} from 'lucide-react';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface WorldCity {
  name: string;
  country: string;
  timeZone: string;
}

const WORLD_CITIES: WorldCity[] = [
  { name: 'Bengaluru / New Delhi', country: 'India', timeZone: 'Asia/Kolkata' },
  { name: 'London', country: 'United Kingdom', timeZone: 'Europe/London' },
  { name: 'New York', country: 'United States', timeZone: 'America/New_York' },
  { name: 'San Francisco', country: 'United States', timeZone: 'America/Los_Angeles' },
  { name: 'Tokyo', country: 'Japan', timeZone: 'Asia/Tokyo' },
  { name: 'Dubai', country: 'UAE', timeZone: 'Asia/Dubai' },
  { name: 'Sydney', country: 'Australia', timeZone: 'Australia/Sydney' },
  { name: 'Paris', country: 'France', timeZone: 'Europe/Paris' },
  { name: 'Singapore', country: 'Singapore', timeZone: 'Asia/Singapore' },
  { name: 'UTC', country: 'Universal Time', timeZone: 'UTC' },
];

export function ClockSuiteTab() {
  const [activeSubTab, setActiveSubTab] = useState<'alarm' | 'world' | 'stopwatch' | 'timer' | 'sleep'>('alarm');
  const [showPermissionBanner, setShowPermissionBanner] = useState<boolean>(() => {
    return localStorage.getItem('bg_alarm_banner_dismissed') !== 'true';
  });
  const [overlayGranted, setOverlayGranted] = useState<boolean>(true);
  const [exactAlarmGranted, setExactAlarmGranted] = useState<boolean>(true);
  const [batteryExempt, setBatteryExempt] = useState<boolean>(true);
  const [testingPopup, setTestingPopup] = useState(false);

  const refreshPermissions = async () => {
    const overlay = await checkOverlayPermissionNative();
    const exact = await checkExactAlarmPermissionNative();
    const exempt = await checkBatteryOptimizationExemptNative();
    setOverlayGranted(overlay);
    setExactAlarmGranted(exact);
    setBatteryExempt(exempt);
  };

  useEffect(() => {
    refreshPermissions();
    window.addEventListener('focus', refreshPermissions);
    window.addEventListener('permissions-updated', refreshPermissions);
    return () => {
      window.removeEventListener('focus', refreshPermissions);
      window.removeEventListener('permissions-updated', refreshPermissions);
    };
  }, []);

  const handleTestPopup = async () => {
    setTestingPopup(true);
    await testAlarmPopupNative();
    window.dispatchEvent(
      new CustomEvent('app-toast', {
        detail: {
          id: `test-popup-${Date.now()}`,
          type: 'info',
          title: '⏰ Test Alarm Scheduled in 1.5s!',
          description: 'Switch to home screen or another app now to see the popup appear on top.',
        },
      })
    );
    setTimeout(() => {
      setTestingPopup(false);
      refreshPermissions();
    }, 3500);
  };

  // --------------------------------------------------------------------------
  // 1. ALARMS STATE
  // --------------------------------------------------------------------------
  const [alarms, setAlarms] = useState<AlarmItem[]>(() => getStoredAlarms());
  const [expandedAlarmId, setExpandedAlarmId] = useState<string | null>(null);
  const [savedTracks, setSavedTracks] = useState<CustomAudioTrack[]>([]);
  const [playingAlarmSoundId, setPlayingAlarmSoundId] = useState<string | null>(null);

  // Add / Edit Modal State
  const [isAddAlarmOpen, setIsAddAlarmOpen] = useState(false);
  const [editingAlarmId, setEditingAlarmId] = useState<string | null>(null);
  const [alarmTime, setAlarmTime] = useState('07:00');
  const [alarmLabel, setAlarmLabel] = useState('');
  const [alarmDays, setAlarmDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [alarmSound, setAlarmSound] = useState<BuiltinAlarmSound>('twin_bell');
  const [customTrackName, setCustomTrackName] = useState<string>('');
  const [customDataUrl, setCustomDataUrl] = useState<string>('');
  const [alarmVibrate, setAlarmVibrate] = useState(true);
  const [alarmSnooze, setAlarmSnooze] = useState(10);
  const [isUploadingMusic, setIsUploadingMusic] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveStoredAlarms(alarms);
    syncAlarmsToNative(alarms);
  }, [alarms]);

  useEffect(() => {
    getAllCustomAudioTracks().then((tracks) => setSavedTracks(tracks));
  }, []);

  // Stop audio on unmount or tab switch
  useEffect(() => {
    return () => {
      audioAlerts.stopCurrentAlarm();
    };
  }, [activeSubTab]);

  const handleToggleAlarm = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAlarms(
      alarms.map((a) => (a.id === id ? { ...a, isEnabled: !a.isEnabled } : a))
    );
  };

  const handleDeleteAlarm = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    audioAlerts.stopCurrentAlarm();
    setPlayingAlarmSoundId(null);
    setAlarms(alarms.filter((a) => a.id !== id));
    if (expandedAlarmId === id) setExpandedAlarmId(null);
  };

  const openAddAlarm = () => {
    audioAlerts.stopCurrentAlarm();
    setPlayingAlarmSoundId(null);
    setEditingAlarmId(null);

    // Automatically initialize with current present time
    const now = new Date();
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    setAlarmTime(`${currentHours}:${currentMinutes}`);

    setAlarmLabel('');
    setAlarmDays([0, 1, 2, 3, 4, 5, 6]);
    setAlarmSound('twin_bell');
    setCustomTrackName('');
    setCustomDataUrl('');
    setAlarmVibrate(true);
    setAlarmSnooze(10);
    setIsAddAlarmOpen(true);
  };

  const openEditAlarm = (alarm: AlarmItem) => {
    audioAlerts.stopCurrentAlarm();
    setPlayingAlarmSoundId(null);
    setEditingAlarmId(alarm.id);
    setAlarmTime(alarm.time);
    setAlarmLabel(alarm.label);
    setAlarmDays(alarm.days);
    setAlarmSound(alarm.soundType || 'twin_bell');
    setCustomTrackName(alarm.customTrackName || '');
    setCustomDataUrl(alarm.customDataUrl || '');
    setAlarmVibrate(alarm.vibrate !== false);
    setAlarmSnooze(alarm.snoozeMinutes || 10);
    setIsAddAlarmOpen(true);
  };

  const handleCustomAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingMusic(true);
      const saved = await saveCustomAudioTrack(file);
      setCustomTrackName(saved.name);
      setCustomDataUrl(saved.dataUrl);
      setAlarmSound('custom_music');
      const all = await getAllCustomAudioTracks();
      setSavedTracks(all);
      // Play brief test of uploaded song
      audioAlerts.playAlarm('custom_music', saved.dataUrl, 'modal-preview');
      setPlayingAlarmSoundId('modal-preview');
    } catch (err) {
      console.warn('Failed to load custom audio file:', err);
    } finally {
      setIsUploadingMusic(false);
    }
  };

  const handleToggleSoundPreview = (soundType: BuiltinAlarmSound, dataUrl?: string, previewId?: string) => {
    const targetId = previewId || soundType;
    if (audioAlerts.isPlaying() && playingAlarmSoundId === targetId) {
      audioAlerts.stopCurrentAlarm();
      setPlayingAlarmSoundId(null);
    } else {
      audioAlerts.playAlarm(soundType, dataUrl || customDataUrl, targetId);
      setPlayingAlarmSoundId(targetId);
    }
  };

  const handleSaveAlarm = (e: React.FormEvent) => {
    e.preventDefault();
    audioAlerts.stopCurrentAlarm();
    setPlayingAlarmSoundId(null);

    if (editingAlarmId) {
      // Update existing alarm
      setAlarms(
        alarms.map((a) =>
          a.id === editingAlarmId
            ? {
                ...a,
                time: alarmTime,
                label: alarmLabel.trim() || 'Alarm',
                days: alarmDays.length > 0 ? alarmDays : [0, 1, 2, 3, 4, 5, 6],
                soundType: alarmSound,
                customTrackName: alarmSound === 'custom_music' ? customTrackName : undefined,
                customDataUrl: alarmSound === 'custom_music' ? customDataUrl : undefined,
                vibrate: alarmVibrate,
                snoozeMinutes: alarmSnooze,
              }
            : a
        )
      );
    } else {
      // Add new alarm
      const item: AlarmItem = {
        id: `alarm-${Date.now()}`,
        time: alarmTime,
        label: alarmLabel.trim() || 'Alarm',
        days: alarmDays.length > 0 ? alarmDays : [0, 1, 2, 3, 4, 5, 6],
        isEnabled: true,
        soundType: alarmSound,
        customTrackName: alarmSound === 'custom_music' ? customTrackName : undefined,
        customDataUrl: alarmSound === 'custom_music' ? customDataUrl : undefined,
        vibrate: alarmVibrate,
        snoozeMinutes: alarmSnooze,
      };
      setAlarms([item, ...alarms]);
    }
    setIsAddAlarmOpen(false);
  };

  const toggleDaySelection = (dayIdx: number) => {
    if (alarmDays.includes(dayIdx)) {
      setAlarmDays(alarmDays.filter((d) => d !== dayIdx));
    } else {
      setAlarmDays([...alarmDays, dayIdx].sort());
    }
  };

  const selectQuickDays = (type: 'all' | 'weekdays' | 'weekends') => {
    if (type === 'all') setAlarmDays([0, 1, 2, 3, 4, 5, 6]);
    else if (type === 'weekdays') setAlarmDays([1, 2, 3, 4, 5]);
    else if (type === 'weekends') setAlarmDays([0, 6]);
  };

  const nextEarliestAlarm = useMemo(() => {
    const enabled = alarms.filter((a) => a.isEnabled);
    if (enabled.length === 0) return null;
    let earliest: { alarm: AlarmItem; details: ReturnType<typeof getNextActiveAlarmDetails> } | null = null;
    for (const a of enabled) {
      const details = getNextActiveAlarmDetails(a);
      if (!earliest || details.diffMs < earliest.details.diffMs) {
        earliest = { alarm: a, details };
      }
    }
    return earliest;
  }, [alarms]);

  const handleQuickNapAlarm = (minutes: number, label: string) => {
    const target = new Date(Date.now() + minutes * 60000);
    const h = target.getHours().toString().padStart(2, '0');
    const m = target.getMinutes().toString().padStart(2, '0');
    const newAlarm: AlarmItem = {
      id: `alarm-nap-${Date.now()}`,
      time: `${h}:${m}`,
      label,
      days: [], // One-off ring
      isEnabled: true,
      soundType: 'digital_siren',
      vibrate: true,
      snoozeMinutes: 5,
    };
    const updated = [newAlarm, ...alarms];
    setAlarms(updated);
    saveStoredAlarms(updated);
    syncAlarmsToNative(updated);
    window.dispatchEvent(
      new CustomEvent('app-toast', {
        detail: {
          id: `nap-${Date.now()}`,
          type: 'success',
          title: `⏰ ${label} Set for ${h}:${m}`,
          description: `Alarm rings in ${minutes} minutes with on-screen pop-up alert.`,
        },
      })
    );
  };

  // --------------------------------------------------------------------------
  // 2. WORLD CLOCK STATE
  // --------------------------------------------------------------------------
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (activeSubTab !== 'world') return;
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [activeSubTab]);

  const formatCityTime = (timeZone: string) => {
    try {
      const timeStr = currentTime.toLocaleTimeString('en-US', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      const dateStr = currentTime.toLocaleDateString('en-US', {
        timeZone,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      return { timeStr, dateStr };
    } catch {
      return { timeStr: '--:--', dateStr: '' };
    }
  };

  // --------------------------------------------------------------------------
  // 3. STOPWATCH STATE
  // --------------------------------------------------------------------------
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
  const [stopwatchElapsedMs, setStopwatchElapsedMs] = useState(0);
  const [laps, setLaps] = useState<LapTime[]>([]);
  const stopwatchStartTimeRef = useRef<number>(0);
  const stopwatchElapsedBeforeRef = useRef<number>(0);
  const stopwatchIntervalRef = useRef<any>(null);

  const startStopwatch = () => {
    setIsStopwatchRunning(true);
    stopwatchStartTimeRef.current = performance.now();
    stopwatchIntervalRef.current = setInterval(() => {
      const now = performance.now();
      const currentDelta = now - stopwatchStartTimeRef.current;
      setStopwatchElapsedMs(stopwatchElapsedBeforeRef.current + currentDelta);
    }, 25);
  };

  const pauseStopwatch = () => {
    setIsStopwatchRunning(false);
    if (stopwatchIntervalRef.current) clearInterval(stopwatchIntervalRef.current);
    stopwatchElapsedBeforeRef.current = stopwatchElapsedMs;
  };

  const resetStopwatch = () => {
    setIsStopwatchRunning(false);
    if (stopwatchIntervalRef.current) clearInterval(stopwatchIntervalRef.current);
    stopwatchElapsedBeforeRef.current = 0;
    setStopwatchElapsedMs(0);
    setLaps([]);
  };

  const recordLap = () => {
    if (!isStopwatchRunning && stopwatchElapsedMs === 0) return;
    const prevTotal = laps.length > 0 ? laps[0].totalTimeMs : 0;
    const lapDuration = stopwatchElapsedMs - prevTotal;
    const newLap: LapTime = {
      lapNumber: laps.length + 1,
      lapDurationMs: lapDuration,
      totalTimeMs: stopwatchElapsedMs,
    };
    setLaps([newLap, ...laps]);
  };

  useEffect(() => {
    return () => {
      if (stopwatchIntervalRef.current) clearInterval(stopwatchIntervalRef.current);
    };
  }, []);

  const swFormatted = formatStopwatchTime(stopwatchElapsedMs);

  // --------------------------------------------------------------------------
  // 4. TIMER STATE
  // --------------------------------------------------------------------------
  const [timerHours, setTimerHours] = useState(0);
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(300);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const timerIntervalRef = useRef<any>(null);

  const startTimer = () => {
    let targetSec = timerSecondsLeft;
    if (!isTimerActive) {
      const totalSec = timerHours * 3600 + timerMinutes * 60 + timerSeconds;
      if (totalSec <= 0) return;
      setTimerSecondsLeft(totalSec);
      setIsTimerActive(true);
      targetSec = totalSec;
    }
    setIsTimerRunning(true);
    scheduleTimerAlarmToNative(targetSec, 'Countdown Timer Finished!', 'countdown_timer');
  };

  const pauseTimer = () => {
    setIsTimerRunning(false);
    cancelTimerAlarmFromNative('countdown_timer');
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setIsTimerActive(false);
    cancelTimerAlarmFromNative('countdown_timer');
    const totalSec = timerHours * 3600 + timerMinutes * 60 + timerSeconds;
    setTimerSecondsLeft(totalSec > 0 ? totalSec : 300);
  };

  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            setIsTimerRunning(false);
            setIsTimerActive(false);
            cancelTimerAlarmFromNative('countdown_timer');
            audioAlerts.playAlarm('digital_siren');
            window.dispatchEvent(
              new CustomEvent('app-toast', {
                detail: {
                  id: `timer-alert-${Date.now()}`,
                  type: 'success',
                  title: '⏰ Timer Finished!',
                  description: 'Your countdown timer has reached zero.',
                },
              })
            );
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning]);

  const displayTimerHours = Math.floor(timerSecondsLeft / 3600);
  const displayTimerMins = Math.floor((timerSecondsLeft % 3600) / 60);
  const displayTimerSecs = timerSecondsLeft % 60;

  // --------------------------------------------------------------------------
  // 4b. FOCUS SESSION & ZEN MODE STATE (Integrated into Timer Tab)
  // --------------------------------------------------------------------------
  const [timerMode, setTimerMode] = useState<'timer' | 'focus'>('timer');
  const [focusDurationMins, setFocusDurationMins] = useState<number>(() => {
    const saved = localStorage.getItem('focus_session_duration_mins');
    return saved ? parseInt(saved, 10) : 25;
  });
  const [focusSecondsLeft, setFocusSecondsLeft] = useState<number>(() => {
    const saved = localStorage.getItem('focus_session_duration_mins');
    const mins = saved ? parseInt(saved, 10) : 25;
    return mins * 60;
  });
  const [isFocusRunning, setIsFocusRunning] = useState<boolean>(false);
  const [isFocusZenOpen, setIsFocusZenOpen] = useState<boolean>(false);
  const [vipCallers, setVipCallers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('focus_vip_callers');
      return saved ? JSON.parse(saved) : ['Mom', 'Emergency'];
    } catch {
      return ['Mom', 'Emergency'];
    }
  });
  const [newCallerInput, setNewCallerInput] = useState<string>('');

  // Handle deep link into Timer / Focus mode (#clock?subtab=timer&mode=focus)
  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash;
      if (hash.includes('subtab=timer')) {
        setActiveSubTab('timer');
      }
      if (hash.includes('mode=focus')) {
        setActiveSubTab('timer');
        setTimerMode('focus');
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  useEffect(() => {
    localStorage.setItem('focus_vip_callers', JSON.stringify(vipCallers));
  }, [vipCallers]);

  useEffect(() => {
    localStorage.setItem('focus_session_duration_mins', focusDurationMins.toString());
  }, [focusDurationMins]);

  useEffect(() => {
    let interval: any;
    if (isFocusRunning) {
      interval = setInterval(() => {
        setFocusSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsFocusRunning(false);
            cancelTimerAlarmFromNative('focus_session');
            syncPomodoroToNative({ secondsLeft: 0, isRunning: false, mode: 'work' });
            audioAlerts.playPomodoroComplete();
            if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
            window.dispatchEvent(
              new CustomEvent('app-toast', {
                detail: {
                  id: `focus-complete-${Date.now()}`,
                  type: 'success',
                  title: '🎉 Focus Session Finished!',
                  description: 'Great job completing your session! Notifications are restored.',
                },
              })
            );
            return 0;
          }
          const next = prev - 1;
          if (next % 15 === 0) {
            syncPomodoroToNative({ secondsLeft: next, isRunning: true, mode: 'work' });
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isFocusRunning]);

  const handleSelectFocusMins = (mins: number) => {
    setFocusDurationMins(mins);
    if (!isFocusRunning) {
      setFocusSecondsLeft(mins * 60);
    }
  };

  const startFocusSession = () => {
    let secs = focusSecondsLeft;
    if (secs <= 0) {
      secs = focusDurationMins * 60;
      setFocusSecondsLeft(secs);
    }
    setIsFocusRunning(true);
    setIsFocusZenOpen(true);
    scheduleTimerAlarmToNative(secs, 'Focus Session Completed!', 'focus_session');
    syncPomodoroToNative({ secondsLeft: secs, isRunning: true, mode: 'work' });
    window.dispatchEvent(
      new CustomEvent('app-toast', {
        detail: {
          id: `focus-start-${Date.now()}`,
          type: 'success',
          title: '🎯 Focus Session Active',
          description: `Notifications silenced. Only ${vipCallers.length} VIP callers allowed.`,
        },
      })
    );
  };

  const pauseFocusSession = () => {
    setIsFocusRunning(false);
    cancelTimerAlarmFromNative('focus_session');
    syncPomodoroToNative({ secondsLeft: focusSecondsLeft, isRunning: false, mode: 'work' });
  };

  const resumeFocusSession = () => {
    setIsFocusRunning(true);
    scheduleTimerAlarmToNative(focusSecondsLeft, 'Focus Session Completed!', 'focus_session');
    syncPomodoroToNative({ secondsLeft: focusSecondsLeft, isRunning: true, mode: 'work' });
  };

  const stopFocusSession = () => {
    setIsFocusRunning(false);
    setIsFocusZenOpen(false);
    cancelTimerAlarmFromNative('focus_session');
    setFocusSecondsLeft(focusDurationMins * 60);
    syncPomodoroToNative({ secondsLeft: focusDurationMins * 60, isRunning: false, mode: 'work' });
  };

  const handleAddVipCaller = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newCallerInput.trim();
    if (!val) return;
    if (!vipCallers.includes(val)) {
      setVipCallers([...vipCallers, val]);
    }
    setNewCallerInput('');
  };

  const handleRemoveVipCaller = (name: string) => {
    setVipCallers(vipCallers.filter((c) => c !== name));
  };

  const focusHours = Math.floor(focusSecondsLeft / 3600);
  const focusMins = Math.floor((focusSecondsLeft % 3600) / 60);
  const focusSecs = focusSecondsLeft % 60;
  const focusTimeStr =
    focusHours > 0
      ? `${formatTimeDigits(focusHours)}:${formatTimeDigits(focusMins)}:${formatTimeDigits(focusSecs)}`
      : `${formatTimeDigits(focusMins)}:${formatTimeDigits(focusSecs)}`;

  // --------------------------------------------------------------------------
  // 5. SLEEP CALCULATOR STATE
  // --------------------------------------------------------------------------
  const [wakeUpTime, setWakeUpTime] = useState('06:30');
  const calculateSleepCycles = (wakeTimeStr: string) => {
    const [h, m] = wakeTimeStr.split(':').map(Number);
    const wakeDate = new Date();
    wakeDate.setHours(h, m, 0, 0);

    const cycles = [6, 5, 4, 3]; // 9h, 7.5h, 6h, 4.5h
    return cycles.map((c) => {
      const sleepDate = new Date(wakeDate.getTime() - (c * 90 + 15) * 60000);
      return {
        cycles: c,
        hours: (c * 1.5).toFixed(1),
        bedtimeStr: sleepDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        isOptimal: c === 5,
      };
    });
  };

  const sleepOptions = calculateSleepCycles(wakeUpTime);

  const requestAllAlarmPermissions = async () => {
    if ('Notification' in window) {
      try {
        await Notification.requestPermission();
      } catch {}
    }
    if (!overlayGranted) {
      await requestOverlayPermissionNative();
    }
    if (!exactAlarmGranted) {
      await requestExactAlarmPermissionNative();
    }
    refreshPermissions();
  };

  return (
    <div className="space-y-4 pb-24 max-w-2xl mx-auto select-none">

      {/* Sub-Tab Navigation Header */}
      <div className="grid grid-cols-5 gap-1 p-1.5 rounded-3xl liquid-glass-dock liquid-specular shadow-sm">
        <button
          type="button"
          onClick={() => setActiveSubTab('alarm')}
          className={`py-2 px-1 rounded-2xl text-[11px] font-bold transition-all duration-100 flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
            activeSubTab === 'alarm'
              ? 'liquid-glass-accent shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/30 dark:hover:bg-slate-800/40'
          }`}
        >
          <AlarmClock className="w-3.5 h-3.5 shrink-0" />
          <span>Alarm</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('world')}
          className={`py-2 px-1 rounded-2xl text-[11px] font-bold transition-all duration-100 flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
            activeSubTab === 'world'
              ? 'liquid-glass-accent shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/30 dark:hover:bg-slate-800/40'
          }`}
        >
          <Globe className="w-3.5 h-3.5 shrink-0" />
          <span>World</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('stopwatch')}
          className={`py-2 px-1 rounded-2xl text-[11px] font-bold transition-all duration-100 flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
            activeSubTab === 'stopwatch'
              ? 'liquid-glass-accent shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/30 dark:hover:bg-slate-800/40'
          }`}
        >
          <ClockIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Stopwatch</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('timer')}
          className={`py-2 px-1 rounded-2xl text-[11px] font-bold transition-all duration-100 flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
            activeSubTab === 'timer'
              ? 'liquid-glass-accent shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/30 dark:hover:bg-slate-800/40'
          }`}
        >
          <Timer className="w-3.5 h-3.5 shrink-0" />
          <span>Timer</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('sleep')}
          className={`py-2 px-1 rounded-2xl text-[11px] font-bold transition-all duration-100 flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
            activeSubTab === 'sleep'
              ? 'liquid-glass-accent shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/30 dark:hover:bg-slate-800/40'
          }`}
        >
          <Moon className="w-3.5 h-3.5 shrink-0" />
          <span>Sleep</span>
        </button>
      </div>

      {/* 1. ALARMS VIEW */}
      {activeSubTab === 'alarm' && (
        <div className="space-y-4 animate-fade-in">
          {/* Hero Next Ringing Alarm Card or Quick Presets Banner */}
          {nextEarliestAlarm ? (
            <div className="p-4 sm:p-5 rounded-3xl liquid-glass liquid-specular border border-black/10 dark:border-white/10 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl liquid-glass-accent text-slate-900 dark:text-slate-100 flex items-center justify-center shadow-sm shrink-0">
                  <AlarmClock className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-black/10 dark:border-white/10">
                      Next Alarm
                    </span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {nextEarliestAlarm.details.isToday ? 'Today' : nextEarliestAlarm.details.isTomorrow ? 'Tomorrow' : 'Scheduled'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-3xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight">
                      {nextEarliestAlarm.details.time12.time}
                    </span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/10 text-slate-800 dark:text-slate-200 border border-black/10 dark:border-white/10">
                      {nextEarliestAlarm.details.time12.period}
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                      • {nextEarliestAlarm.alarm.label || 'Alarm'}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Rings {nextEarliestAlarm.details.text}
                  </p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  ● Scheduled
                </span>
              </div>
            </div>
          ) : null}

          {/* Overnight Reliability & Battery Optimization Banner (Only shown if unexempted) */}
          {!batteryExempt && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-500 shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Ensure Alarms Ring Overnight
                  </h4>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-tight mt-0.5">
                    Allow unrestricted battery &amp; exact alarms so your phone's deep sleep mode doesn't silence morning alarms.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={async () => {
                    await requestBatteryOptimizationExemptionNative();
                    await requestExactAlarmPermissionNative();
                    window.dispatchEvent(new CustomEvent('app-toast', {
                      detail: {
                        id: `opt-${Date.now()}`,
                        type: 'success',
                        title: '⚡ Battery Optimization Settings Opened',
                        description: 'Select "Unrestricted" or "Don\'t optimize" for nTools.',
                      }
                    }));
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold transition active:scale-95 shadow-sm cursor-pointer"
                >
                  Allow Unrestricted
                </button>
              </div>
            </div>
          )}

          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Alarms
              </h3>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-black/10 dark:border-white/10">
                {alarms.filter((a) => a.isEnabled).length} active of {alarms.length}
              </span>
            </div>
            <button
              type="button"
              onClick={openAddAlarm}
              className="px-4 py-2 rounded-2xl liquid-glass-accent text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Alarm</span>
            </button>
          </div>

          {/* Alarm Items List */}
          <div className="space-y-3">
            {alarms.length === 0 ? (
              <div className="text-center py-12 rounded-3xl liquid-glass-card liquid-specular border border-slate-200/60 dark:border-slate-800/60 p-6 space-y-3">
                <AlarmClock className="w-10 h-10 mx-auto text-slate-400 stroke-[1.5]" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Alarms Set</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Tap "+ Add Alarm" or choose a quick nap above to create an alarm with custom music and native pop-up ringing.
                </p>
              </div>
            ) : (
              alarms.map((alarm) => {
                const isExpanded = expandedAlarmId === alarm.id;
                const isThisPlaying = audioAlerts.isPlaying() && playingAlarmSoundId === alarm.id;
                const soundName =
                  alarm.soundType === 'custom_music'
                    ? alarm.customTrackName || 'Custom Song'
                    : BUILTIN_ALARM_SOUNDS.find((s) => s.id === alarm.soundType)?.name || 'Twin Bell Alarm';
                const time12 = formatAlarmTime12h(alarm.time);
                const nextInfo = getNextActiveAlarmDetails(alarm);

                return (
                  <div
                    key={alarm.id}
                    className={`rounded-3xl liquid-glass-card liquid-specular transition-all duration-200 overflow-hidden border ${
                      alarm.isEnabled
                        ? 'border-black/15 dark:border-white/20 shadow-sm'
                        : 'border-white/40 dark:border-white/10 opacity-70'
                    }`}
                  >
                    {/* Collapsed Header Card */}
                    <div
                      onClick={() => setExpandedAlarmId(isExpanded ? null : alarm.id)}
                      className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/20 dark:hover:bg-slate-800/20"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight font-mono">
                            {time12.time}
                          </span>
                          <span
                            className="text-xs font-black px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-black/10 dark:border-white/10"
                          >
                            {time12.period}
                          </span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                            {alarm.label || 'Alarm'}
                          </span>
                        </div>

                        {/* Subtitle Countdown */}
                        <div className="mt-1">
                          {alarm.isEnabled ? (
                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Rings {nextInfo.text} {nextInfo.isTomorrow ? '• Tomorrow' : nextInfo.isToday ? '• Today' : ''}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">
                              Alarm is turned off
                            </span>
                          )}
                        </div>

                        {/* Sound & Schedule Summary */}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[10px]">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-bold border border-black/10 dark:border-white/10">
                            <Music className="w-3 h-3 text-slate-500 dark:text-slate-400 shrink-0" />
                            <span className="truncate max-w-[120px]">{soundName}</span>
                          </span>

                          <div className="flex items-center gap-1">
                            {DAYS_SHORT.map((day, idx) => (
                              <span
                                key={day}
                                className={`font-bold px-1.5 py-0.5 rounded-md ${
                                  alarm.days.includes(idx)
                                    ? 'bg-black/15 dark:bg-white/20 text-slate-900 dark:text-slate-100 border border-black/10 dark:border-white/10'
                                    : 'text-slate-400'
                                }`}
                              >
                                {day[0]}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right Controls: Guaranteed Non-Overflowing Emerald Toggle + Expand */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleToggleAlarm(alarm.id, e)}
                          className={`w-12 h-7 shrink-0 rounded-full transition-all duration-200 relative focus:outline-none cursor-pointer ${
                            alarm.isEnabled
                              ? 'bg-emerald-500 shadow-md shadow-emerald-500/35'
                              : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                          aria-label="Toggle alarm state"
                        >
                          <div
                            className={`w-5.5 h-5.5 rounded-full shadow-md bg-white transition-transform duration-200 absolute top-0.75 left-0.75 ${
                              alarm.isEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>

                        <div className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Detail & Customization Tray */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] space-y-3.5 animate-fade-in">
                        {/* Sound & Live Preview Bar */}
                        <div className="p-3 rounded-2xl liquid-glass-card border border-black/10 dark:border-white/10 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="p-2 rounded-xl bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300 shrink-0">
                              <Volume2 className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                                Alarm Ringtone / Music
                              </span>
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate block">
                                {soundName}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSoundPreview(
                                alarm.soundType || 'twin_bell',
                                alarm.customDataUrl,
                                alarm.id
                              );
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                              isThisPlaying
                                ? 'liquid-glass-accent shadow-md'
                                : 'liquid-glass-btn text-slate-900 dark:text-white shadow-sm'
                            }`}
                          >
                            {isThisPlaying ? (
                              <>
                                <Square className="w-3.5 h-3.5 fill-current" />
                                <span>Stop</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Test Sound</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Attribute Grid */}
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="p-2.5 rounded-2xl liquid-glass-card border border-black/10 dark:border-white/10 text-center">
                            <span className="text-[10px] text-slate-400 font-bold block">Vibration</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                              {alarm.vibrate !== false ? 'Enabled' : 'Off'}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-2xl liquid-glass-card border border-black/10 dark:border-white/10 text-center">
                            <span className="text-[10px] text-slate-400 font-bold block">Snooze</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                              {alarm.snoozeMinutes || 10} Mins
                            </span>
                          </div>

                          <div className="p-2.5 rounded-2xl liquid-glass-card border border-black/10 dark:border-white/10 text-center">
                            <span className="text-[10px] text-slate-400 font-bold block">Schedule</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                              {alarm.days.length === 7
                                ? 'Everyday'
                                : alarm.days.length === 5 && !alarm.days.includes(0) && !alarm.days.includes(6)
                                ? 'Weekdays'
                                : alarm.days.length === 0
                                ? 'One-Time'
                                : `${alarm.days.length} Days`}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons: Edit & Delete */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => openEditAlarm(alarm)}
                            className="flex-1 py-2.5 rounded-2xl liquid-glass-btn hover:text-black dark:hover:text-white text-slate-800 dark:text-slate-200 font-bold text-xs active:scale-95 transition-all cursor-pointer"
                          >
                            Edit Sound &amp; Schedule
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteAlarm(alarm.id, e)}
                            className="px-4 py-2.5 rounded-2xl liquid-glass-btn text-rose-600 hover:bg-rose-500/10 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-sm cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Hidden File Input for Custom Audio Track Selection */}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleCustomAudioUpload}
            className="hidden"
          />

          {/* Add / Edit Alarm Full Customization Modal — Centered, Sleek & Compact */}
          {isAddAlarmOpen && (
            <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-4 animate-fade-in">
              <form
                onSubmit={handleSaveAlarm}
                className="w-full max-w-sm liquid-glass liquid-specular rounded-3xl max-h-[88vh] flex flex-col shadow-2xl border border-white/60 dark:border-white/10 overflow-hidden relative z-[100]"
              >
                {/* Header */}
                <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-black/10 dark:border-white/10 flex items-center justify-between shrink-0">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <AlarmClock className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                    <span>{editingAlarmId ? 'Edit Alarm' : 'Set Alarm'}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      audioAlerts.stopCurrentAlarm();
                      setPlayingAlarmSoundId(null);
                      setIsAddAlarmOpen(false);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Compact Modal Body */}
                <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4 space-y-3.5">
                  {/* Time Picker */}
                  <div className="text-center">
                    <input
                      type="time"
                      value={alarmTime}
                      onChange={(e) => setAlarmTime(e.target.value)}
                      className="w-full text-center text-3xl sm:text-4xl font-mono font-black py-2.5 rounded-2xl liquid-glass-input liquid-specular text-slate-900 dark:text-slate-100 outline-none border border-black/10 dark:border-white/10"
                      required
                    />
                  </div>

                  {/* Alarm Name / Label + Quick Chips */}
                  <div>
                    <input
                      type="text"
                      placeholder="Alarm Name (e.g. Wake Up)"
                      value={alarmLabel}
                      onChange={(e) => setAlarmLabel(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl liquid-glass-input text-xs font-bold text-slate-900 dark:text-slate-100 outline-none border border-black/10 dark:border-white/10 placeholder:text-slate-400"
                    />
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1.5">
                      {['☀️ Wake Up', '📚 Study', '💊 Medicine', '🏃 Workout', '💧 Water', '🌙 Bedtime'].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setAlarmLabel(chip)}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold liquid-glass-btn text-slate-700 dark:text-slate-300 whitespace-nowrap hover:text-black dark:hover:text-white cursor-pointer"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Repeat Days — Quick Selectors + 7 Pills */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5 text-[10.5px] font-bold text-slate-400">
                      <span>Repeat Schedule</span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => selectQuickDays('all')}
                          className="text-[10px] text-slate-600 dark:text-slate-400 hover:underline font-bold cursor-pointer"
                        >
                          All
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => selectQuickDays('weekdays')}
                          className="text-[10px] text-slate-600 dark:text-slate-400 hover:underline font-bold cursor-pointer"
                        >
                          Weekdays
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => selectQuickDays('weekends')}
                          className="text-[10px] text-slate-600 dark:text-slate-400 hover:underline font-bold cursor-pointer"
                        >
                          Weekends
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between gap-1">
                      {DAYS_SHORT.map((day, idx) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDaySelection(idx)}
                          className={`flex-1 py-1.5 rounded-xl text-[10.5px] font-black transition cursor-pointer ${
                            alarmDays.includes(idx)
                              ? 'liquid-glass-accent shadow-sm'
                              : 'liquid-glass-btn text-slate-500'
                          }`}
                        >
                          {day[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ringtone Sound Selection (With Correct Sound IDs) */}
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-400 block mb-1">
                      Alarm Sound &amp; Melody
                    </label>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={alarmSound}
                        onChange={(e) => {
                          const val = e.target.value as BuiltinAlarmSound;
                          setAlarmSound(val);
                          audioAlerts.stopCurrentAlarm();
                          setPlayingAlarmSoundId(null);
                        }}
                        className="flex-1 px-3 py-2 rounded-xl liquid-glass-input text-xs font-bold text-slate-900 dark:text-slate-100 outline-none border border-black/10 dark:border-white/10 cursor-pointer"
                      >
                        {BUILTIN_ALARM_SOUNDS.map((sound) => (
                          <option key={sound.id} value={sound.id}>
                            {sound.id === 'custom_music' && customTrackName
                              ? `🎵 ${customTrackName}`
                              : `${sound.name} (${sound.tag})`}
                          </option>
                        ))}
                      </select>

                      {/* Preview Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (alarmSound === 'custom_music') {
                            if (!customDataUrl) {
                              fileInputRef.current?.click();
                              return;
                            }
                            handleToggleSoundPreview('custom_music', customDataUrl, 'modal-preview');
                          } else {
                            handleToggleSoundPreview(alarmSound, undefined, 'modal-preview');
                          }
                        }}
                        className="p-2 rounded-xl liquid-glass-btn text-slate-900 dark:text-white transition active:scale-95 shrink-0 cursor-pointer"
                        title="Preview sound"
                      >
                        {playingAlarmSoundId === 'modal-preview' ? (
                          <Square className="w-4 h-4 fill-current text-rose-500" />
                        ) : (
                          <Play className="w-4 h-4 fill-current text-slate-700 dark:text-slate-300" />
                        )}
                      </button>

                      {/* Custom Upload Button */}
                      {alarmSound === 'custom_music' && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-2 rounded-xl liquid-glass-btn text-xs font-bold text-slate-800 dark:text-slate-200 shrink-0 cursor-pointer"
                        >
                          {customDataUrl ? 'Change' : 'Upload'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Compact Vibrate & Snooze Settings */}
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setAlarmVibrate(!alarmVibrate)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-between cursor-pointer ${
                        alarmVibrate
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/35 shadow-sm'
                          : 'liquid-glass-btn text-slate-500'
                      }`}
                    >
                      <span>Vibrate</span>
                      <span className="font-black">{alarmVibrate ? 'ON' : 'OFF'}</span>
                    </button>

                    <select
                      value={alarmSnooze}
                      onChange={(e) => setAlarmSnooze(Number(e.target.value))}
                      className="py-2 px-3 rounded-xl liquid-glass-input text-xs font-bold text-slate-900 dark:text-slate-100 outline-none border border-black/10 dark:border-white/10 cursor-pointer"
                    >
                      <option value={5}>Snooze: 5m</option>
                      <option value={10}>Snooze: 10m</option>
                      <option value={15}>Snooze: 15m</option>
                      <option value={20}>Snooze: 20m</option>
                    </select>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-3 sm:p-4 border-t border-black/10 dark:border-white/10 liquid-glass shrink-0 flex gap-2">
                  {editingAlarmId && (
                    <button
                      type="button"
                      onClick={() => {
                        handleDeleteAlarm(editingAlarmId);
                        setIsAddAlarmOpen(false);
                      }}
                      className="p-2.5 rounded-xl liquid-glass-btn text-rose-600 hover:bg-rose-500/15 transition cursor-pointer"
                      title="Delete this alarm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      audioAlerts.stopCurrentAlarm();
                      setPlayingAlarmSoundId(null);
                      setIsAddAlarmOpen(false);
                    }}
                    className="flex-1 py-2.5 rounded-xl liquid-glass-btn text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl liquid-glass-accent text-xs font-black shadow-md transition cursor-pointer"
                  >
                    {editingAlarmId ? 'Save Changes' : 'Save Alarm'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* 2. WORLD CLOCK VIEW */}
      {activeSubTab === 'world' && (
        <div className="space-y-3 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {WORLD_CITIES.map((city) => {
              const { timeStr, dateStr } = formatCityTime(city.timeZone);
              return (
                <div
                  key={city.name}
                  className="p-4 rounded-3xl liquid-glass-card liquid-specular border border-white/60 dark:border-white/10 shadow-sm flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {city.name}
                    </h4>
                    <p className="text-[11px] text-slate-500">{city.country} • {dateStr}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-mono font-black text-slate-900 dark:text-white">
                      {timeStr}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. STOPWATCH VIEW */}
      {activeSubTab === 'stopwatch' && (
        <div className="space-y-5 animate-fade-in text-center">
          <div className="py-8 rounded-3xl liquid-glass-card liquid-specular border border-black/10 dark:border-white/10 shadow-sm">
            <div className="text-5xl sm:text-6xl font-mono font-black tracking-tight text-slate-900 dark:text-slate-100">
              {swFormatted.minutes}:{swFormatted.seconds}
              <span className="text-3xl sm:text-4xl text-slate-500 dark:text-slate-400">.{swFormatted.millis}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            {isStopwatchRunning ? (
              <button
                type="button"
                onClick={pauseStopwatch}
                className="px-8 py-3.5 rounded-2xl liquid-glass-btn text-slate-900 dark:text-white font-bold text-sm shadow-md active:scale-95 transition flex items-center gap-2"
              >
                <Pause className="w-5 h-5" />
                Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={startStopwatch}
                className="px-8 py-3.5 rounded-2xl liquid-glass-accent font-black text-sm shadow-md active:scale-95 transition flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                Start
              </button>
            )}

            <button
              type="button"
              onClick={recordLap}
              disabled={!isStopwatchRunning}
              className="px-5 py-3.5 rounded-2xl liquid-glass-btn text-slate-700 dark:text-slate-300 font-bold text-sm disabled:opacity-40 active:scale-95 transition flex items-center gap-1.5"
            >
              <Flag className="w-4 h-4" />
              Lap
            </button>

            <button
              type="button"
              onClick={resetStopwatch}
              disabled={stopwatchElapsedMs === 0}
              className="p-3.5 rounded-2xl liquid-glass-btn text-slate-700 dark:text-slate-300 disabled:opacity-40 active:scale-95 transition"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          {/* Lap List */}
          {laps.length > 0 && (
            <div className="max-h-60 overflow-y-auto space-y-1.5 text-left pt-2">
              {laps.map((lap) => {
                const lapFormatted = formatStopwatchTime(lap.lapDurationMs);
                return (
                  <div
                    key={lap.lapNumber}
                    className="flex items-center justify-between p-3 rounded-2xl liquid-glass-card text-xs font-mono"
                  >
                    <span className="font-bold text-slate-500">Lap {lap.lapNumber}</span>
                    <span className="font-black text-slate-900 dark:text-slate-100">
                      +{lapFormatted.minutes}:{lapFormatted.seconds}.{lapFormatted.millis}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. TIMER & FOCUS SESSION VIEW */}
      {activeSubTab === 'timer' && (
        <div className="space-y-4 animate-fade-in">
          {/* Sub-Mode Switcher: Countdown Timer vs Focus Session */}
          <div className="flex items-center justify-center p-1 rounded-2xl liquid-glass-dock max-w-xs mx-auto border border-black/10 dark:border-white/10 shadow-sm">
            <button
              type="button"
              onClick={() => setTimerMode('timer')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                timerMode === 'timer'
                  ? 'liquid-glass-accent shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>Countdown</span>
            </button>
            <button
              type="button"
              onClick={() => setTimerMode('focus')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                timerMode === 'focus'
                  ? 'liquid-glass-accent shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Focus Session</span>
            </button>
          </div>

          {/* Active Focus Session Banner (if running and minimized) */}
          {isFocusRunning && !isFocusZenOpen && (
            <div
              onClick={() => setIsFocusZenOpen(true)}
              className="p-3.5 rounded-2xl bg-black text-white border border-white/20 shadow-xl flex items-center justify-between cursor-pointer hover:border-white/40 transition active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <div className="text-left">
                  <span className="text-xs font-black block text-emerald-400">
                    🎯 Focus Session Active • {focusTimeStr} Remaining
                  </span>
                  <span className="text-[10px] text-slate-400">
                    🔕 Notifications Silenced • Tap to open Zen Black Screen
                  </span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-xl bg-white/20 text-xs font-bold shrink-0">
                Open Zen ➔
              </span>
            </div>
          )}

          {/* Mode A: Standard Countdown Timer */}
          {timerMode === 'timer' && (
            <div className="space-y-5 text-center">
              <div className="py-8 rounded-3xl liquid-glass-card liquid-specular border border-black/10 dark:border-white/10 shadow-sm">
                <div className="text-5xl sm:text-6xl font-mono font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {formatTimeDigits(displayTimerHours)}:{formatTimeDigits(displayTimerMins)}:{formatTimeDigits(displayTimerSecs)}
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex justify-center gap-2">
                {[1, 3, 5, 10, 15, 25].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => {
                      setTimerHours(0);
                      setTimerMinutes(mins);
                      setTimerSeconds(0);
                      setTimerSecondsLeft(mins * 60);
                      setIsTimerActive(false);
                      setIsTimerRunning(false);
                    }}
                    className="px-3 py-1.5 rounded-xl liquid-glass-btn text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    {mins}m
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-center gap-3">
                {isTimerRunning ? (
                  <button
                    type="button"
                    onClick={pauseTimer}
                    className="px-8 py-3.5 rounded-2xl liquid-glass-btn text-slate-900 dark:text-white font-bold text-sm shadow-md active:scale-95 transition flex items-center gap-2 cursor-pointer"
                  >
                    <Pause className="w-5 h-5" />
                    Pause
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startTimer}
                    className="px-8 py-3.5 rounded-2xl liquid-glass-accent font-black text-sm shadow-md active:scale-95 transition flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-5 h-5" />
                    Start
                  </button>
                )}

                <button
                  type="button"
                  onClick={resetTimer}
                  className="p-3.5 rounded-2xl liquid-glass-btn text-slate-700 dark:text-slate-300 active:scale-95 transition cursor-pointer"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Mode B: Focus Session (Zen Mode) */}
          {timerMode === 'focus' && (
            <div className="space-y-4 animate-fade-in">
              {/* Focus Duration Centerpiece */}
              <div className="py-8 px-4 rounded-3xl liquid-glass-card liquid-specular border border-black/10 dark:border-white/10 shadow-sm text-center space-y-4">
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  <Target className="w-4 h-4" />
                  <span>Deep Work &amp; Focus Session</span>
                </div>

                <div className="text-6xl sm:text-7xl font-mono font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {focusTimeStr}
                </div>

                {/* Duration Presets */}
                <div className="flex justify-center gap-2 pt-1 flex-wrap">
                  {[15, 25, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => handleSelectFocusMins(mins)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        focusDurationMins === mins
                          ? 'liquid-glass-accent shadow-sm'
                          : 'liquid-glass-btn text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {mins} mins
                    </button>
                  ))}
                </div>

                {/* Main Launch Button: Opens Minimalist Zen Pitch Black Screen */}
                <div className="pt-2 max-w-sm mx-auto">
                  <button
                    type="button"
                    onClick={startFocusSession}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-black text-sm shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2.5 active:scale-95 transition cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start Focus Session (Zen Screen)</span>
                  </button>
                </div>
              </div>

              {/* DND & VIP Callers Protection Card */}
              <div className="p-4 sm:p-5 rounded-3xl liquid-glass-card liquid-specular border border-black/10 dark:border-white/10 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-2 border-b border-black/10 dark:border-white/10 pb-3">
                  <div className="space-y-0.5">
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <VolumeX className="w-4 h-4 text-rose-500" />
                      <span>Do Not Disturb (Silence All Notifications)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      When started, notifications are suppressed. Only specified VIP callers are permitted.
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 text-[10px] font-black uppercase shrink-0">
                    Active
                  </span>
                </div>

                {/* VIP Callers List & Input */}
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    Allowed Important Callers ({vipCallers.length})
                  </span>

                  <div className="flex flex-wrap gap-1.5">
                    {vipCallers.map((caller) => (
                      <span
                        key={caller}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/5 dark:bg-white/10 text-xs font-bold text-slate-800 dark:text-slate-200 border border-black/10 dark:border-white/10"
                      >
                        <PhoneCall className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span>{caller}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveVipCaller(caller)}
                          className="p-0.5 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                          title="Remove caller"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Add VIP Form */}
                  <form onSubmit={handleAddVipCaller} className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={newCallerInput}
                      onChange={(e) => setNewCallerInput(e.target.value)}
                      placeholder="Add contact name or phone number..."
                      className="flex-1 px-3 py-2 rounded-xl liquid-glass-input text-xs font-bold text-slate-900 dark:text-slate-100 outline-none border border-black/10 dark:border-white/10 placeholder:text-slate-400"
                    />
                    <button
                      type="submit"
                      disabled={!newCallerInput.trim()}
                      className="px-4 py-2 rounded-xl liquid-glass-accent text-xs font-bold disabled:opacity-40 transition active:scale-95 cursor-pointer shrink-0"
                    >
                      + Add VIP
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. SLEEP CALCULATOR VIEW */}
      {activeSubTab === 'sleep' && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-4 rounded-3xl liquid-glass-card liquid-specular border border-black/10 dark:border-white/10 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Target Wake-Up Time
                </h4>
                <p className="text-xs text-slate-500">Calculate 90-minute REM sleep cycles</p>
              </div>
              <input
                type="time"
                value={wakeUpTime}
                onChange={(e) => setWakeUpTime(e.target.value)}
                className="px-3 py-1.5 rounded-xl liquid-glass-input font-mono font-bold text-sm outline-none border border-black/10 dark:border-white/10 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Suggested Bedtimes
            </h4>
            {sleepOptions.map((opt) => (
              <div
                key={opt.cycles}
                className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                  opt.isOptimal
                    ? 'liquid-glass-card border-black/20 dark:border-white/30 shadow-md ring-1 ring-black/10 dark:ring-white/20'
                    : 'liquid-glass-card border-black/10 dark:border-white/10'
                }`}
              >
                <div>
                  <div className="text-lg font-mono font-black text-slate-900 dark:text-slate-100">
                    {opt.bedtimeStr}
                  </div>
                  <span className="text-xs text-slate-500">
                    {opt.hours} hours ({opt.cycles} sleep cycles)
                  </span>
                </div>
                {opt.isOptimal && (
                  <span className="px-2.5 py-1 rounded-full liquid-glass-accent text-[10px] font-black uppercase tracking-wider">
                    Recommended
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MINIMALIST ZEN PITCH BLACK OLED SCREEN (User requested: pure black screen with time remaining, pause and stop) */}
      {isFocusZenOpen && (
        <div className="fixed inset-0 z-[250] bg-black text-white flex flex-col items-center justify-between p-6 sm:p-10 select-none animate-fade-in overflow-hidden">
          {/* Top subtle indicator */}
          <div className="w-full flex items-center justify-between text-xs text-slate-400 max-w-md pt-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-bold tracking-wider uppercase text-[11px] text-slate-300">
                Focus Session Active
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              <span>🔕 Notifications Silenced</span>
            </div>
          </div>

          {/* Center: HUGE glowing time remaining */}
          <div className="flex-1 flex flex-col items-center justify-center my-auto">
            <div className="text-7xl sm:text-8xl md:text-9xl font-mono font-black tracking-tight text-white drop-shadow-[0_0_35px_rgba(255,255,255,0.25)]">
              {focusTimeStr}
            </div>
            <div className="mt-4 text-xs sm:text-sm font-semibold text-slate-400 tracking-wide text-center">
              {isFocusRunning ? 'Stay in the zone • Zero distractions' : 'Session Paused'}
            </div>

            {/* Allowed VIP Callers Summary Chip */}
            {vipCallers.length > 0 && (
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-400">
                <PhoneCall className="w-3 h-3 text-emerald-400" />
                <span>Allowed VIP Callers: {vipCallers.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Bottom: Pause and Stop Controls */}
          <div className="w-full max-w-xs flex flex-col items-center gap-3 pb-6">
            <div className="w-full flex items-center justify-center gap-3">
              {isFocusRunning ? (
                <button
                  type="button"
                  onClick={pauseFocusSession}
                  className="flex-1 py-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm transition flex items-center justify-center gap-2 border border-white/15 cursor-pointer active:scale-95"
                >
                  <Pause className="w-5 h-5" />
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resumeFocusSession}
                  className="flex-1 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer active:scale-95"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Resume</span>
                </button>
              )}

              <button
                type="button"
                onClick={stopFocusSession}
                className="flex-1 py-4 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-sm transition flex items-center justify-center gap-2 border border-rose-500/30 cursor-pointer active:scale-95"
              >
                <Square className="w-5 h-5 fill-current" />
                <span>Stop</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsFocusZenOpen(false)}
              className="text-[11px] text-slate-500 hover:text-slate-300 transition py-1 cursor-pointer"
            >
              Minimize &amp; Keep Running in Background
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
