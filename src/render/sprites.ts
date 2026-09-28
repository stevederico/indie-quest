/**
 * All character, item and prop art, as text. One letter is one pixel.
 * Pure data: baking to canvases happens in bake.ts.
 */

export const PALETTE: Record<string, string> = {
  k: '#1a1c2c', // outline
  K: '#333c57', // dark slate
  w: '#f4f4f4',
  a: '#c2c9d6', // light gray
  A: '#8a93a8', // gray
  r: '#b13e53',
  R: '#e0566b',
  o: '#ef7d57',
  y: '#ffcd75',
  Y: '#f2a63c',
  l: '#a7f070',
  n: '#38b764',
  N: '#257179',
  b: '#29366f',
  B: '#3b5dc9',
  c: '#41a6f6',
  C: '#73eff7',
  p: '#5d275d',
  P: '#9b4fa5',
  v: '#d9c8ff', // ghost lavender
  m: '#e86fb0',
  s: '#f0c19c', // skin
  S: '#cf9270',
  h: '#6b3e26', // brown
  H: '#9c6238',
  e: '#ecd9a0', // sand
  E: '#c9a66b',
};

export type Sprite = readonly string[];

const PLAYER_DOWN: Sprite = [
  '................',
  '.....kkkkkk.....',
  '....khhhhhhk....',
  '...khhhhhhhhk...',
  '...khhsssshhk...',
  '...khsksskshk...',
  '...kssssssssk...',
  '....kssSSssk....',
  '...kkKKKKKKkk...',
  '..kKKKKwwKKKKk..',
  '..kKkKKKKKKkKk..',
  '..kskKKKKKKksk..',
  '...kkKKKKKKkk...',
  '....kbbkkbbk....',
  '....kbbk.kk.....',
  '....kkkk........',
];

const PLAYER_DOWN_IDLE: Sprite = [
  ...PLAYER_DOWN.slice(0, 13),
  '....kbbkkbbk....',
  '....kbbkkbbk....',
  '....kkkkkkkk....',
];

const PLAYER_UP: Sprite = [
  '................',
  '.....kkkkkk.....',
  '....khhhhhhk....',
  '...khhhhhhhhk...',
  '...khhhhhhhhk...',
  '...khhhhhhhhk...',
  '...khhhhhhhhk...',
  '....kshhhhsk....',
  '...kkKKKKKKkk...',
  '..kKKKkkkkKKKk..',
  '..kKkKKKKKKkKk..',
  '..kskKKKKKKksk..',
  '...kkKKKKKKkk...',
  '....kbbkkbbk....',
  '....kbbk.kk.....',
  '....kkkk........',
];

const PLAYER_UP_IDLE: Sprite = [
  ...PLAYER_UP.slice(0, 13),
  '....kbbkkbbk....',
  '....kbbkkbbk....',
  '....kkkkkkkk....',
];

const PLAYER_SIDE: Sprite = [
  '................',
  '.....kkkkkk.....',
  '....khhhhhhk....',
  '...khhhhhhhhk...',
  '...khhhhssssk...',
  '...khhhsskssk...',
  '...khhsssssssk..',
  '....khsssSssk...',
  '....kkKKKKkk....',
  '...kKKKKKKKKk...',
  '...kKKKkKKKKk...',
  '...kKKKskKKKk...',
  '....kkKKKKkk....',
  '....kbbbkbbk....',
  '...kbbk..kbbk...',
  '...kkkk..kkkk...',
];

const PLAYER_SIDE_IDLE: Sprite = [
  ...PLAYER_SIDE.slice(0, 13),
  '....kbbbbbbk....',
  '.....kbbbbk.....',
  '.....kkkkkk.....',
];

const BUG_A: Sprite = [
  '................',
  '................',
  '...k........k...',
  '....k......k....',
  '.....kkkkkk.....',
  '....krrrrrrk....',
  '.k.krwkRRkwrk.k.',
  '..kkrRRRRRRrkk..',
  '...krRkRRkRrk...',
  '..kkrRRRRRRrkk..',
  '.k.krRkRRkRrk.k.',
  '....krrrrrrk....',
  '.....kkkkkk.....',
  '................',
  '................',
  '................',
];

const BUG_B: Sprite = [
  '................',
  '................',
  '....k......k....',
  '....k......k....',
  '.....kkkkkk.....',
  '....krrrrrrk....',
  'k..krwkRRkwrk..k',
  '.kkkrRRRRRRrkkk.',
  '...krRkRRkRrk...',
  '.kkkrRRRRRRrkkk.',
  'k..krRkRRkRrk..k',
  '....krrrrrrk....',
  '.....kkkkkk.....',
  '................',
  '................',
  '................',
];

const GHOST_A: Sprite = [
  '................',
  '.....kkkkkk.....',
  '....kvvvvvvk....',
  '...kvvvvvvvvk...',
  '..kvvkkvvkkvvk..',
  '.kkvvkRvvkRvvkk.',
  'kvkvvvvvvvvvvkvk',
  'kvvvvvkkkkvvvvvk',
  '.kkvvkvvvvkvvkk.',
  '..kvvvvvvvvvvk..',
  '..kvvvvvvvvvk...',
  '...kvvvvvvvk....',
  '....kvvvvvk.....',
  '.....kkvvvk.....',
  '.......kkvvk....',
  '.........kk.....',
];

const GHOST_B: Sprite = [
  '................',
  '.....kkkkkk.....',
  '....kvvvvvvk....',
  '...kvvvvvvvvk...',
  '..kvvkkvvkkvvk..',
  '..kvvkRvvkRvvk..',
  '.kkvvvvvvvvvvkk.',
  'kvvvvvkkkkvvvvvk',
  'kvkvvkvvvvkvvkvk',
  '..kvvvvvvvvvvk..',
  '..kvvvvvvvvvk...',
  '...kvvvvvvvk....',
  '....kvvvvvk.....',
  '.....kvvvkk.....',
  '......kvvk......',
  '.......kk.......',
];

const CRAB_A: Sprite = [
  '................',
  '................',
  '.kk..........kk.',
  'kook........kook',
  'kook........kook',
  '.kok.kkkkkk.kok.',
  '..kokooooookok..',
  '...kowkookwok...',
  '...kooooooook...',
  '..kkoYooooYokk..',
  '.k..kkkkkkkk..k.',
  'k..k.k....k.k..k',
  '................',
  '................',
  '................',
  '................',
];

const CRAB_B: Sprite = [
  '................',
  '.kk..........kk.',
  'kook........kook',
  'kook........kook',
  '.kk..........kk.',
  '.kok.kkkkkk.kok.',
  '..kokooooookok..',
  '...kowkookwok...',
  '...kooooooook...',
  '..kkoYooooYokk..',
  '..k.kkkkkkkk.k..',
  '.k.k..k..k..k.k.',
  '................',
  '................',
  '................',
  '................',
];

const TROLL_A: Sprite = [
  '................',
  '..k..........k..',
  '.knk.kkkkkk.knk.',
  '.knnknnnnnnknnk.',
  '..knnnnnnnnnnk..',
  '..knwknnnnwknk..',
  '..knkknnnnkknk..',
  '..knnnnnnnnnnk..',
  '..knnkwkwkwknk..',
  '..knnnkkkkknnk..',
  '...knnnnnnnnk...',
  '....kkNNNNkk....',
  '...kNNNNNNNNk...',
  '...kNkNNNNkNk...',
  '....kkkk.kkkk...',
  '................',
];

const TROLL_B: Sprite = [
  '................',
  '..k..........k..',
  '.knk.kkkkkk.knk.',
  '.knnknnnnnnknnk.',
  '..knnnnnnnnnnk..',
  '..knwknnnnwknk..',
  '..knkknnnnkknk..',
  '..knnnnnnnnnnk..',
  '..knnkwkwkwknk..',
  '..knnnkkkkknnk..',
  '...knnnnnnnnk...',
  '....kkNNNNkk....',
  '...kNNNNNNNNk...',
  '...kNkNNNNkNk...',
  '...kkkk.kkkk....',
  '................',
];

const SCORPION_A: Sprite = [
  '................',
  '.......kk.......',
  '......kyyk......',
  '......kPPk......',
  '.......kPPk.....',
  '......kPPk......',
  '....kkPPPPkk....',
  '.k.kPPPPPPPPk.k.',
  '..kkPwkPPkwPkk..',
  '.k.kPPPPPPPPk.k.',
  '..kkPPPPPPPPkk..',
  '.k..kPPkkPPk..k.',
  '...kPPk..kPPk...',
  '..kpk......kpk..',
  '..kk........kk..',
  '................',
];

const SCORPION_B: Sprite = [
  '................',
  '.......kk.......',
  '......kyyk......',
  '......kPPk......',
  '.....kPPk.......',
  '......kPPk......',
  '....kkPPPPkk....',
  'k..kPPPPPPPPk..k',
  '.kkkPwkPPkwPkkk.',
  'k..kPPPPPPPPk..k',
  '.kkkPPPPPPPPkkk.',
  'k...kPPkkPPk...k',
  '...kPPk..kPPk...',
  '...kpk....kpk...',
  '...kk......kk...',
  '................',
];

/** Left half of the 32x32 Churn King. The right half is its mirror. */
const BOSS_LEFT: Sprite = [
  '................',
  '................',
  '....kk.......kkk',
  '....kyk.....kyyy',
  '....kyyk...kyyyy',
  '....kyyyk.kyyyyy',
  '....kyyyykyyyyRR',
  '....kyYYYYYYYYRR',
  '....kkkkkkkkkkkk',
  '...kpppppppppppp',
  '..kpPPpppppppppp',
  '.kpPPppppppppppp',
  '.kpPpkkkkppppppp',
  'kpPpppkwwkkppppp',
  'kpPppppkwwwkkppp',
  'kpppppkwwRRwkppp',
  'kpppppkwwRRwkppp',
  'kppppppkwwwkpppp',
  'kpppppppkkkppppp',
  'kppppppppppppppp',
  'kpppkkpppppppppp',
  'kppkwwkkpppkkppp',
  'kppkRRwwkkkwwkkk',
  'kpppkRRRwwwRRwww',
  'kppppkkRRRRRRRRR',
  '.kpppppkkkkkkkkk',
  '.kpppppppppppppp',
  '..kppPpppppPpppp',
  '..kpkkppkkkpppkk',
  '...k..kk...kkk..',
  '................',
  '................',
];

export const BOSS: Sprite = BOSS_LEFT.map((row) => row + Array.from(row).reverse().join(''));

const COIN: Sprite = [
  '..kkkk..',
  '.kyyyyk.',
  'kyywyyYk',
  'kyywyyYk',
  'kyywyyYk',
  'kyyyyyYk',
  '.kYYYYk.',
  '..kkkk..',
];

const COIN_SIDE: Sprite = [
  '...kk...',
  '..kyYk..',
  '..kyYk..',
  '..kyYk..',
  '..kyYk..',
  '..kyYk..',
  '..kyYk..',
  '...kk...',
];

const GEM: Sprite = [
  '..kkkk..',
  '.kCwCck.',
  'kCwCccck',
  'kCCccBBk',
  '.kccBBk.',
  '..kcBk..',
  '...kk...',
  '........',
];

const COFFEE: Sprite = [
  '..w..w..',
  '...w..w.',
  'kkkkkk..',
  'khhhhkk.',
  'kwwwwk.k',
  'kwwwwkk.',
  'kaaaak..',
  '.kkkk...',
];

const COMMIT: Sprite = [
  '...kk...',
  '..klk...',
  '.kklkk..',
  'klwwllk.',
  'klwlllk.',
  'klllnnk.',
  '.kklkk..',
  '..klk...',
];

const CUP_FULL: Sprite = [
  '........',
  'wwwwww..',
  'wHHHHwww',
  'whhhhw.w',
  'whhhhwww',
  'whhhhw..',
  '.wwww...',
  '........',
];

const CUP_HALF: Sprite = [
  '........',
  'wwwwww..',
  'wKKKKwww',
  'wKKKKw.w',
  'wHHHHwww',
  'whhhhw..',
  '.wwww...',
  '........',
];

const CUP_EMPTY: Sprite = [
  '........',
  'AAAAAA..',
  'AKKKKAAA',
  'AKKKKA.A',
  'AKKKKAAA',
  'AKKKKA..',
  '.AAAA...',
  '........',
];

const ROCKET: Sprite = [
  '...kk...',
  '..kwwk..',
  '..kRRk..',
  '.kwccwk.',
  '.kwwwwk.',
  'kRkwwkRk',
  'kk.yy.kk',
  '...oo...',
];

const SLOT: Sprite = [
  '........',
  '..KKKK..',
  '.K....K.',
  '.K....K.',
  '.K....K.',
  '.K....K.',
  '..KKKK..',
  '........',
];

const KEYBOARD: Sprite = [
  'kkkkkkkkkkkkkk',
  'kKaKaKaKaKaKKk',
  'kKKaKaKaKaKaKk',
  'kKaaaaaaaaKaKk',
  'kkkkkkkkkkkkkk',
];

const HOTFIX: Sprite = [
  '..CCCC..',
  '.CwwwwC.',
  'CwwCCwwC',
  'CwCllCwC',
  'CwCllCwC',
  'CwwCCwwC',
  '.CwwwwC.',
  '..CCCC..',
];

const HOT_TAKE: Sprite = [
  '..kkkk..',
  '.kooook.',
  'koyyyook',
  'koywyyok',
  'koyyyyok',
  'kooyyook',
  '.kooook.',
  '..kkkk..',
];

const CANCEL: Sprite = [
  '..kkkk..',
  '.kRRRRk.',
  'kRwRRwRk',
  'kRRwwRRk',
  'kRRwwRRk',
  'kRwRRwRk',
  '.kRRRRk.',
  '..kkkk..',
];

const PALM: Sprite = [
  '.....nn..nn.....',
  '...nnlln.nllnn..',
  '..nllllnnnlllln.',
  '.nllnnnlnnnnnlln',
  '.nnn.nnlllnn.nnn',
  '....nnllnllnn...',
  '...nllnnhnnlln..',
  '..nlln.khk.nlln.',
  '..nnn..kHk..nnn.',
  '.......khk......',
  '.......kHk......',
  '.......khk......',
  '......kkHkk.....',
  '.....kEEEEEk....',
  '......kkkkk.....',
  '................',
];

const PLANT: Sprite = [
  '................',
  '.....nn..nn.....',
  '....nlln.nln....',
  '...nllllnllln...',
  '...nlnllllnln...',
  '..nllnlllnllln..',
  '..nlllnlnlllln..',
  '...nnllnllnnn...',
  '....nnlllnn.....',
  '.....kkkkkk.....',
  '....kooooook....',
  '....koooorok....',
  '.....kooork.....',
  '.....koorok.....',
  '......kkkk......',
  '................',
];

const CACTUS: Sprite = [
  '................',
  '......kkkk......',
  '.....knnlnk.....',
  '.....knnlnk.....',
  '.kk..knnlnk.....',
  'knnk.knnlnk.kk..',
  'knnk.knnlnkknnk.',
  'knnkkknnlnkknnk.',
  'knnnnnnnlnkknnk.',
  '.kknnnnnlnnnnnk.',
  '...kkknnlnnnnk..',
  '.....knnlnkkk...',
  '.....knnlnk.....',
  '.....knnlnk.....',
  '....kkkkkkkk....',
  '................',
];

const DESK: Sprite = [
  'kkkkkkkkkkkkkkkk',
  'kHHHHHHHHHHHHHHk',
  'kHkkkkkkkkHHHHHk',
  'kHkccccCCkHHwwHk',
  'kHkcCcccckHwhhwk',
  'kHkccccCckHHwwHk',
  'kHkkkkkkkkHHHHHk',
  'kHkaaaaaakHHHHHk',
  'kHkaAaAaakHHHHHk',
  'kHkkkkkkkkHHHHHk',
  'kHHHHHHHHHHHHHHk',
  'khhhhhhhhhhhhhhk',
  'kkkkkkkkkkkkkkkk',
  '.kk..........kk.',
  '.kk..........kk.',
  '................',
];

const ROCK: Sprite = [
  '................',
  '................',
  '.....kkkkkk.....',
  '...kkaaaaaakk...',
  '..kaaawaaaaaak..',
  '.kaaawaaaaaaAk..',
  '.kaaaaaaaaaAAAk.',
  'kaaaaaaaaaAAAAk.',
  'kaaaaaaaaAAAAAAk',
  'kaAaaaaaAAAAAAAk',
  'kAAAaaAAAAAAAAAk',
  '.kAAAAAAAAAAAAk.',
  '..kkAAAAAAAAkk..',
  '....kkkkkkkk....',
  '................',
  '................',
];

const TOMB: Sprite = [
  '................',
  '....kkkkkkkk....',
  '...kaaaaaaaak...',
  '..kaaaaaaaaaak..',
  '..kaaaaaaaaaak..',
  '..kakkakakkkak..',
  '..kakakakakaak..',
  '..kakkakakkkak..',
  '..kakakakakaak..',
  '..kakakakakaak..',
  '..kaaaaaaaaaak..',
  '..kaaaaaaaaaAk..',
  '..kaAaaaaaaAAk..',
  '.kkkkkkkkkkkkkk.',
  '.kEEEEEEEEEEEEk.',
  '..kkkkkkkkkkkk..',
];

const BOX: Sprite = [
  '................',
  '................',
  '..kkkkkkkkkkkk..',
  '.kHHHHHyyHHHHHk.',
  '.kHHHHHyyHHHHHk.',
  '.kkkkkkkkkkkkkk.',
  '.kHHHHHyyHHHHhk.',
  '.kHHHHHyyHHHHhk.',
  '.kHHHHHHHHHHHhk.',
  '.kHHkkkHHHHHHhk.',
  '.kHHHHHHHHHHHhk.',
  '.kHHHHHHHHHhhhk.',
  '.kkkkkkkkkkkkkk.',
  '................',
  '................',
  '................',
];

const BUSH: Sprite = [
  '................',
  '................',
  '.....kkkkk......',
  '...kknlllnkk....',
  '..knllllnlllk...',
  '.knllnlllllnnk..',
  '.knlllllnlllnk..',
  'knllnlllllnlnnk.',
  'knlllllnllllnnk.',
  'knnllnlllnlnnnk.',
  '.knnnllnnlnnnk..',
  '.knnnnnnnnnnnk..',
  '..kknnnnnnnkk...',
  '....kkkkkkk.....',
  '................',
  '................',
];

const TERMINAL: Sprite = [
  '.kkkkkkkkkkkkkk.',
  '.kBBBBBBBBBBBBk.',
  '.kBBBBBwwBBBBBk.',
  '.kBBBBwRRwBBBBk.',
  '.kBBBBwRRwBBBBk.',
  '.kBBBwwwwwwBBBk.',
  '.kBBBwoyyowBBBk.',
  '.kBBBBByyBBBBBk.',
  '.kkkkkkkkkkkkkk.',
  '......kAAk......',
  '....kkkkkkkk....',
  'kkkkkkkkkkkkkkkk',
  'kHHHHHHHHHHHHHHk',
  'kHHaaaaaaaaaaHHk',
  'khhhhhhhhhhhhhhk',
  'kkkkkkkkkkkkkkkk',
];

const SIGN: Sprite = [
  '................',
  '.kkkkkkkkkkkkkk.',
  '.kHHHHHHHHHHHHk.',
  '.kHkkkHkkkkkHHk.',
  '.kHHHHHHHHHHHHk.',
  '.kHkkkkkHkkkkHk.',
  '.kHHHHHHHHHHHHk.',
  '.kHkkkkHkkkHHHk.',
  '.khhhhhhhhhhhhk.',
  '.kkkkkkkkkkkkkk.',
  '......khhk......',
  '......khhk......',
  '......khhk......',
  '.....kkhhkk.....',
  '.....kkkkkk.....',
  '................',
];

const LOCK: Sprite = [
  '..kkkk..',
  '.kaaaak.',
  '.kak.ak.',
  'kkkkkkkk',
  'kyyyyyYk',
  'kyykkyYk',
  'kyyykyYk',
  'kkkkkkkk',
];

export const SPRITES = {
  playerDown: PLAYER_DOWN,
  playerDownIdle: PLAYER_DOWN_IDLE,
  playerUp: PLAYER_UP,
  playerUpIdle: PLAYER_UP_IDLE,
  playerSide: PLAYER_SIDE,
  playerSideIdle: PLAYER_SIDE_IDLE,
  bugA: BUG_A,
  bugB: BUG_B,
  ghostA: GHOST_A,
  ghostB: GHOST_B,
  crabA: CRAB_A,
  crabB: CRAB_B,
  trollA: TROLL_A,
  trollB: TROLL_B,
  scorpionA: SCORPION_A,
  scorpionB: SCORPION_B,
  boss: BOSS,
  coin: COIN,
  coinSide: COIN_SIDE,
  gem: GEM,
  coffee: COFFEE,
  commit: COMMIT,
  cupFull: CUP_FULL,
  cupHalf: CUP_HALF,
  cupEmpty: CUP_EMPTY,
  rocket: ROCKET,
  slot: SLOT,
  keyboard: KEYBOARD,
  hotfix: HOTFIX,
  hotTake: HOT_TAKE,
  cancel: CANCEL,
  palm: PALM,
  plant: PLANT,
  cactus: CACTUS,
  desk: DESK,
  rock: ROCK,
  tomb: TOMB,
  box: BOX,
  bush: BUSH,
  terminal: TERMINAL,
  sign: SIGN,
  lock: LOCK,
} as const;

export type SpriteName = keyof typeof SPRITES;

/** Expected pixel size of each sprite, checked by the tests. */
export const SPRITE_SIZE: Record<SpriteName, [number, number]> = {
  playerDown: [16, 16],
  playerDownIdle: [16, 16],
  playerUp: [16, 16],
  playerUpIdle: [16, 16],
  playerSide: [16, 16],
  playerSideIdle: [16, 16],
  bugA: [16, 16],
  bugB: [16, 16],
  ghostA: [16, 16],
  ghostB: [16, 16],
  crabA: [16, 16],
  crabB: [16, 16],
  trollA: [16, 16],
  trollB: [16, 16],
  scorpionA: [16, 16],
  scorpionB: [16, 16],
  boss: [32, 32],
  coin: [8, 8],
  coinSide: [8, 8],
  gem: [8, 8],
  coffee: [8, 8],
  commit: [8, 8],
  cupFull: [8, 8],
  cupHalf: [8, 8],
  cupEmpty: [8, 8],
  rocket: [8, 8],
  slot: [8, 8],
  keyboard: [14, 5],
  hotfix: [8, 8],
  hotTake: [8, 8],
  cancel: [8, 8],
  palm: [16, 16],
  plant: [16, 16],
  cactus: [16, 16],
  desk: [16, 16],
  rock: [16, 16],
  tomb: [16, 16],
  box: [16, 16],
  bush: [16, 16],
  terminal: [16, 16],
  sign: [16, 16],
  lock: [8, 8],
};

/** Swap palette letters, used for locals and dry desert brush. */
export function recolor(sprite: Sprite, swaps: Record<string, string>): Sprite {
  return sprite.map((row) => Array.from(row, (ch) => swaps[ch] ?? ch).join(''));
}

export const NPC_SWAPS: Record<string, Record<string, string>> = {
  cafe: { h: 'r', K: 'n', w: 'y' },
  bali: { h: 'y', K: 'o', w: 'C', b: 'N' },
  desert: { h: 'a', K: 'p', w: 'y', b: 'h' },
};

export const DRY_SWAPS: Record<string, string> = { n: 'h', l: 'H' };
