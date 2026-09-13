// Time, Clock, Alarms, Stopwatch & Pomodoro Study Hub Engine

export interface WorldClockCity {
  id: string;
  name: string;
  country: string;
  timeZone: string;
  flag: string;
}

export const POPULAR_WORLD_CITIES: WorldClockCity[] = [
  { id: 'bengaluru', name: 'Bengaluru / IST', country: 'India', timeZone: 'Asia/Kolkata', flag: '🇮🇳' },
  { id: 'utc', name: 'UTC / GMT', country: 'Universal', timeZone: 'UTC', flag: '🌐' },
  { id: 'london', name: 'London', country: 'United Kingdom', timeZone: 'Europe/London', flag: '🇬🇧' },
  { id: 'newyork', name: 'New York', country: 'United States (EST)', timeZone: 'America/New_York', flag: '🇺🇸' },
  { id: 'sanfrancisco', name: 'San Francisco', country: 'United States (PST)', timeZone: 'America/Los_Angeles', flag: '🇺🇸' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', timeZone: 'Asia/Tokyo', flag: '🇯🇵' },
  { id: 'dubai', name: 'Dubai', country: 'United Arab Emirates', timeZone: 'Asia/Dubai', flag: '🇦🇪' },
  { id: 'sydney', name: 'Sydney', country: 'Australia', timeZone: 'Australia/Sydney', flag: '🇦🇺' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', timeZone: 'Asia/Singapore', flag: '🇸🇬' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', timeZone: 'Europe/Berlin', flag: '🇩🇪' },
];

export type AlarmMissionType = 'none' | 'math' | 'shake' | 'memory';

import { BuiltinAlarmSound } from './audioAlerts';

export interface AlarmItem {
  id: string;
  time: string; // "07:30"
  label: string;
  days: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  isEnabled: boolean;
  soundType?: BuiltinAlarmSound;
  customTrackName?: string;
  customDataUrl?: string;
  vibrate?: boolean;
  snoozeMinutes?: number;
  snoozeCount?: number;
  missionType?: AlarmMissionType;
  missionDifficulty?: 'easy' | 'medium' | 'hard';
  gentleWakeup?: boolean;
}

export interface MultiTimerItem {
  id: string;
  label: string;
  totalSeconds: number;
  secondsLeft: number;
  isRunning: boolean;
}

export interface LapTime {
  lapNumber: number;
  lapDurationMs: number;
  totalTimeMs: number;
}

export interface PomodoroSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
  autoStartBreaks: boolean;
  soundEnabled: boolean;
}

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  autoStartBreaks: true,
  soundEnabled: true,
};

const ALARMS_STORAGE_KEY = 'app_clock_alarms_v1';
const POMO_SETTINGS_KEY = 'app_pomodoro_settings_v1';
const MULTI_TIMERS_STORAGE_KEY = 'app_multi_timers_v1';

export function getStoredAlarms(): AlarmItem[] {
  try {
    const raw = localStorage.getItem(ALARMS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredAlarms(alarms: AlarmItem[]) {
  try {
    localStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(alarms));
  } catch (e) {
    console.error('Failed to save alarms', e);
  }
}

export function getStoredPomodoroSettings(): PomodoroSettings {
  try {
    const raw = localStorage.getItem(POMO_SETTINGS_KEY);
    return raw ? { ...DEFAULT_POMODORO_SETTINGS, ...JSON.parse(raw) } : DEFAULT_POMODORO_SETTINGS;
  } catch {
    return DEFAULT_POMODORO_SETTINGS;
  }
}

export function saveStoredPomodoroSettings(settings: PomodoroSettings) {
  try {
    localStorage.setItem(POMO_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save pomodoro settings', e);
  }
}

export function getStoredMultiTimers(): MultiTimerItem[] {
  try {
    const raw = localStorage.getItem(MULTI_TIMERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredMultiTimers(timers: MultiTimerItem[]) {
  try {
    localStorage.setItem(MULTI_TIMERS_STORAGE_KEY, JSON.stringify(timers));
  } catch (e) {
    console.error('Failed to save multi-timers', e);
  }
}

export function formatTimeDigits(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

export function formatStopwatchTime(ms: number): {
  minutes: string;
  seconds: string;
  millis: string;
  main: string;
  ms: string;
} {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hundredths = Math.floor((ms % 1000) / 10);

  const minStr = formatTimeDigits(minutes);
  const secStr = formatTimeDigits(seconds);
  const msStr = formatTimeDigits(hundredths);

  return {
    minutes: minStr,
    seconds: secStr,
    millis: msStr,
    main: `${minStr}:${secStr}`,
    ms: msStr,
  };
}

/**
 * Calculates countdown string to the next ringing alarm. E.g. "Rings in 6h 24m"
 */
export function getCountdownToAlarm(alarmTime: string): string {
  const [targetH, targetM] = alarmTime.split(':').map(Number);
  const now = new Date();
  const currentH = now.getHours();
  const currentM = now.getMinutes();

  let diffMinutes = targetH * 60 + targetM - (currentH * 60 + currentM);
  if (diffMinutes <= 0) {
    diffMinutes += 24 * 60; // Scheduled for tomorrow
  }

  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;

  if (hours === 0) {
    return `Rings in ${mins}m`;
  }
  return `Rings in ${hours}h ${mins}m`;
}

export interface SleepCycleOption {
  wakeTime: string;
  cycles: number;
  totalHours: string;
  tag: string;
  quality: 'Optimal' | 'Great' | 'Good' | 'Minimum';
}

/**
 * Calculates recommended wake-up times based on 90-minute REM sleep cycles (allowing 14 min to fall asleep).
 */
export function calculateSleepCycles(sleepTime = new Date()): SleepCycleOption[] {
  const startMs = sleepTime.getTime() + 14 * 60 * 1000; // 14 mins to fall asleep
  const cycleMinutes = 90;
  const results: SleepCycleOption[] = [];

  const configs: { cycles: number; tag: string; quality: SleepCycleOption['quality'] }[] = [
    { cycles: 6, tag: '9 Hours (Ultimate Energy)', quality: 'Optimal' },
    { cycles: 5, tag: '7.5 Hours (Recommended)', quality: 'Great' },
    { cycles: 4, tag: '6 Hours (Sufficient)', quality: 'Good' },
    { cycles: 3, tag: '4.5 Hours (Power Sleep)', quality: 'Minimum' },
  ];

  for (const c of configs) {
    const wakeMs = startMs + c.cycles * cycleMinutes * 60 * 1000;
    const wakeDate = new Date(wakeMs);
    const hours = formatTimeDigits(wakeDate.getHours());
    const mins = formatTimeDigits(wakeDate.getMinutes());
    results.push({
      wakeTime: `${hours}:${mins}`,
      cycles: c.cycles,
      totalHours: `${(c.cycles * 1.5).toFixed(1)} hrs`,
      tag: c.tag,
      quality: c.quality,
    });
  }

  return results;
}

/**
 * Formats a 24-hour time string ("14:30") to 12-hour format ("02:30", "PM")
 */
export function formatAlarmTime12h(time24: string): { time: string; period: 'AM' | 'PM' } {
  if (!time24 || !time24.includes(':')) {
    return { time: '12:00', period: 'AM' };
  }
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10) || 0;
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return {
    time: `${h12.toString().padStart(2, '0')}:${(mStr || '00').padStart(2, '0')}`,
    period,
  };
}

/**
 * Calculates the next occurrence and countdown details for an alarm
 */
export function getNextActiveAlarmDetails(alarm: AlarmItem): {
  diffMs: number;
  text: string;
  isToday: boolean;
  isTomorrow: boolean;
  time12: { time: string; period: 'AM' | 'PM' };
} {
  const [hStr, mStr] = (alarm.time || '07:00').split(':');
  const hours = parseInt(hStr, 10) || 0;
  const minutes = parseInt(mStr, 10) || 0;
  const now = new Date();

  let nextDate = new Date();
  nextDate.setHours(hours, minutes, 0, 0);

  const days = Array.isArray(alarm.days) ? alarm.days : [];

  if (days.length === 0) {
    if (nextDate.getTime() <= now.getTime()) {
      nextDate.setDate(nextDate.getDate() + 1);
    }
  } else {
    let daysAhead = 0;
    let found = false;
    while (daysAhead < 7) {
      const checkDate = new Date(now);
      checkDate.setDate(now.getDate() + daysAhead);
      checkDate.setHours(hours, minutes, 0, 0);

      const checkDay = checkDate.getDay();
      if (days.includes(checkDay) && checkDate.getTime() > now.getTime()) {
        nextDate = checkDate;
        found = true;
        break;
      }
      daysAhead++;
    }
    if (!found) {
      nextDate.setDate(nextDate.getDate() + 7);
    }
  }

  const diffMs = Math.max(0, nextDate.getTime() - now.getTime());
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const remainingMins = diffMins % 60;

  let text = '';
  if (diffHours > 0) {
    text = `in ${diffHours}h ${remainingMins}m`;
  } else if (remainingMins > 0) {
    text = `in ${remainingMins}m`;
  } else {
    text = 'in < 1m';
  }

  const isToday = nextDate.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = nextDate.toDateString() === tomorrow.toDateString();

  return {
    diffMs,
    text,
    isToday,
    isTomorrow,
    time12: formatAlarmTime12h(alarm.time),
  };
}
