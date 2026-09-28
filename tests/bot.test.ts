import { describe, expect, it } from 'vitest';
import { COLS, COMMITS_TO_SHIP, ROWS, STEP, TILE } from '../src/game/constants';
import { createGame, pickupKey, update } from '../src/game/game';
import { isShipArea } from '../src/game/progress';
import type { Dir, Game, Input } from '../src/game/types';
import { allScreens, findMarkers, getScreen, isSolid, SHIP_AREAS, type ShipArea } from '../src/game/world';

/**
 * A simple bot that plays the whole game through the same Input a person uses.
 * It reads the game state to decide, but it can only act by pressing buttons.
 * If it can finish, the game can be finished.
 */

type Tile = { col: number; row: number };

const HUBS: Record<ShipArea, { sx: number; sy: number }> = {
  cafe: { sx: 0, sy: 1 },
  bali: { sx: 2, sy: 1 },
  desert: { sx: 2, sy: 0 },
};

function passable(g: Game, col: number, row: number): boolean {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
  const ch = g.tiles[row]![col]!;
  return ch === 'g' || !isSolid(ch, g);
}

/** Shortest tile path from start to any tile accepted by `done`. */
function findPath(g: Game, start: Tile, done: (t: Tile) => boolean): Tile[] | null {
  const key = (t: Tile): number => t.row * COLS + t.col;
  const from = new Map<number, Tile | null>([[key(start), null]]);
  const queue: Tile[] = [start];
  while (queue.length) {
    const cur = queue.shift()!;
    if (done(cur)) {
      const path: Tile[] = [];
      let at: Tile | null = cur;
      while (at) {
        path.unshift(at);
        at = from.get(key(at)) ?? null;
      }
      return path;
    }
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const next = { col: cur.col + dc, row: cur.row + dr };
      if (from.has(key(next)) || !passable(g, next.col, next.row)) continue;
      from.set(key(next), cur);
      queue.push(next);
    }
  }
  return null;
}

/** Which way to leave the current screen to get closer to the target screen. */
function worldStep(g: Game, tx: number, ty: number): [number, number] | null {
  const open = (sx: number, sy: number, dx: number, dy: number): boolean => {
    const a = getScreen(sx, sy);
    const b = getScreen(sx + dx, sy + dy);
    if (!a || !b) return false;
    for (let i = 0; i < (dx !== 0 ? ROWS : COLS); i++) {
      const ca = dx !== 0 ? a.rows[i]![dx > 0 ? COLS - 1 : 0]! : a.rows[dy > 0 ? ROWS - 1 : 0]![i]!;
      const cb = dx !== 0 ? b.rows[i]![dx > 0 ? 0 : COLS - 1]! : b.rows[dy > 0 ? 0 : ROWS - 1]![i]!;
      if (!isSolid(ca, g) && !isSolid(cb, g)) return true;
    }
    return false;
  };
  const start = `${g.sx},${g.sy}`;
  const first = new Map<string, [number, number] | null>([[start, null]]);
  const queue: [number, number][] = [[g.sx, g.sy]];
  while (queue.length) {
    const [sx, sy] = queue.shift()!;
    if (sx === tx && sy === ty) return first.get(`${sx},${sy}`) ?? null;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const k = `${sx + dx},${sy + dy}`;
      if (first.has(k) || !open(sx, sy, dx, dy)) continue;
      first.set(k, first.get(`${sx},${sy}`) ?? [dx, dy]);
      queue.push([sx + dx, sy + dy]);
    }
  }
  return null;
}

/** Next screen the bot wants to be in. */
function targetScreen(g: Game): { sx: number; sy: number } {
  for (const area of SHIP_AREAS) {
    if (g.shipped[area]) continue;
    if (g.commits[area] >= COMMITS_TO_SHIP) return HUBS[area];
    for (const s of allScreens()) {
      if (s.area !== area) continue;
      const owed = findMarkers(s).some(
        (m) => (m.ch === 'c' || m.ch === 'C') && !g.collected.has(pickupKey(s.sx, s.sy, m.col, m.row)),
      );
      if (owed) return { sx: s.sx, sy: s.sy };
    }
  }
  return { sx: 3, sy: 0 };
}

class Bot {
  private pressed = false;
  private stuck = 0;
  private lastX = 0;
  private lastY = 0;

  private tap(): Input {
    this.pressed = !this.pressed;
    return { x: 0, y: 0, attack: this.pressed, pause: false };
  }

  private face(g: Game, dir: Dir): Input {
    if (g.player.dir === dir) return this.tap();
    this.pressed = false;
    const x = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    const y = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    return { x, y, attack: false, pause: false };
  }

  private walk(g: Game, path: Tile[]): Input {
    const p = g.player;
    const next = path.length > 1 ? path[1]! : path[0]!;
    if (g.tiles[next.row]![next.col] === 'g') {
      const here = path[0]!;
      const dir: Dir =
        next.col > here.col ? 'right' : next.col < here.col ? 'left' : next.row > here.row ? 'down' : 'up';
      return this.face(g, dir);
    }
    this.pressed = false;
    const tx = next.col * TILE + TILE / 2;
    const ty = next.row * TILE + TILE / 2;
    const dx = tx - p.x;
    const dy = ty - p.y;
    return {
      x: Math.abs(dx) > 1.5 ? Math.sign(dx) : 0,
      y: Math.abs(dy) > 1.5 ? Math.sign(dy) : 0,
      attack: false,
      pause: false,
    };
  }

  private here(g: Game): Tile {
    return {
      col: Math.min(COLS - 1, Math.max(0, Math.floor(g.player.x / TILE))),
      row: Math.min(ROWS - 1, Math.max(0, Math.floor(g.player.y / TILE))),
    };
  }

  private goTo(g: Game, col: number, row: number): Input | null {
    const path = findPath(g, this.here(g), (t) => t.col === col && t.row === row);
    return path ? this.walk(g, path) : null;
  }

  next(g: Game): Input {
    if (g.mode !== 'playing') {
      if (g.mode === 'transition' || g.mode === 'paused') return { x: 0, y: 0, attack: false, pause: false };
      return this.tap();
    }
    const p = g.player;

    // Shake loose if something holds the bot in place.
    if (Math.abs(p.x - this.lastX) + Math.abs(p.y - this.lastY) < 0.01) this.stuck++;
    else this.stuck = 0;
    this.lastX = p.x;
    this.lastY = p.y;

    const foes = g.enemies.filter((e) => e.kind !== 'boss' || g.bossActive);
    // Low on energy: grab a coffee before anything else.
    const cup = g.pickups.find((k) => k.kind === 'coffee');
    if (cup && p.hp <= p.maxHp / 2) {
      const step = this.goTo(g, Math.floor(cup.x / TILE), Math.floor(cup.y / TILE));
      if (step) return step;
    }
    if (foes.length > 0) {
      const e = foes.reduce((a, b) => (Math.hypot(a.x - p.x, a.y - p.y) < Math.hypot(b.x - p.x, b.y - p.y) ? a : b));
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const reach = 15 + e.half;
      const side = 3 + e.half;
      if (Math.abs(dx) <= reach && Math.abs(dy) <= side) return this.face(g, dx < 0 ? 'left' : 'right');
      if (Math.abs(dy) <= reach && Math.abs(dx) <= side) return this.face(g, dy < 0 ? 'up' : 'down');
      const et = { col: Math.floor(e.x / TILE), row: Math.floor(e.y / TILE) };
      const path = findPath(g, this.here(g), (t) => Math.abs(t.col - et.col) + Math.abs(t.row - et.row) <= 1);
      if (path && path.length > 1) return this.walk(g, path);
      // Already next to it but not lined up: slide onto its row or column.
      this.pressed = false;
      return Math.abs(dx) < Math.abs(dy)
        ? { x: Math.sign(dx), y: 0, attack: false, pause: false }
        : { x: 0, y: Math.sign(dy), attack: false, pause: false };
    }

    const loot = g.pickups
      .filter((k) => k.kind !== 'coffee' || p.hp < p.maxHp)
      .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
    for (const k of loot) {
      const step = this.goTo(g, Math.floor(k.x / TILE), Math.floor(k.y / TILE));
      if (step) {
        const close = Math.abs(k.x - p.x) < 8 && Math.abs(k.y - p.y) < 8;
        return close ? { x: Math.sign(k.x - p.x), y: Math.sign(k.y - p.y), attack: false, pause: false } : step;
      }
    }

    const want = targetScreen(g);
    if (want.sx === g.sx && want.sy === g.sy) {
      if (g.area === 'boss') return { x: 1, y: 0, attack: false, pause: false };
      if (isShipArea(g.area) && g.commits[g.area] >= COMMITS_TO_SHIP) {
        // Stand under the terminal, face it, press the button.
        for (let row = 0; row < ROWS; row++) {
          const col = g.tiles[row]!.indexOf('L');
          if (col < 0) continue;
          const at = this.here(g);
          if (at.col === col && at.row === row + 1 && Math.abs(p.x - (col * TILE + 8)) < 4) {
            // Walk right up to the desk before pressing.
            if (p.y > (row + 1) * TILE + 8) return { x: 0, y: -1, attack: false, pause: false };
            return this.face(g, 'up');
          }
          return this.goTo(g, col, row + 1) ?? this.tap();
        }
      }
      return { x: 0, y: 0, attack: false, pause: false };
    }

    const dir = worldStep(g, want.sx, want.sy);
    if (!dir) return { x: 0, y: 0, attack: false, pause: false };
    const [dx, dy] = dir;
    const onEdge = (t: Tile): boolean =>
      dx > 0 ? t.col === COLS - 1 : dx < 0 ? t.col === 0 : dy > 0 ? t.row === ROWS - 1 : t.row === 0;
    const path = findPath(g, this.here(g), onEdge);
    if (!path) return { x: 0, y: 0, attack: false, pause: false };
    if (path.length === 1) {
      // On the edge tile: center on it, then walk out.
      const t = path[0]!;
      const cx = t.col * TILE + 8 - p.x;
      const cy = t.row * TILE + 8 - p.y;
      if (dx !== 0) return { x: dx, y: Math.abs(cy) > 2 ? Math.sign(cy) : 0, attack: false, pause: false };
      return { x: Math.abs(cx) > 2 ? Math.sign(cx) : 0, y: dy, attack: false, pause: false };
    }
    return this.walk(g, path);
  }
}

/** Where the bot burned out, by screen name. */
const burnouts = new Map<string, number>();

function play(seed: number, maxMinutes: number): Game {
  const g = createGame(seed);
  const bot = new Bot();
  const maxSteps = (maxMinutes * 60) / STEP;
  burnouts.clear();
  for (let i = 0; i < maxSteps && g.mode !== 'win'; i++) {
    const deaths = g.deaths;
    update(g, bot.next(g), STEP);
    if (g.deaths > deaths) burnouts.set(g.screenName, (burnouts.get(g.screenName) ?? 0) + 1);
  }
  return g;
}

describe('bot playthrough', () => {
  for (const seed of [1, 2, 3, 5, 7, 11, 42, 99]) {
    it(`finishes the game with buttons only (seed ${seed})`, () => {
      const g = play(seed, 45);
      const note = `seed ${seed}: mode=${g.mode} time=${Math.round(g.time)}s deaths=${g.deaths} kills=${g.kills} mrr=${g.player.mrr} at=${g.sx},${g.sy} commits=${JSON.stringify(g.commits)} shipped=${JSON.stringify(g.shipped)} burnouts=${JSON.stringify([...burnouts])}`;
      console.log(note);
      expect(g.mode, note).toBe('win');
      expect(g.shipped).toEqual({ cafe: true, bali: true, desert: true });
      expect(g.bossDefeated).toBe(true);
      expect(g.player.mrr).toBeGreaterThan(5000);
      // A fair boss: beaten in a few tries at most.
      expect(g.deaths, note).toBeLessThanOrEqual(3);
    });
  }
});

