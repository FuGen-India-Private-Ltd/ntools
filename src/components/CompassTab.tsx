import React, { useState, useEffect, useRef } from 'react';
import {
  Compass as CompassIcon,
  Sparkles,
  Layers,
  HelpCircle,
  Sliders
} from 'lucide-react';

export function CompassTab() {
  const [heading, setHeading] = useState<number>(0);
  const [pitch, setPitch] = useState<number>(0); // beta (-180 to 180)
  const [roll, setRoll] = useState<number>(0);   // gamma (-90 to 90)
  const [hasSensor, setHasSensor] = useState<boolean>(false);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [showCalibrationHelp, setShowCalibrationHelp] = useState<boolean>(false);

  // Smooth animation refs
  const dialRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const targetHeadingRef = useRef<number>(0);
  const currentRotationRef = useRef<number>(0);
  const targetPitchRef = useRef<number>(0);
  const currentPitchRef = useRef<number>(0);
  const targetRollRef = useRef<number>(0);
  const currentRollRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let sensorReceived = false;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      let rawHeading = 0;

      // iOS webkitCompassHeading vs standard alpha
      if ((e as any).webkitCompassHeading !== undefined) {
        rawHeading = (e as any).webkitCompassHeading;
      } else if (e.alpha !== null) {
        rawHeading = 360 - e.alpha;
      }

      if (rawHeading !== undefined && !isSimulated) {
        targetHeadingRef.current = (rawHeading + 360) % 360;
        sensorReceived = true;
        setHasSensor(true);
      }

      if (e.beta !== null && !isSimulated) {
        targetPitchRef.current = Math.round(e.beta);
      }
      if (e.gamma !== null && !isSimulated) {
        targetRollRef.current = Math.round(e.gamma);
      }
    };

    // Absolute orientation event preferred on modern Android
    window.addEventListener('deviceorientationabsolute' as any, handleOrientation, true);
    window.addEventListener('deviceorientation', handleOrientation, true);

    const timer = setTimeout(() => {
      if (!sensorReceived) {
        setHasSensor(false);
      }
    }, 1500);

    // Continuous 60/120 FPS Damped Animation Loop with Angle Unwrapping
    let lastStateUpdate = 0;
    const animate = (timestamp: number) => {
      // 1. Angle Unwrapping for Smooth 360° Compass Rotation
      const target = targetHeadingRef.current;
      const current = currentRotationRef.current;
      let diff = (target - (current % 360));
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;

      // Smooth interpolation factor (0.15 for buttery damping without lag)
      currentRotationRef.current += diff * 0.16;

      // 2. Smooth Pitch & Roll for Spirit Level Bubble
      currentPitchRef.current += (targetPitchRef.current - currentPitchRef.current) * 0.16;
      currentRollRef.current += (targetRollRef.current - currentRollRef.current) * 0.16;

      // Update DOM transform directly for 60/120 FPS performance
      if (dialRef.current) {
        dialRef.current.style.transform = `rotate(${-currentRotationRef.current}deg)`;
      }
      if (bubbleRef.current) {
        const clampedX = Math.min(Math.max(currentRollRef.current * 2, -60), 60);
        const clampedY = Math.min(Math.max(currentPitchRef.current * 2, -22), 22);
        bubbleRef.current.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
      }

      // Throttle React state updates to ~20Hz to prevent React rendering bottlenecks
      if (timestamp - lastStateUpdate > 50) {
        const normalizedHeading = Math.round(((currentRotationRef.current % 360) + 360) % 360);
        setHeading(normalizedHeading);
        setPitch(Math.round(currentPitchRef.current));
        setRoll(Math.round(currentRollRef.current));
        lastStateUpdate = timestamp;
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('deviceorientationabsolute' as any, handleOrientation, true);
      window.removeEventListener('deviceorientation', handleOrientation, true);
      clearTimeout(timer);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isSimulated]);

  // Request permission on iOS 13+ if applicable
  const requestSensorPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const res = await (DeviceOrientationEvent as any).requestPermission();
        if (res === 'granted') {
          setHasSensor(true);
        }
      } catch (err) {
        console.error('Sensor permission error:', err);
      }
    }
  };

  const getCardinalDirection = (deg: number): string => {
    const directions = [
      'N', 'NNE', 'NE', 'ENE',
      'E', 'ESE', 'SE', 'SSE',
      'S', 'SSW', 'SW', 'WSW',
      'W', 'WNW', 'NW', 'NNW'
    ];
    const index = Math.round(((deg % 360) / 22.5)) % 16;
    return directions[index];
  };

  const isLevel = Math.abs(pitch) <= 2 && Math.abs(roll) <= 2;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="p-4 sm:p-6 rounded-3xl liquid-glass liquid-specular border border-black/10 dark:border-white/10 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
            <CompassIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Digital Compass &amp; Level
              </h2>
              {hasSensor ? (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  ● Sensor Active
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                  Manual Mode
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              360° Magnetic Heading, Direction &amp; 2-Axis Surface Level
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCalibrationHelp(!showCalibrationHelp)}
          className="p-2.5 rounded-2xl liquid-glass-btn text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white transition active:scale-95"
          title="Calibration Guide"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>

      {/* Calibration Guide Banner */}
      {showCalibrationHelp && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-900 dark:text-emerald-200 space-y-1.5 animate-fadeIn">
          <div className="flex items-center justify-between font-bold">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Compass Accuracy Calibration
            </span>
            <button
              type="button"
              onClick={() => setShowCalibrationHelp(false)}
              className="text-emerald-600 dark:text-emerald-400 hover:opacity-80 cursor-pointer"
            >
              Close
            </button>
          </div>
          <p className="leading-relaxed text-[11.5px] opacity-90">
            For maximum accuracy, wave your device in a smooth <strong>figure-8 motion</strong> in the air for 5 seconds. Keep away from strong magnetic fields, laptop chargers, and metal cases.
          </p>
        </div>
      )}

      {/* Main Compass Rose Card */}
      <div className="p-6 sm:p-8 rounded-3xl liquid-glass liquid-specular border border-black/10 dark:border-white/10 shadow-sm flex flex-col items-center justify-center text-center space-y-6">
        {/* Large Digital Heading Readout */}
        <div className="space-y-1">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-slate-900 dark:text-slate-100">
              {heading.toString().padStart(3, '0')}°
            </span>
            <span className="text-2xl font-black text-emerald-500">
              {getCardinalDirection(heading)}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {isLevel ? 'Phone is held flat (Optimal)' : 'Hold device flat for best accuracy'}
          </p>
        </div>

        {/* 360-Degree Rotating Compass Dial */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center select-none">
          {/* Outer Ring Ticks - smooth RAF rotated */}
          <div
            ref={dialRef}
            className="absolute inset-0 rounded-full border-2 border-dashed border-black/15 dark:border-white/20 will-change-transform"
          >
            {/* North Indicator */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 text-sm font-black text-rose-500">
              N
            </div>
            {/* East Indicator */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
              E
            </div>
            {/* South Indicator */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs font-black text-slate-400">
              S
            </div>
            {/* West Indicator */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
              W
            </div>

            {/* Degree Markers (30° intervals) */}
            {[30, 60, 120, 150, 210, 240, 300, 330].map((deg) => (
              <div
                key={deg}
                className="absolute inset-0 flex justify-center items-start pt-1"
                style={{ transform: `rotate(${deg}deg)` }}
              >
                <span className="w-0.5 h-2 bg-slate-400/40 rounded-full" />
              </div>
            ))}
          </div>

          {/* Center Crown & Stationary Needle Pointer */}
          <div className="relative w-36 h-36 rounded-full bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 flex items-center justify-center shadow-inner">
            {/* Needle */}
            <div className="absolute w-2 h-28 flex flex-col items-center justify-between">
              {/* North Pointer (Red) */}
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[40px] border-b-rose-500 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
              {/* Center Pivot */}
              <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-rose-500 z-10" />
              {/* South Pointer (White/Silver) */}
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[40px] border-t-slate-300 dark:border-t-slate-500" />
            </div>
          </div>
        </div>

        {/* 2-Axis Digital Spirit Level Indicator */}
        <div className="w-full max-w-sm p-4 rounded-2xl liquid-glass-card liquid-specular border border-black/5 dark:border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-500" />
              Surface Spirit Level
            </span>
            <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
              isLevel ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'
            }`}>
              {isLevel ? 'Level 0°' : `${Math.max(Math.abs(pitch), Math.abs(roll))}° Tilt`}
            </span>
          </div>

          {/* Level Crosshair Bubble Box */}
          <div className="relative w-full h-16 bg-black/10 dark:bg-black/40 rounded-xl border border-black/10 dark:border-white/10 flex items-center justify-center overflow-hidden">
            {/* Center Target Rings */}
            <div className="w-8 h-8 rounded-full border border-slate-400/30 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full border border-slate-400/40" />
            </div>

            {/* Floating Level Bubble - smooth RAF positioned */}
            <div
              ref={bubbleRef}
              className={`absolute w-6 h-6 rounded-full shadow-md will-change-transform ${
                isLevel
                  ? 'bg-emerald-500 shadow-emerald-500/50'
                  : 'bg-amber-500 shadow-amber-500/50'
              }`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 px-1">
            <span>Pitch: {pitch}°</span>
            <span>Roll: {roll}°</span>
          </div>
        </div>

        {/* Simulation / Manual Controls for devices without magnetometer */}
        {!hasSensor && (
          <div className="w-full max-w-sm p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                Sensor Test / Slider
              </span>
              <button
                type="button"
                onClick={requestSensorPermission}
                className="text-[11px] font-bold text-emerald-500 hover:underline cursor-pointer"
              >
                Request Permission
              </button>
            </div>
            <input
              type="range"
              min="0"
              max="359"
              value={heading}
              onChange={(e) => {
                setIsSimulated(true);
                const val = parseInt(e.target.value, 10);
                targetHeadingRef.current = val;
                setHeading(val);
              }}
              className="w-full accent-emerald-500"
            />
          </div>
        )}
      </div>
    </div>
  );
}
