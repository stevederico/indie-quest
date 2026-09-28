import type { GameEvent } from '../game/types';

/** All sound is made with WebAudio oscillators and noise. No audio files. */

export type Track = 'none' | 'title' | 'cafe' | 'bali' | 'desert' | 'boss' | 'win';

interface Song {
  bpm: number;
  lead: string[];
  bass: string[];
  leadWave: OscillatorType;
}

function steps(bars: string): string[] {
  return bars.split(/[\s|]+/).filter(Boolean);
}

const CAFE_LEAD =
  'E5 - G5 E5 C5 - D5 E5 | F5 - A5 F5 D5 - E5 F5 | G5 - E5 G5 C6 - B5 A5 | G5 F5 E5 D5 C5 - - -';
const CAFE_BASS =
  'C3 - G3 - C3 - G3 - | F3 - C4 - F3 - C4 - | C3 - G3 - A3 - E3 - | G3 - G3 - C3 - G3 -';

const SONGS: Record<Exclude<Track, 'none'>, Song> = {
  title: { bpm: 108, leadWave: 'triangle', lead: steps(CAFE_LEAD), bass: steps(CAFE_BASS) },
  cafe: { bpm: 132, leadWave: 'square', lead: steps(CAFE_LEAD), bass: steps(CAFE_BASS) },
  win: { bpm: 150, leadWave: 'square', lead: steps(CAFE_LEAD), bass: steps(CAFE_BASS) },
  bali: {
    bpm: 104,
    leadWave: 'triangle',
    lead: steps('A4 - C5 D5 E5 - G5 E5 | D5 - C5 A4 C5 - - - | E5 - G5 A5 G5 - E5 D5 | C5 - D5 C5 A4 - - -'),
    bass: steps('A2 - - E3 A2 - E3 - | F2 - - C3 F2 - C3 - | C3 - - G3 C3 - G3 - | G2 - - D3 E3 - E3 -'),
  },
  desert: {
    bpm: 116,
    leadWave: 'square',
    lead: steps('E5 F5 E5 - D5 E5 - - | G5 F5 E5 - D5 - E5 - | E5 F5 G5 A5 G5 F5 E5 - | D5 - F5 - E5 - - -'),
    bass: steps('E3 - E3 B3 E3 - E3 B3 | F3 - F3 C4 F3 - F3 C4 | E3 - E3 B3 E3 - E3 B3 | D3 - D3 A3 E3 - E3 -'),
  },
  boss: {
    bpm: 164,
    leadWave: 'sawtooth',
    lead: steps(
      'A4 A4 C5 A4 E5 A4 C5 A4 | G#4 G#4 B4 G#4 E5 G#4 B4 G#4 | A4 A4 C5 A4 E5 A4 A5 G5 | F5 E5 D5 C5 B4 C5 B4 G#4',
    ),
    bass: steps(
      'A2 A2 A2 A2 A2 A2 A2 A2 | E2 E2 E2 E2 E2 E2 E2 E2 | F2 F2 F2 F2 F2 F2 F2 F2 | E2 E2 E2 E2 E3 E3 E2 E2',
    ),
  },
};

const SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "A4" -> 440. Returns 0 for a rest. */
export function noteFreq(name: string): number {
  const m = /^([A-G])(#?)(\d)$/.exec(name);
  if (!m) return 0;
  const midi = 12 * (Number(m[3]) + 1) + SEMITONE[m[1]!]! + (m[2] ? 1 : 0);
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class Sound {
  muted = false;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private track: Track = 'none';
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;

  /** Must be called from a user gesture. Safe to call many times. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const AC: typeof AudioContext | undefined =
          window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 1;
        this.master.connect(this.ctx.destination);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.5;
        this.musicGain.connect(this.master);
        const len = Math.floor(this.ctx.sampleRate * 0.5);
        this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        this.timer = window.setInterval(() => this.schedule(), 40);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.02);
  }

  setTrack(track: Track): void {
    if (track === this.track) return;
    this.track = track;
    this.step = 0;
    if (this.ctx) this.nextTime = this.ctx.currentTime + 0.08;
  }

  dispose(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
  }

  private tone(
    freq: number,
    dur: number,
    wave: OscillatorType,
    vol: number,
    slideTo = 0,
    delay = 0,
    out: AudioNode | null = this.master,
    at = 0,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !out || freq <= 0) return;
    const t0 = (at || ctx.currentTime) + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(out);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  private hiss(dur: number, vol: number, cutoff: number, delay = 0): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noise) return;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, cutoff / 6), t0 + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.03);
  }

  private tune(notes: string[], gap: number, dur: number, wave: OscillatorType, vol: number): void {
    notes.forEach((n, i) => this.tone(noteFreq(n), dur, wave, vol, 0, i * gap));
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || this.track === 'none' || ctx.state !== 'running') return;
    const song = SONGS[this.track];
    const stepTime = 60 / song.bpm / 2;
    if (this.nextTime < ctx.currentTime - 0.2) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + 0.15) {
      const i = this.step % song.lead.length;
      const lead = noteFreq(song.lead[i]!);
      const bass = noteFreq(song.bass[i % song.bass.length]!);
      if (lead) this.tone(lead, stepTime * 0.9, song.leadWave, 0.05, 0, 0, this.musicGain, this.nextTime);
      if (bass) this.tone(bass, stepTime * 1.4, 'triangle', 0.09, 0, 0, this.musicGain, this.nextTime);
      this.step++;
      this.nextTime += stepTime;
    }
  }

  play(ev: GameEvent): void {
    if (!this.ctx || this.muted) return;
    switch (ev) {
      case 'start':
        this.tune(['C5', 'E5', 'G5', 'C6'], 0.07, 0.12, 'square', 0.08);
        break;
      case 'swing':
        this.hiss(0.09, 0.12, 5000);
        this.tone(520, 0.08, 'square', 0.04, 180);
        break;
      case 'hit':
        this.tone(240, 0.09, 'square', 0.09, 110);
        this.hiss(0.06, 0.1, 2500);
        break;
      case 'kill':
        this.tone(330, 0.07, 'square', 0.08, 660);
        this.tone(660, 0.1, 'square', 0.07, 990, 0.06);
        this.hiss(0.14, 0.12, 3000);
        break;
      case 'hurt':
        this.tone(320, 0.26, 'sawtooth', 0.12, 70);
        this.hiss(0.12, 0.12, 1800);
        break;
      case 'coin':
        this.tune(['C6', 'G6'], 0.05, 0.09, 'square', 0.06);
        break;
      case 'gem':
        this.tune(['E6', 'G6', 'B6'], 0.05, 0.1, 'square', 0.06);
        break;
      case 'coffee':
        this.tone(440, 0.22, 'triangle', 0.12, 880);
        break;
      case 'commit':
        this.tune(['G5', 'B5', 'D6', 'G6'], 0.06, 0.14, 'square', 0.07);
        break;
      case 'ready':
        this.tune(['C5', 'E5', 'G5', 'C6', 'G5', 'C6'], 0.09, 0.16, 'triangle', 0.12);
        break;
      case 'ship':
        this.tune(['C5', 'C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7'], 0.1, 0.22, 'square', 0.08);
        this.hiss(0.9, 0.1, 900, 0.2);
        break;
      case 'gate':
        this.tone(90, 0.5, 'sawtooth', 0.12, 45, 0.25);
        this.hiss(0.45, 0.1, 600, 0.25);
        break;
      case 'talk':
        this.tone(520, 0.06, 'square', 0.05);
        break;
      case 'blip':
        this.tone(700, 0.025, 'square', 0.025);
        break;
      case 'select':
        this.tone(880, 0.06, 'square', 0.05);
        break;
      case 'deny':
        this.tune(['E4', 'C4'], 0.1, 0.14, 'square', 0.08);
        break;
      case 'cut':
        this.hiss(0.1, 0.14, 3500);
        break;
      case 'shoot':
        this.tone(520, 0.12, 'square', 0.05, 260);
        break;
      case 'hotfix':
        this.tone(900, 0.12, 'square', 0.05, 1500);
        break;
      case 'churn':
        this.tune(['E5', 'C5', 'G4'], 0.09, 0.16, 'sawtooth', 0.07);
        break;
      case 'secret':
        this.tune(['D5', 'A5', 'F#5', 'D6', 'A5', 'F#6'], 0.07, 0.12, 'square', 0.06);
        break;
      case 'bossroar':
        this.tone(120, 0.9, 'sawtooth', 0.16, 45);
        this.hiss(0.8, 0.14, 700);
        break;
      case 'bosshit':
        this.tone(190, 0.14, 'square', 0.1, 80);
        this.hiss(0.1, 0.12, 2000);
        break;
      case 'bossdie':
        for (let i = 0; i < 6; i++) {
          this.hiss(0.3, 0.16, 1500, i * 0.22);
          this.tone(160 - i * 15, 0.25, 'sawtooth', 0.1, 50, i * 0.22);
        }
        break;
      case 'die':
        this.tune(['E5', 'D5', 'C5', 'A4', 'F4', 'D4', 'C4'], 0.1, 0.2, 'triangle', 0.12);
        break;
      case 'win':
        this.tune(['C5', 'E5', 'G5', 'C6', 'G5', 'C6', 'E6', 'G6', 'C7'], 0.11, 0.24, 'square', 0.08);
        break;
      case 'restart':
        this.tune(['G4', 'E4', 'C4'], 0.08, 0.14, 'triangle', 0.1);
        break;
      case 'pause':
        this.tone(440, 0.08, 'triangle', 0.08, 330);
        break;
    }
  }
}
