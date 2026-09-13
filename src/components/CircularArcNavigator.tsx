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
      className={`arc-navigator-bar fixed bottom-1 sm:bottom-2 left-1/2 -translate-x-1/2 z-30 select-none touch-none flex flex-col items-center pointer-events-auto transition-all duration-150 ease-out ${
        isKeyboardOpen
          ? 'opacity-0 pointer-events-none translate-y-12'
          : 'opacity-100 translate-y-0'
      }`}
    >
      {/* Rotating Curved Circular Arc Dial Container */}
      <div
        className="relative w-[280px] sm:w-[320px] h-[68px] px-4 rounded-[32px] bg-white/95 dark:bg-[#0d0d12]/95 border border-black/10 dark:border-white/15 shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
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
          const scale = isActive ? 1.08 : 0.75;
          const opacity = !isVisible ? 0 : isActive ? 1 : 0.6;

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
              className="absolute top-1 flex flex-col items-center gap-0.5 select-none"
              title={label}
            >
              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center transition-colors duration-150 border ${
                  isActive
                    ? 'bg-indigo-600 border-indigo-400 shadow-md text-white'
                    : 'bg-black/5 dark:bg-white/10 text-slate-500 hover:text-black dark:text-slate-400 dark:hover:text-white border-black/10 dark:border-white/10'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform duration-150 ${
                    isActive ? 'scale-110 stroke-[2.4]' : 'scale-90 stroke-[2.2]'
                  }`}
                />
              </div>

              <span
                className={`text-[10px] font-black text-black dark:text-white px-2 py-0.2 rounded-full whitespace-nowrap drop-shadow-sm transition-opacity duration-150 ${
                  isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
});
