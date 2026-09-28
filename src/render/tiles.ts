import { COLS, ROWS, TILE, VIEW_H, VIEW_W } from '../game/constants';
import type { Area, GateFlags } from '../game/world';
import { isSolid } from '../game/world';
import { getArt, makeCanvas, type Ctx } from './bake';

/** Painted ground for one screen. Two frames so water and lights can move. */
export interface Layer {
  frames: [HTMLCanvasElement, HTMLCanvasElement];
  locals: { x: number; y: number }[];
  terminals: { x: number; y: number }[];
}

function hash(col: number, row: number, n: number): number {
  let h = (Math.imul(col + 11, 73856093) ^ Math.imul(row + 7, 19349663) ^ Math.imul(n + 3, 83492791)) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995) >>> 0;
  return (h ^ (h >>> 15)) >>> 0;
}

function px(c: Ctx, color: string, x: number, y: number, w = 1, h = 1): void {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
}

function floor(c: Ctx, area: Area, col: number, row: number, x: number, y: number): void {
  switch (area) {
    case 'cafe': {
      px(c, '#b8794a', x, y, TILE, TILE);
      px(c, '#8f5a33', x, y + 7, TILE, 1);
      px(c, '#8f5a33', x, y + 15, TILE, 1);
      px(c, '#c78a58', x, y, TILE, 1);
      px(c, '#c78a58', x, y + 8, TILE, 1);
      px(c, '#8f5a33', x + (hash(col, row, 1) % 14) + 1, y, 1, 7);
      px(c, '#8f5a33', x + (hash(col, row, 2) % 14) + 1, y + 8, 1, 7);
      for (let i = 0; i < 3; i++) {
        const h = hash(col, row, 10 + i);
        px(c, '#a66b3f', x + (h % 14) + 1, y + ((h >>> 5) % 6) + 1 + (i % 2) * 8, 2, 1);
      }
      break;
    }
    case 'bali': {
      px(c, '#ecd9a0', x, y, TILE, TILE);
      for (let i = 0; i < 6; i++) {
        const h = hash(col, row, 20 + i);
        px(c, i % 2 ? '#d9c182' : '#f6e8b8', x + (h % 16), y + ((h >>> 5) % 16), 1, 1);
      }
      const h = hash(col, row, 30);
      if (h % 11 === 0) {
        const sx = x + 3 + ((h >>> 4) % 9);
        const sy = y + 3 + ((h >>> 8) % 9);
        px(c, '#e86fb0', sx, sy, 3, 1);
        px(c, '#e86fb0', sx + 1, sy - 1, 1, 3);
      } else if (h % 13 === 0) {
        const sx = x + 3 + ((h >>> 4) % 9);
        const sy = y + 3 + ((h >>> 8) % 9);
        px(c, '#f4f4f4', sx, sy, 2, 2);
        px(c, '#c9a66b', sx, sy + 2, 2, 1);
      }
      break;
    }
    case 'desert': {
      px(c, '#e0a45e', x, y, TILE, TILE);
      for (let i = 0; i < TILE; i++) {
        const wx = col * TILE + i;
        const a = Math.round(Math.sin(wx / 5 + row * 1.7) * 2);
        px(c, '#c98a45', x + i, y + 4 + a, 1, 1);
        const b = Math.round(Math.sin(wx / 7 + row * 2.9 + 2) * 2);
        px(c, '#eab672', x + i, y + 12 + b, 1, 1);
      }
      const h = hash(col, row, 40);
      if (h % 5 === 0) px(c, '#a8703a', x + 2 + ((h >>> 4) % 12), y + 2 + ((h >>> 8) % 12), 2, 1);
      break;
    }
    case 'boss': {
      px(c, '#1d2140', x, y, TILE, TILE);
      px(c, '#2a3060', x, y, TILE, 1);
      px(c, '#2a3060', x, y, 1, TILE);
      px(c, '#161a33', x, y + 15, TILE, 1);
      px(c, '#161a33', x + 15, y, 1, TILE);
      const h = hash(col, row, 50);
      if (h % 4 === 0) px(c, '#3b5dc9', x + 7, y + 7, 2, 2);
      break;
    }
  }
}

function wall(c: Ctx, area: Area, col: number, row: number, x: number, y: number, frame: number, openBelow: boolean): void {
  switch (area) {
    case 'cafe': {
      px(c, '#6e3328', x, y, TILE, TILE);
      for (let r = 0; r < 4; r++) {
        const off = (r + row * 4) % 2 === 0 ? 0 : 4;
        for (let b = -1; b < 3; b++) {
          const bx = b * 8 + off;
          const x0 = Math.max(0, bx);
          const x1 = Math.min(TILE, bx + 7);
          if (x1 <= x0) continue;
          const shade = hash(col * 2 + b, row * 4 + r, 60) % 3;
          px(c, shade === 0 ? '#a9523f' : shade === 1 ? '#b35a45' : '#9c4a39', x + x0, y + r * 4, x1 - x0, 3);
          px(c, '#c46c54', x + x0, y + r * 4, x1 - x0, 1);
        }
      }
      if (openBelow) {
        px(c, '#3d1f1a', x, y + 12, TILE, 4);
        px(c, '#5a2e28', x, y + 12, TILE, 1);
      }
      break;
    }
    case 'desert':
    case 'bali': {
      px(c, '#8a452f', x, y, TILE, TILE);
      for (let q = 0; q < 4; q++) {
        const qx = x + (q % 2) * 8;
        const qy = y + Math.floor(q / 2) * 8;
        const h = hash(col * 2 + (q % 2), row * 2 + Math.floor(q / 2), 70);
        const w = 6 + (h % 2);
        const hh = 6 + ((h >>> 3) % 2);
        px(c, '#b0623f', qx + 1, qy + 1, w, hh);
        px(c, '#cf8358', qx + 1, qy + 1, w, 1);
        px(c, '#cf8358', qx + 1, qy + 1, 1, hh - 1);
        px(c, '#7a3b28', qx + 1, qy + hh, w, 1);
      }
      if (openBelow) px(c, '#5c2c1e', x, y + 14, TILE, 2);
      break;
    }
    case 'boss': {
      px(c, '#0f1226', x, y, TILE, TILE);
      px(c, '#2a3060', x, y, TILE, 1);
      px(c, '#2a3060', x, y, 1, TILE);
      px(c, '#2a3060', x + 15, y, 1, TILE);
      for (let u = 0; u < 3; u++) {
        const uy = y + 2 + u * 5;
        px(c, '#1d2140', x + 2, uy, 12, 4);
        px(c, '#0f1226', x + 7, uy + 1, 6, 1);
        px(c, '#0f1226', x + 7, uy + 3, 6, 1);
        const h = hash(col, row, 80 + u);
        const on = (h + frame) % 2 === 0;
        px(c, on ? (h % 3 === 0 ? '#e0566b' : '#a7f070') : '#257179', x + 3, uy + 1, 2, 2);
      }
      break;
    }
  }
}

function water(c: Ctx, tiles: string[][], col: number, row: number, x: number, y: number, frame: number): void {
  px(c, '#3a8ee0', x, y, TILE, TILE);
  for (let i = 0; i < 3; i++) {
    const h = hash(col, row, 90 + i);
    const wx = ((h % 12) + frame * 3) % 13;
    const wy = 2 + i * 5 + ((h >>> 4) % 2);
    px(c, '#6cc4f5', x + wx, y + wy, 3, 1);
    px(c, '#2f78c9', x + ((wx + 7) % 13), y + wy + 2, 2, 1);
  }
  const wet = (cc: number, rr: number): boolean =>
    cc < 0 || cc >= COLS || rr < 0 || rr >= ROWS || tiles[rr]![cc] === '~';
  const foam = '#d6f3ff';
  if (!wet(col, row - 1)) {
    px(c, foam, x, y, TILE, 1);
    px(c, foam, x + 2 + frame * 3, y + 1, 5, 1);
    px(c, foam, x + 10 - frame * 2, y + 1, 3, 1);
  }
  if (!wet(col, row + 1)) {
    px(c, '#2f78c9', x, y + 15, TILE, 1);
  }
  if (!wet(col - 1, row)) {
    px(c, foam, x, y, 1, TILE);
    px(c, foam, x + 1, y + 3 + frame * 2, 1, 4);
  }
  if (!wet(col + 1, row)) {
    px(c, foam, x + 15, y, 1, TILE);
    px(c, foam, x + 14, y + 8 - frame * 2, 1, 4);
  }
}

function gate(c: Ctx, x: number, y: number): void {
  const art = getArt();
  px(c, '#1a1c2c', x, y, TILE, TILE);
  for (let i = 0; i < 4; i++) {
    px(c, '#8a93a8', x + 1 + i * 4, y + 1, 2, 14);
    px(c, '#c2c9d6', x + 1 + i * 4, y + 1, 1, 14);
  }
  px(c, '#333c57', x, y + 2, TILE, 2);
  px(c, '#333c57', x, y + 12, TILE, 2);
  c.drawImage(art.lock.img, x + 4, y + 4);
}

function seal(c: Ctx, x: number, y: number, frame: number): void {
  px(c, '#0f1226', x, y, TILE, TILE);
  px(c, '#333c57', x, y, 3, TILE);
  px(c, '#333c57', x + 13, y, 3, TILE);
  for (let i = 0; i < 3; i++) {
    const ly = y + 2 + i * 5 + (frame ? 1 : 0);
    px(c, '#b13e53', x + 3, ly - 1, 10, 3);
    px(c, '#e0566b', x + 3, ly, 10, 1);
    px(c, '#f4f4f4', x + 4 + ((i + frame) % 2) * 4, ly, 3, 1);
  }
}

function debris(c: Ctx, area: Area, col: number, row: number, x: number, y: number): void {
  const color = area === 'cafe' ? '#9c6238' : area === 'desert' ? '#6b3e26' : '#38b764';
  for (let i = 0; i < 5; i++) {
    const h = hash(col, row, 100 + i);
    px(c, color, x + 3 + (h % 10), y + 5 + ((h >>> 4) % 8), 2, 1);
  }
}

function paintFrame(c: Ctx, tiles: string[][], area: Area, flags: GateFlags, frame: number): void {
  const art = getArt();
  const at = (cc: number, rr: number): string =>
    cc < 0 || cc >= COLS || rr < 0 || rr >= ROWS ? '#' : tiles[rr]![cc]!;
  const isWall = (ch: string): boolean => ch === '#';

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const ch = tiles[row]![col]!;
      const x = col * TILE;
      const y = row * TILE;
      switch (ch) {
        case '#':
          wall(c, area, col, row, x, y, frame, row + 1 < ROWS && !isWall(at(col, row + 1)));
          break;
        case '~':
          water(c, tiles, col, row, x, y, frame);
          break;
        case 'T': {
          if (area === 'bali') {
            const grove =
              col === 0 || row === 0 || col === COLS - 1 || row === ROWS - 1 ||
              [at(col - 1, row), at(col + 1, row), at(col, row - 1), at(col, row + 1)].includes('T');
            if (grove) {
              px(c, '#4f9a4a', x, y, TILE, TILE);
              for (let i = 0; i < 5; i++) {
                const h = hash(col, row, 110 + i);
                px(c, i % 2 ? '#3f8440' : '#66b35a', x + (h % 15), y + ((h >>> 4) % 15), 2, 1);
              }
            } else floor(c, area, col, row, x, y);
            c.drawImage(art.palm.img, x, y);
          } else {
            floor(c, area, col, row, x, y);
            c.drawImage(area === 'desert' ? art.cactus.img : art.plant.img, x, y);
          }
          break;
        }
        case 't':
          floor(c, area, col, row, x, y);
          c.drawImage(area === 'cafe' ? art.desk.img : area === 'desert' ? art.tomb.img : art.rock.img, x, y);
          break;
        case 'g':
          floor(c, area, col, row, x, y);
          c.drawImage(area === 'cafe' ? art.box.img : area === 'desert' ? art.dryBush.img : art.bush.img, x, y);
          break;
        case ',':
          floor(c, area, col, row, x, y);
          debris(c, area, col, row, x, y);
          break;
        case 'L':
          floor(c, area, col, row, x, y);
          c.drawImage(art.terminal.img, x, y);
          if (frame) px(c, '#73eff7', x + 3, y + 2, 2, 1);
          break;
        case 'S':
          floor(c, area, col, row, x, y);
          c.drawImage(art.sign.img, x, y);
          break;
        case '1':
        case '2':
        case '3':
          floor(c, area, col, row, x, y);
          if (isSolid(ch, flags)) gate(c, x, y);
          break;
        case '4':
          floor(c, area, col, row, x, y);
          if (isSolid(ch, flags)) seal(c, x, y, frame);
          break;
        default:
          floor(c, area, col, row, x, y);
      }
    }
  }

  // Soft shade under walls and props gives the flat ground some depth.
  c.fillStyle = 'rgba(26, 28, 44, 0.22)';
  for (let row = 1; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const here = tiles[row]![col]!;
      const above = tiles[row - 1]![col]!;
      const openHere = here === '.' || here === ',' || (!isSolid(here, flags) && here !== '~');
      if (openHere && (above === '#' || (above === 'T' && area === 'bali'))) {
        c.fillRect(col * TILE, row * TILE, TILE, 3);
      }
    }
  }
}

export function paintLayer(tiles: string[][], area: Area, flags: GateFlags): Layer {
  const frames = [0, 1].map((frame) => {
    const [canvas, ctx] = makeCanvas(VIEW_W, VIEW_H);
    paintFrame(ctx, tiles, area, flags, frame);
    return canvas;
  }) as [HTMLCanvasElement, HTMLCanvasElement];
  const locals: { x: number; y: number }[] = [];
  const terminals: { x: number; y: number }[] = [];
  tiles.forEach((row, r) =>
    row.forEach((ch, col) => {
      if (ch === 'N') locals.push({ x: col * TILE, y: r * TILE });
      if (ch === 'L') terminals.push({ x: col * TILE, y: r * TILE });
    }),
  );
  return { frames, locals, terminals };
}
