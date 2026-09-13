// 100% Client-Side High-Energy Alarm & Sound Engine
// Features authentic continuous looping alarms (Twin Bell, Digital Siren, Escalating Anthem, Morning Rooster) + Custom MP3 playback

export type BuiltinAlarmSound =
  | 'crystal_zen'
  | 'celestial_marimba'
  | 'cyber_pulse'
  | 'radiant_bell'
  | 'lofi_sunrise'
  | 'twin_bell'
  | 'digital_siren'
  | 'energetic_anthem'
  | 'rooster_dawn'
  | 'custom_music';

export interface AlarmSoundOption {
  id: BuiltinAlarmSound;
  name: string;
  desc: string;
  tag: string;
}

export const BUILTIN_ALARM_SOUNDS: AlarmSoundOption[] = [
  {
    id: 'crystal_zen',
    name: 'Crystal Zen Chimes',
    desc: 'Calming glass harmonic crystal arpeggios for peaceful awakening',
    tag: 'Modern Ambient',
  },
  {
    id: 'celestial_marimba',
    name: 'Celestial Marimba',
    desc: 'Crisp wooden acoustic marimba with snappy percussive groove',
    tag: 'Modern Acoustic',
  },
  {
    id: 'cyber_pulse',
    name: 'Neon Cyber Pulse',
    desc: 'High-energy electronic synth arp with sub-bass kick',
    tag: 'Electronic Energy',
  },
  {
    id: 'radiant_bell',
    name: 'Radiant Bell Chime',
    desc: 'Bright multi-voice bell chords with sparkling acoustic resonance',
    tag: 'Polyphonic Bell',
  },
  {
    id: 'lofi_sunrise',
    name: 'Lo-Fi Morning Rhodes',
    desc: 'Warm electric piano jazz chords with mellow relaxing vibe',
    tag: 'Chill Sunrise',
  },
  {
    id: 'twin_bell',
    name: 'Twin Bell Alarm',
    desc: 'Loud classic bedside physical bell with rapid clapper ringing',
    tag: 'Classic Loud',
  },
  {
    id: 'digital_siren',
    name: 'Digital Siren',
    desc: 'High-energy 4-burst electronic wake-up beep siren for heavy sleepers',
    tag: 'Emergency Loud',
  },
  {
    id: 'energetic_anthem',
    name: 'Sunrise Synth Melody',
    desc: 'Continuous upbeat escalating melodic chords to start your morning',
    tag: 'Melodic Upbeat',
  },
  {
    id: 'rooster_dawn',
    name: 'Morning Rooster & Chime',
    desc: 'Crisp morning rooster crow with bright sunrise acoustic resonance',
    tag: 'Nature Wake-Up',
  },
  {
    id: 'custom_music',
    name: 'Custom Device Music / Song',
    desc: 'Choose your own MP3, WAV, or AAC audio file from device storage',
    tag: 'Your Music',
  },
];

class AlarmSoundEngine {
  private ctx: AudioContext | null = null;
  private activeInterval: any = null;
  private customAudioElem: HTMLAudioElement | null = null;
  private isCurrentlyPlaying = false;
  private currentPlayingId: string | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Stop any currently running alarm sound or custom music preview
  stopCurrentAlarm() {
    if (this.activeInterval) {
      clearInterval(this.activeInterval);
      this.activeInterval = null;
    }
    if (this.customAudioElem) {
      this.customAudioElem.pause();
      this.customAudioElem.currentTime = 0;
      this.customAudioElem = null;
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(0);
      } catch {}
    }
    this.isCurrentlyPlaying = false;
    this.currentPlayingId = null;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('alarm-sound-stopped'));
    }
  }

  isPlaying(): boolean {
    return this.isCurrentlyPlaying;
  }

  getCurrentPlayingId(): string | null {
    return this.currentPlayingId;
  }

  // 1. Classic Twin-Bell Physical Clapper (Authentic Bedside Bell Ringing)
  private triggerTwinBellCycle() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // 14 rapid hammer strikes per second (alternating between left bell 2040Hz and right bell 3180Hz)
      const numStrikes = 12;
      for (let i = 0; i < numStrikes; i++) {
        const strikeTime = now + i * 0.07;
        const isLeftBell = i % 2 === 0;
        const fundamentalFreq = isLeftBell ? 2040 : 3180;
        const harmonicFreq = isLeftBell ? 4080 : 6360;

        // Primary Bell Resonance
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(fundamentalFreq, strikeTime);

        gain.gain.setValueAtTime(0.35, strikeTime);
        gain.gain.exponentialRampToValueAtTime(0.001, strikeTime + 0.065);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(strikeTime);
        osc.stop(strikeTime + 0.07);

        // High Metallic Clapper Overtones
        const harmOsc = ctx.createOscillator();
        const harmGain = ctx.createGain();
        harmOsc.type = 'sine';
        harmOsc.frequency.setValueAtTime(harmonicFreq, strikeTime);

        harmGain.gain.setValueAtTime(0.18, strikeTime);
        harmGain.gain.exponentialRampToValueAtTime(0.001, strikeTime + 0.04);

        harmOsc.connect(harmGain);
        harmGain.connect(ctx.destination);
        harmOsc.start(strikeTime);
        harmOsc.stop(strikeTime + 0.05);
      }
    } catch (e) {
      console.warn('Twin bell audio error:', e);
    }
  }

  // 2. High-Power Digital Siren (4-Beep Piercing Rapid Alarm)
  private triggerDigitalSirenCycle() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // 4 loud rapid square/sine pulses
      const pulses = [0, 0.12, 0.24, 0.36];
      pulses.forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(1020, now + offset);
        osc.frequency.setValueAtTime(1240, now + offset + 0.05);

        gain.gain.setValueAtTime(0.28, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.095);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.10);
      });
    } catch (e) {
      console.warn('Digital siren audio error:', e);
    }
  }

  // 3. Energetic Upbeat Melodic Synth Chords
  private triggerEnergeticAnthemCycle() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Upbeat Arpeggio: C5 -> E5 -> G5 -> B5 -> C6 -> G5 -> E5 -> C5
      const notes = [523.25, 659.25, 783.99, 987.77, 1046.5, 783.99, 659.25, 523.25];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.11);

        gain.gain.setValueAtTime(0.25, now + idx * 0.11);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.16);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.11);
        osc.stop(now + idx * 0.11 + 0.17);
      });
    } catch (e) {
      console.warn('Anthem audio error:', e);
    }
  }

  // 4. Morning Rooster Crow + Bright Sunrise Chime
  private triggerRoosterDawnCycle() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Rooster crow pitch bends (Cock-a-doodle-doo contour)
      const segments = [
        { start: 0, dur: 0.18, fStart: 580, fEnd: 720 },
        { start: 0.22, dur: 0.22, fStart: 620, fEnd: 840 },
        { start: 0.48, dur: 0.25, fStart: 750, fEnd: 960 },
        { start: 0.76, dur: 0.55, fStart: 1020, fEnd: 740 },
      ];

      segments.forEach((seg) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(seg.fStart, now + seg.start);
        osc.frequency.exponentialRampToValueAtTime(seg.fEnd, now + seg.start + seg.dur);

        gain.gain.setValueAtTime(0.22, now + seg.start);
        gain.gain.exponentialRampToValueAtTime(0.001, now + seg.start + seg.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + seg.start);
        osc.stop(now + seg.start + seg.dur + 0.02);
      });
    } catch (e) {
      console.warn('Rooster audio error:', e);
    }
  }

  // 5. Modern Crystal Zen Chimes (Ethereal Ambient Morning Awakening)
  private triggerCrystalZenCycle() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      // D5 (587.33), F#5 (739.99), A5 (880), C#6 (1108.73), E6 (1318.51)
      const notes = [587.33, 739.99, 880.0, 1108.73, 1318.51];
      notes.forEach((freq, idx) => {
        const time = now + idx * 0.16;

        // Fundamental pure tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.24, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.95);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 1.0);

        // Glass crystalline harmonic overtone (f * 2.76)
        const harm = ctx.createOscillator();
        const harmGain = ctx.createGain();
        harm.type = 'sine';
        harm.frequency.setValueAtTime(freq * 2.76, time);

        harmGain.gain.setValueAtTime(0, time);
        harmGain.gain.linearRampToValueAtTime(0.08, time + 0.015);
        harmGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.45);

        harm.connect(harmGain);
        harmGain.connect(ctx.destination);
        harm.start(time);
        harm.stop(time + 0.5);
      });
    } catch (e) {
      console.warn('Crystal zen audio error:', e);
    }
  }

  // 6. Modern Neon Cyber Pulse (High-Energy Synthwave Bass & Lead Arp)
  private triggerCyberPulseCycle() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Punchy Sub-Bass Kick at downbeat
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(140, now);
      bassOsc.frequency.exponentialRampToValueAtTime(45, now + 0.22);
      bassGain.gain.setValueAtTime(0.38, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      bassOsc.connect(bassGain);
      bassGain.connect(ctx.destination);
      bassOsc.start(now);
      bassOsc.stop(now + 0.26);

      // Rapid Lead Synth Arpeggio: A4 (440), C5 (523.25), E5 (659.25), G5 (783.99), A5 (880), C6 (1046.5)
      const arp = [440, 523.25, 659.25, 783.99, 880, 1046.5];
      arp.forEach((freq, idx) => {
        const time = now + idx * 0.09;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2400, time);
        filter.frequency.exponentialRampToValueAtTime(600, time + 0.12);

        gain.gain.setValueAtTime(0.22, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + 0.15);
      });
    } catch (e) {
      console.warn('Cyber pulse audio error:', e);
    }
  }

  // 7. Celestial Marimba (Crisp Wooden Acoustic Percussive Melody)
  private triggerCelestialMarimbaCycle() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Melodic phrase: F4 -> A4 -> C5 -> E5 -> G5 -> C6 -> E6
      const melody = [349.23, 440.0, 523.25, 659.25, 783.99, 1046.5, 1318.51];
      melody.forEach((freq, idx) => {
        const time = now + idx * 0.12;

        // Warm wooden strike body
        const bodyOsc = ctx.createOscillator();
        const bodyGain = ctx.createGain();
        bodyOsc.type = 'triangle';
        bodyOsc.frequency.setValueAtTime(freq, time);

        bodyGain.gain.setValueAtTime(0.32, time);
        bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

        bodyOsc.connect(bodyGain);
        bodyGain.connect(ctx.destination);
        bodyOsc.start(time);
        bodyOsc.stop(time + 0.30);

        // Resonant overtone (f * 4.0 - wooden bar physics)
        const resOsc = ctx.createOscillator();
        const resGain = ctx.createGain();
        resOsc.type = 'sine';
        resOsc.frequency.setValueAtTime(freq * 3.98, time);

        resGain.gain.setValueAtTime(0.12, time);
        resGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);

        resOsc.connect(resGain);
        resGain.connect(ctx.destination);
        resOsc.start(time);
        resOsc.stop(time + 0.09);
      });
    } catch (e) {
      console.warn('Celestial marimba audio error:', e);
    }
  }

  // 8. Radiant Ripple (Uplifting Polyphonic Bell Chime)
  private triggerRadiantBellCycle() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Multi-voice chord pairs: (E5, B5), (G#5, E6), (B5, G#6)
      const chords = [
        { f1: 659.25, f2: 987.77, delay: 0 },
        { f1: 830.61, f2: 1318.51, delay: 0.22 },
        { f1: 987.77, f2: 1661.22, delay: 0.44 },
      ];

      chords.forEach((chord) => {
        [chord.f1, chord.f2].forEach((freq) => {
          const time = now + chord.delay;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, time);

          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(0.20, time + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.85);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(time);
          osc.stop(time + 0.9);
        });
      });
    } catch (e) {
      console.warn('Radiant bell audio error:', e);
    }
  }

  // 9. Lo-Fi Morning Rhodes (Smooth Electric Piano Jazz Chords)
  private triggerLofiSunriseCycle() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Cmaj9 chord: C4 (261.63), E4 (329.63), G4 (392.00), B4 (493.88), D5 (587.33)
      const chordNotes = [261.63, 329.63, 392.00, 493.88, 587.33];
      chordNotes.forEach((freq, idx) => {
        const time = now + idx * 0.05; // slight strumming spread
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Mellow Rhodes-like timbre using sine with a lowpass filter
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.18, time + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 1.3);
      });
    } catch (e) {
      console.warn('Lo-Fi sunrise audio error:', e);
    }
  }

  // Soft Timer/Pomodoro Break Bell
  playBreakBell() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.8);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.85);
    } catch (e) {
      console.warn(e);
    }
  }

  // Soft Pomodoro Session Complete Chime
  playPomodoroComplete() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Harmonic Chord
      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.12);

        gain.gain.setValueAtTime(0, now + index * 0.12);
        gain.gain.linearRampToValueAtTime(0.25, now + index * 0.12 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.12);
        osc.stop(now + index * 0.12 + 1.3);
      });
    } catch (e) {
      console.warn(e);
    }
  }

  // Stopwatch / Timer Tick
  playTick() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {
      console.warn(e);
    }
  }

  playAlarmPulse() {
    this.triggerDigitalSirenCycle();
  }

  // Play full continuous looping alarm sound or user custom music
  playAlarm(soundType: BuiltinAlarmSound = 'twin_bell', customDataUrl?: string, soundId?: string) {
    this.stopCurrentAlarm();
    this.isCurrentlyPlaying = true;
    this.currentPlayingId = soundId || soundType;

    // Handle Custom Music Track Uploaded by User
    if (soundType === 'custom_music' && customDataUrl) {
      try {
        const audio = new Audio(customDataUrl);
        audio.loop = true;
        audio.volume = 1.0;
        audio.play().catch((err) => console.warn('Custom audio playback error:', err));
        this.customAudioElem = audio;
        return;
      } catch (e) {
        console.warn('Custom music error:', e);
      }
    }

    // Handle Built-in Continuous Alarm Loops
    switch (soundType) {
      case 'crystal_zen':
        this.triggerCrystalZenCycle();
        this.activeInterval = setInterval(() => this.triggerCrystalZenCycle(), 1400);
        break;

      case 'celestial_marimba':
        this.triggerCelestialMarimbaCycle();
        this.activeInterval = setInterval(() => this.triggerCelestialMarimbaCycle(), 1100);
        break;

      case 'cyber_pulse':
        this.triggerCyberPulseCycle();
        this.activeInterval = setInterval(() => this.triggerCyberPulseCycle(), 800);
        break;

      case 'radiant_bell':
        this.triggerRadiantBellCycle();
        this.activeInterval = setInterval(() => this.triggerRadiantBellCycle(), 1200);
        break;

      case 'lofi_sunrise':
        this.triggerLofiSunriseCycle();
        this.activeInterval = setInterval(() => this.triggerLofiSunriseCycle(), 1500);
        break;

      case 'twin_bell':
        this.triggerTwinBellCycle();
        this.activeInterval = setInterval(() => this.triggerTwinBellCycle(), 1100);
        break;

      case 'digital_siren':
        this.triggerDigitalSirenCycle();
        this.activeInterval = setInterval(() => this.triggerDigitalSirenCycle(), 750);
        break;

      case 'energetic_anthem':
        this.triggerEnergeticAnthemCycle();
        this.activeInterval = setInterval(() => this.triggerEnergeticAnthemCycle(), 1200);
        break;

      case 'rooster_dawn':
        this.triggerRoosterDawnCycle();
        this.activeInterval = setInterval(() => this.triggerRoosterDawnCycle(), 1800);
        break;

      default:
        this.triggerCrystalZenCycle();
        this.activeInterval = setInterval(() => this.triggerCrystalZenCycle(), 1400);
        break;
    }
  }
}

export const audioAlerts = new AlarmSoundEngine();
