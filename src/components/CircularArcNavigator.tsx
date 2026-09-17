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
  bgActive: string;
}

export const ARC_ITEMS: ArcItem[] = [
  { id: 'dashboard', labelEn: 'Home', labelKn: 'ಮುಖಪುಟ', icon: LayoutDashboard, color: 'text-indigo-500', bgActive: 'bg-indigo-600 text-white' },
  { id: 'converter', labelEn: 'Sanka', labelKn: 'ಸಂಕ', icon: FileCode, color: 'text-blue-500', bgActive: 'bg-blue-600 text-white' },
  { id: 'files', labelEn: 'Files', labelKn: 'ಫೈಲ್‌ಗಳು', icon: FolderArchive, color: 'text-rose-500', bgActive: 'bg-rose-600 text-white' },
  { id: 'tasks', labelEn: 'Tasks', labelKn: 'ಕಾರ್ಯಗಳು', icon: ListTodo, color: 'text-teal-500', bgActive: 'bg-teal-600 text-white' },
  { id: 'clock', labelEn: 'Clock', labelKn: 'ಗಡಿಯಾರ', icon: Clock, color: 'text-amber-500', bgActive: 'bg-amber-600 text-white' },
  { id: 'notes', labelEn: 'Notes', labelKn: 'ಟಿಪ್ಪಣಿ', icon: StickyNote, color: 'text-purple-500', bgActive: 'bg-purple-600 text-white' },
  { id: 'calc', labelEn: 'Calc', labelKn: 'ಕ್ಯಾಲ್ಕ್', icon: Calculator, color: 'text-emerald-500', bgActive: 'bg-emerald-600 text-white' },
  { id: 'calendar', labelEn: 'Calendar', labelKn: 'ಕ್ಯಾಲೆಂಡರ್', icon: Calendar, color: 'text-sky-500', bgActive: 'bg-sky-600 text-white' },
  { id: 'widgets', labelEn: 'Widgets', labelKn: 'ವಿಜೆಟ್', icon: Layers, color: 'text-pink-500', bgActive: 'bg-pink-600 text-white' },
  { id: 'recorder', labelEn: 'Recorder', labelKn: 'ಧ್ವನಿ', icon: Mic, color: 'text-rose-500', bgActive: 'bg-rose-600 text-white' },
  { id: 'compass', labelEn: 'Compass', labelKn: 'ದಿಕ್ಸೂಚಿ', icon: Compass, color: 'text-emerald-500', bgActive: 'bg-emerald-600 text-white' },
  { id: 'settings', labelEn: 'Settings', labelKn: 'ಸೆಟ್ಟಿಂಗ್ಸ್', icon: Settings, color: 'text-slate-400', bgActive: 'bg-slate-700 text-white' },
];

interface CircularArcNavigatorProps {
  activeModule: AppModule;
  onSelectModule: (module: AppModule) => void;
  lang: 'en' | 'kn';
}

const ARC_RADIUS = 130;
const ANGLE_STEP = 36; // 36 degrees between items

export const CircularArcNavigator = React.memo(function CircularArcNavigator({
  activeModule,
  onSelectModule,
  lang,
}: CircularArcNavigatorProps) {
  const numItems = ARC_ITEMS.length;
  // Local immediate active state for instant, non-blocking dial rotation
  const [localActiveModule, setLocalActiveModule] = useState<AppModule>(activeModule);

  useEffect(() => {
    setLocalActiveModule(activeModule);
  }, [activeModule]);

  const activeIdx = ARC_ITEMS.findIndex((item) => item.id === localActiveModule);

  // Drag rotation state
  const [dragOffsetDeg, setDragOffsetDeg] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef<number | null>(null);

  // Keyboard visibility tracking based strictly on physical viewport changes
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

      // If current height is significantly shrunk (>160px from max), the soft keyboard is open
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

  const prevIdx = (activeIdx - 1 + numItems) % numItems;
  const nextIdx = (activeIdx + 1) % numItems;

  const hasMovedRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const selectModule = (modId: AppModule) => {
    if (modId === localActiveModule) return;
    setLocalActiveModule(modId);
    onSelectModule(modId);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    hasMovedRef.current = false;
    startXRef.current = e.clientX;
    setDragOffsetDeg(0);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || startXRef.current === null) return;
    const clientX = e.clientX;
    const deltaX = clientX - startXRef.current;
    if (Math.abs(deltaX) > 6) {
      hasMovedRef.current = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (_) {}
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (startXRef.current === null) return;
      const deg = (deltaX / 100) * ANGLE_STEP;
      setDragOffsetDeg(Math.max(-65, Math.min(65, deg)));
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch (_) {}
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setIsDragging(false);

    if (dragOffsetDeg > 18) {
      selectModule(ARC_ITEMS[prevIdx].id);
    } else if (dragOffsetDeg < -18) {
      selectModule(ARC_ITEMS[nextIdx].id);
    }

    setDragOffsetDeg(0);
    startXRef.current = null;
  };

  return (
    <div
      className={`arc-navigator-bar fixed bottom-6 sm:bottom-7 left-1/2 -translate-x-1/2 pb-[env(safe-area-inset-bottom,12px)] z-30 select-none touch-none flex flex-col items-center pointer-events-auto transition-all duration-150 ease-out ${
        isKeyboardOpen
          ? 'opacity-0 pointer-events-none translate-y-12'
          : 'opacity-100 translate-y-0'
      }`}
    >
      {/* Rotating Curved Circular Arc Dial Container with Apple Liquid Glass Material */}
      <div
        className="relative w-[288px] sm:w-[328px] h-[68px] px-4 rounded-[34px] liquid-glass-arc-dock liquid-specular flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Ambient luminous jewel glow beneath the active item */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-10 bg-indigo-500/35 dark:bg-indigo-400/40 blur-2xl pointer-events-none rounded-full" />

        {/* Dynamic Rotating Items along the Circular Arc */}
        {ARC_ITEMS.map((item, i) => {
          const Icon = item.icon;
          const label = lang === 'kn' ? item.labelKn : item.labelEn;

          // Compute shortest angular distance to current active item
          let diff = i - activeIdx;
          if (diff > numItems / 2) diff -= numItems;
          if (diff < -numItems / 2) diff += numItems;

          const itemAngleDeg = diff * ANGLE_STEP + dragOffsetDeg;
          const isVisible = Math.abs(itemAngleDeg) <= 56;
          const isActive = Math.abs(itemAngleDeg) < 18;

          const rad = (itemAngleDeg * Math.PI) / 180;
          const x = ARC_RADIUS * Math.sin(rad);
          const y = ARC_RADIUS * (1 - Math.cos(rad));
          const scale = isActive ? 1.08 : 0.76;
          const opacity = !isVisible ? 0 : isActive ? 1 : 0.65;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                selectModule(item.id);
              }}
              style={{
                transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})`,
                opacity,
                pointerEvents: isVisible ? 'auto' : 'none',
                zIndex: isActive ? 20 : isVisible ? 10 : 0,
                transition: isDragging
                  ? 'none'
                  : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.16s ease-out',
              }}
              className="absolute top-1 flex flex-col items-center gap-0.5 select-none active:scale-95 transition-transform"
              title={label}
            >
              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center transition-all duration-150 border ${
                  isActive
                    ? 'bg-gradient-to-b from-indigo-500 via-indigo-600 to-indigo-700 text-white border-white/60 dark:border-white/40 shadow-[0_6px_22px_rgba(99,102,241,0.65),inset_0_1.5px_2px_rgba(255,255,255,0.85)]'
                    : 'bg-white/20 dark:bg-white/[0.07] backdrop-blur-xl text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/14 border-white/40 dark:border-white/12 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform duration-150 ${
                    isActive ? 'scale-110 stroke-[2.4]' : 'scale-90 stroke-[2.1]'
                  }`}
                />
              </div>

              <div
                className={`flex items-center gap-1 transition-opacity duration-150 ${
                  isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                <span className="w-1 h-1 rounded-full bg-indigo-500 dark:bg-indigo-300 animate-pulse" />
                <span className="text-[10px] font-extrabold tracking-tight text-slate-900 dark:text-white drop-shadow-sm whitespace-nowrap">
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
