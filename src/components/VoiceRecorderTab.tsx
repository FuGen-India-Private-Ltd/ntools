import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Mic,
  Square,
  Pause,
  Play,
  Trash2,
  Download,
  Share2,
  Edit2,
  Check,
  X,
  AudioWaveform,
  AlertCircle,
  Search,
  Star,
  Volume2,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { saveAndDownloadFile, showToast } from '../lib/fileDownloader';
import {
  checkAllStartupPermissionsNative,
  requestAudioPermissionNative,
  openAppDetailsSettingsNative,
} from '../lib/widgetSyncBridge';

export type RecordingCategory = 'note' | 'meeting' | 'lecture' | 'idea' | 'interview';

export interface SavedRecording {
  id: string;
  name: string;
  timestamp: string;
  durationSec: number;
  dataUrl: string;
  mimeType: string;
  sizeBytes: number;
  category: RecordingCategory;
  isFavorite?: boolean;
  peaks: number[]; // 0.05 to 1.0 normalized bar heights
}

const STORAGE_KEY = 'ntools_saved_voice_recordings';

export const RECORDING_CATEGORIES: Record<
  RecordingCategory,
  { label: string; badge: string; dot: string }
> = {
  note: {
    label: 'Voice Note',
    badge: 'bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-black/10 dark:border-white/15',
    dot: 'bg-slate-400 dark:bg-slate-400',
  },
  meeting: {
    label: 'Meeting',
    badge: 'bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-black/10 dark:border-white/15',
    dot: 'bg-slate-400 dark:bg-slate-400',
  },
  lecture: {
    label: 'Lecture',
    badge: 'bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-black/10 dark:border-white/15',
    dot: 'bg-slate-400 dark:bg-slate-400',
  },
  idea: {
    label: 'Idea',
    badge: 'bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-black/10 dark:border-white/15',
    dot: 'bg-slate-400 dark:bg-slate-400',
  },
  interview: {
    label: 'Interview',
    badge: 'bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-black/10 dark:border-white/15',
    dot: 'bg-slate-400 dark:bg-slate-400',
  },
};

const PLAYBACK_SPEEDS = [0.75, 1.0, 1.25, 1.5, 2.0];

export function VoiceRecorderTab() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [currentDecibels, setCurrentDecibels] = useState<number>(-60);
  const [selectedCategory, setSelectedCategory] = useState<RecordingCategory>('note');

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | RecordingCategory>('all');
  const [filterFavorites, setFilterFavorites] = useState(false);

  // Playback state
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Recordings list
  const [recordings, setRecordings] = useState<SavedRecording[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      // Ensure backward-compatibility with previously saved items
      return parsed.map((item: any, idx: number) => ({
        ...item,
        category: item.category || 'note',
        isFavorite: !!item.isFavorite,
        peaks: item.peaks && item.peaks.length > 0 ? item.peaks : generatePseudoPeaks(idx + 1),
      }));
    } catch {
      return [];
    }
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const idleAnimRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const livePeaksRef = useRef<number[]>([]);
  const smoothedHeightsRef = useRef<number[]>(new Array(44).fill(0));

  // Helper to generate representative waveform peaks if not recorded
  function generatePseudoPeaks(seed = 1): number[] {
    const peaks: number[] = [];
    for (let i = 0; i < 36; i++) {
      const sinVal = Math.sin((i + seed) * 0.45);
      const cosVal = Math.cos((i + seed * 2) * 0.7);
      const val = 0.2 + Math.abs(sinVal * 0.5 + cosVal * 0.3);
      peaks.push(Math.max(0.12, Math.min(0.95, Number(val.toFixed(2)))));
    }
    return peaks;
  }

  // Save recordings to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recordings));
    } catch (e) {
      console.error('Failed to save recordings to localStorage:', e);
    }
  }, [recordings]);

  // Audio Playback Listeners
  useEffect(() => {
    const audio = audioElementRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setPlaybackTime(audio.currentTime);
    };

    const onEnded = () => {
      setActivePlayingId(null);
      setPlaybackTime(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  // Permissions updated listener from Android native bridge
  useEffect(() => {
    const onPermsUpdated = () => {
      setMicPermissionError(null);
    };
    window.addEventListener('permissions-updated', onPermsUpdated);
    return () => window.removeEventListener('permissions-updated', onPermsUpdated);
  }, []);

  // Update playback speed whenever selected
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioElementRef.current) {
      audioElementRef.current.playbackRate = speed;
    }
  };

  // Idle studio oscilloscope graph renderer - continuously animated so the bar is never empty!
  const startIdleVisualizer = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (idleAnimRef.current) cancelAnimationFrame(idleAnimRef.current);
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let offset = 0;
    const renderIdle = () => {
      offset += 0.012;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr))) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }

      const width = canvas.width;
      const height = canvas.height;
      if (width === 0 || height === 0) {
        idleAnimRef.current = requestAnimationFrame(renderIdle);
        return;
      }
      const centerY = height / 2;
      ctx.clearRect(0, 0, width, height);

      // Subtle center datum line
      ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
      ctx.fillRect(0, centerY - 0.5 * dpr, width, 1 * dpr);

      // Resting studio audio wave graph across the bar
      const numBars = 44;
      const barWidth = Math.max(3, (width / numBars) - 2.5 * dpr);
      for (let i = 0; i < numBars; i++) {
        const x = i * (barWidth + 2.5 * dpr);
        const wave = Math.sin(offset + i * 0.22) * 0.5 + Math.cos(offset * 0.7 + i * 0.15) * 0.5;
        const halfHeight = Math.max(2 * dpr, (3 + Math.abs(wave) * 6) * dpr);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(x, centerY - halfHeight, barWidth, halfHeight * 2, [barWidth / 2]);
          ctx.fill();
        } else {
          ctx.fillRect(x, centerY - halfHeight, barWidth, halfHeight * 2);
        }
      }

      // Smooth central wave thread
      ctx.beginPath();
      for (let i = 0; i < width; i += 4) {
        const y = centerY + Math.sin(offset + (i / width) * 8) * (4 * dpr);
        if (i === 0) ctx.moveTo(i, y);
        else ctx.lineTo(i, y);
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1 * dpr;
      ctx.stroke();

      idleAnimRef.current = requestAnimationFrame(renderIdle);
    };

    renderIdle();
  };

  // High-DPI Live Visualizer Loop for active recording
  const startVisualizer = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (idleAnimRef.current) cancelAnimationFrame(idleAnimRef.current);
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    if (!ctx) return;

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const freqArray = new Uint8Array(bufferLength);
    const timeArray = new Uint8Array(analyser.fftSize);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(freqArray);
      analyser.getByteTimeDomainData(timeArray);

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr))) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }

      const width = canvas.width;
      const height = canvas.height;
      if (width === 0 || height === 0) return;
      const centerY = height / 2;
      ctx.clearRect(0, 0, width, height);

      // Compute RMS decibel level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const normalized = freqArray[i] / 255;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / bufferLength);
      const db = Math.max(-60, Math.round(20 * Math.log10(rms || 0.001)));
      setCurrentDecibels(db);

      // Record peak samples periodically
      if (Math.random() < 0.25) {
        livePeaksRef.current.push(Math.max(0.12, Math.min(1.0, Number((rms * 1.8).toFixed(2)))));
      }

      // Draw subtle specular horizontal center beam
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(0, centerY - 0.5 * dpr, width, 1 * dpr);

      // 1. Render dynamic frequency spectrum bars with EMA smoothing
      const numBars = 44;
      const barWidth = Math.max(3, width / numBars - 3 * dpr);

      for (let i = 0; i < numBars; i++) {
        const binIndex = Math.floor((i / numBars) * (bufferLength * 0.85));
        const rawValue = freqArray[binIndex] || 0;
        const normalized = rawValue / 255;
        const targetHalfHeight = Math.max(2.5 * dpr, normalized * height * 0.44);
        smoothedHeightsRef.current[i] += (targetHalfHeight - (smoothedHeightsRef.current[i] || 0)) * 0.30;
        const halfHeight = smoothedHeightsRef.current[i];
        const x = i * (barWidth + 3 * dpr);
        const y = centerY - halfHeight;
        const fullHeight = halfHeight * 2;

        // Sleek monochrome studio gradient: pure silver-white to slate
        const grad = ctx.createLinearGradient(0, y, 0, y + fullHeight);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.5, '#cbd5e1');
        grad.addColorStop(1, '#64748b');

        ctx.fillStyle = grad;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, fullHeight, [barWidth / 2]);
        } else {
          ctx.rect(x, y, barWidth, fullHeight);
        }
        ctx.fill();
      }

      // 2. Render live voice waveform line over the bars
      ctx.beginPath();
      const sliceWidth = width / timeArray.length;
      let waveX = 0;
      for (let i = 0; i < timeArray.length; i++) {
        const v = timeArray[i] / 128.0; // 1.0 is center
        const waveY = centerY + (v - 1.0) * (height * 0.40);
        if (i === 0) {
          ctx.moveTo(waveX, waveY);
        } else {
          ctx.lineTo(waveX, waveY);
        }
        waveX += sliceWidth;
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.5 * dpr;
      ctx.stroke();
    };

    render();
  };

  // Keep canvas visualizer state in sync with recording lifecycle
  useEffect(() => {
    if (isRecording && !isPaused) {
      startVisualizer();
    } else {
      startIdleVisualizer();
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (idleAnimRef.current) {
        cancelAnimationFrame(idleAnimRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // Window resize observer for high-DPI canvas
  useEffect(() => {
    const handleResize = () => {
      if (isRecording && !isPaused) {
        startVisualizer();
      } else {
        startIdleVisualizer();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isRecording, isPaused]);

  const handleGrantMicPermission = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await requestAudioPermissionNative();
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicPermissionError(null);
      startRecording();
    } catch {
      if (Capacitor.isNativePlatform()) {
        await openAppDetailsSettingsNative();
      }
    }
  };

  const startRecording = async () => {
    setMicPermissionError(null);
    setSaveSuccessNotice(null);
    livePeaksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.smoothingTimeConstant = 0.78;
      source.connect(analyser);
      analyserRef.current = analyser;

      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;

          // Normalize recorded peaks to 36 bars
          let peaks = livePeaksRef.current;
          if (peaks.length < 36) {
            peaks = generatePseudoPeaks(recordings.length + 1);
          } else {
            const step = peaks.length / 36;
            const resampled: number[] = [];
            for (let i = 0; i < 36; i++) {
              const idx = Math.min(peaks.length - 1, Math.floor(i * step));
              resampled.push(peaks[idx]);
            }
            peaks = resampled;
          }

          const defaultLabel =
            RECORDING_CATEGORIES[selectedCategory]?.label || 'Voice Note';
          const newRecording: SavedRecording = {
            id: `rec_${Date.now()}`,
            name: `${defaultLabel} ${recordings.length + 1}`,
            timestamp: new Date().toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            durationSec: recordingSeconds || 1,
            dataUrl: base64Audio,
            mimeType: mimeType,
            sizeBytes: audioBlob.size,
            category: selectedCategory,
            isFavorite: false,
            peaks,
          };

          setRecordings((prev) => [newRecording, ...prev]);
          setSaveSuccessNotice(
            `Saved "${newRecording.name}".`
          );
        };

        // Stop stream tracks
        stream.getTracks().forEach((track) => track.stop());
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      startVisualizer();
    } catch (err: any) {
      console.error('Microphone error:', err);
      setMicPermissionError(
        'Microphone permission is needed to record audio.'
      );
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
      startVisualizer();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      setRecordingSeconds(0);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const playRecording = (rec: SavedRecording) => {
    if (!audioElementRef.current) return;
    if (activePlayingId === rec.id) {
      audioElementRef.current.pause();
      setActivePlayingId(null);
    } else {
      audioElementRef.current.src = rec.dataUrl;
      audioElementRef.current.playbackRate = playbackSpeed;
      audioElementRef.current.play();
      setActivePlayingId(rec.id);
    }
  };

  // Interactive Waveform Seek
  const handleWaveformSeek = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    rec: SavedRecording
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const ratio = clickX / rect.width;
    const targetSeconds = ratio * (rec.durationSec || 1);

    if (activePlayingId === rec.id && audioElementRef.current) {
      audioElementRef.current.currentTime = targetSeconds;
      setPlaybackTime(targetSeconds);
    } else {
      if (audioElementRef.current) {
        audioElementRef.current.src = rec.dataUrl;
        audioElementRef.current.currentTime = targetSeconds;
        audioElementRef.current.playbackRate = playbackSpeed;
        audioElementRef.current.play();
        setActivePlayingId(rec.id);
        setPlaybackTime(targetSeconds);
      }
    }
  };

  const deleteRecording = (id: string) => {
    if (activePlayingId === id && audioElementRef.current) {
      audioElementRef.current.pause();
      setActivePlayingId(null);
    }
    setRecordings((prev) => prev.filter((r) => r.id !== id));
  };

  const toggleFavorite = (id: string) => {
    setRecordings((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isFavorite: !r.isFavorite } : r))
    );
  };

  const saveRename = (id: string) => {
    if (!editingName.trim()) return;
    setRecordings((prev) =>
      prev.map((r) => (r.id === id ? { ...r, name: editingName.trim() } : r))
    );
    setEditingId(null);
  };

  // Direct export to Phone Public Storage in Documents/nTools/Recordings/
  const downloadToPhoneStorage = async (rec: SavedRecording) => {
    try {
      const response = await fetch(rec.dataUrl);
      const blob = await response.blob();
      const ext = rec.mimeType.includes('mp4') ? 'm4a' : 'webm';
      const cleanFileName = `${rec.name.replace(/\s+/g, '_')}.${ext}`;

      await saveAndDownloadFile(
        blob,
        cleanFileName,
        rec.mimeType,
        'Recordings'
      );
    } catch (err: any) {
      console.error('Failed to export recording to phone storage:', err);
      showToast('Export Error', 'Could not save audio to phone storage', 'error');
    }
  };

  const shareRecording = async (rec: SavedRecording) => {
    try {
      if (Capacitor.isNativePlatform()) {
        const response = await fetch(rec.dataUrl);
        const blob = await response.blob();
        const ext = rec.mimeType.includes('mp4') ? 'm4a' : 'webm';
        await saveAndDownloadFile(
          blob,
          `${rec.name.replace(/\s+/g, '_')}.${ext}`,
          rec.mimeType,
          'Recordings'
        );
      } else if (navigator.share) {
        await navigator.share({
          title: rec.name,
          text: `Voice recording: ${rec.name} (${formatSecs(rec.durationSec)})`,
        });
      } else {
        downloadToPhoneStorage(rec);
      }
    } catch (_) {
      downloadToPhoneStorage(rec);
    }
  };

  const formatSecs = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = Math.floor(totalSecs % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Filtered list of recordings
  const filteredRecordings = useMemo(() => {
    return recordings.filter((rec) => {
      if (filterCategory !== 'all' && rec.category !== filterCategory) return false;
      if (filterFavorites && !rec.isFavorite) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          rec.name.toLowerCase().includes(q) ||
          rec.timestamp.toLowerCase().includes(q) ||
          RECORDING_CATEGORIES[rec.category]?.label.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [recordings, filterCategory, filterFavorites, searchQuery]);

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-24">
      {/* Hidden audio element for playback */}
      <audio ref={audioElementRef} className="hidden" />

      {/* Header */}
      <div className="p-4 sm:p-5 rounded-3xl liquid-glass liquid-specular shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-white/10 dark:bg-white/10 text-slate-800 dark:text-slate-100 flex items-center justify-center shrink-0 shadow-sm border border-white/15">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Voice Recorder
            </h2>
          </div>
        </div>
      </div>

      {/* Mic Permission Error Alert */}
      {micPermissionError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-600 dark:text-rose-300 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{micPermissionError}</p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleGrantMicPermission}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition active:scale-95 shadow-sm"
            >
              Grant Permission
            </button>
            <button
              type="button"
              onClick={() => openAppDetailsSettingsNative()}
              className="px-3 py-1.5 rounded-xl liquid-glass-btn text-slate-700 dark:text-slate-200 font-bold text-xs transition active:scale-95 border border-black/10 dark:border-white/10"
            >
              Settings
            </button>
            <button
              type="button"
              onClick={() => setMicPermissionError(null)}
              className="p-1 hover:text-rose-800 dark:hover:text-rose-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Save Success Notice */}
      {saveSuccessNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2.5 text-emerald-600 dark:text-emerald-300 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{saveSuccessNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessNotice(null)}
            className="p-1 hover:text-emerald-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Studio Minimalist Voice Recording Console */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0d0f14] dark:bg-[#090a0e] border border-white/10 shadow-2xl flex flex-col items-center justify-center text-center space-y-6 select-none">
        {/* Status Pill */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 shadow-sm">
            {isRecording ? (
              isPaused ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span className="text-slate-300 font-mono font-bold tracking-wider uppercase text-[11px]">PAUSED</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-white" />
                  <span className="text-white font-mono font-bold tracking-widest uppercase text-[11px]">RECORDING</span>
                </>
              )
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <span className="text-slate-400 text-[11px] font-medium">Ready • Studio 48kHz</span>
              </>
            )}
          </div>

          <div>
            <span className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white drop-shadow-sm">
              {formatSecs(recordingSeconds)}
            </span>
          </div>
        </div>

        {/* Studio Live Voice Oscilloscope & Frequency Spectrum Graph */}
        <div className="w-full max-w-lg h-24 bg-black/60 rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden p-2 relative shadow-inner">
          <canvas
            ref={canvasRef}
            className="w-full h-full block"
          />
        </div>

        {/* Recording Controls */}
        <div className="flex items-center justify-center pt-1">
          {!isRecording ? (
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={startRecording}
                className="px-8 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white flex items-center gap-3 shadow-xl active:scale-95 transition-all cursor-pointer group"
                title="Start Recording"
              >
                <Mic className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                <span className="text-sm font-black tracking-wider uppercase">Start Recording</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
              {/* Cancel / Discard */}
              <button
                type="button"
                onClick={cancelRecording}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs flex items-center gap-2 active:scale-95 transition cursor-pointer shadow-sm"
                title="Discard Recording"
              >
                <Trash2 className="w-4 h-4" />
                <span>Discard</span>
              </button>

              {/* Pause / Resume */}
              <button
                type="button"
                onClick={isPaused ? resumeRecording : pauseRecording}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs flex items-center gap-2 active:scale-95 transition cursor-pointer shadow-md"
                title={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? (
                  <>
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Pause</span>
                  </>
                )}
              </button>

              {/* Stop & Save */}
              <button
                type="button"
                onClick={stopRecording}
                className="px-6 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-black text-xs flex items-center gap-2 active:scale-95 transition shadow-lg cursor-pointer"
                title="Finish & Save"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Finish &amp; Save</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Saved Recordings Suite */}
      <div className="space-y-3.5">
        {/* Filter, Search & Speed Bar */}
        <div className="p-3 sm:p-4 rounded-2xl liquid-glass liquid-specular shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search recordings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl liquid-glass-input text-xs font-semibold outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Playback Speed Pill */}
            <div className="flex items-center gap-1 self-end sm:self-auto shrink-0">
              <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
                <Volume2 className="w-3 h-3" /> Speed:
              </span>
              {PLAYBACK_SPEEDS.map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => handleSpeedChange(spd)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold transition active:scale-95 ${
                    playbackSpeed === spd
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                      : 'liquid-glass-btn text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
            <button
              type="button"
              onClick={() => {
                setFilterCategory('all');
                setFilterFavorites(false);
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition active:scale-95 ${
                filterCategory === 'all' && !filterFavorites
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'liquid-glass-btn text-slate-600 dark:text-slate-300'
              }`}
            >
              All ({recordings.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterFavorites((prev) => !prev)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition active:scale-95 flex items-center gap-1 ${
                filterFavorites
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'liquid-glass-btn text-slate-600 dark:text-slate-300'
              }`}
            >
              <Star className="w-3 h-3 fill-current" />
              Starred
            </button>

            {(Object.keys(RECORDING_CATEGORIES) as RecordingCategory[]).map((cat) => {
              const info = RECORDING_CATEGORIES[cat];
              const count = recordings.filter((r) => r.category === cat).length;
              const isActive = filterCategory === cat && !filterFavorites;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setFilterCategory(cat);
                    setFilterFavorites(false);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition active:scale-95 flex items-center gap-1.5 ${
                    isActive
                      ? `${info.badge} border shadow-sm`
                      : 'liquid-glass-btn text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${info.dot}`} />
                  {info.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Empty State */}
        {filteredRecordings.length === 0 ? (
          <div className="p-8 rounded-3xl liquid-glass-card liquid-specular text-center space-y-2">
            <AudioWaveform className="w-9 h-9 text-slate-400 mx-auto opacity-40" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              No voice recordings found
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              {recordings.length === 0
                ? 'Tap the microphone button above to start recording.'
                : 'Try clearing your search or filter to view all recordings.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRecordings.map((rec) => {
              const isPlaying = activePlayingId === rec.id;
              const catInfo = RECORDING_CATEGORIES[rec.category] || RECORDING_CATEGORIES.note;
              const progressPercent = isPlaying
                ? Math.min(100, (playbackTime / (rec.durationSec || 1)) * 100)
                : 0;

              return (
                <div
                  key={rec.id}
                  className={`p-4 sm:p-5 rounded-2xl liquid-glass-card liquid-specular border transition-all duration-200 shadow-sm ${
                    isPlaying
                      ? 'border-slate-500 dark:border-slate-400 shadow-sm'
                      : 'border-black/5 dark:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Play/Pause Button */}
                    <button
                      type="button"
                      onClick={() => playRecording(rec)}
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition active:scale-95 cursor-pointer border ${
                        isPlaying
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-sm'
                          : 'liquid-glass-btn text-slate-800 dark:text-slate-200 border-black/10 dark:border-white/10'
                      }`}
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      )}
                    </button>

                    {/* Title & Metadata */}
                    <div className="min-w-0 flex-1">
                      {editingId === rec.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveRename(rec.id)}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg liquid-glass-input text-slate-900 dark:text-slate-100 outline-none w-full"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => saveRename(rec.id)}
                            className="p-1 text-emerald-500 hover:text-emerald-600"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">
                            {rec.name}
                          </h4>
                          {isPlaying && (
                            <div className="flex items-end gap-0.5 h-3 px-1 py-0.5 rounded-md bg-slate-900/10 dark:bg-white/10 border border-slate-900/20 dark:border-white/20 shrink-0">
                              <div className="w-0.5 bg-slate-900 dark:bg-white rounded-full animate-soundbar-1" />
                              <div className="w-0.5 bg-slate-900 dark:bg-white rounded-full animate-soundbar-2" />
                              <div className="w-0.5 bg-slate-900 dark:bg-white rounded-full animate-soundbar-3" />
                              <div className="w-0.5 bg-slate-900 dark:bg-white rounded-full animate-soundbar-4" />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(rec.id);
                              setEditingName(rec.name);
                            }}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                            title="Rename"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>

                          {/* Star */}
                          <button
                            type="button"
                            onClick={() => toggleFavorite(rec.id)}
                            className={`transition ${
                              rec.isFavorite
                                ? 'text-amber-500 fill-current'
                                : 'text-slate-300 dark:text-slate-600 hover:text-amber-400'
                            }`}
                            title="Star Recording"
                          >
                            <Star className={`w-3.5 h-3.5 ${rec.isFavorite ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                        {/* Category tag pill */}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${catInfo.badge}`}
                        >
                          {catInfo.label}
                        </span>
                        <span>•</span>
                        <span>{formatSecs(rec.durationSec)}</span>
                        <span>•</span>
                        <span>{formatSize(rec.sizeBytes)}</span>
                        <span>•</span>
                        <span>{rec.timestamp}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => shareRecording(rec)}
                        className="p-2 rounded-xl liquid-glass-btn text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white active:scale-95 transition cursor-pointer"
                        title="Share Audio"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadToPhoneStorage(rec)}
                        className="p-2 rounded-xl liquid-glass-btn text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white active:scale-95 transition cursor-pointer"
                        title="Save to Phone (Documents/nTools/Recordings)"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRecording(rec.id)}
                        className="p-2 rounded-xl liquid-glass-btn text-slate-400 hover:text-slate-900 dark:hover:text-white active:scale-95 transition cursor-pointer"
                        title="Delete Recording"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Interactive Waveform Scrubbing Bar */}
                  <div className="mt-3.5 pt-2 border-t border-black/5 dark:border-white/5">
                    <div
                      onClick={(e) => handleWaveformSeek(e, rec)}
                      onTouchStart={(e) => handleWaveformSeek(e, rec)}
                      className="w-full h-9 bg-black/5 dark:bg-black/30 rounded-xl px-2 flex items-center gap-1 cursor-pointer select-none relative group overflow-hidden"
                      title="Click or drag to seek in audio"
                    >
                      {/* Playback progress backdrop fill */}
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-slate-900/10 dark:bg-white/10 pointer-events-none transition-[width] duration-75"
                        style={{ width: `${progressPercent}%` }}
                      />

                      {/* Visual Waveform Peak Bars */}
                      {(rec.peaks || []).map((heightNorm, barIdx) => {
                        const barPercent = ((barIdx + 1) / (rec.peaks.length || 36)) * 100;
                        const isBarActive = isPlaying && barPercent <= progressPercent;

                        return (
                          <div
                            key={barIdx}
                            className="flex-1 flex items-center justify-center h-full pointer-events-none"
                          >
                            <div
                              className={`w-full rounded-full transition-colors duration-100 ${
                                isBarActive
                                  ? 'bg-slate-900 dark:bg-white'
                                  : 'bg-slate-300 dark:bg-slate-600 group-hover:bg-slate-400'
                              }`}
                              style={{
                                height: `${Math.max(12, Math.round(heightNorm * 26))}px`,
                              }}
                            />
                          </div>
                        );
                      })}

                      {/* Scrub Head Pin */}
                      {isPlaying && (
                        <div
                          className="absolute top-1 bottom-1 w-1 bg-slate-900 dark:bg-white rounded-full shadow-sm pointer-events-none"
                          style={{ left: `${progressPercent}%` }}
                        />
                      )}
                    </div>

                    {/* Progress Timestamps */}
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400 mt-1 px-1">
                      <span>{isPlaying ? formatSecs(playbackTime) : '00:00'}</span>
                      <span>{formatSecs(rec.durationSec)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

