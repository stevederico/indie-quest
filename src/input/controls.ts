import type { Input } from '../game/types';

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const ACT = new Set(['Space', 'KeyZ', 'KeyX', 'KeyJ', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

/** Fallback for keyboards and tools that send no physical key code. */
const BY_KEY: Record<string, string> = {
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  a: 'KeyA',
  d: 'KeyD',
  w: 'KeyW',
  s: 'KeyS',
  ' ': 'Space',
  z: 'KeyZ',
  x: 'KeyX',
  j: 'KeyJ',
  Enter: 'Enter',
  p: 'KeyP',
  Escape: 'Escape',
  m: 'KeyM',
};

/** Steps a tap or click counts as a held button. */
const PULSE_STEPS = 5;

export interface ControlHooks {
  /** Called on any first touch so the game can show the touch layout. */
  onTouch(): void;
  /** Called on every key, click or touch. Used to unlock audio. */
  onGesture(): void;
  onMute(): void;
}

/** Keyboard, mouse and touch, merged into one Input per simulation step. */
export class Controls {
  private keys = new Set<string>();
  private padX = 0;
  private padY = 0;
  private padPointer: number | null = null;
  private touchAct = false;
  private actPulse = 0;
  private pausePulse = 0;

  constructor(
    private hooks: ControlHooks,
    canvas: HTMLCanvasElement,
    private pad: HTMLElement,
    private stick: HTMLElement,
    actButton: HTMLElement,
    pauseButton: HTMLElement,
    muteButton: HTMLElement,
  ) {
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => this.release());

    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (e.pointerType === 'touch') hooks.onTouch();
      hooks.onGesture();
      // Inside an embed the page needs focus before keys arrive.
      window.focus();
      this.actPulse = PULSE_STEPS;
    });

    pad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      hooks.onTouch();
      hooks.onGesture();
      this.padPointer = e.pointerId;
      pad.setPointerCapture(e.pointerId);
      this.movePad(e);
    });
    pad.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.padPointer) this.movePad(e);
    });
    const endPad = (e: PointerEvent): void => {
      if (e.pointerId !== this.padPointer) return;
      this.padPointer = null;
      this.padX = 0;
      this.padY = 0;
      this.stick.style.transform = 'translate(-50%, -50%)';
    };
    pad.addEventListener('pointerup', endPad);
    pad.addEventListener('pointercancel', endPad);

    actButton.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      hooks.onGesture();
      this.touchAct = true;
      this.actPulse = PULSE_STEPS;
      actButton.classList.add('down');
    });
    const endAct = (): void => {
      this.touchAct = false;
      actButton.classList.remove('down');
    };
    actButton.addEventListener('pointerup', endAct);
    actButton.addEventListener('pointercancel', endAct);
    actButton.addEventListener('pointerleave', endAct);

    pauseButton.addEventListener('click', (e) => {
      e.preventDefault();
      hooks.onGesture();
      this.pausePulse = 2;
      pauseButton.blur();
    });
    muteButton.addEventListener('click', (e) => {
      e.preventDefault();
      hooks.onGesture();
      hooks.onMute();
      muteButton.blur();
    });

    // Keep long presses and double taps from selecting or zooming the page.
    for (const el of [canvas, pad, actButton]) {
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    }
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const code = e.code || BY_KEY[e.key.length === 1 ? e.key.toLowerCase() : e.key] || '';
    const known =
      LEFT.has(code) || RIGHT.has(code) || UP.has(code) || DOWN.has(code) || ACT.has(code) || PAUSE.has(code) || MUTE.has(code);
    if (!known) return;
    e.preventDefault();
    if (down) {
      this.hooks.onGesture();
      if (!e.repeat) {
        // Latch quick taps so a press shorter than one step still counts.
        if (MUTE.has(code)) this.hooks.onMute();
        if (ACT.has(code)) this.actPulse = PULSE_STEPS;
        if (PAUSE.has(code)) this.pausePulse = 2;
      }
      this.keys.add(code);
    } else {
      this.keys.delete(code);
    }
  }

  private movePad(e: PointerEvent): void {
    const r = this.pad.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const dist = Math.hypot(dx, dy);
    const dead = r.width * 0.12;
    if (dist < dead) {
      this.padX = 0;
      this.padY = 0;
    } else {
      const nx = dx / dist;
      const ny = dy / dist;
      this.padX = Math.abs(nx) > 0.38 ? Math.sign(nx) : 0;
      this.padY = Math.abs(ny) > 0.38 ? Math.sign(ny) : 0;
    }
    const max = r.width * 0.28;
    const k = dist > max ? max / dist : 1;
    this.stick.style.transform = `translate(calc(-50% + ${dx * k}px), calc(-50% + ${dy * k}px))`;
  }

  private any(set: Set<string>): boolean {
    for (const k of set) if (this.keys.has(k)) return true;
    return false;
  }

  /** Let go of everything, used when the window loses focus. */
  release(): void {
    this.keys.clear();
    this.touchAct = false;
    this.padX = 0;
    this.padY = 0;
  }

  /** Ask for a pause on the next step. */
  requestPause(): void {
    this.pausePulse = 2;
  }

  read(): Input {
    const x = (this.any(RIGHT) ? 1 : 0) - (this.any(LEFT) ? 1 : 0) || this.padX;
    const y = (this.any(DOWN) ? 1 : 0) - (this.any(UP) ? 1 : 0) || this.padY;
    return {
      x,
      y,
      attack: this.any(ACT) || this.touchAct || this.actPulse > 0,
      pause: this.any(PAUSE) || this.pausePulse > 0,
    };
  }

  /** Call once after each simulation step. */
  afterStep(): void {
    if (this.actPulse > 0) this.actPulse--;
    if (this.pausePulse > 0) this.pausePulse--;
  }
}
