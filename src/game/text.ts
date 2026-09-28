import { COMMITS_TO_SHIP } from './constants';
import type { Area, ShipArea } from './world';
import { PRODUCTS } from './world';

/** Characters per dialog line and lines per page. */
export const LINE_CHARS = 38;
export const PAGE_LINES = 3;

/** Break text into lines of at most `width` characters, on word borders. */
export function wrap(text: string, width: number = LINE_CHARS): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    let w = word;
    while (w.length > width) {
      if (line) {
        lines.push(line);
        line = '';
      }
      lines.push(w.slice(0, width));
      w = w.slice(width);
    }
    if (!line) line = w;
    else if (line.length + 1 + w.length <= width) line += ' ' + w;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Turn paragraphs into dialog pages of wrapped lines joined by newlines. */
export function paginate(paragraphs: readonly string[]): string[] {
  const pages: string[] = [];
  for (const p of paragraphs) {
    const lines = wrap(p);
    for (let i = 0; i < lines.length; i += PAGE_LINES) {
      pages.push(lines.slice(i, i + PAGE_LINES).join('\n'));
    }
  }
  return pages;
}

export function formatMrr(n: number): string {
  return '$' + Math.max(0, Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

export function rankFor(mrr: number): string {
  if (mrr >= 7600) return 'INDIE LEGEND';
  if (mrr >= 7100) return 'SERIAL SHIPPER';
  if (mrr >= 6500) return 'RAMEN PROFITABLE';
  return 'SIDE PROJECT HERO';
}

export const INTRO: readonly string[] = [
  'YOU QUIT YOUR JOB. YOU HAVE A LAPTOP, A KEYBOARD AND ZERO CUSTOMERS.',
  'FIND 3 COMMITS IN EACH LAND, THEN SHIP AT THE LAUNCH TERMINAL.',
  'SHIP 3 PRODUCTS AND END THE CHURN KING.',
];

const NPC_NAME: Record<Area, string> = {
  cafe: 'BARISTA',
  bali: 'SURF NOMAD',
  desert: 'OLD FOUNDER',
  boss: '',
};

export function npcName(area: Area): string {
  return NPC_NAME[area];
}

export function npcLines(area: Area, shipped: Record<ShipArea, boolean>): string[] {
  switch (area) {
    case 'cafe':
      return shipped.cafe
        ? ['YOU SHIPPED! THE GATE IN THE HOT DESKS ROOM IS OPEN. GO EAST. SEND A POSTCARD.']
        : [
            'WELCOME, MAKER. BUGS ARE ALL OVER THE PLACE AGAIN. SWING YOUR KEYBOARD AT THEM.',
            'EVERY ROOM HIDES A COMMIT. SOME SHOW UP ONLY WHEN THE ROOM IS CLEAR OF BUGS.',
            'THEY SAY A LEGEND ONCE SHIPPED 12 STARTUPS IN 12 MONTHS. HE STILL POSTS FROM A BEACH SOMEWHERE.',
          ];
    case 'bali':
      return shipped.bali
        ? ['NICE LAUNCH. THE NORTH GATE LEADS TO THE STARTUP DESERT. BRING WATER. AND RUNWAY.']
        : [
            'SELAMAT DATANG! WIFI IS GOOD, WAVES ARE BETTER.',
            'WATCH FOR CHURN GHOSTS. THEY DO NOT JUST HURT. THEY EAT YOUR MRR.',
            'REPLY TROLLS THROW HOT TAKES. KNOCK THEM BACK WITH A GOOD SWING.',
          ];
    case 'desert':
      return shipped.desert
        ? ['THE CLOUD IS EAST. THE CHURN KING EATS SUBSCRIPTIONS. DO NOT LET HIM EAT YOURS.']
        : [
            'MANY STARTUPS CAME HERE TO PIVOT. FEW WALKED OUT.',
            'SCOPE CREEPS CHARGE WHEN YOU LINE UP WITH THEM. STEP ASIDE, THEN STRIKE.',
          ];
    case 'boss':
      return [];
  }
}

export function signLines(area: Area): string[] {
  switch (area) {
    case 'cafe':
      return ['HOUSE RULES: 1. SHIP FAST. 2. NO MEETINGS. 3. COFFEE REFILLS YOUR ENERGY.'];
    case 'bali':
      return ['BEACH NOTICE: EAST IS CRAB COVE. SOUTH ARE THE RICE PADDIES. MIND THE GHOSTS.'];
    case 'desert':
      return ['WEST: PIVOT DUNES AND THE STARTUP GRAVEYARD. EAST: THE CHURN CLOUD. NO REFUNDS.'];
    case 'boss':
      return [];
  }
}

export function terminalNeedLines(area: ShipArea, have: number): string[] {
  const left = COMMITS_TO_SHIP - have;
  return [
    `LAUNCH TERMINAL. ${PRODUCTS[area].name} NEEDS ${COMMITS_TO_SHIP} COMMITS. YOU HAVE ${have}. FIND ${left} MORE.`,
  ];
}

export function terminalLiveLines(area: ShipArea): string[] {
  return [`${PRODUCTS[area].name} IS LIVE. CUSTOMERS ARE HAPPY. MOSTLY.`];
}

export function shipLines(area: ShipArea): string[] {
  const p = PRODUCTS[area];
  return [`YOU SHIPPED ${p.name}! ${p.pitch} +$500 MRR AND ONE MORE CUP OF ENERGY.`, p.unlock];
}
