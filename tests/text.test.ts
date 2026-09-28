import { describe, expect, it } from 'vitest';
import { createRng } from '../src/game/rng';
import {
  formatMrr,
  formatTime,
  INTRO,
  LINE_CHARS,
  npcLines,
  PAGE_LINES,
  paginate,
  rankFor,
  shipLines,
  signLines,
  terminalNeedLines,
  wrap,
} from '../src/game/text';
import { GLYPHS } from '../src/render/font';

describe('text', () => {
  it('wraps on word borders', () => {
    expect(wrap('SHIP FAST AND OFTEN', 9)).toEqual(['SHIP FAST', 'AND OFTEN']);
    expect(wrap('  ', 9)).toEqual([]);
    expect(wrap('ABCDEFGHIJKL', 5)).toEqual(['ABCDE', 'FGHIJ', 'KL']);
  });

  it('never makes a line longer than the box', () => {
    const all = [
      ...INTRO,
      ...npcLines('cafe', { cafe: false, bali: false, desert: false }),
      ...npcLines('bali', { cafe: true, bali: false, desert: false }),
      ...npcLines('desert', { cafe: true, bali: true, desert: true }),
      ...signLines('cafe'),
      ...shipLines('bali'),
      ...terminalNeedLines('desert', 1),
    ];
    for (const page of paginate(all)) {
      const lines = page.split('\n');
      expect(lines.length).toBeLessThanOrEqual(PAGE_LINES);
      for (const line of lines) expect(line.length).toBeLessThanOrEqual(LINE_CHARS);
    }
  });

  it('only uses characters the pixel font can draw', () => {
    const shipped = { cafe: true, bali: true, desert: true };
    const fresh = { cafe: false, bali: false, desert: false };
    const all = [
      ...INTRO,
      ...(['cafe', 'bali', 'desert'] as const).flatMap((a) => [
        ...npcLines(a, shipped),
        ...npcLines(a, fresh),
        ...signLines(a),
        ...shipLines(a),
        ...terminalNeedLines(a, 0),
      ]),
    ].join(' ');
    for (const ch of all) expect(ch === ' ' || ch in GLYPHS, `"${ch}"`).toBe(true);
  });

  it('formats money, time and rank', () => {
    expect(formatMrr(0)).toBe('$0');
    expect(formatMrr(1234567)).toBe('$1,234,567');
    expect(formatMrr(-5)).toBe('$0');
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(125.9)).toBe('2:05');
    expect(rankFor(100)).toBe('SIDE PROJECT HERO');
    expect(rankFor(20000)).toBe('INDIE LEGEND');
  });
});

describe('rng', () => {
  it('repeats for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 20; i++) expect(a.next()).toBe(b.next());
  });

  it('stays in range', () => {
    const r = createRng(7);
    for (let i = 0; i < 500; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      expect(r.int(5)).toBeLessThan(5);
      const x = r.range(2, 3);
      expect(x).toBeGreaterThanOrEqual(2);
      expect(x).toBeLessThan(3);
    }
  });
});
