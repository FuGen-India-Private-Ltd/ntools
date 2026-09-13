import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppModule, DOCK_ITEMS } from './FloatingDock';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Check,
  Compass,
} from 'lucide-react';

interface CircularOrbitSwitcherProps {
  activeModule: AppModule;
  onSelectModule: (module: AppModule) => void;
  lang: 'en' | 'kn';
  isOpen: boolean;
  onClose: () => void;
}

export function CircularOrbitSwitcher({
  activeModule,
  onSelectModule,
  lang,
  isOpen,
  onClose,
}: CircularOrbitSwitcherProps) {
  const numItems = DOCK_ITEMS.length;
  const angleStep = 360 / numItems; // 36 degrees per tab

  // Find index of currently active module
  const activeIdx = DOCK_ITEMS.findIndex((item) => item.id === activeModule);
  const targetAngle = -activeIdx * angleStep;

  const [currentAngle, setCurrentAngle] = useState(targetAngle);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [angleAtDragStart, setAngleAtDragStart] = useState(targetAngle);
  const velocityRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  // Sync angle when activeModule changes externally
  useEffect(() => {
    if (!isDragging) {
      setCurrentAngle(-activeIdx * angleStep);
    }
  }, [activeIdx, angleStep, isDragging]);

  // Snap to nearest item index
  const snapToNearest = useCallback(() => {
    let normalized = currentAngle % 360;
    if (normalized > 0) normalized -= 360;

    let nearestIndex = Math.round(-normalized / angleStep) % numItems;
    if (nearestIndex < 0) nearestIndex += numItems;

    const snapAngle = -nearestIndex * angleStep;
    setCurrentAngle(snapAngle);

    const selectedItem = DOCK_ITEMS[nearestIndex];
    if (selectedItem && selectedItem.id !== activeModule) {
      onSelectModule(selectedItem.id);
    }
  }, [currentAngle, angleStep, numItems, activeModule, onSelectModule]);

  // Physics animation loop for momentum and snappy snapping
  const startMomentum = useCallback(() => {
    let velocity = velocityRef.current;
    const friction = 0.85; // Snappy deceleration

    const step = () => {
      velocity *= friction;
      if (Math.abs(velocity) > 0.08) {
        setCurrentAngle((prev) => prev + velocity);
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        snapToNearest();
      }
    };

    animFrameRef.current = requestAnimationFrame(step);
  }, [snapToNearest]);

  // Pointer drag handlers with responsive tracking
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setAngleAtDragStart(currentAngle);
    lastXRef.current = e.clientX;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartX;
    const degDelta = deltaX * 0.45; // 50% faster rotation response
    setCurrentAngle(angleAtDragStart + degDelta);

    const now = performance.now();
    const dt = Math.max(1, now - lastTimeRef.current);
    const dx = e.clientX - lastXRef.current;
    velocityRef.current = (dx / dt) * 5.2;

    lastXRef.current = e.clientX;
    lastTimeRef.current = now;
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    startMomentum();
  };

  const handleSelectIndex = (index: number) => {
    const target = -index * angleStep;
    setCurrentAngle(target);
    onSelectModule(DOCK_ITEMS[index].id);
  };

  const handleNext = () => {
    const nextIdx = (activeIdx + 1) % numItems;
    handleSelectIndex(nextIdx);
  };

  const handlePrev = () => {
    const prevIdx = (activeIdx - 1 + numItems) % numItems;
    handleSelectIndex(prevIdx);
  };

  if (!isOpen) return null;

  // Radius of 3D cylinder
  const radius = 290;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between p-4 bg-slate-950/90 backdrop-blur-2xl animate-fade-in select-none touch-none overflow-hidden"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Top Bar with Mode Controls & Title */}
      <div className="w-full max-w-lg flex items-center justify-between z-10 pt-2 px-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white tracking-wide flex items-center gap-2">
              Circular Tab Orbit
            </h3>
            <p className="text-[10px] text-slate-400">3D Rapid Navigation</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all duration-100 flex items-center gap-1.5 border border-white/20 active:scale-95 shadow-md shadow-black/30"
        >
          <Check className="w-3.5 h-3.5 text-white" />
          <span>Done</span>
        </button>
      </div>

      {/* 3D Circular Orbit Stage with Perspective & High-Speed GPU Transforms */}
      <div className="relative w-full max-w-md h-[420px] sm:h-[480px] flex items-center justify-center perspective-[1400px]">
        {/* Glowing Orbit Ring Base Floor */}
        <div className="absolute w-[360px] h-[360px] rounded-full border border-white/15 pointer-events-none transform -rotate-X-[75deg] translate-y-36 shadow-[0_0_50px_rgba(255,255,255,0.08)]" />

        <div
          className="relative w-[210px] sm:w-[240px] h-[290px] sm:h-[320px] transform-style-3d"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateY(${currentAngle}deg)`,
            willChange: 'transform',
          }}
        >
          {DOCK_ITEMS.map((item, index) => {
            const Icon = item.icon;
            const itemBaseAngle = index * angleStep;
            const effectiveAngle = (itemBaseAngle + currentAngle) % 360;
            const normalizedAngle =
              effectiveAngle > 180 ? effectiveAngle - 360 : effectiveAngle < -180 ? effectiveAngle + 360 : effectiveAngle;

            const angleRad = (normalizedAngle * Math.PI) / 180;
            const isFront = Math.abs(normalizedAngle) < 18;
            const isSelected = item.id === activeModule;
            const label = lang === 'kn' ? item.labelKn : item.labelEn;

            // Compute depth variables: scale, opacity, z-index (zero heavy blur filter)
            const cosVal = Math.cos(angleRad);
            const scale = Math.max(0.62, 0.76 + 0.24 * cosVal);
            const opacity = Math.max(0.25, (cosVal + 1) / 2);
            const zIndex = Math.round(100 * (1 + cosVal));

            return (
              <div
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectIndex(index);
                }}
                className="absolute inset-0 cursor-pointer rounded-3xl p-5 border flex flex-col items-center justify-between shadow-2xl transition-opacity duration-100 overflow-hidden"
                style={{
                  transform: `rotateY(${itemBaseAngle}deg) translateZ(${radius}px) scale(${scale})`,
                  opacity,
                  zIndex,
                  backgroundColor: isFront
                    ? 'rgba(10, 10, 10, 0.94)'
                    : 'rgba(25, 25, 25, 0.7)',
                  borderColor: isSelected
                    ? 'rgba(255, 255, 255, 0.95)'
                    : isFront
                    ? 'rgba(255, 255, 255, 0.35)'
                    : 'rgba(255, 255, 255, 0.1)',
                  boxShadow: isSelected
                    ? '0 0 35px rgba(255, 255, 255, 0.35), 0 20px 30px rgba(0, 0, 0, 0.7)'
                    : '0 16px 25px rgba(0, 0, 0, 0.4)',
                  willChange: 'transform, opacity',
                }}
              >
                {/* Specular glass reflection overlay on front card */}
                {isFront && (
                  <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                )}

                {/* Active Indicator Top Tag */}
                {isSelected ? (
                  <span className="px-3 py-1 rounded-full bg-white text-black font-black text-[10.5px] uppercase tracking-wider shadow-md shadow-white/20">
                    Active Tab
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {index + 1} / {numItems}
                  </span>
                )}

                {/* Main Icon */}
                <div
                  className={`w-18 h-18 sm:w-22 sm:h-22 rounded-3xl flex items-center justify-center shadow-inner transition-transform duration-100 ${
                    isFront ? 'scale-110' : 'scale-95'
                  } ${
                    isSelected
                      ? 'bg-white text-black shadow-white/40'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  <Icon className="w-9 h-9 sm:w-11 sm:h-11 stroke-[2.2]" />
                </div>

                {/* Tab Label */}
                <div className="text-center w-full">
                  <h4 className="text-sm sm:text-base font-black text-white tracking-tight">
                    {label}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    Tap to Switch
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Hint & Arrow Step Navigation */}
      <div className="w-full max-w-sm flex items-center justify-between pb-4 z-10">
        <button
          type="button"
          onClick={handlePrev}
          className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all duration-100 active:scale-90 border border-white/10 shadow-lg"
          aria-label="Previous Tab"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span>Swipe or drag to spin wheel</span>
        </div>

        <button
          type="button"
          onClick={handleNext}
          className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all duration-100 active:scale-90 border border-white/10 shadow-lg"
          aria-label="Next Tab"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
