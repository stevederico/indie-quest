import { DRY_SWAPS, NPC_SWAPS, PALETTE, recolor, SPRITES, type Sprite, type SpriteName } from './sprites';

export type Ctx = CanvasRenderingContext2D;

export interface Baked {
  w: number;
  h: number;
  img: HTMLCanvasElement;
  /** Mirrored left to right. */
  flip: HTMLCanvasElement;
  /** Solid white shape, for hit flashes. */
  white: HTMLCanvasElement;
  whiteFlip: HTMLCanvasElement;
}

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [canvas, ctx];
}

function paint(sprite: Sprite, mirror: boolean, white: boolean): HTMLCanvasElement {
  const w = sprite[0]!.length;
  const h = sprite.length;
  const [canvas, ctx] = makeCanvas(w, h);
  for (let y = 0; y < h; y++) {
    const row = sprite[y]!;
    for (let x = 0; x < w; x++) {
      const ch = row[x]!;
      if (ch === '.') continue;
      ctx.fillStyle = white ? '#ffffff' : (PALETTE[ch] ?? '#ff00ff');
      ctx.fillRect(mirror ? w - 1 - x : x, y, 1, 1);
    }
  }
  return canvas;
}

export function bake(sprite: Sprite): Baked {
  return {
    w: sprite[0]!.length,
    h: sprite.length,
    img: paint(sprite, false, false),
    flip: paint(sprite, true, false),
    white: paint(sprite, false, true),
    whiteFlip: paint(sprite, true, true),
  };
}

/** Quarter turn clockwise. */
export function rotate(src: HTMLCanvasElement): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(src.height, src.width);
  ctx.translate(src.height, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(src, 0, 0);
  return canvas;
}

export type Art = Record<SpriteName, Baked> & {
  npc: Record<string, Baked>;
  dryBush: Baked;
  keyboardV: HTMLCanvasElement;
};

let art: Art | null = null;

/** Bake every sprite once. Needs a browser. */
export function getArt(): Art {
  if (art) return art;
  const out: Record<string, unknown> = {};
  for (const name of Object.keys(SPRITES) as SpriteName[]) out[name] = bake(SPRITES[name]);
  const npc: Record<string, Baked> = {};
  for (const [area, swaps] of Object.entries(NPC_SWAPS)) {
    npc[area] = bake(recolor(SPRITES.playerDownIdle, swaps));
  }
  out.npc = npc;
  out.dryBush = bake(recolor(SPRITES.bush, DRY_SWAPS));
  out.keyboardV = rotate((out.keyboard as Baked).img);
  art = out as Art;
  return art;
}

/** Filled or outlined circle made of whole pixels. */
export function pixelCircle(ctx: Ctx, cx: number, cy: number, r: number, color: string, filled: boolean): void {
  ctx.fillStyle = color;
  const x0 = Math.round(cx);
  const y0 = Math.round(cy);
  const rad = Math.max(0, Math.round(r));
  for (let dy = -rad; dy <= rad; dy++) {
    const span = Math.round(Math.sqrt(rad * rad - dy * dy));
    if (filled) {
      ctx.fillRect(x0 - span, y0 + dy, span * 2 + 1, 1);
    } else {
      const inner = Math.abs(dy) >= rad - 1 ? 0 : Math.round(Math.sqrt((rad - 1) * (rad - 1) - dy * dy));
      if (inner === 0) ctx.fillRect(x0 - span, y0 + dy, span * 2 + 1, 1);
      else {
        ctx.fillRect(x0 - span, y0 + dy, span - inner + 1, 1);
        ctx.fillRect(x0 + inner, y0 + dy, span - inner + 1, 1);
      }
    }
  }
}
