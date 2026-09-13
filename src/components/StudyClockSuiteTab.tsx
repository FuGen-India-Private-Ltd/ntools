import React, { useState, useEffect, useRef } from 'react';
import {
  WorldClockCity,
  POPULAR_WORLD_CITIES,
  AlarmItem,
  LapTime,
  PomodoroSettings,
  getStoredAlarms,
  saveStoredAlarms,
  getStoredPomodoroSettings,
  saveStoredPomodoroSettings,
  formatTimeDigits,
  formatStopwatchTime,
} from '../lib/timeAndClock';
import { audioAlerts } from '../lib/audioAlerts';
import { syncPomodoroToNative } from '../lib/widgetSyncBridge';
import {
  Timer,
  Clock,
  AlarmClock,
  Watch,
  Hourglass,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Bell,
  BellOff,
  Flame,
  CheckCircle2,
  Globe,
  Volume2,
  VolumeX,
  Sparkles,
  ChevronRight,
  Zap,
} from 'lucide-react';

export function StudyClockSuiteTab() {
  // --------------------------------------------------------------------------
  // 1. Pomodoro Focus Timer State
  // --------------------------------------------------------------------------
  const [pomoSettings, setPomoSettings] = useState<PomodoroSettings>(() => getStoredPomodoroSettings());
  const [pomoMode, setPomoMode] = useState<'work' | 'shortBreak' | 'longBreak'>('work');
  const [pomoSecondsLeft, setPomoSecondsLeft] = useState<number>(pomoSettings.workMinutes * 60);
  const [isPomoRunning, setIsPomoRunning] = useState<boolean>(false);
  const [completedSessions, setCompletedSessions] = useState<number>(0);

  useEffect(() => {
    saveStoredPomodoroSettings(pomoSettings);
  }, [pomoSettings]);

  // Real-time Android Widget Sync for Pomodoro timer (throttled)
  useEffect(() => {
    syncPomodoroToNative({
      secondsLeft: pomoSecondsLeft,
      isRunning: isPomoRunning,
      mode: pomoMode,
    });
  }, [isPomoRunning, pomoMode]);

  useEffect(() => {
    if (isPomoRunning && pomoSecondsLeft % 30 === 0) {
      syncPomodoroToNative({
        secondsLeft: pomoSecondsLeft,
        isRunning: isPomoRunning,
        mode: pomoMode,
      });
    }
  }, [pomoSecondsLeft, isPomoRunning, pomoMode]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPomoRunning) {
      interval = setInterval(() => {
        setPomoSecondsLeft((prev) => {
          if (prev <= 1) {
            // Switch session
            if (pomoMode === 'work') {
              const nextCount = completedSessions + 1;
              setCompletedSessions(nextCount);
              if (pomoSettings.soundEnabled) audioAlerts.playPomodoroComplete();

              if (nextCount % pomoSettings.sessionsBeforeLongBreak === 0) {
                setPomoMode('longBreak');
                return pomoSettings.longBreakMinutes * 60;
              } else {
                setPomoMode('shortBreak');
                return pomoSettings.shortBreakMinutes * 60;
              }
            } else {
              if (pomoSettings.soundEnabled) audioAlerts.playBreakBell();
              setPomoMode('work');
              return pomoSettings.workMinutes * 60;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPomoRunning, pomoMode, completedSessions, pomoSettings]);

  const handleResetPomodoro = () => {
    setIsPomoRunning(false);
    if (pomoMode === 'work') setPomoSecondsLeft(pomoSettings.workMinutes * 60);
    else if (pomoMode === 'shortBreak') setPomoSecondsLeft(pomoSettings.shortBreakMinutes * 60);
    else setPomoSecondsLeft(pomoSettings.longBreakMinutes * 60);
  };

  const getPomoTotalSeconds = () => {
    if (pomoMode === 'work') return pomoSettings.workMinutes * 60;
    if (pomoMode === 'shortBreak') return pomoSettings.shortBreakMinutes * 60;
    return pomoSettings.longBreakMinutes * 60;
  };

  const totalSecs = getPomoTotalSeconds();
  const elapsedSecs = totalSecs - pomoSecondsLeft;
  const progressRatio = Math.min(1, Math.max(0, elapsedSecs / totalSecs));

  // SVG Circular Ring parameters
  const ringRadius = 110;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = ringCircumference * (1 - progressRatio);

  // --------------------------------------------------------------------------
  // 2. World Clock State
  // --------------------------------------------------------------------------
  const [worldTime, setWorldTime] = useState<Date>(new Date());
  useEffect(() => {
    const t = setInterval(() => setWorldTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // --------------------------------------------------------------------------
  // 3. Stopwatch State
  // --------------------------------------------------------------------------
  const [stopwatchMs, setStopwatchMs] = useState<number>(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState<boolean>(false);
  const [laps, setLaps] = useState<LapTime[]>([]);

  useEffect(() => {
    let animId: number;
    if (isStopwatchRunning) {
      const startTime = performance.now() - stopwatchMs;
      const update = () => {
        setStopwatchMs(performance.now() - startTime);
        animId = requestAnimationFrame(update);
      };
      animId = requestAnimationFrame(update);
    }
    return () => cancelAnimationFrame(animId);
  }, [isStopwatchRunning]);

  const handleLapStopwatch = () => {
    if (!isStopwatchRunning) return;
    const lastLapTotal = laps.length > 0 ? laps[0].totalTimeMs : 0;
    const lapDuration = stopwatchMs - lastLapTotal;
    const newLap: LapTime = {
      lapNumber: laps.length + 1,
      lapDurationMs: lapDuration,
      totalTimeMs: stopwatchMs,
    };
    setLaps([newLap, ...laps]);
  };

  const handleResetStopwatch = () => {
    setIsStopwatchRunning(false);
    setStopwatchMs(0);
    setLaps([]);
  };

  // --------------------------------------------------------------------------
  // 4. Countdown Timer State
  // --------------------------------------------------------------------------
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(300);
  const [timerTotalDuration, setTimerTotalDuration] = useState<number>(300);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  useEffect(() => {
    let timerInt: NodeJS.Timeout;
    if (isTimerRunning) {
      timerInt = setInterval(() => {
        setTimerSecondsLeft((prev) => {
          if (prev <= 1) {
            audioAlerts.playBreakBell();
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerInt);
  }, [isTimerRunning]);

  const handleSetTimerPreset = (secs: number) => {
    setIsTimerRunning(false);
    setTimerTotalDuration(secs);
    setTimerSecondsLeft(secs);
  };

  // --------------------------------------------------------------------------
  // 5. Alarms State
  // --------------------------------------------------------------------------
  const [alarms, setAlarms] = useState<AlarmItem[]>(() => getStoredAlarms());
  const [newAlarmTime, setNewAlarmTime] = useState('07:00');
  const [newAlarmLabel, setNewAlarmLabel] = useState('');

  useEffect(() => {
    saveStoredAlarms(alarms);
  }, [alarms]);

  const handleAddAlarm = () => {
    if (!newAlarmTime) return;
    const newAlarm: AlarmItem = {
      id: `alarm-${Date.now()}`,
      time: newAlarmTime,
      label: newAlarmLabel.trim() || 'Study Session',
      days: [1, 2, 3, 4, 5],
      isEnabled: true,
    };
    setAlarms([...alarms, newAlarm]);
    setNewAlarmLabel('');
  };

  const handleDeleteAlarm = (id: string) => {
    setAlarms(alarms.filter((a) => a.id !== id));
  };

  const handleToggleAlarm = (id: string) => {
    setAlarms(
      alarms.map((a) => (a.id === id ? { ...a, isEnabled: !a.isEnabled } : a))
    );
  };

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto">
      {/* -------------------------------------------------------------------- */}
      {/* 1. TOP GLANCEABLE BAR: Live Local Time & World Clock Chips            */}
      {/* -------------------------------------------------------------------- */}
      <div className="rounded-3xl p-5 liquid-glass-card liquid-specular shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl liquid-glass-accent flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                World Time & Study Suite
              </h2>
              <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
                {worldTime.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 liquid-glass px-3.5 py-1.5 rounded-2xl border border-black/10 dark:border-white/10 text-xs sm:text-sm font-mono font-black text-slate-900 dark:text-white shadow-inner">
            <span className="w-2 h-2 rounded-full bg-slate-950 dark:bg-white animate-pulse mr-1" />
            {worldTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>

        {/* Horizontal World Clock Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-black/10 dark:border-white/10">
          {POPULAR_WORLD_CITIES.slice(0, 4).map((city) => {
            const timeStr = worldTime.toLocaleTimeString('en-US', {
              timeZone: city.timeZone,
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            });

            return (
              <div
                key={city.id}
                className="flex items-center justify-between px-3 py-2 rounded-xl liquid-glass border border-black/10 dark:border-white/10 text-xs"
              >
                <div className="flex items-center gap-1.5 truncate mr-2">
                  <span className="text-sm">{city.flag}</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 truncate">{city.name}</span>
                </div>
                <span className="font-mono font-extrabold text-slate-900 dark:text-white shrink-0">
                  {timeStr}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 2. HERO FOCAL CENTERPIECE: Large Circular Pomodoro Focus Timer       */}
      {/* -------------------------------------------------------------------- */}
      <div className="relative rounded-3xl p-6 sm:p-8 liquid-glass-card liquid-specular shadow-xl flex flex-col items-center justify-center space-y-6 text-center overflow-hidden">
        {/* Mode Selector Pills */}
        <div className="relative z-10 flex items-center gap-1.5 p-1 rounded-2xl liquid-glass border border-black/10 dark:border-white/10 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setIsPomoRunning(false);
              setPomoMode('work');
              setPomoSecondsLeft(pomoSettings.workMinutes * 60);
            }}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition select-none ${
              pomoMode === 'work'
                ? 'liquid-glass-rose shadow-md'
                : 'liquid-glass-btn text-slate-600 dark:text-slate-400'
            }`}
          >
            Focus Session (25m)
          </button>

          <button
            type="button"
            onClick={() => {
              setIsPomoRunning(false);
              setPomoMode('shortBreak');
              setPomoSecondsLeft(pomoSettings.shortBreakMinutes * 60);
            }}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition select-none ${
              pomoMode === 'shortBreak'
                ? 'liquid-glass-emerald shadow-md'
                : 'liquid-glass-btn text-slate-600 dark:text-slate-400'
            }`}
          >
            Short Break (5m)
          </button>

          <button
            type="button"
            onClick={() => {
              setIsPomoRunning(false);
              setPomoMode('longBreak');
              setPomoSecondsLeft(pomoSettings.longBreakMinutes * 60);
            }}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition select-none ${
              pomoMode === 'longBreak'
                ? 'liquid-glass-accent shadow-md'
                : 'liquid-glass-btn text-slate-600 dark:text-slate-400'
            }`}
          >
            Long Break (15m)
          </button>
        </div>

        {/* Large SVG Animated Circular Progress Ring */}
        <div className="relative z-10 w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 260 260">
            {/* Background track circle */}
            <circle
              cx="130"
              cy="130"
              r={ringRadius}
              className="stroke-black/10 dark:stroke-white/15"
              strokeWidth="10"
              fill="transparent"
            />

            {/* Active animated progress ring */}
            <circle
              cx="130"
              cy="130"
              r={ringRadius}
              stroke="currentColor"
              strokeWidth="12"
              strokeDasharray={ringCircumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className={`transition-all duration-1000 ease-linear ${
                pomoMode === 'work'
                  ? 'text-rose-500 drop-shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                  : pomoMode === 'shortBreak'
                  ? 'text-emerald-500 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : 'text-indigo-500 drop-shadow-[0_0_12px_rgba(99,102,241,0.5)]'
              }`}
            />
          </svg>

          {/* Inner Numerals & Status */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center space-y-1">
            <span className="text-5xl sm:text-6xl font-black font-mono tracking-tighter text-slate-900 dark:text-slate-100 drop-shadow-sm">
              {formatTimeDigits(Math.floor(pomoSecondsLeft / 60))}:
              {formatTimeDigits(pomoSecondsLeft % 60)}
            </span>

            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className={`w-2 h-2 rounded-full ${isPomoRunning ? (pomoMode === 'work' ? 'bg-rose-500 animate-ping' : 'bg-emerald-500 animate-ping') : 'bg-slate-400'}`} />
              <span className="capitalize">{pomoMode === 'work' ? 'Deep Work' : 'Break Time'}</span>
            </div>

            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-800 dark:text-slate-200 pt-0.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>{completedSessions} Finished</span>
            </div>
          </div>
        </div>

        {/* Primary Controls */}
        <div className="relative z-10 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPomoRunning(!isPomoRunning)}
            className="px-8 py-3.5 rounded-2xl liquid-glass-accent text-sm font-bold shadow-lg transition active:scale-95 flex items-center gap-2.5"
          >
            {isPomoRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            <span>{isPomoRunning ? 'Pause Focus' : 'Start Focus Session'}</span>
          </button>

          <button
            type="button"
            onClick={handleResetPomodoro}
            className="p-3.5 rounded-2xl liquid-glass-btn text-slate-700 dark:text-slate-300 transition active:scale-95 shadow-sm"
            title="Reset Timer"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 3. SECONDARY SUITE GRID: Stopwatch, Countdown & Alarms                */}
      {/* -------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Stopwatch Card */}
        <div className="rounded-3xl p-5 liquid-glass-card liquid-specular shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <Watch className="w-4 h-4 text-violet-500" />
                Precision Stopwatch
              </h3>
              {isStopwatchRunning && (
                <span className="px-2 py-0.5 rounded-md liquid-glass-accent text-[10px] font-bold shadow-sm">
                  RUNNING
                </span>
              )}
            </div>

            {(() => {
              const time = formatStopwatchTime(stopwatchMs);
              return (
                <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-slate-900 dark:text-slate-100 text-center py-3 liquid-glass rounded-2xl border border-black/10 dark:border-white/10">
                  {time.minutes}:{time.seconds}
                  <span className="text-2xl text-slate-500 font-bold">.{time.millis}</span>
                </div>
              );
            })()}

            {/* Controls */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsStopwatchRunning(!isStopwatchRunning)}
                className="flex-1 py-2.5 rounded-xl liquid-glass-accent text-xs font-bold shadow-md transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                {isStopwatchRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                {isStopwatchRunning ? 'Stop' : 'Start'}
              </button>

              {isStopwatchRunning && (
                <button
                  type="button"
                  onClick={handleLapStopwatch}
                  className="px-4 py-2.5 rounded-xl liquid-glass-btn text-slate-700 dark:text-slate-300 text-xs font-bold transition active:scale-95"
                >
                  Lap
                </button>
              )}

              <button
                type="button"
                onClick={handleResetStopwatch}
                className="p-2.5 rounded-xl liquid-glass-btn text-slate-700 dark:text-slate-300 transition active:scale-95"
                title="Reset Stopwatch"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Laps List */}
          {laps.length > 0 && (
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 border-t border-black/10 dark:border-white/10 pt-2 font-mono text-[11px]">
              {laps.map((lap) => {
                const dur = formatStopwatchTime(lap.lapDurationMs);
                return (
                  <div
                    key={lap.lapNumber}
                    className="flex items-center justify-between p-1.5 rounded-xl liquid-glass border border-black/10 dark:border-white/10"
                  >
                    <span className="text-slate-400 font-bold">Lap {lap.lapNumber}</span>
                    <span className="text-slate-900 dark:text-white font-bold">
                      +{dur.minutes}:{dur.seconds}.{dur.millis}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Countdown & Alarms Card */}
        <div className="rounded-3xl p-5 liquid-glass-card liquid-specular shadow-sm space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <Hourglass className="w-4 h-4 text-slate-900 dark:text-white" />
                Quick Countdown Timer
              </h3>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              {[60, 180, 300, 600, 900, 1800].map((secs) => (
                <button
                  key={secs}
                  type="button"
                  onClick={() => handleSetTimerPreset(secs)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                    timerTotalDuration === secs
                      ? 'liquid-glass-accent shadow-sm'
                      : 'liquid-glass-btn text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {secs / 60}m
                </button>
              ))}
            </div>

            <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-slate-100 text-center py-2 liquid-glass rounded-2xl border border-black/10 dark:border-white/10">
              {formatTimeDigits(Math.floor(timerSecondsLeft / 60))}:
              {formatTimeDigits(timerSecondsLeft % 60)}
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="flex-1 py-2 rounded-xl liquid-glass-accent text-xs font-bold shadow-md transition active:scale-95"
              >
                {isTimerRunning ? 'Pause' : 'Start Timer'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsTimerRunning(false);
                  setTimerSecondsLeft(timerTotalDuration);
                }}
                className="p-2 rounded-xl liquid-glass-btn text-slate-700 dark:text-slate-300"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mini Alarms Strip */}
          <div className="border-t border-black/10 dark:border-white/10 pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <AlarmClock className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
                Alarms ({alarms.length})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="time"
                value={newAlarmTime}
                onChange={(e) => setNewAlarmTime(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl liquid-glass-input text-xs font-bold text-slate-900 dark:text-slate-100 outline-none"
              />
              <input
                type="text"
                value={newAlarmLabel}
                onChange={(e) => setNewAlarmLabel(e.target.value)}
                placeholder="Alarm note..."
                className="flex-1 px-2.5 py-1.5 rounded-xl liquid-glass-input text-xs text-slate-900 dark:text-slate-100 outline-none"
              />
              <button
                type="button"
                onClick={handleAddAlarm}
                className="p-1.5 rounded-xl liquid-glass-accent font-bold text-xs shadow-sm"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
              {alarms.map((al) => (
                <div
                  key={al.id}
                  className="flex items-center justify-between p-2 rounded-xl liquid-glass border border-black/10 dark:border-white/10 text-xs"
                >
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{al.time} • {al.label}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleAlarm(al.id)}
                      className={`p-1 rounded-lg ${al.isEnabled ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-400'}`}
                    >
                      {al.isEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAlarm(al.id)}
                      className="p-1 text-slate-400 hover:text-black dark:hover:text-white"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
