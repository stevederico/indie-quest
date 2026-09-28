/** 5x7 pixel font, drawn from data. Uppercase, digits and a few signs. */

export const GLYPH_W = 5;
export const GLYPH_H = 7;
/** Horizontal step from one character to the next. */
export const ADVANCE = 6;
export const LINE_H = 9;

/** Each glyph is 7 rows of 5 cells, rows split by "/". "#" is ink. */
export const GLYPHS: Record<string, string> = {
  A: '.###./#...#/#...#/#####/#...#/#...#/#...#',
  B: '####./#...#/#...#/####./#...#/#...#/####.',
  C: '.###./#...#/#..../#..../#..../#...#/.###.',
  D: '####./#...#/#...#/#...#/#...#/#...#/####.',
  E: '#####/#..../#..../####./#..../#..../#####',
  F: '#####/#..../#..../####./#..../#..../#....',
  G: '.###./#...#/#..../#.###/#...#/#...#/.###.',
  H: '#...#/#...#/#...#/#####/#...#/#...#/#...#',
  I: '.###./..#../..#../..#../..#../..#../.###.',
  J: '..###/...#./...#./...#./...#./#..#./.##..',
  K: '#...#/#..#./#.#../##.../#.#../#..#./#...#',
  L: '#..../#..../#..../#..../#..../#..../#####',
  M: '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#',
  N: '#...#/##..#/#.#.#/#..##/#...#/#...#/#...#',
  O: '.###./#...#/#...#/#...#/#...#/#...#/.###.',
  P: '####./#...#/#...#/####./#..../#..../#....',
  Q: '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#',
  R: '####./#...#/#...#/####./#.#../#..#./#...#',
  S: '.####/#..../#..../.###./....#/....#/####.',
  T: '#####/..#../..#../..#../..#../..#../..#..',
  U: '#...#/#...#/#...#/#...#/#...#/#...#/.###.',
  V: '#...#/#...#/#...#/#...#/#...#/.#.#./..#..',
  W: '#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#',
  X: '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
  Y: '#...#/#...#/.#.#./..#../..#../..#../..#..',
  Z: '#####/....#/...#./..#../.#.../#..../#####',
  '0': '.###./#...#/#..##/#.#.#/##..#/#...#/.###.',
  '1': '..#../.##../..#../..#../..#../..#../.###.',
  '2': '.###./#...#/....#/...#./..#../.#.../#####',
  '3': '####./....#/....#/.###./....#/....#/####.',
  '4': '...#./..##./.#.#./#..#./#####/...#./...#.',
  '5': '#####/#..../####./....#/....#/#...#/.###.',
  '6': '.###./#..../#..../####./#...#/#...#/.###.',
  '7': '#####/....#/...#./..#../..#../..#../..#..',
  '8': '.###./#...#/#...#/.###./#...#/#...#/.###.',
  '9': '.###./#...#/#...#/.####/....#/....#/.###.',
  '.': '...../...../...../...../...../.##../.##..',
  ',': '...../...../...../...../.##../.##../.#...',
  '!': '..#../..#../..#../..#../..#../...../..#..',
  '?': '.###./#...#/....#/...#./..#../...../..#..',
  ':': '...../.##../.##../...../.##../.##../.....',
  "'": '..#../..#../...../...../...../...../.....',
  '-': '...../...../...../.###./...../...../.....',
  '+': '...../..#../..#../#####/..#../..#../.....',
  $: '..#../.####/#.#../.###./..#.#/####./..#..',
  '/': '....#/....#/...#./..#../.#.../#..../#....',
  '(': '...#./..#../.#.../.#.../.#.../..#../...#.',
  ')': '.#.../..#../...#./...#./...#./..#../.#...',
  '%': '##..#/##.#./...#./..#../.#.../.#.##/#..##',
  '>': '.#.../..#../...#./....#/...#./..#../.#...',
  '<': '...#./..#../.#.../#..../.#.../..#../...#.',
};

export function textWidth(text: string, scale = 1): number {
  if (text.length === 0) return 0;
  return (text.length * ADVANCE - 1) * scale;
}

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

const ATLAS_COLS = 16;
const atlases = new Map<string, HTMLCanvasElement>();
const ORDER = Object.keys(GLYPHS);
const INDEX = new Map(ORDER.map((ch, i) => [ch, i]));

/** One sheet of every glyph in a single color, built on first use. */
function atlas(color: string): HTMLCanvasElement {
  let sheet = atlases.get(color);
  if (sheet) return sheet;
  sheet = document.createElement('canvas');
  sheet.width = ATLAS_COLS * GLYPH_W;
  sheet.height = Math.ceil(ORDER.length / ATLAS_COLS) * GLYPH_H;
  const c = sheet.getContext('2d')!;
  c.fillStyle = color;
  ORDER.forEach((ch, i) => {
    const ox = (i % ATLAS_COLS) * GLYPH_W;
    const oy = Math.floor(i / ATLAS_COLS) * GLYPH_H;
    GLYPHS[ch]!.split('/').forEach((row, y) => {
      for (let x = 0; x < GLYPH_W; x++) if (row[x] === '#') c.fillRect(ox + x, oy + y, 1, 1);
    });
  });
  atlases.set(color, sheet);
  return sheet;
}

export type Align = 'left' | 'center' | 'right';

export function drawText(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  color = '#f4f4f4',
  align: Align = 'left',
  scale = 1,
): void {
  const upper = text.toUpperCase();
  let cx = Math.round(x);
  if (align === 'center') cx = Math.round(x - textWidth(upper, scale) / 2);
  else if (align === 'right') cx = Math.round(x - textWidth(upper, scale));
  const cy = Math.round(y);
  const sheet = atlas(color);
  for (const ch of upper) {
    const i = INDEX.get(ch);
    if (i !== undefined) {
      ctx.drawImage(
        sheet,
        (i % ATLAS_COLS) * GLYPH_W,
        Math.floor(i / ATLAS_COLS) * GLYPH_H,
        GLYPH_W,
        GLYPH_H,
        cx,
        cy,
        GLYPH_W * scale,
        GLYPH_H * scale,
      );
    }
    cx += ADVANCE * scale;
  }
}

/** Text with a dark rim so it stays readable on any ground. */
export function drawTextShadow(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  color = '#f4f4f4',
  align: Align = 'left',
  scale = 1,
  shadow = '#1a1c2c',
): void {
  drawText(ctx, text, x + scale, y + scale, shadow, align, scale);
  drawText(ctx, text, x, y, color, align, scale);
}
