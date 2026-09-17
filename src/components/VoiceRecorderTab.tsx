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
    badge: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    dot: 'bg-rose-500',
  },
  meeting: {
    label: 'Meeting',
    badge: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    dot: 'bg-blue-500',
  },
  lecture: {
    label: 'Lecture',
    badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    dot: 'bg-amber-500',
  },
  idea: {
    label: 'Idea',
    badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-500',
  },
  interview: {
    label: 'Interview',
    badge: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
    dot: 'bg-purple-500',
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const livePeaksRef = useRef<number[]>([]);

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

  // Update playback speed whenever selected
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioElementRef.current) {
      audioElementRef.current.playbackRate = speed;
    }
  };

  // Live Visualizer Loop for active recording
  const startVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    analyser.fftSize = 128; // 64 frequency bins
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      if (!ctx) return;
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Compute RMS decibel level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const normalized = dataArray[i] / 255;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / bufferLength);
      const db = Math.max(-60, Math.round(20 * Math.log10(rms || 0.001)));
      setCurrentDecibels(db);

      // Record peak samples periodically
      if (Math.random() < 0.25) {
        livePeaksRef.current.push(Math.max(0.12, Math.min(1.0, Number((rms * 1.8).toFixed(2)))));
      }

      // Render sleek multi-frequency spectrum bars
      const numBars = 48;
      const barWidth = width / numBars - 2;

      for (let i = 0; i < numBars; i++) {
        const binIndex = Math.floor((i / numBars) * (bufferLength * 0.85));
        const rawValue = dataArray[binIndex] || 0;
        const normalized = rawValue / 255;
        const barHeight = Math.max(4, normalized * height * 0.92);
        const x = i * (barWidth + 2);
        const y = height - barHeight;

        // Radiant liquid gradient: coral to amber to rose
        const grad = ctx.createLinearGradient(0, height, 0, 0);
        grad.addColorStop(0, '#f43f5e'); // rose-500
        grad.addColorStop(0.5, '#fb7185'); // rose-400
        grad.addColorStop(1, '#fbbf24'); // amber-400

        ctx.fillStyle = grad;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, Math.max(2, barWidth), barHeight, [3, 3, 0, 0]);
        } else {
          ctx.rect(x, y, Math.max(2, barWidth), barHeight);
        }
        ctx.fill();
      }
    };

    render();
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
            `Saved "${newRecording.name}". Ready in your recordings list.`
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
        'Microphone access was denied or not available. Please allow microphone permission in Android settings.'
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

      {/* Header Banner with Apple Liquid Glass styling */}
      <div className="p-4 sm:p-6 rounded-3xl liquid-glass liquid-specular shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0 shadow-sm border border-rose-500/20">
            <Mic className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Voice Recorder Studio
              </h2>
              <span className="text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                48 kHz HD
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              High-fidelity audio deck with live frequency visualizer &amp; public storage export.
            </p>
          </div>
        </div>

        {/* Storage Location Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl liquid-glass-btn text-[11px] font-bold text-slate-600 dark:text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-rose-500" />
          <span>Documents/nTools/Recordings</span>
        </div>
      </div>

      {/* Mic Permission Error Alert */}
      {micPermissionError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-600 dark:text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{micPermissionError}</p>
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

      {/* Liquid Glass Recording Console Card */}
      <div
        className={`p-6 sm:p-8 rounded-3xl liquid-glass-recording-deck liquid-specular transition-all duration-300 flex flex-col items-center justify-center text-center space-y-6 ${
          isRecording ? 'liquid-glass-recording-aura border-rose-500/40' : ''
        }`}
      >
        {/* Category Tag Selector (Pre-recording) */}
        {!isRecording && (
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 mr-1">Tag:</span>
            {(Object.keys(RECORDING_CATEGORIES) as RecordingCategory[]).map((cat) => {
              const info = RECORDING_CATEGORIES[cat];
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition active:scale-95 flex items-center gap-1.5 ${
                    isSelected
                      ? `${info.badge} border`
                      : 'liquid-glass-btn text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${info.dot}`} />
                  {info.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Animated Timer & Status Pill */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full liquid-glass-capsule text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm">
            {isRecording ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="text-rose-500 font-black tracking-wider uppercase">
                  {isPaused ? 'Recording Paused' : 'Live Recording'}
                </span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {currentDecibels > -50 ? `${currentDecibels} dB` : 'Quiet'}
                </span>
              </>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">
                Ready to Record • 48kHz HD Audio
              </span>
            )}
          </div>

          <div>
            <span className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-slate-900 dark:text-slate-100 drop-shadow-sm">
              {formatSecs(recordingSeconds)}
            </span>
          </div>
        </div>

        {/* Live Audio Frequency Spectrum Canvas */}
        <div className="w-full max-w-lg h-20 bg-black/5 dark:bg-black/40 rounded-2xl border border-black/5 dark:border-white/10 flex items-center justify-center overflow-hidden p-2 relative shadow-inner">
          {isRecording ? (
            <canvas
              ref={canvasRef}
              width={480}
              height={76}
              className="w-full h-full"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-1.5 opacity-30">
              <AudioWaveform className="w-7 h-7 text-slate-400" />
              <span className="text-xs font-semibold text-slate-400">
                Live frequency spectrum will pulse here while speaking
              </span>
            </div>
          )}
        </div>

        {/* Recording Controls */}
        <div className="flex items-center justify-center gap-5 pt-1">
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-gradient-to-tr from-rose-600 to-rose-400 hover:from-rose-500 hover:to-rose-400 text-white flex items-center justify-center shadow-xl shadow-rose-500/40 active:scale-95 transition-all cursor-pointer border border-white/25"
              title="Start Recording"
            >
              <Mic className="w-9 h-9 sm:w-10 sm:h-10 drop-shadow-sm" />
            </button>
          ) : (
            <>
              {/* Cancel / Discard */}
              <button
                type="button"
                onClick={cancelRecording}
                className="w-13 h-13 rounded-full liquid-glass-btn text-slate-500 hover:text-rose-500 flex items-center justify-center active:scale-95 transition cursor-pointer shadow-sm"
                title="Discard Recording"
              >
                <Trash2 className="w-5 h-5" />
              </button>

              {/* Pause / Resume */}
              {isPaused ? (
                <button
                  type="button"
                  onClick={resumeRecording}
                  className="w-15 h-15 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 active:scale-95 transition cursor-pointer border border-white/20"
                  title="Resume Recording"
                >
                  <Play className="w-7 h-7 fill-current ml-0.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={pauseRecording}
                  className="w-15 h-15 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 active:scale-95 transition cursor-pointer border border-white/20"
                  title="Pause Recording"
                >
                  <Pause className="w-7 h-7" />
                </button>
              )}

              {/* Stop & Save */}
              <button
                type="button"
                onClick={stopRecording}
                className="w-18 h-18 rounded-full bg-gradient-to-tr from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white flex items-center justify-center shadow-xl shadow-rose-500/40 active:scale-95 transition cursor-pointer border border-white/25"
                title="Finish & Save Recording"
              >
                <Square className="w-8 h-8 fill-current" />
              </button>
            </>
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
                      ? 'bg-rose-500 text-white shadow-sm'
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
                ? 'Tap the red microphone button above to record your first HD voice note.'
                : 'Try clearing your search or category filter to view all recordings.'}
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
                      ? 'border-rose-500/40 shadow-rose-500/10'
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
                          ? 'bg-rose-500 text-white border-rose-400 shadow-rose-500/30'
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
                        className="p-2 rounded-xl liquid-glass-btn text-slate-600 dark:text-slate-300 hover:text-rose-500 active:scale-95 transition cursor-pointer"
                        title="Share Audio"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadToPhoneStorage(rec)}
                        className="p-2 rounded-xl liquid-glass-btn text-slate-600 dark:text-slate-300 hover:text-rose-500 active:scale-95 transition cursor-pointer"
                        title="Save to Phone (Documents/nTools/Recordings)"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRecording(rec.id)}
                        className="p-2 rounded-xl liquid-glass-btn text-slate-400 hover:text-rose-500 active:scale-95 transition cursor-pointer"
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
                        className="absolute left-0 top-0 bottom-0 bg-rose-500/15 pointer-events-none transition-[width] duration-75"
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
                                  ? 'bg-rose-500'
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
                          className="absolute top-1 bottom-1 w-1 bg-rose-500 rounded-full shadow-md shadow-rose-500/50 pointer-events-none"
                          style={{ left: `${progressPercent}%` }}
                        />
                      )}
                    </div>

                    {/* Progress Timestamps */}
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400 mt-1 px-1">
                      <span>{isPlaying ? formatSecs(playbackTime) : '00:00'}</span>
                      <span className="text-[10px] font-sans font-semibold text-slate-400">
                        {isPlaying ? 'Playing • Click waveform to scrub' : 'Tap waveform to jump'}
                      </span>
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

