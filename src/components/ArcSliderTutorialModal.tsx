import React from 'react';
import {
  X,
  Compass,
  Layers,
  Sparkles,
  MoveHorizontal,
  HandMetal,
  Check,
  RotateCcw,
  MousePointerClick
} from 'lucide-react';

interface ArcSliderTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ArcSliderTutorialModal({ isOpen, onClose }: ArcSliderTutorialModalProps) {
  if (!isOpen) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem('has_seen_dial_tutorial', 'true');
    } catch (_) {}
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn select-none">
      <div className="relative w-full max-w-md p-6 rounded-3xl liquid-glass liquid-specular border border-black/15 dark:border-white/15 shadow-2xl text-slate-900 dark:text-white space-y-5 animate-scaleUp">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          title="Close Tutorial"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight leading-tight">
              Navigation Dial Guide
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              How to navigate seamlessly with the bottom slider bar.
            </p>
          </div>
        </div>

        {/* Animated Visual Demonstration Graphic */}
        <div className="relative w-full h-36 rounded-2xl bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 flex flex-col items-center justify-center overflow-hidden p-4">
          {/* Arc Curve Representation */}
          <div className="absolute -bottom-10 w-64 h-32 rounded-[100%] border-2 border-dashed border-indigo-500/40" />

          {/* Dial Sample Icons */}
          <div className="flex items-center gap-3 z-10 pt-2">
            <div className="w-9 h-9 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center text-xs opacity-60">
              📁
            </div>
            <div className="w-9 h-9 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center text-xs opacity-80">
              📝
            </div>
            {/* Center Active Crown */}
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-base shadow-lg shadow-indigo-500/40 animate-pulse">
              ⏰
            </div>
            <div className="w-9 h-9 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center text-xs opacity-80">
              🧮
            </div>
            <div className="w-9 h-9 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center text-xs opacity-60">
              📅
            </div>
          </div>

          {/* Animated Swipe Guide Arrow */}
          <div className="flex items-center gap-2 mt-4 text-[11px] font-bold text-indigo-500 dark:text-indigo-400 animate-bounce">
            <MoveHorizontal className="w-4 h-4" />
            <span>Drag sideways to spin the wheel</span>
          </div>
        </div>

        {/* 3 Step-by-Step Tips */}
        <div className="space-y-3 text-xs">
          <div className="flex items-start gap-3 p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
            <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-500 shrink-0 mt-0.5">
              <MoveHorizontal className="w-4 h-4" />
            </div>
            <div>
              <strong className="font-bold text-slate-900 dark:text-slate-100">1. Smooth Drag &amp; Slide</strong>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Place your thumb anywhere on the bottom dial and drag left or right to smoothly rotate through all 10 tools.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
            <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-500 shrink-0 mt-0.5">
              <MousePointerClick className="w-4 h-4" />
            </div>
            <div>
              <strong className="font-bold text-slate-900 dark:text-slate-100">2. Instant Tap to Switch</strong>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Tap directly on any icon visible on the arc to jump to that module with 0ms latency.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
            <div className="p-1 rounded-lg bg-amber-500/20 text-amber-500 shrink-0 mt-0.5">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <strong className="font-bold text-slate-900 dark:text-slate-100">3. Quick Return Home</strong>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Pressing your phone's back button or back gesture from any module instantly returns you to the Home dashboard!
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 active:scale-98 transition cursor-pointer"
        >
          <Check className="w-4 h-4" />
          <span>Got it, let's explore!</span>
        </button>
      </div>
    </div>
  );
}
