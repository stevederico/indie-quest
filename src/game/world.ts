import { COLS, ROWS } from './constants';

/**
 * World map. Each screen is 16x11 tiles, laid out on a 4x3 grid:
 *
 *   (0,0) desert   (1,0) desert   (2,0) desert hub   (3,0) boss
 *   (0,1) cafe hub (1,1) cafe     (2,1) bali hub     (3,1) bali
 *   (0,2) cafe     (1,2) cafe     (2,2) bali         (3,2) bali
 *
 * Legend
 *   #  wall            .  floor            ~  water
 *   T  tree / plant    t  table / rock / tombstone
 *   g  cuttable clutter (box, bush, tumbleweed)
 *   1 2 3  gates opened by shipping product 1, 2, 3
 *   4  boss seal (closed while the boss fight runs)
 *   L  launch terminal N  local            S  sign
 *   c  commit          C  commit that appears when the room is cleared
 *   $  coin            H  coffee           @  player start
 *   b  bug   h  churn ghost   k  crab   r  reply troll   s  scope creep   B  boss
 */

export type Area = 'cafe' | 'bali' | 'desert' | 'boss';
export type ShipArea = 'cafe' | 'bali' | 'desert';
export const SHIP_AREAS: readonly ShipArea[] = ['cafe', 'bali', 'desert'];

export interface ScreenDef {
  sx: number;
  sy: number;
  area: Area;
  name: string;
  rows: readonly string[];
}

export interface GateFlags {
  shipped: Record<ShipArea, boolean>;
  bossActive: boolean;
}

export const WORLD_W = 4;
export const WORLD_H = 3;

const SCREENS: ScreenDef[] = [
  {
    sx: 0, sy: 1, area: 'cafe', name: 'COWORKING CAFE',
    rows: [
      '################',
      '#T..t..L...t..T#',
      '#..............#',
      '#..N...........#',
      '#...............',
      '#......@........',
      '#...............',
      '#.tt......tt...#',
      '#..........S...#',
      '#T............T#',
      '#######..#######',
    ],
  },
  {
    sx: 1, sy: 1, area: 'cafe', name: 'HOT DESKS',
    rows: [
      '################',
      '#T.....g....$..#',
      '#..tt......tt..#',
      '#......b.......#',
      '........b......1',
      '...............1',
      '.....b.....b...1',
      '#..tt......tt..#',
      '#.c......g.....#',
      '#T............T#',
      '#######..#######',
    ],
  },
  {
    sx: 0, sy: 2, area: 'cafe', name: 'MEETING ROOM',
    rows: [
      '#######..#######',
      '#..............#',
      '#.gg..b....tt..#',
      '#.g............#',
      '#......C........',
      '#...b...........',
      '#..........b....',
      '#..tt......g...#',
      '#....b.....gg..#',
      '#T....$.......T#',
      '################',
    ],
  },
  {
    sx: 1, sy: 2, area: 'cafe', name: 'STORAGE ROOM',
    rows: [
      '#######..#######',
      '#..........gggg#',
      '#..tt..b...g.cg#',
      '#..........gggg#',
      '.......h.......#',
      '...............#',
      '...............#',
      '#..b....tt..b..#',
      '#..............#',
      '#T..$.....H...T#',
      '################',
    ],
  },
  {
    sx: 2, sy: 1, area: 'bali', name: 'BALI BEACH',
    rows: [
      'TTTTTTT22TTTTTTT',
      'T..............T',
      'T..L.......N...T',
      'T..............T',
      '1...............',
      '1...............',
      '1...............',
      'T....S.........T',
      'T..........~~~.T',
      'T.........~~~~~T',
      'TTTTTTT..TTTTTTT',
    ],
  },
  {
    sx: 3, sy: 1, area: 'bali', name: 'CRAB COVE',
    rows: [
      'TTTTTTTTTTTTTTTT',
      'T....~~~~~~....T',
      'T..k..~~~~..g..T',
      'T...........h..T',
      '.......C...k...T',
      '...............T',
      '......h........T',
      'T..g.......$...T',
      'T....k.....~~..T',
      'T~~.......~~~~.T',
      'TTTTTTT..TTTTTTT',
    ],
  },
  {
    sx: 2, sy: 2, area: 'bali', name: 'RICE PADDIES',
    rows: [
      'TTTTTTT..TTTTTTT',
      'T..............T',
      'T.~~~~~.~~~~~~.T',
      'T.~c..~.~....~.T',
      'T.~.~.~.~.~~.~..',
      'T.~.~...~.$~....',
      'T.~.~~~~~.~~.~..',
      'T.~..........~.T',
      'T.~~~~~~~~~~~~rT',
      'T......k....h..T',
      'TTTTTTTTTTTTTTTT',
    ],
  },
  {
    sx: 3, sy: 2, area: 'bali', name: 'JUNGLE WIFI SPOT',
    rows: [
      'TTTTTTT..TTTTTTT',
      'T..............T',
      'T..g..r....g...T',
      'T.....T....T...T',
      '...............T',
      '.......C.....r.T',
      '...k...........T',
      'T.....T....T...T',
      'T..h.......g.H.T',
      'T..............T',
      'TTTTTTTTTTTTTTTT',
    ],
  },
  {
    sx: 2, sy: 0, area: 'desert', name: 'STARTUP DESERT',
    rows: [
      '################',
      '#..............#',
      '#..L.......N...#',
      '#..............#',
      '...............3',
      '...............3',
      '...............3',
      '#....S.....T...#',
      '#..T...........#',
      '#..............#',
      '#######22#######',
    ],
  },
  {
    sx: 1, sy: 0, area: 'desert', name: 'PIVOT DUNES',
    rows: [
      '################',
      '#..T...r...T...#',
      '#......s.......#',
      '#..........g...#',
      '................',
      '.......C........',
      '................',
      '#..s.......s...#',
      '#.....T........#',
      '#.$..........T.#',
      '################',
    ],
  },
  {
    sx: 0, sy: 0, area: 'desert', name: 'STARTUP GRAVEYARD',
    rows: [
      '################',
      '#c.t..t..t..t..#',
      '#..............#',
      '#.t..r.....s...#',
      '#...............',
      '#..h...C........',
      '#...............',
      '#.t..s.....r...#',
      '#..............#',
      '#..t..t..t.H.$.#',
      '################',
    ],
  },
  {
    sx: 3, sy: 0, area: 'boss', name: 'THE CHURN CLOUD',
    rows: [
      '################',
      '#..............#',
      '#.#..........#.#',
      '#..............#',
      '4..............#',
      '4..........B...#',
      '4..............#',
      '#..............#',
      '#.#..........#.#',
      '#..............#',
      '################',
    ],
  },
];

const BY_KEY = new Map<string, ScreenDef>(SCREENS.map((s) => [screenKey(s.sx, s.sy), s]));

export function screenKey(sx: number, sy: number): string {
  return `${sx},${sy}`;
}

export function allScreens(): readonly ScreenDef[] {
  return SCREENS;
}

export function getScreen(sx: number, sy: number): ScreenDef | undefined {
  return BY_KEY.get(screenKey(sx, sy));
}

/** Map characters that are only spawn markers and sit on plain floor. */
const MARKERS = new Set(['c', 'C', '$', 'H', '@', 'b', 'h', 'k', 'r', 's', 'B']);

export function isMarker(ch: string): boolean {
  return MARKERS.has(ch);
}

/** Tiles the player can talk to or use. */
export function isInteractive(ch: string): boolean {
  return ch === 'L' || ch === 'N' || ch === 'S';
}

export function isCuttable(ch: string): boolean {
  return ch === 'g';
}

/** True when the tile blocks walking, given which gates are open. */
export function isSolid(ch: string, flags: GateFlags): boolean {
  switch (ch) {
    case '#':
    case '~':
    case 'T':
    case 't':
    case 'g':
    case 'L':
    case 'N':
    case 'S':
      return true;
    case '1':
      return !flags.shipped.cafe;
    case '2':
      return !flags.shipped.bali;
    case '3':
      return !flags.shipped.desert;
    case '4':
      return flags.bossActive;
    default:
      return false;
  }
}

/** Runtime copy of a screen with spawn markers turned into floor. */
export function buildTiles(def: ScreenDef): string[][] {
  return def.rows.map((row) => Array.from(row, (ch) => (isMarker(ch) ? '.' : ch)));
}

export interface Marker {
  ch: string;
  col: number;
  row: number;
}

export function findMarkers(def: ScreenDef): Marker[] {
  const out: Marker[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const ch = def.rows[row]![col]!;
      if (isMarker(ch)) out.push({ ch, col, row });
    }
  }
  return out;
}

/** Screen where the player wakes up after burning out in the given area. */
export function hubOf(area: Area): { sx: number; sy: number; col: number; row: number } {
  switch (area) {
    case 'cafe':
      return { sx: 0, sy: 1, col: 7, row: 5 };
    case 'bali':
      return { sx: 2, sy: 1, col: 7, row: 5 };
    case 'desert':
      return { sx: 2, sy: 0, col: 7, row: 5 };
    case 'boss':
      return { sx: 2, sy: 0, col: 12, row: 5 };
  }
}

export const PRODUCTS: Record<ShipArea, { name: string; pitch: string; unlock: string }> = {
  cafe: {
    name: 'LATTE LOG',
    pitch: 'A DASHBOARD FOR YOUR CAFFEINE.',
    unlock: 'FIRST CUSTOMERS! YOU CAN AFFORD A ONE WAY TICKET. THE GATE TO BALI IS OPEN.',
  },
  bali: {
    name: 'NOMAD NAP',
    pitch: 'HAMMOCK BOOKING FOR REMOTE WORKERS.',
    unlock: 'YOU LEARNED HOTFIX! AT FULL ENERGY YOUR KEYBOARD FIRES A PATCH. THE DESERT ROAD IS OPEN.',
  },
  desert: {
    name: 'CACTUS CRM',
    pitch: 'A CRM THAT NEEDS NO WATERING.',
    unlock: 'YOU ARE NOW A 10X DEV. DOUBLE DAMAGE! THE CHURN CLOUD IS OPEN. GO EAST.',
  },
};
