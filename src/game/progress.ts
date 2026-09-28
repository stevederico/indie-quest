import { COMMITS_TO_SHIP, PLAYER_MAX_HP, SHIP_BONUS } from './constants';
import { addFx, addText, emit, openDialog } from './helpers';
import { npcLines, npcName, shipLines, signLines, terminalLiveLines, terminalNeedLines } from './text';
import type { Game } from './types';
import type { Area, ShipArea } from './world';
import { SHIP_AREAS } from './world';

export function isShipArea(area: Area): area is ShipArea {
  return area !== 'boss';
}

export function shippedCount(g: Game): number {
  return SHIP_AREAS.filter((a) => g.shipped[a]).length;
}

export function canShip(g: Game, area: ShipArea): boolean {
  return !g.shipped[area] && g.commits[area] >= COMMITS_TO_SHIP;
}

/** Sword damage: doubles once the third product is live. */
export function playerDamage(g: Game): number {
  return g.shipped.desert ? 2 : 1;
}

/** Ranged hotfix is learned by shipping the second product. */
export function hasHotfix(g: Game): boolean {
  return g.shipped.bali;
}

/** Count a collected commit for the area and tell the player where they stand. */
export function addCommit(g: Game, area: Area, x: number, y: number): void {
  if (!isShipArea(area)) return;
  g.commits[area] = Math.min(COMMITS_TO_SHIP, g.commits[area] + 1);
  const n = g.commits[area];
  emit(g, 'commit');
  if (n >= COMMITS_TO_SHIP) {
    addText(g, 'READY TO SHIP!', x, y - 10, '#a7f070');
    emit(g, 'ready');
  } else {
    addText(g, `COMMIT ${n}/${COMMITS_TO_SHIP}`, x, y - 10, '#a7f070');
  }
}

/** Use the launch terminal. Ships the area's product when enough commits are in. */
export function useTerminal(g: Game): void {
  const area = g.area;
  if (!isShipArea(area)) return;
  if (g.shipped[area]) {
    openDialog(g, 'TERMINAL', terminalLiveLines(area));
    return;
  }
  if (!canShip(g, area)) {
    emit(g, 'deny');
    openDialog(g, 'TERMINAL', terminalNeedLines(area, g.commits[area]));
    return;
  }
  g.shipped[area] = true;
  g.tilesVersion++;
  const p = g.player;
  p.mrr += SHIP_BONUS;
  p.maxHp = Math.min(PLAYER_MAX_HP, p.maxHp + 2);
  p.hp = p.maxHp;
  addFx(g, 'ring', p.x, p.y, 0.8);
  addFx(g, 'boom', p.x, p.y - 20, 0.8);
  addText(g, `+$${SHIP_BONUS} MRR`, p.x, p.y - 14, '#ffcd75');
  emit(g, 'ship');
  emit(g, 'gate');
  openDialog(g, 'SHIPPED!', shipLines(area));
}

export function talkToNpc(g: Game): void {
  openDialog(g, npcName(g.area), npcLines(g.area, g.shipped));
}

export function readSign(g: Game): void {
  openDialog(g, 'SIGN', signLines(g.area));
}
