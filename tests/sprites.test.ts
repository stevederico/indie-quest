import { describe, expect, it } from 'vitest';
import { GLYPH_H, GLYPH_W, GLYPHS, textWidth } from '../src/render/font';
import { DRY_SWAPS, NPC_SWAPS, PALETTE, recolor, SPRITE_SIZE, SPRITES, type SpriteName } from '../src/render/sprites';

describe('sprites', () => {
  it('have the right size and only palette colors', () => {
    for (const name of Object.keys(SPRITES) as SpriteName[]) {
      const [w, h] = SPRITE_SIZE[name];
      const rows = SPRITES[name];
      expect(rows.length, name).toBe(h);
      rows.forEach((row, y) => {
        expect(row.length, `${name} row ${y}: "${row}"`).toBe(w);
        for (const ch of row) expect(ch === '.' || ch in PALETTE, `${name} row ${y}: "${ch}"`).toBe(true);
      });
    }
  });

  it('keeps the boss mirrored', () => {
    for (const row of SPRITES.boss) expect(row).toBe(Array.from(row).reverse().join(''));
  });

  it('recolors into palette colors only', () => {
    for (const swaps of [...Object.values(NPC_SWAPS), DRY_SWAPS]) {
      for (const to of Object.values(swaps)) expect(to in PALETTE).toBe(true);
    }
    expect(recolor(['kh.'], { h: 'r' })).toEqual(['kr.']);
  });
});

describe('font', () => {
  it('has 5x7 glyphs', () => {
    for (const [ch, data] of Object.entries(GLYPHS)) {
      const rows = data.split('/');
      expect(rows.length, ch).toBe(GLYPH_H);
      for (const row of rows) {
        expect(row.length, `${ch}: "${row}"`).toBe(GLYPH_W);
        expect(/^[#.]+$/.test(row), ch).toBe(true);
      }
    }
  });

  it('covers letters and digits', () => {
    for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') expect(ch in GLYPHS, ch).toBe(true);
  });

  it('measures text', () => {
    expect(textWidth('')).toBe(0);
    expect(textWidth('A')).toBe(5);
    expect(textWidth('AB')).toBe(11);
    expect(textWidth('AB', 2)).toBe(22);
  });
});
