import { describe, expect, it } from 'vitest';
import { COLS, ROWS } from '../src/game/constants';
import {
  allScreens,
  buildTiles,
  findMarkers,
  getScreen,
  hubOf,
  isSolid,
  SHIP_AREAS,
  type Area,
  type GateFlags,
  type ShipArea,
} from '../src/game/world';

const LEGEND = new Set('#.~TtgLNScC$H@bhkrsB1234'.split(''));

function flags(shipped: Partial<Record<ShipArea, boolean>> = {}, bossActive = false): GateFlags {
  return { shipped: { cafe: false, bali: false, desert: false, ...shipped }, bossActive };
}

/** Walkable for path checks: clutter can be cut, so it counts as open. */
function open(ch: string, f: GateFlags): boolean {
  return ch === 'g' || !isSolid(ch, f);
}

/** Flood fill over the whole world from the player start. Returns reached "sx,sy,col,row" keys. */
function reach(f: GateFlags): Set<string> {
  const start = allScreens().find((s) => s.rows.some((r) => r.includes('@')))!;
  const at = findMarkers(start).find((m) => m.ch === '@')!;
  const seen = new Set<string>();
  const queue: [number, number, number, number][] = [[start.sx, start.sy, at.col, at.row]];
  while (queue.length) {
    const [sx, sy, col, row] = queue.pop()!;
    const key = `${sx},${sy},${col},${row}`;
    if (seen.has(key)) continue;
    const def = getScreen(sx, sy);
    if (!def || !open(def.rows[row]![col]!, f)) continue;
    seen.add(key);
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      let nsx = sx;
      let nsy = sy;
      let nc = col + dc;
      let nr = row + dr;
      if (nc < 0) { nsx--; nc = COLS - 1; }
      if (nc >= COLS) { nsx++; nc = 0; }
      if (nr < 0) { nsy--; nr = ROWS - 1; }
      if (nr >= ROWS) { nsy++; nr = 0; }
      queue.push([nsx, nsy, nc, nr]);
    }
  }
  return seen;
}

/** True when a tile next to the target can be reached (targets like terminals are solid). */
function touches(seen: Set<string>, sx: number, sy: number, col: number, row: number): boolean {
  return [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) =>
    seen.has(`${sx},${sy},${col + dc!},${row + dr!}`),
  );
}

function find(ch: string, area?: Area): { sx: number; sy: number; col: number; row: number }[] {
  const out: { sx: number; sy: number; col: number; row: number }[] = [];
  for (const s of allScreens()) {
    if (area && s.area !== area) continue;
    s.rows.forEach((r, row) =>
      Array.from(r).forEach((c, col) => {
        if (c === ch) out.push({ sx: s.sx, sy: s.sy, col, row });
      }),
    );
  }
  return out;
}

describe('world map', () => {
  it('has 12 screens of 16x11 known tiles', () => {
    expect(allScreens()).toHaveLength(12);
    for (const s of allScreens()) {
      expect(s.rows, s.name).toHaveLength(ROWS);
      for (const row of s.rows) {
        expect(row.length, `${s.name}: "${row}"`).toBe(COLS);
        for (const ch of row) expect(LEGEND.has(ch), `${s.name}: "${ch}"`).toBe(true);
      }
    }
  });

  it('lines up exits between neighbor screens', () => {
    const all = flags({ cafe: true, bali: true, desert: true });
    for (const s of allScreens()) {
      for (let row = 0; row < ROWS; row++) {
        const east = getScreen(s.sx + 1, s.sy);
        const here = open(s.rows[row]![COLS - 1]!, all);
        if (!east) expect(here, `${s.name} east edge row ${row}`).toBe(false);
        else expect(open(east.rows[row]![0]!, all), `${s.name} east row ${row}`).toBe(here);
        if (!getScreen(s.sx - 1, s.sy)) {
          expect(open(s.rows[row]![0]!, all), `${s.name} west edge row ${row}`).toBe(false);
        }
      }
      for (let col = 0; col < COLS; col++) {
        const south = getScreen(s.sx, s.sy + 1);
        const here = open(s.rows[ROWS - 1]![col]!, all);
        if (!south) expect(here, `${s.name} south edge col ${col}`).toBe(false);
        else expect(open(south.rows[0]![col]!, all), `${s.name} south col ${col}`).toBe(here);
        if (!getScreen(s.sx, s.sy - 1)) {
          expect(open(s.rows[0]![col]!, all), `${s.name} north edge col ${col}`).toBe(false);
        }
      }
    }
  });

  it('has one start, and per land 3 commits, a terminal, a local and a sign', () => {
    expect(find('@')).toHaveLength(1);
    expect(find('B')).toHaveLength(1);
    for (const area of SHIP_AREAS) {
      expect(find('c', area).length + find('C', area).length, area).toBe(3);
      expect(find('L', area), area).toHaveLength(1);
      expect(find('N', area), area).toHaveLength(1);
      expect(find('S', area), area).toHaveLength(1);
    }
  });

  it('puts an enemy in every room that hides a clear commit', () => {
    for (const s of allScreens()) {
      const marks = findMarkers(s).map((m) => m.ch);
      if (marks.includes('C')) expect(marks.some((m) => 'bhkrs'.includes(m)), s.name).toBe(true);
    }
  });

  it('keeps later lands locked until products ship', () => {
    const none = reach(flags());
    for (const t of [...find('c', 'cafe'), ...find('C', 'cafe')]) {
      expect(none.has(`${t.sx},${t.sy},${t.col},${t.row}`)).toBe(true);
    }
    const cafeTerminal = find('L', 'cafe')[0]!;
    expect(touches(none, cafeTerminal.sx, cafeTerminal.sy, cafeTerminal.col, cafeTerminal.row)).toBe(true);
    expect([...none].some((k) => k.startsWith('2,1,'))).toBe(false);

    const one = reach(flags({ cafe: true }));
    for (const t of [...find('c', 'bali'), ...find('C', 'bali')]) {
      expect(one.has(`${t.sx},${t.sy},${t.col},${t.row}`)).toBe(true);
    }
    expect([...one].some((k) => k.startsWith('2,0,'))).toBe(false);

    const two = reach(flags({ cafe: true, bali: true }));
    for (const t of [...find('c', 'desert'), ...find('C', 'desert')]) {
      expect(two.has(`${t.sx},${t.sy},${t.col},${t.row}`)).toBe(true);
    }
    expect([...two].some((k) => k.startsWith('3,0,'))).toBe(false);

    const three = reach(flags({ cafe: true, bali: true, desert: true }));
    const boss = find('B')[0]!;
    expect(three.has(`${boss.sx},${boss.sy},${boss.col},${boss.row}`)).toBe(true);
  });

  it('can reach every pickup, terminal, local and sign once all gates are open', () => {
    const seen = reach(flags({ cafe: true, bali: true, desert: true }));
    for (const ch of ['c', 'C', '$', 'H', 'L', 'N', 'S']) {
      for (const t of find(ch)) {
        expect(touches(seen, t.sx, t.sy, t.col, t.row), `${ch} at ${t.sx},${t.sy}`).toBe(true);
      }
    }
  });

  it('seals the boss room only during the fight', () => {
    expect(isSolid('4', flags({}, true))).toBe(true);
    expect(isSolid('4', flags({}, false))).toBe(false);
  });

  it('turns markers into floor and keeps hubs on open ground', () => {
    for (const s of allScreens()) {
      for (const row of buildTiles(s)) for (const ch of row) expect('cC$H@bhkrsB'.includes(ch)).toBe(false);
    }
    for (const area of ['cafe', 'bali', 'desert', 'boss'] as const) {
      const hub = hubOf(area);
      const def = getScreen(hub.sx, hub.sy)!;
      expect(isSolid(buildTiles(def)[hub.row]![hub.col]!, flags()), area).toBe(false);
    }
  });
});
