import React, { useRef, useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FileCode,
  FolderArchive,
  ListTodo,
  Clock,
  StickyNote,
  Calculator,
  Calendar,
  Layers,
  Settings,
  Mic,
  Compass,
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
  | 'recorder'
  | 'compass'
  | 'settings';

export interface ArcItem {
  id: AppModule;
  labelEn: string;
  labelKn: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  accentGrad: string;
  glowColor: string;
  glowHex: string;
}

export const ARC_ITEMS: ArcItem[] = [
  {
    id: 'dashboard',
    labelEn: 'Home',
    labelKn: 'ಮುಖಪುಟ',
    icon: LayoutDashboard,
    color: 'text-cyan-500',
    accentGrad: 'from-cyan-500 via-blue-600 to-indigo-600',
    glowColor: 'rgba(6, 182, 212, 0.45)',
    glowHex: '#06b6d4',
  },
  {
    id: 'converter',
    labelEn: 'Sanka',
    labelKn: 'ಸಂಕ',
    icon: FileCode,
    color: 'text-blue-500',
    accentGrad: 'from-blue-500 via-indigo-600 to-violet-600',
    glowColor: 'rgba(59, 130, 246, 0.45)',
    glowHex: '#3b82f6',
  },
  {
    id: 'files',
    labelEn: 'Files',
    labelKn: 'ಫೈಲ್‌ಗಳು',
    icon: FolderArchive,
    color: 'text-rose-500',
    accentGrad: 'from-rose-500 via-pink-600 to-rose-700',
    glowColor: 'rgba(244, 63, 94, 0.45)',
    glowHex: '#f43f5e',
  },
  {
    id: 'tasks',
    labelEn: 'Tasks',
    labelKn: 'ಕಾರ್ಯಗಳು',
    icon: ListTodo,
    color: 'text-teal-500',
    accentGrad: 'from-teal-500 via-emerald-600 to-teal-700',
    glowColor: 'rgba(20, 184, 166, 0.45)',
    glowHex: '#14b8a6',
  },
  {
    id: 'clock',
    labelEn: 'Clock',
    labelKn: 'ಗಡಿಯಾರ',
    icon: Clock,
    color: 'text-amber-500',
    accentGrad: 'from-amber-500 via-orange-600 to-amber-700',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    glowHex: '#f59e0b',
  },
  {
    id: 'notes',
    labelEn: 'Notes',
    labelKn: 'ಟಿಪ್ಪಣಿ',
    icon: StickyNote,
    color: 'text-purple-500',
    accentGrad: 'from-purple-500 via-violet-600 to-purple-700',
    glowColor: 'rgba(168, 85, 247, 0.45)',
    glowHex: '#a855f7',
  },
  {
    id: 'calc',
    labelEn: 'Calc',
    labelKn: 'ಕ್ಯಾಲ್ಕ್',
    icon: Calculator,
    color: 'text-emerald-500',
    accentGrad: 'from-emerald-500 via-teal-600 to-emerald-700',
    glowColor: 'rgba(16, 185, 129, 0.45)',
    glowHex: '#10b981',
  },
  {
    id: 'calendar',
    labelEn: 'Calendar',
    labelKn: 'ಕ್ಯಾಲೆಂಡರ್',
    icon: Calendar,
    color: 'text-sky-500',
    accentGrad: 'from-sky-500 via-blue-600 to-cyan-600',
    glowColor: 'rgba(14, 165, 233, 0.45)',
    glowHex: '#0ea5e9',
  },
  {
    id: 'widgets',
    labelEn: 'Widgets',
    labelKn: 'ವಿಜೆಟ್',
    icon: Layers,
    color: 'text-pink-500',
    accentGrad: 'from-pink-500 via-rose-600 to-fuchsia-600',
    glowColor: 'rgba(236, 72, 153, 0.45)',
    glowHex: '#ec4899',
  },
  {
    id: 'recorder',
    labelEn: 'Recorder',
    labelKn: 'ಧ್ವನಿ',
    icon: Mic,
    color: 'text-rose-500',
    accentGrad: 'from-rose-600 via-red-600 to-rose-700',
    glowColor: 'rgba(225, 29, 72, 0.45)',
    glowHex: '#e11d48',
  },
  {
    id: 'compass',
    labelEn: 'Compass',
    labelKn: 'ದಿಕ್ಸೂಚಿ',
    icon: Compass,
    color: 'text-emerald-500',
    accentGrad: 'from-emerald-500 via-teal-600 to-cyan-600',
    glowColor: 'rgba(16, 185, 129, 0.45)',
    glowHex: '#10b981',
  },
  {
    id: 'settings',
    labelEn: 'Settings',
    labelKn: 'ಸೆಟ್ಟಿಂಗ್ಸ್',
    icon: Settings,
    color: 'text-slate-400',
    accentGrad: 'from-slate-600 via-slate-700 to-slate-800',
    glowColor: 'rgba(148, 163, 184, 0.45)',
    glowHex: '#94a3b8',
  },
];

interface CircularArcNavigatorProps {
  activeModule: AppModule;
  onSelectModule: (module: AppModule) => void;
  lang: 'en' | 'kn';
}

// Spacing between icons and scrub sensitivity distance (lower = faster, snappier scrub)
const ITEM_WIDTH = 56;
const STEP_PX = 20; // 20px per tab change = ultra-fast agile continuous scrubbing across multiple tabs

export const CircularArcNavigator = React.memo(function CircularArcNavigator({
  activeModule,
  onSelectModule,
  lang,
}: CircularArcNavigatorProps) {
  const numItems = ARC_ITEMS.length;
  const [localActiveModule, setLocalActiveModule] = useState<AppModule>(activeModule);

  useEffect(() => {
    setLocalActiveModule(activeModule);
  }, [activeModule]);

  const activeIdx = ARC_ITEMS.findIndex((item) => item.id === localActiveModule);
  const activeItem = ARC_ITEMS[activeIdx] || ARC_ITEMS[0];
  const activeIdxRef = useRef(activeIdx);
  activeIdxRef.current = activeIdx;

  // Drag state
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const isDraggingRef = useRef(false);
  const startXRef = useRef<number>(0);
  const lastClientXRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const velocityXRef = useRef<number>(0);
  const accumulatedDeltaRef = useRef<number>(0);
  const stepsTakenRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  // Keyboard detection
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const maxRecordedHeightRef = useRef<number>(
    typeof window !== 'undefined'
      ? Math.max(window.innerHeight, window.visualViewport?.height || 0)
      : 800
  );

  useEffect(() => {
    const handleViewport = () => {
      const currentH = window.visualViewport?.height || window.innerHeight;
      if (currentH > maxRecordedHeightRef.current) {
        maxRecordedHeightRef.current = currentH;
      }
      const diff = maxRecordedHeightRef.current - currentH;
      setIsKeyboardOpen(diff > 160);
    };

    window.addEventListener('resize', handleViewport);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewport);
    }

    return () => {
      window.removeEventListener('resize', handleViewport);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewport);
      }
    };
  }, []);

  // Pending commit timer to avoid unmounting/mounting full pages rapidly while finger is moving
  const pendingCommitTimerRef = useRef<any>(null);

  const commitModuleChange = (modId: AppModule, immediate = false) => {
    setLocalActiveModule(modId);
    if (pendingCommitTimerRef.current) {
      clearTimeout(pendingCommitTimerRef.current);
      pendingCommitTimerRef.current = null;
    }
    if (immediate) {
      onSelectModule(modId);
    } else {
      pendingCommitTimerRef.current = setTimeout(() => {
        onSelectModule(modId);
      }, 50);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pendingCommitTimerRef.current) {
      clearTimeout(pendingCommitTimerRef.current);
      pendingCommitTimerRef.current = null;
    }
    isDraggingRef.current = true;
    setIsDragging(true);
    startXRef.current = e.clientX;
    lastClientXRef.current = e.clientX;
    lastTimeRef.current = performance.now();
    velocityXRef.current = 0;
    accumulatedDeltaRef.current = 0;
    stepsTakenRef.current = 0;
    setDragOffsetPx(0);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const now = performance.now();
    const dt = Math.max(1, now - lastTimeRef.current);
    const dx = e.clientX - lastClientXRef.current;

    velocityXRef.current = dx / dt;
    lastClientXRef.current = e.clientX;
    lastTimeRef.current = now;

    const totalTravel = e.clientX - startXRef.current;
    if (Math.abs(totalTravel) > 6) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (_) {}
    }

    // Continuous scrubbing: accumulate delta
    accumulatedDeltaRef.current += dx;

    // Check if scrub crossed forward threshold (moving finger left advances tabs forward)
    if (accumulatedDeltaRef.current <= -STEP_PX) {
      const steps = Math.floor(Math.abs(accumulatedDeltaRef.current) / STEP_PX);
      if (steps > 0) {
        accumulatedDeltaRef.current += steps * STEP_PX;
        stepsTakenRef.current += steps;
        const newIdx = (activeIdxRef.current + steps) % numItems;
        activeIdxRef.current = newIdx;
        const targetMod = ARC_ITEMS[newIdx].id;
        commitModuleChange(targetMod, false);
        if (navigator.vibrate) navigator.vibrate(10);
      }
    } else if (accumulatedDeltaRef.current >= STEP_PX) {
      const steps = Math.floor(accumulatedDeltaRef.current / STEP_PX);
      if (steps > 0) {
        accumulatedDeltaRef.current -= steps * STEP_PX;
        stepsTakenRef.current += steps;
        const newIdx = (activeIdxRef.current - steps + numItems * 100) % numItems;
        activeIdxRef.current = newIdx;
        const targetMod = ARC_ITEMS[newIdx].id;
        commitModuleChange(targetMod, false);
        if (navigator.vibrate) navigator.vibrate(10);
      }
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setDragOffsetPx(accumulatedDeltaRef.current);
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch (_) {}
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setIsDragging(false);

    if (pendingCommitTimerRef.current) {
      clearTimeout(pendingCommitTimerRef.current);
      pendingCommitTimerRef.current = null;
    }

    const totalTravel = e.clientX - startXRef.current;

    // "one slide, one movement": If user performed a single swipe/flick without continuous holding
    if (stepsTakenRef.current === 0) {
      const isFlick = Math.abs(velocityXRef.current) > 0.22 || Math.abs(totalTravel) > 12;
      if (isFlick) {
        const step = (totalTravel < 0 || velocityXRef.current < -0.22) ? 1 : -1;
        const newIdx = (activeIdxRef.current + step + numItems * 100) % numItems;
        activeIdxRef.current = newIdx;
        const targetMod = ARC_ITEMS[newIdx].id;
        commitModuleChange(targetMod, true);
        if (navigator.vibrate) navigator.vibrate(12);
        setDragOffsetPx(0);
        return;
      }
    }

    // Immediately commit whatever item is currently centered
    const finalMod = ARC_ITEMS[activeIdxRef.current].id;
    commitModuleChange(finalMod, true);
    setDragOffsetPx(0);
  };

  return (
    <div
      className={`arc-navigator-bar fixed bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 pb-[env(safe-area-inset-bottom,12px)] z-30 select-none touch-none flex flex-col items-center pointer-events-auto transition-all duration-200 ease-out ${
        isKeyboardOpen
          ? 'opacity-0 pointer-events-none translate-y-12'
          : 'opacity-100 translate-y-0'
      }`}
    >
      {/* Sleek Obsidian Glass Sliding Dock (Pure Pitch Black, Zero Breathing Lights) */}
      <div
        className="relative w-[300px] sm:w-[340px] h-[68px] px-3 rounded-[34px] liquid-glass-arc-dock flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden shadow-2xl"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* 1:1 Smooth Continuous Sliding Carousel */}
        {ARC_ITEMS.map((item, i) => {
          const Icon = item.icon;
          const label = lang === 'kn' ? item.labelKn : item.labelEn;

          // Shortest angular index distance to active item
          let diff = i - activeIdx;
          if (diff > numItems / 2) diff -= numItems;
          if (diff < -numItems / 2) diff += numItems;

          const distPx = diff * ITEM_WIDTH + dragOffsetPx;
          const absDist = Math.abs(distPx);
          const isVisible = absDist <= 145;
          const isCenter = absDist < ITEM_WIDTH * 0.45;

          const scale = isCenter
            ? 1.15
            : Math.max(0.68, 1.15 - (absDist / 140) * 0.42);
          const opacity = !isVisible
            ? 0
            : isCenter
            ? 1
            : Math.max(0.35, 1 - Math.pow(absDist / 140, 1.3));

          // Gentle optical elevation arc curve
          const y = Math.pow(distPx / 110, 2) * 4;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                commitModuleChange(item.id, true);
                if (navigator.vibrate) navigator.vibrate(10);
              }}
              style={{
                transform: `translate3d(${distPx}px, ${y}px, 0) scale(${scale})`,
                opacity,
                pointerEvents: isVisible ? 'auto' : 'none',
                zIndex: isCenter ? 20 : isVisible ? 10 : 0,
                transition: isDragging
                  ? 'none'
                  : 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.16s ease-out',
              }}
              className="absolute top-1 flex flex-col items-center gap-1 select-none active:scale-95 cursor-pointer"
              title={label}
            >
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-150 border ${
                  isCenter
                    ? `bg-gradient-to-b ${item.accentGrad} text-white border-white/60 dark:border-white/40 shadow-[0_8px_20px_rgba(0,0,0,0.3),inset_0_1.5px_2px_rgba(255,255,255,0.7)]`
                    : 'bg-white/[0.07] dark:bg-white/[0.08] backdrop-blur-xl text-slate-300 dark:text-slate-300 hover:text-white hover:bg-white/15 border-white/10 shadow-sm'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform duration-150 ${
                    isCenter ? 'scale-110 stroke-[2.4]' : 'scale-90 stroke-[2]'
                  }`}
                />
              </div>

              <div
                className={`flex items-center justify-center transition-opacity duration-150 ${
                  isCenter ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                <span className="text-[10.5px] font-black tracking-tight text-white drop-shadow-sm whitespace-nowrap">
                  {label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});
