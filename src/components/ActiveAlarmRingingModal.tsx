import React, { useState, useEffect, useRef } from 'react';
import { AlarmItem } from '../lib/timeAndClock';
import { audioAlerts, BUILTIN_ALARM_SOUNDS } from '../lib/audioAlerts';
import {
  AlarmClock,
  Timer,
  Music,
  Brain,
  Smartphone,
  ChevronRight,
  AlarmClockOff,
} from 'lucide-react';

interface ActiveAlarmRingingModalProps {
  alarm: AlarmItem | null;
  onDismiss: () => void;
  onSnooze: (alarm: AlarmItem) => void;
}

export function ActiveAlarmRingingModal({
  alarm,
  onDismiss,
  onSnooze,
}: ActiveAlarmRingingModalProps) {
  if (!alarm) return null;

  // Math mission state
  const [mathProblem, setMathProblem] = useState<{ q: string; ans: number } | null>(null);
  const [userMathInput, setUserMathInput] = useState('');
  const [mathError, setMathError] = useState(false);

  // Shake mission state
  const [shakeCount, setShakeCount] = useState(0);
  const requiredShakes = 15;

  // "Circle inside a Cylinder" Slide-to-Turn-Off State
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const isDismissedRef = useRef(false);

  const mission = alarm.missionType || 'none';

  useEffect(() => {
    if (mission === 'math') {
      generateMathProblem();
    }
  }, [mission]);

  const generateMathProblem = () => {
    const diff = alarm.missionDifficulty || 'medium';
    let a = 12, b = 15;
    if (diff === 'easy') {
      a = Math.floor(Math.random() * 15) + 5;
      b = Math.floor(Math.random() * 15) + 5;
      setMathProblem({ q: `${a} + ${b}`, ans: a + b });
    } else if (diff === 'hard') {
      a = Math.floor(Math.random() * 40) + 15;
      b = Math.floor(Math.random() * 20) + 7;
      setMathProblem({ q: `${a} × 3 + ${b}`, ans: a * 3 + b });
    } else {
      a = Math.floor(Math.random() * 30) + 12;
      b = Math.floor(Math.random() * 30) + 12;
      setMathProblem({ q: `${a} + ${b}`, ans: a + b });
    }
    setUserMathInput('');
    setMathError(false);
  };

  const handleVerifyMath = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mathProblem) return;
    if (parseInt(userMathInput.trim(), 10) === mathProblem.ans) {
      audioAlerts.stopCurrentAlarm();
      onDismiss();
    } else {
      setMathError(true);
      setUserMathInput('');
      setTimeout(() => setMathError(false), 800);
    }
  };

  const handleShakeIncrement = () => {
    const next = shakeCount + 1;
    setShakeCount(next);
    if (next >= requiredShakes) {
      audioAlerts.stopCurrentAlarm();
      onDismiss();
    }
  };

  const handleDismiss = () => {
    audioAlerts.stopCurrentAlarm();
    onDismiss();
  };

  const handleSnooze = () => {
    audioAlerts.stopCurrentAlarm();
    onSnooze(alarm);
  };

  // Slider Drag Handlers (Circle inside a Cylinder)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    startXRef.current = e.clientX;
    setIsDragging(true);
    isDismissedRef.current = false;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || isDismissedRef.current) return;
    const track = trackRef.current;
    if (!track) return;

    // Cylinder track width minus circle width (52px) and margins
    const maxDrag = Math.max(10, track.clientWidth - 58);
    const delta = e.clientX - startXRef.current;
    const clamped = Math.max(0, Math.min(maxDrag, delta));
    setDragX(clamped);

    if (clamped >= maxDrag * 0.68) {
      isDismissedRef.current = true;
      setIsDragging(false);
      setDragX(maxDrag);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(80);
        } catch {}
      }
      setTimeout(() => {
        handleDismiss();
      }, 100);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}
    setIsDragging(false);
    if (!isDismissedRef.current) {
      setDragX(0);
    }
  };

  const soundName =
    alarm.soundType === 'custom_music'
      ? alarm.customTrackName || 'Custom Song'
      : BUILTIN_ALARM_SOUNDS.find((s) => s.id === alarm.soundType)?.name || 'Twin Bell Alarm';

  const trackWidth = trackRef.current?.clientWidth || 280;
  const maxDrag = Math.max(10, trackWidth - 58);
  const dragProgress = Math.min(1, dragX / maxDrag);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 animate-fade-in select-none">
      <div className="w-full max-w-sm sm:max-w-md liquid-glass liquid-specular border border-white/20 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl relative overflow-hidden">
        {/* Glowing Background Monochrome Specular Reflection */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent pointer-events-none" />

        {/* Animated Ringing Bell with Concentric Ripples */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-white/10 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-white/15 animate-pulse" />
          <div className="relative w-14 h-14 rounded-2xl liquid-glass-accent flex items-center justify-center shadow-xl border border-white/40">
            <AlarmClock className="w-7 h-7 animate-bounce" />
          </div>
        </div>

        {/* Alarm Time & Label */}
        <div className="space-y-1.5">
          <div className="text-5xl sm:text-6xl font-mono font-black text-slate-900 dark:text-white tracking-tight">
            {alarm.time}
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
            {alarm.label || 'Alarm Wakeup'}
          </h3>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full liquid-glass-btn text-xs font-semibold">
            <Music className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
            <span className="text-slate-700 dark:text-slate-300">{soundName}</span>
          </div>
        </div>

        {/* Mission View: Math Challenge */}
        {mission === 'math' && mathProblem && (
          <div className="p-4 rounded-2xl liquid-glass-card border border-black/10 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
              <Brain className="w-4 h-4" />
              <span>Wake-up Mission: Solve to Dismiss</span>
            </div>
            <div className="text-2xl font-mono font-black text-slate-900 dark:text-white">
              {mathProblem.q} = ?
            </div>
            <form onSubmit={handleVerifyMath} className="flex gap-2">
              <input
                type="number"
                value={userMathInput}
                onChange={(e) => setUserMathInput(e.target.value)}
                placeholder="Answer"
                autoFocus
                className={`flex-1 px-3 py-2 rounded-xl liquid-glass-input text-slate-900 dark:text-white font-mono text-center font-bold text-lg outline-none focus:ring-2 focus:ring-black dark:focus:ring-white ${
                  mathError ? 'border-neutral-500 dark:border-neutral-400 ring-2 ring-neutral-400 animate-shake' : ''
                }`}
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl liquid-glass-accent font-bold text-xs shadow-md"
              >
                Submit
              </button>
            </form>
          </div>
        )}

        {/* Mission View: Shake Challenge */}
        {mission === 'shake' && (
          <div className="p-4 rounded-2xl liquid-glass-card border border-black/10 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
              <Smartphone className="w-4 h-4 animate-bounce" />
              <span>Wake-up Mission: Tap or Shake Phone</span>
            </div>
            <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-3 overflow-hidden">
              <div
                className="bg-black dark:bg-white h-full transition-all duration-150"
                style={{ width: `${Math.min(100, (shakeCount / requiredShakes) * 100)}%` }}
              />
            </div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {shakeCount} / {requiredShakes} shakes completed
            </div>
            <button
              type="button"
              onClick={handleShakeIncrement}
              className="w-full py-2.5 rounded-xl liquid-glass-accent font-bold text-xs"
            >
              Tap / Shake Phone
            </button>
          </div>
        )}

        {/* Clock App Authentic "Circle Inside a Cylinder" Slide-To-Turn-Off Slider */}
        {mission === 'none' && (
          <div className="space-y-3 pt-2">
            <div
              ref={trackRef}
              className="relative w-full h-15 rounded-full bg-black/10 dark:bg-white/10 border-2 border-black/15 dark:border-white/20 p-1 flex items-center overflow-hidden touch-none select-none shadow-inner"
            >
              {/* Dynamic Fill Highlight Following Circle */}
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500/25 to-teal-500/20 pointer-events-none transition-opacity"
                style={{ width: `${dragX + 54}px`, opacity: dragProgress > 0 ? 1 : 0 }}
              />

              {/* Guide Hint Shimmer Text inside Cylinder Track */}
              <div
                className="absolute inset-0 flex items-center justify-center gap-1 text-xs font-black tracking-wider uppercase text-slate-700 dark:text-slate-300 pointer-events-none transition-opacity duration-150 pl-10"
                style={{ opacity: Math.max(0, 1 - dragProgress * 1.6) }}
              >
                <span>Slide to turn off</span>
                <ChevronRight className="w-4 h-4 animate-pulse" />
                <ChevronRight className="w-4 h-4 animate-pulse delay-75" />
              </div>

              {/* The Sliding Circle Knob inside the Cylinder */}
              <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className={`relative w-12 h-12 rounded-full bg-white dark:bg-white text-black shadow-xl border-2 border-white/80 flex items-center justify-center cursor-grab active:cursor-grabbing shrink-0 z-10 ${
                  isDragging ? 'scale-105 shadow-2xl' : 'transition-transform duration-200 ease-out'
                }`}
                style={{
                  transform: `translateX(${dragX}px)`,
                }}
              >
                <AlarmClockOff className="w-5 h-5 text-slate-900 stroke-[2.5]" />
              </div>
            </div>
          </div>
        )}

        {/* Snooze Button */}
        <button
          type="button"
          onClick={handleSnooze}
          className="w-full py-2.5 rounded-2xl liquid-glass-btn active:scale-98 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Timer className="w-3.5 h-3.5" />
          <span>Snooze for {alarm.snoozeMinutes || 10} Minutes</span>
        </button>
      </div>
    </div>
  );
}
