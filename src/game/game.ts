import {
  BOSS_BONUS,
  BURNOUT_PENALTY,
  PLAYER_HALF,
  PLAYER_START_HP,
  RESPAWN_VISITS,
  TILE,
  TRANSITION_TIME,
  VIEW_H,
  VIEW_W,
} from './constants';
import { spawnEnemy, spawnPickup, updateEnemies, updatePickups, updatePlayer, updateShots } from './actors';
import { addFx, addText, emit, openDialog, setMode, tileCenter } from './helpers';
import { createRng } from './rng';
import { INTRO } from './text';
import type { EnemyKind, Game, Input, PickupKind } from './types';
import { NO_INPUT } from './types';
import { buildTiles, findMarkers, getScreen, hubOf, screenKey } from './world';

const START = { sx: 0, sy: 1 };

const ENEMY_MARKS: Record<string, EnemyKind> = {
  b: 'bug',
  h: 'ghost',
  k: 'crab',
  r: 'troll',
  s: 'scorpion',
  B: 'boss',
};

const PICKUP_MARKS: Record<string, PickupKind> = {
  c: 'commit',
  $: 'gem',
  H: 'coffee',
};

export const PAUSE_ITEMS = ['RESUME', 'RESTART'] as const;
/** Second step before a restart. NO comes first so a stray double tap is safe. */
export const CONFIRM_ITEMS = ['NO, KEEP GOING', 'YES, RESTART'] as const;

export function pickupKey(sx: number, sy: number, col: number, row: number): string {
  return `${sx},${sy}:${col},${row}`;
}

export function createGame(seed: number = 1): Game {
  const g: Game = {
    mode: 'title',
    rng: createRng(seed),
    time: 0,
    clock: 0,
    sx: START.sx,
    sy: START.sy,
    area: 'cafe',
    screenName: '',
    tiles: [],
    tilesVersion: 0,
    transition: null,
    player: {
      x: 0,
      y: 0,
      dir: 'down',
      hp: PLAYER_START_HP,
      maxHp: PLAYER_START_HP,
      mrr: 0,
      attack: 0,
      cooldown: 0,
      invuln: 0,
      kx: 0,
      ky: 0,
      walk: 0,
      moving: false,
      swingHits: [],
    },
    enemies: [],
    shots: [],
    pickups: [],
    fx: [],
    texts: [],
    dialog: null,
    commits: { cafe: 0, bali: 0, desert: 0 },
    shipped: { cafe: false, bali: false, desert: false },
    collected: new Set(),
    clearedAt: new Map(),
    visits: 0,
    roomEnemies: 0,
    bossActive: false,
    bossDefeated: false,
    bossSeen: false,
    winDelay: 0,
    deaths: 0,
    kills: 0,
    shake: 0,
    modeTime: 0,
    menuIndex: 0,
    confirmRestart: false,
    lastMrr: 0,
    nextId: 1,
    prev: { ...NO_INPUT },
    events: [],
    banner: 0,
  };
  enterScreen(g, START.sx, START.sy);
  const start = findMarkers(getScreen(START.sx, START.sy)!).find((m) => m.ch === '@');
  const c = tileCenter(start?.col ?? 7, start?.row ?? 5);
  g.player.x = c.x;
  g.player.y = c.y;
  return g;
}

/** Put a fresh run into an existing game object, keeping the random stream. */
export function resetGame(g: Game): void {
  const fresh = createGame(1);
  fresh.rng = g.rng;
  fresh.prev = g.prev;
  fresh.clock = g.clock;
  fresh.events = g.events;
  fresh.lastMrr = g.player.mrr;
  Object.assign(g, fresh);
}

/** Load a screen: tiles, enemies and pickups that are still there. */
export function enterScreen(g: Game, sx: number, sy: number): void {
  const def = getScreen(sx, sy);
  if (!def) throw new Error(`No screen at ${sx},${sy}`);
  g.sx = sx;
  g.sy = sy;
  g.area = def.area;
  g.screenName = def.name;
  g.tiles = buildTiles(def);
  g.tilesVersion++;
  g.enemies = [];
  g.shots = [];
  g.pickups = [];
  g.fx = [];
  g.texts = [];
  g.bossActive = false;
  g.visits++;
  g.banner = 2.2;

  const key = screenKey(sx, sy);
  const cleared = g.clearedAt.get(key);
  const quiet = cleared !== undefined && g.visits - cleared <= RESPAWN_VISITS;
  for (const m of findMarkers(def)) {
    const c = tileCenter(m.col, m.row);
    const enemy = ENEMY_MARKS[m.ch];
    if (enemy) {
      if (enemy === 'boss') {
        if (!g.bossDefeated) spawnEnemy(g, 'boss', c.x + TILE / 2, c.y);
      } else if (!quiet) {
        spawnEnemy(g, enemy, c.x, c.y);
      }
      continue;
    }
    const pickup = PICKUP_MARKS[m.ch];
    if (pickup) {
      const k = pickupKey(sx, sy, m.col, m.row);
      if (!g.collected.has(k)) spawnPickup(g, pickup, c.x, c.y, k);
    }
  }
  g.roomEnemies = g.enemies.filter((e) => e.kind !== 'boss').length;
}

function startRun(g: Game): void {
  resetGame(g);
  setMode(g, 'playing');
  emit(g, 'start');
  openDialog(g, 'INDIE QUEST', INTRO);
}

/** Wake up at the area hub after burning out. Costs a share of MRR. */
export function respawn(g: Game): void {
  const p = g.player;
  const lost = Math.floor(p.mrr * BURNOUT_PENALTY);
  p.mrr -= lost;
  p.hp = p.maxHp;
  p.invuln = 1.5;
  p.attack = 0;
  p.kx = 0;
  p.ky = 0;
  p.dir = 'down';
  const hub = hubOf(g.area);
  enterScreen(g, hub.sx, hub.sy);
  const c = tileCenter(hub.col, hub.row);
  p.x = c.x;
  p.y = c.y;
  if (lost > 0) addText(g, `-$${lost} CHURN`, p.x, p.y - 14, '#e0566b');
  setMode(g, 'playing');
  emit(g, 'start');
}

function tryLeaveScreen(g: Game): void {
  const p = g.player;
  let dx = 0;
  let dy = 0;
  if (p.x < 0) dx = -1;
  else if (p.x >= VIEW_W) dx = 1;
  else if (p.y < 0) dy = -1;
  else if (p.y >= VIEW_H) dy = 1;
  if (dx === 0 && dy === 0) return;

  const next = getScreen(g.sx + dx, g.sy + dy);
  if (!next) {
    p.x = Math.min(VIEW_W - 1, Math.max(0, p.x));
    p.y = Math.min(VIEW_H - 1, Math.max(0, p.y));
    return;
  }
  const fromTiles = g.tiles;
  const fromArea = g.area;
  const fromX = p.x;
  const fromY = p.y;
  enterScreen(g, next.sx, next.sy);
  const edge = PLAYER_HALF + 1;
  if (dx === 1) p.x = edge;
  if (dx === -1) p.x = VIEW_W - edge;
  if (dy === 1) p.y = edge;
  if (dy === -1) p.y = VIEW_H - edge;
  p.kx = 0;
  p.ky = 0;
  g.transition = { t: 0, dx, dy, fromTiles, fromArea, fromX, fromY };
  setMode(g, 'transition');
}

/** Drop the room's hidden commit once every enemy is gone. */
function checkRoomClear(g: Game): void {
  const left = g.enemies.filter((e) => e.kind !== 'boss').length;
  if (left > 0) return;
  const key = screenKey(g.sx, g.sy);
  if (g.roomEnemies > 0) {
    g.roomEnemies = 0;
    g.clearedAt.set(key, g.visits);
  }
  if (g.area === 'boss') return;
  const def = getScreen(g.sx, g.sy)!;
  for (const m of findMarkers(def)) {
    if (m.ch !== 'C') continue;
    const k = pickupKey(g.sx, g.sy, m.col, m.row);
    if (g.collected.has(k) || g.pickups.some((pk) => pk.key === k)) continue;
    const c = tileCenter(m.col, m.row);
    spawnPickup(g, 'commit', c.x, c.y, k);
    addFx(g, 'ring', c.x, c.y, 0.6);
    addText(g, 'ROOM CLEAR!', c.x, c.y - 12, '#a7f070');
    emit(g, 'secret');
  }
}

function checkBossDoor(g: Game): void {
  if (g.area !== 'boss' || g.bossDefeated || g.bossActive) return;
  if (!g.bossSeen) {
    g.bossSeen = true;
    openDialog(g, 'THE CHURN KING', [
      'SO. ANOTHER MAKER WITH A DREAM AND A PAYMENT LINK.',
      'YOUR SUBSCRIBERS WILL CANCEL. THEY ALWAYS CANCEL.',
    ]);
    return;
  }
  if (g.player.x - PLAYER_HALF > TILE + 1) {
    g.bossActive = true;
    g.tilesVersion++;
    g.shake = 0.4;
    emit(g, 'bossroar');
    emit(g, 'gate');
  }
}

function updateEffects(g: Game, dt: number): void {
  for (let i = g.fx.length - 1; i >= 0; i--) {
    const f = g.fx[i]!;
    f.t += dt;
    if (f.t >= f.life) g.fx.splice(i, 1);
  }
  for (let i = g.texts.length - 1; i >= 0; i--) {
    const t = g.texts[i]!;
    t.t += dt;
    t.y -= 14 * dt;
    if (t.t >= 1.1) g.texts.splice(i, 1);
  }
  g.shake = Math.max(0, g.shake - dt);
  g.banner = Math.max(0, g.banner - dt);
}

function updatePlaying(g: Game, input: Input, attackPressed: boolean, pausePressed: boolean, dt: number): void {
  if (pausePressed) {
    g.menuIndex = 0;
    g.confirmRestart = false;
    setMode(g, 'paused');
    emit(g, 'pause');
    return;
  }
  g.time += dt;
  updatePlayer(g, input, attackPressed, dt);
  if (g.mode !== 'playing') return;
  updateEnemies(g, dt);
  updateShots(g, dt);
  updatePickups(g, dt);
  updateEffects(g, dt);
  if (g.mode !== 'playing') return;

  if (g.winDelay > 0) {
    // Victory lap: stay in the arena until the win screen shows.
    g.player.x = Math.min(VIEW_W - PLAYER_HALF, Math.max(PLAYER_HALF, g.player.x));
    g.player.y = Math.min(VIEW_H - PLAYER_HALF, Math.max(PLAYER_HALF, g.player.y));
    g.winDelay -= dt;
    if (g.winDelay <= 0) {
      g.player.mrr += BOSS_BONUS;
      setMode(g, 'win');
      emit(g, 'win');
    }
    return;
  }
  checkRoomClear(g);
  checkBossDoor(g);
  if (g.mode === 'playing') tryLeaveScreen(g);
}

function updateDialog(g: Game, attackPressed: boolean, dt: number): void {
  const d = g.dialog;
  if (!d) {
    setMode(g, 'playing');
    return;
  }
  const page = d.pages[d.page]!;
  if (d.shown < page.length) {
    const before = Math.floor(d.shown);
    d.shown = Math.min(page.length, d.shown + 45 * dt);
    if (Math.floor(d.shown / 3) !== Math.floor(before / 3)) emit(g, 'blip');
  }
  updateEffects(g, dt);
  if (!attackPressed) return;
  if (d.shown < page.length) {
    d.shown = page.length;
    return;
  }
  d.page++;
  d.shown = 0;
  emit(g, 'select');
  if (d.page >= d.pages.length) {
    g.dialog = null;
    g.player.cooldown = 0.2;
    setMode(g, 'playing');
  }
}

/** Pause from outside the game loop, for example when the tab is hidden. */
export function pauseGame(g: Game): void {
  if (g.mode !== 'playing') return;
  g.menuIndex = 0;
  g.confirmRestart = false;
  setMode(g, 'paused');
}

/** Advance the game by one step. */
export function update(g: Game, input: Input, dt: number): void {
  const attackPressed = input.attack && !g.prev.attack;
  const pausePressed = input.pause && !g.prev.pause;
  const upPressed = input.y < 0 && !(g.prev.y < 0);
  const downPressed = input.y > 0 && !(g.prev.y > 0);
  g.prev = { ...input };
  g.clock += dt;
  g.modeTime += dt;

  switch (g.mode) {
    case 'title':
      if (attackPressed) startRun(g);
      break;

    case 'playing':
      updatePlaying(g, input, attackPressed, pausePressed, dt);
      break;

    case 'dialog':
      updateDialog(g, attackPressed, dt);
      break;

    case 'transition': {
      const t = g.transition;
      if (!t) {
        setMode(g, 'playing');
        break;
      }
      t.t += dt;
      g.player.walk += dt;
      if (t.t >= TRANSITION_TIME) {
        g.transition = null;
        setMode(g, 'playing');
      }
      break;
    }

    case 'paused': {
      if (pausePressed) {
        // Pause backs out of the restart question, otherwise it resumes.
        if (g.confirmRestart) {
          g.confirmRestart = false;
          g.menuIndex = 1;
          emit(g, 'blip');
        } else {
          setMode(g, 'playing');
          emit(g, 'pause');
        }
        break;
      }
      const count = g.confirmRestart ? CONFIRM_ITEMS.length : PAUSE_ITEMS.length;
      if (upPressed || downPressed) {
        g.menuIndex = (g.menuIndex + (downPressed ? 1 : count - 1)) % count;
        emit(g, 'blip');
      }
      if (attackPressed) {
        emit(g, 'select');
        if (g.confirmRestart) {
          g.confirmRestart = false;
          if (g.menuIndex === 1) {
            emit(g, 'restart');
            resetGame(g);
            setMode(g, 'title');
          } else {
            g.menuIndex = 1;
          }
        } else if (g.menuIndex === 0) {
          setMode(g, 'playing');
        } else {
          g.confirmRestart = true;
          g.menuIndex = 0;
        }
      }
      break;
    }

    case 'gameover':
      updateEffects(g, dt);
      if (attackPressed && g.modeTime > 0.9) respawn(g);
      break;

    case 'win':
      updateEffects(g, dt);
      if (attackPressed && g.modeTime > 1.5) {
        resetGame(g);
        setMode(g, 'title');
      }
      break;
  }
}
