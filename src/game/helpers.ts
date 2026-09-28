import { TILE } from './constants';
import { paginate } from './text';
import type { FxKind, Game, GameEvent, Mode } from './types';

export function emit(g: Game, ev: GameEvent): void {
  g.events.push(ev);
}

export function setMode(g: Game, mode: Mode): void {
  g.mode = mode;
  g.modeTime = 0;
}

export function addFx(g: Game, kind: FxKind, x: number, y: number, life = 0.35): void {
  g.fx.push({ kind, x, y, t: 0, life });
}

export function addText(g: Game, text: string, x: number, y: number, color = '#f4f4f4'): void {
  g.texts.push({ text, x, y, t: 0, color });
}

export function openDialog(g: Game, speaker: string, paragraphs: readonly string[]): void {
  const pages = paginate(paragraphs);
  if (pages.length === 0) return;
  g.dialog = { speaker, pages, page: 0, shown: 0 };
  setMode(g, 'dialog');
  emit(g, 'talk');
}

export function tileCenter(col: number, row: number): { x: number; y: number } {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}
