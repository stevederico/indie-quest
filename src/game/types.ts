import type { Rng } from './rng';
import type { Area, ShipArea } from './world';

export type Dir = 'up' | 'down' | 'left' | 'right';

export type Mode = 'title' | 'playing' | 'dialog' | 'transition' | 'paused' | 'gameover' | 'win';

/** Held buttons for one simulation step. The game works out presses by itself. */
export interface Input {
  x: number; // -1, 0, 1
  y: number; // -1, 0, 1
  attack: boolean;
  pause: boolean;
}

export const NO_INPUT: Input = { x: 0, y: 0, attack: false, pause: false };

export interface Player {
  x: number;
  y: number;
  dir: Dir;
  hp: number;
  maxHp: number;
  mrr: number;
  /** Seconds left in the current swing, 0 when idle. */
  attack: number;
  cooldown: number;
  invuln: number;
  /** Knockback velocity. */
  kx: number;
  ky: number;
  /** Walk cycle clock. */
  walk: number;
  moving: boolean;
  /** Enemy ids already hit by the current swing. */
  swingHits: number[];
}

export type EnemyKind = 'bug' | 'ghost' | 'crab' | 'troll' | 'scorpion' | 'boss';

export interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  dir: Dir;
  /** Small state machine label, meaning depends on the kind. */
  state: string;
  timer: number;
  /** Second clock for attacks. */
  timer2: number;
  stun: number;
  flash: number;
  kx: number;
  ky: number;
  anim: number;
  half: number;
  /** Target point for the boss. */
  tx: number;
  ty: number;
  /** Attack counter for the boss. */
  count: number;
  /** Hits the boss has taken, used to make it break away. */
  hits: number;
  /** Boss phase, 1 to 3. */
  phase: number;
}

export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fromPlayer: boolean;
  damage: number;
  life: number;
}

export type PickupKind = 'coin' | 'gem' | 'coffee' | 'commit';

export interface Pickup {
  kind: PickupKind;
  x: number;
  y: number;
  /** Set for map pickups so they stay collected. */
  key: string | null;
  /** Seconds left, Infinity for map pickups. */
  life: number;
  age: number;
}

export type FxKind = 'poof' | 'spark' | 'cut' | 'boom' | 'ring';

export interface Fx {
  kind: FxKind;
  x: number;
  y: number;
  t: number;
  life: number;
}

export interface FloatText {
  text: string;
  x: number;
  y: number;
  t: number;
  color: string;
}

export interface Dialog {
  speaker: string;
  pages: string[];
  page: number;
  /** Characters shown on the current page. */
  shown: number;
}

export type GameEvent =
  | 'start'
  | 'swing'
  | 'hit'
  | 'kill'
  | 'hurt'
  | 'coin'
  | 'gem'
  | 'coffee'
  | 'commit'
  | 'ready'
  | 'ship'
  | 'gate'
  | 'talk'
  | 'blip'
  | 'cut'
  | 'shoot'
  | 'hotfix'
  | 'churn'
  | 'secret'
  | 'bossroar'
  | 'bosshit'
  | 'bossdie'
  | 'die'
  | 'win'
  | 'pause'
  | 'select'
  | 'restart'
  | 'deny';

export interface Transition {
  t: number;
  dx: number;
  dy: number;
  fromTiles: string[][];
  fromArea: Area;
  fromX: number;
  fromY: number;
}

export interface Game {
  mode: Mode;
  rng: Rng;
  /** Seconds of play time, runs only while playing. */
  time: number;
  /** Clock for animations, always runs. */
  clock: number;
  sx: number;
  sy: number;
  area: Area;
  screenName: string;
  tiles: string[][];
  /** Bumped whenever tiles change so the renderer can rebuild its cache. */
  tilesVersion: number;
  transition: Transition | null;
  player: Player;
  enemies: Enemy[];
  shots: Shot[];
  pickups: Pickup[];
  fx: Fx[];
  texts: FloatText[];
  dialog: Dialog | null;
  commits: Record<ShipArea, number>;
  shipped: Record<ShipArea, boolean>;
  collected: Set<string>;
  clearedAt: Map<string, number>;
  visits: number;
  /** Enemies still owed for the room clear, 0 once the room counts as cleared. */
  roomEnemies: number;
  bossActive: boolean;
  bossDefeated: boolean;
  /** True once the boss has given his speech. */
  bossSeen: boolean;
  /** Counts down after the boss falls, then the win screen shows. */
  winDelay: number;
  deaths: number;
  kills: number;
  shake: number;
  /** Seconds spent in the current mode. */
  modeTime: number;
  menuIndex: number;
  /** True while the pause menu asks "restart?". */
  confirmRestart: boolean;
  /** MRR the previous run ended with, kept across a reset so it can count as a best. */
  lastMrr: number;
  nextId: number;
  prev: Input;
  events: GameEvent[];
  /** Name banner timer when a new screen is entered. */
  banner: number;
}
