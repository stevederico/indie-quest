import './style.css';
import { Sound, type Track } from './audio/sound';
import { CANVAS_H, CANVAS_W, STEP } from './game/constants';
import { createGame, enterScreen, pauseGame, update } from './game/game';
import { NO_INPUT, type Game, type Input } from './game/types';
import { Controls } from './input/controls';
import { makeCanvas } from './render/bake';
import { render, type Ui } from './render/renderer';

const BEST_KEY = 'indie-quest.best';
const MUTE_KEY = 'indie-quest.muted';

function load(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function save(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private windows may block storage. The game works without it.
  }
}

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id}`);
  return node as T;
}

const canvas = el<HTMLCanvasElement>('game');
const screen = canvas.getContext('2d')!;
const [buffer, ctx] = makeCanvas(CANVAS_W, CANVAS_H);
const muteButton = el<HTMLButtonElement>('btn-mute');

const params = new URLSearchParams(window.location.search);

const game: Game = createGame((Date.now() & 0xffffffff) >>> 0);
const sound = new Sound();
const ui: Ui = {
  best: Number(load(BEST_KEY)) || 0,
  // ?touch forces the touch layout, handy on a desktop.
  touch: window.matchMedia('(pointer: coarse)').matches || params.has('touch'),
  muted: load(MUTE_KEY) === '1',
  newBest: false,
};
sound.setMuted(ui.muted);

function showMute(): void {
  muteButton.textContent = ui.muted ? 'SOUND OFF' : 'SOUND ON';
  muteButton.setAttribute('aria-pressed', String(ui.muted));
}

function setTouch(on: boolean): void {
  if (ui.touch === on && document.body.classList.contains('touch') === on) return;
  ui.touch = on;
  document.body.classList.toggle('touch', on);
  resize();
}

const controls = new Controls(
  {
    onTouch: () => setTouch(true),
    onGesture: () => sound.unlock(),
    onMute: () => {
      ui.muted = !ui.muted;
      sound.setMuted(ui.muted);
      save(MUTE_KEY, ui.muted ? '1' : '0');
      showMute();
    },
  },
  canvas,
  el('pad'),
  el('stick'),
  el('btn-a'),
  el('btn-pause'),
  muteButton,
);

/** Fit the screen into the window and keep pixels sharp. */
function resize(): void {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const portrait = vh >= vw;
  let availW = vw;
  let availH = vh;
  if (ui.touch && portrait) availH = vh - Math.max(170, Math.min(240, vh * 0.3));
  else if (ui.touch) availW = vw - 2 * Math.min(170, vh * 0.42);
  else {
    availW = vw - 24;
    availH = vh - 24;
  }
  let scale = Math.max(0.5, Math.min(availW / CANVAS_W, availH / CANVAS_H));
  if (!ui.touch && scale >= 2) scale = Math.floor(scale);
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const backing = Math.max(1, Math.ceil(scale * dpr));
  canvas.width = CANVAS_W * backing;
  canvas.height = CANVAS_H * backing;
  canvas.style.width = `${Math.floor(CANVAS_W * scale)}px`;
  canvas.style.height = `${Math.floor(CANVAS_H * scale)}px`;
  screen.imageSmoothingEnabled = false;
}

function trackFor(g: Game): Track {
  switch (g.mode) {
    case 'title':
      return 'title';
    case 'gameover':
      return 'none';
    case 'win':
      return 'win';
    default:
      if (g.area === 'boss') return g.bossActive ? 'boss' : 'none';
      return g.area;
  }
}

/** Keep the highest MRR seen at the end of any run. Returns true for a new best. */
function recordBest(mrr: number): boolean {
  if (mrr <= ui.best) return false;
  ui.best = mrr;
  save(BEST_KEY, String(ui.best));
  return true;
}

function drain(): void {
  for (const ev of game.events) {
    sound.play(ev);
    if (ev === 'start') ui.newBest = false;
    // Burnout: counted before the churn penalty lands on respawn.
    if (ev === 'die') recordBest(game.player.mrr);
    // Restart: the run is already reset, so read what it ended with.
    if (ev === 'restart') recordBest(game.lastMrr);
    if (ev === 'win' && recordBest(game.player.mrr)) ui.newBest = true;
  }
  game.events.length = 0;
  sound.setTrack(trackFor(game));
}

let last = performance.now();
let acc = 0;
/** Set by the test hooks to stop the clock so a frame can be inspected. */
let held = false;

function frame(now: number): void {
  acc += Math.min(0.1, (now - last) / 1000);
  last = now;
  if (held) acc = 0;
  while (acc >= STEP) {
    update(game, controls.read(), STEP);
    controls.afterStep();
    acc -= STEP;
  }
  drain();
  render(ctx, game, ui);
  screen.imageSmoothingEnabled = false;
  screen.drawImage(buffer, 0, 0, canvas.width, canvas.height);
  requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
window.addEventListener('touchstart', () => setTouch(true), { passive: true, once: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    controls.release();
    pauseGame(game);
  }
  last = performance.now();
});

document.body.classList.toggle('touch', ui.touch);
showMute();
resize();
requestAnimationFrame(frame);

// Test hooks for browser checks. Dev server only; stripped from the production build.
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__iq = {
    game,
    enterScreen,
    /** Stop or restart the real time loop. Stepping with advance() still works. */
    hold(on: boolean): void {
      held = on;
    },
    /** Run the game forward without waiting for frames, then draw. */
    advance(seconds: number, input?: Partial<Input>): void {
      for (let t = 0; t < seconds; t += STEP) {
        update(game, input ? { ...NO_INPUT, ...input } : controls.read(), STEP);
        controls.afterStep();
      }
      drain();
      render(ctx, game, ui);
      screen.drawImage(buffer, 0, 0, canvas.width, canvas.height);
    },
  };
}
