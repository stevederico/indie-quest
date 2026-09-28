import { COLS, ROWS, TILE, VIEW_H, VIEW_W } from './constants';
import type { Dir, Game } from './types';
import { isSolid } from './world';

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Tile character under a pixel. Points outside the screen read the nearest edge tile. */
export function tileAt(g: Game, px: number, py: number): string {
  const col = clamp(Math.floor(px / TILE), 0, COLS - 1);
  const row = clamp(Math.floor(py / TILE), 0, ROWS - 1);
  return g.tiles[row]![col]!;
}

export function solidChar(g: Game, ch: string): boolean {
  return isSolid(ch, g);
}

/** True when a box centered on (x, y) overlaps any solid tile. */
export function boxBlocked(g: Game, x: number, y: number, hw: number, hh: number): boolean {
  const c0 = Math.floor((x - hw) / TILE);
  const c1 = Math.floor((x + hw - 0.001) / TILE);
  const r0 = Math.floor((y - hh) / TILE);
  const r1 = Math.floor((y + hh - 0.001) / TILE);
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const ch = g.tiles[clamp(r, 0, ROWS - 1)]![clamp(c, 0, COLS - 1)]!;
      if (isSolid(ch, g)) return true;
    }
  }
  return false;
}

function outside(x: number, y: number, hw: number, hh: number): boolean {
  return x - hw < 1 || x + hw > VIEW_W - 1 || y - hh < 1 || y + hh > VIEW_H - 1;
}

export interface MoveResult {
  hitX: boolean;
  hitY: boolean;
}

/**
 * Move a box one axis at a time and stop at solid tiles.
 * With `keepInside` the box also stops at the screen border (used for enemies).
 */
export function moveBox(
  g: Game,
  e: { x: number; y: number },
  dx: number,
  dy: number,
  hw: number,
  hh: number,
  keepInside: boolean,
): MoveResult {
  const res: MoveResult = { hitX: false, hitY: false };
  const blocked = (x: number, y: number): boolean =>
    boxBlocked(g, x, y, hw, hh) || (keepInside && outside(x, y, hw, hh));
  if (dx !== 0) {
    // Step in small slices so fast movers cannot skip through a tile.
    const steps = Math.max(1, Math.ceil(Math.abs(dx) / 4));
    for (let i = 0; i < steps; i++) {
      const nx = e.x + dx / steps;
      if (blocked(nx, e.y)) {
        res.hitX = true;
        break;
      }
      e.x = nx;
    }
  }
  if (dy !== 0) {
    const steps = Math.max(1, Math.ceil(Math.abs(dy) / 4));
    for (let i = 0; i < steps; i++) {
      const ny = e.y + dy / steps;
      if (blocked(e.x, ny)) {
        res.hitY = true;
        break;
      }
      e.y = ny;
    }
  }
  return res;
}

export function dirVec(dir: Dir): [number, number] {
  switch (dir) {
    case 'up':
      return [0, -1];
    case 'down':
      return [0, 1];
    case 'left':
      return [-1, 0];
    case 'right':
      return [1, 0];
  }
}

export function vecDir(x: number, y: number): Dir {
  if (Math.abs(x) >= Math.abs(y)) return x < 0 ? 'left' : 'right';
  return y < 0 ? 'up' : 'down';
}

export function overlaps(
  ax: number,
  ay: number,
  ahw: number,
  ahh: number,
  bx: number,
  by: number,
  bhw: number,
  bhh: number,
): boolean {
  return Math.abs(ax - bx) < ahw + bhw && Math.abs(ay - by) < ahh + bhh;
}
