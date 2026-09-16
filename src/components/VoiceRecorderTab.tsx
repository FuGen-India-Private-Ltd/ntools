import React, { useState, useEffect, useRef } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

interface SavedRecording {
  id: string;
  name: string;
  timestamp: string;
  durationSec: number;
  dataUrl: string;
  mimeType: string;
  sizeBytes: number;
}

const STORAGE_KEY = 'ntools_saved_voice_recordings';

export function VoiceRecorderTab() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordings, setRecordings] = useState<SavedRecording[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Save recordings to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recordings));
    } catch (e) {
      console.error('Failed to save recordings to localStorage:', e);
    }
  }, [recordings]);

  // Audio Playback Listener
  useEffect(() => {
    const audio = audioElementRef.current;
    if (!audio) return;

    const onEnded = () => {
      setActivePlayingId(null);
    };

    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  // Visualizer loop for active recording
  const startVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    analyser.fftSize = 64;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 1.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.9;

        // Dynamic neon gradient
        const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
        grad.addColorStop(0, '#f43f5e'); // rose-500
        grad.addColorStop(1, '#fb7185'); // rose-400

        ctx.fillStyle = grad;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);

        x += barWidth;
      }
    };

    render();
  };

  const startRecording = async () => {
    setMicPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up Web Audio Analyser
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
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
          const newRecording: SavedRecording = {
            id: `rec_${Date.now()}`,
            name: `Voice Note ${recordings.length + 1}`,
            timestamp: new Date().toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            durationSec: recordingSeconds,
            dataUrl: base64Audio,
            mimeType: mimeType,
            sizeBytes: audioBlob.size,
          };
          setRecordings((prev) => [newRecording, ...prev]);
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
      audioElementRef.current.play();
      setActivePlayingId(rec.id);
    }
  };

  const deleteRecording = (id: string) => {
    if (activePlayingId === id && audioElementRef.current) {
      audioElementRef.current.pause();
      setActivePlayingId(null);
    }
    setRecordings((prev) => prev.filter((r) => r.id !== id));
  };

  const saveRename = (id: string) => {
    if (!editingName.trim()) return;
    setRecordings((prev) =>
      prev.map((r) => (r.id === id ? { ...r, name: editingName.trim() } : r))
    );
    setEditingId(null);
  };

  const downloadRecording = (rec: SavedRecording) => {
    const a = document.createElement('a');
    a.href = rec.dataUrl;
    const ext = rec.mimeType.includes('mp4') ? 'mp4' : 'webm';
    a.download = `${rec.name.replace(/\s+/g, '_')}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const shareRecording = async (rec: SavedRecording) => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({
          title: rec.name,
          text: `Voice recording: ${rec.name} (${formatSecs(rec.durationSec)})`,
          dialogTitle: 'Share Voice Recording',
        });
      } else if (navigator.share) {
        await navigator.share({
          title: rec.name,
          text: `Voice recording: ${rec.name}`,
        });
      } else {
        downloadRecording(rec);
      }
    } catch (_) {
      downloadRecording(rec);
    }
  };

  const formatSecs = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Hidden audio element for playback */}
      <audio ref={audioElementRef} className="hidden" />

      {/* Header Banner */}
      <div className="p-4 sm:p-6 rounded-3xl liquid-glass liquid-specular border border-black/10 dark:border-white/10 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0 shadow-sm">
            <Mic className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Voice Recorder
              </h2>
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                HD Audio
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Record voice notes, lectures &amp; ideas with live visualizer and instant export.
            </p>
          </div>
        </div>
      </div>

      {/* Error alert if mic permission failed */}
      {micPermissionError && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-600 dark:text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{micPermissionError}</p>
        </div>
      )}

      {/* Recording Studio Card */}
      <div className="p-6 rounded-3xl liquid-glass liquid-specular border border-black/10 dark:border-white/10 shadow-sm flex flex-col items-center justify-center text-center space-y-5">
        {/* Animated Timer */}
        <div className="space-y-1">
          <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-slate-900 dark:text-slate-100">
            {formatSecs(recordingSeconds)}
          </span>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
            {isRecording ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="text-rose-500 font-extrabold uppercase tracking-wider">
                  {isPaused ? 'Recording Paused' : 'Live Recording...'}
                </span>
              </>
            ) : (
              'Ready to Record'
            )}
          </p>
        </div>

        {/* Live Audio Visualizer Canvas */}
        <div className="w-full max-w-md h-16 bg-black/5 dark:bg-black/40 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-center overflow-hidden p-2">
          {isRecording ? (
            <canvas ref={canvasRef} width={400} height={60} className="w-full h-full" />
          ) : (
            <div className="flex items-center gap-1 opacity-20">
              <AudioWaveform className="w-6 h-6 text-slate-400" />
              <span className="text-xs font-semibold text-slate-400">Waveform will appear while speaking</span>
            </div>
          )}
        </div>

        {/* Recording Control Action Buttons */}
        <div className="flex items-center justify-center gap-4 pt-2">
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 active:scale-95 transition-all cursor-pointer"
              title="Start Recording"
            >
              <Mic className="w-8 h-8 sm:w-9 sm:h-9" />
            </button>
          ) : (
            <>
              {/* Cancel Button */}
              <button
                type="button"
                onClick={cancelRecording}
                className="w-12 h-12 rounded-full liquid-glass-btn text-slate-500 hover:text-rose-500 flex items-center justify-center active:scale-95 transition cursor-pointer"
                title="Discard Recording"
              >
                <Trash2 className="w-5 h-5" />
              </button>

              {/* Pause / Resume Button */}
              {isPaused ? (
                <button
                  type="button"
                  onClick={resumeRecording}
                  className="w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-md active:scale-95 transition cursor-pointer"
                  title="Resume Recording"
                >
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={pauseRecording}
                  className="w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-md active:scale-95 transition cursor-pointer"
                  title="Pause Recording"
                >
                  <Pause className="w-6 h-6" />
                </button>
              )}

              {/* Stop & Save Button */}
              <button
                type="button"
                onClick={stopRecording}
                className="w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 active:scale-95 transition cursor-pointer"
                title="Finish & Save Recording"
              >
                <Square className="w-7 h-7 fill-current" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Saved Recordings Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Saved Recordings
            </h3>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300">
              {recordings.length}
            </span>
          </div>
        </div>

        {recordings.length === 0 ? (
          <div className="p-8 rounded-3xl liquid-glass-card liquid-specular text-center space-y-2">
            <AudioWaveform className="w-8 h-8 text-slate-400 mx-auto opacity-40" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
              No voice recordings yet
            </p>
            <p className="text-[11px] text-slate-400">
              Tap the red microphone button above to record your first audio note.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recordings.map((rec) => {
              const isPlaying = activePlayingId === rec.id;

              return (
                <div
                  key={rec.id}
                  className="p-4 rounded-2xl liquid-glass-card liquid-specular border border-black/5 dark:border-white/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Play/Pause Button */}
                    <button
                      type="button"
                      onClick={() => playRecording(rec)}
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition active:scale-95 cursor-pointer ${
                        isPlaying
                          ? 'bg-rose-500 text-white'
                          : 'liquid-glass-accent text-slate-900 dark:text-slate-100'
                      }`}
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      {editingId === rec.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveRename(rec.id)}
                            className="px-2 py-1 text-xs font-bold rounded-lg bg-black/10 dark:bg-white/10 text-slate-900 dark:text-slate-100 outline-none w-full"
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
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
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
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                        <span>{formatSecs(rec.durationSec)}</span>
                        <span>•</span>
                        <span>{formatSize(rec.sizeBytes)}</span>
                        <span>•</span>
                        <span>{rec.timestamp}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Download, Share, Delete */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
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
                      onClick={() => downloadRecording(rec)}
                      className="p-2 rounded-xl liquid-glass-btn text-slate-600 dark:text-slate-300 hover:text-rose-500 active:scale-95 transition cursor-pointer"
                      title="Download Audio"
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
