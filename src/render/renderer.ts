import {
  ATTACK_TIME,
  CANVAS_H,
  CANVAS_W,
  COMMITS_TO_SHIP,
  HUD_H,
  PLAYER_HALF,
  TRANSITION_TIME,
  VIEW_H,
  VIEW_W,
} from '../game/constants';
import { CONFIRM_ITEMS, PAUSE_ITEMS } from '../game/game';
import { dirVec } from '../game/physics';
import { canShip, isShipArea } from '../game/progress';
import { formatMrr, formatTime, rankFor } from '../game/text';
import type { Enemy, Fx, Game, Pickup } from '../game/types';
import { SHIP_AREAS, type Area } from '../game/world';
import { getArt, pixelCircle, type Baked, type Ctx } from './bake';
import { drawText, drawTextShadow, LINE_H, textWidth } from './font';
import { paintLayer, type Layer } from './tiles';

export interface Ui {
  best: number;
  touch: boolean;
  muted: boolean;
  newBest: boolean;
}

const INK = '#1a1c2c';
const WHITE = '#f4f4f4';
const GOLD = '#ffcd75';
const LIME = '#a7f070';
const RED = '#e0566b';
const GRAY = '#8a93a8';
const CYAN = '#73eff7';

const LAND_NAME: Record<Area, string> = { cafe: 'CAFE', bali: 'BALI', desert: 'DESERT', boss: 'CLOUD' };

const layers = new WeakMap<string[][], { version: number; layer: Layer }>();

function layerFor(g: Game, tiles: string[][], area: Area, live: boolean): Layer {
  const hit = layers.get(tiles);
  if (hit && (!live || hit.version === g.tilesVersion)) return hit.layer;
  const layer = paintLayer(tiles, area, g);
  layers.set(tiles, { version: g.tilesVersion, layer });
  return layer;
}

function ease(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function shadow(ctx: Ctx, x: number, y: number, w: number): void {
  ctx.fillStyle = 'rgba(26, 28, 44, 0.3)';
  ctx.fillRect(Math.round(x - w / 2), Math.round(y), w, 2);
  ctx.fillRect(Math.round(x - w / 2) + 1, Math.round(y) - 1, w - 2, 4);
}

function blit(ctx: Ctx, b: Baked, x: number, y: number, flip = false, white = false): void {
  const img = white ? (flip ? b.whiteFlip : b.white) : flip ? b.flip : b.img;
  ctx.drawImage(img, Math.round(x), Math.round(y));
}

/* ---------------------------------- actors --------------------------------- */

function drawPlayer(ctx: Ctx, g: Game, x: number, y: number, walking: boolean): void {
  const art = getArt();
  const p = g.player;
  if (g.mode === 'gameover') return;
  if (p.invuln > 0 && Math.floor(g.clock * 16) % 2 === 0 && g.mode === 'playing') return;

  const swinging = p.attack > 0;
  const [fx, fy] = dirVec(p.dir);
  const lunge = swinging ? 2 : 0;
  const px = x - 8 + fx * lunge;
  const py = y - 11 + fy * lunge;
  const step = walking ? Math.floor(p.walk * 9) % 2 : 0;

  shadow(ctx, x, y + 4, 10);
  if (swinging && p.dir === 'up') drawKeyboard(ctx, g, x, y);

  if (p.dir === 'down') blit(ctx, walking ? art.playerDown : art.playerDownIdle, px, py, step === 1);
  else if (p.dir === 'up') blit(ctx, walking ? art.playerUp : art.playerUpIdle, px, py, step === 1);
  else {
    const frame = walking && step === 0 ? art.playerSide : art.playerSideIdle;
    blit(ctx, frame, px, py + (walking && step === 0 ? -1 : 0), p.dir === 'left');
  }

  if (swinging && p.dir !== 'up') drawKeyboard(ctx, g, x, y);
}

function drawKeyboard(ctx: Ctx, g: Game, x: number, y: number): void {
  const art = getArt();
  const p = g.player;
  const t = 1 - p.attack / ATTACK_TIME;
  const [fx, fy] = dirVec(p.dir);
  const reach = 6 + Math.sin(Math.min(1, t * 1.6) * Math.PI * 0.5) * 4;
  if (fx !== 0) {
    const kx = fx > 0 ? x + reach : x - reach - 14;
    ctx.drawImage(art.keyboard.img, Math.round(kx), Math.round(y - 3));
  } else {
    const ky = fy > 0 ? y + reach - 2 : y - reach - 14;
    ctx.drawImage(art.keyboardV, Math.round(x - 2), Math.round(ky));
  }
  // Swoosh arc.
  const mid = Math.atan2(fy, fx);
  const sweep = Math.min(1, t / 0.6);
  const alpha = t < 0.6 ? 1 : Math.max(0, 1 - (t - 0.6) / 0.4);
  ctx.globalAlpha = alpha;
  const from = mid - 1.0;
  const to = from + 2.0 * sweep;
  for (let a = from; a <= to; a += 0.12) {
    const r = 17;
    ctx.fillStyle = a > to - 0.4 ? WHITE : CYAN;
    ctx.fillRect(Math.round(x + Math.cos(a) * r) - 1, Math.round(y + Math.sin(a) * r) - 1, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function bang(ctx: Ctx, g: Game, x: number, y: number): void {
  if (Math.floor(g.clock * 12) % 2 === 0) drawTextShadow(ctx, '!', x - 2, y, GOLD);
}

function drawEnemy(ctx: Ctx, g: Game, e: Enemy): void {
  const art = getArt();
  const white = e.flash > 0 && Math.floor(e.flash * 30) % 2 === 0;
  const beat = Math.floor(e.anim * 6) % 2 === 0;
  switch (e.kind) {
    case 'bug':
      shadow(ctx, e.x, e.y + 5, 10);
      blit(ctx, beat || e.state === 'idle' ? art.bugA : art.bugB, e.x - 8, e.y - 9, false, white);
      break;
    case 'crab':
      shadow(ctx, e.x, e.y + 4, 12);
      blit(ctx, beat ? art.crabA : art.crabB, e.x - 8, e.y - 7, false, white);
      break;
    case 'ghost': {
      const bob = Math.sin(e.anim * 4) * 2;
      shadow(ctx, e.x, e.y + 7, 8);
      ctx.globalAlpha = 0.88;
      blit(ctx, beat ? art.ghostA : art.ghostB, e.x - 8, e.y - 9 + bob, e.dir === 'left', white);
      ctx.globalAlpha = 1;
      break;
    }
    case 'troll':
      shadow(ctx, e.x, e.y + 6, 10);
      blit(ctx, beat || e.state !== 'walk' ? art.trollA : art.trollB, e.x - 8, e.y - 9, false, white);
      if (e.state === 'aim') bang(ctx, g, e.x, e.y - 18);
      break;
    case 'scorpion': {
      const shake = e.state === 'windup' ? (Math.floor(g.clock * 30) % 2) * 2 - 1 : 0;
      shadow(ctx, e.x, e.y + 5, 12);
      blit(ctx, beat || e.state === 'rest' ? art.scorpionA : art.scorpionB, e.x - 8 + shake, e.y - 9, false, white);
      if (e.state === 'windup') bang(ctx, g, e.x, e.y - 18);
      break;
    }
    case 'boss': {
      const bob = Math.sin(e.anim * 2.4) * 2;
      shadow(ctx, e.x, e.y + 15, 22);
      const angry = e.phase >= 3 && Math.floor(g.clock * 8) % 2 === 0;
      blit(ctx, art.boss, e.x - 16 + (angry ? 1 : 0), e.y - 17 + bob, false, white);
      break;
    }
  }
}

function drawPickup(ctx: Ctx, g: Game, k: Pickup): void {
  const art = getArt();
  if (k.life < 2.5 && Math.floor(g.clock * 10) % 2 === 0) return;
  const hop = k.age < 0.25 ? -Math.sin((k.age / 0.25) * Math.PI) * 5 : 0;
  const bob = Math.sin(k.age * 5) * 1.5;
  shadow(ctx, k.x, k.y + 5, 6);
  switch (k.kind) {
    case 'coin':
      blit(ctx, Math.floor(k.age * 6) % 4 === 3 ? art.coinSide : art.coin, k.x - 4, k.y - 5 + hop + bob);
      break;
    case 'gem':
      blit(ctx, art.gem, k.x - 4, k.y - 5 + hop + bob);
      break;
    case 'coffee':
      blit(ctx, art.coffee, k.x - 4, k.y - 5 + hop + bob);
      break;
    case 'commit': {
      const pulse = 7 + Math.sin(k.age * 6) * 2;
      ctx.globalAlpha = 0.45;
      pixelCircle(ctx, k.x, k.y - 1 + bob, pulse, LIME, false);
      ctx.globalAlpha = 1;
      blit(ctx, art.commit, k.x - 4, k.y - 5 + bob);
      break;
    }
  }
}

function drawFx(ctx: Ctx, g: Game, f: Fx): void {
  const t = f.t / f.life;
  switch (f.kind) {
    case 'poof':
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + 0.4;
        const r = 3 + t * 13;
        const size = t < 0.5 ? 3 : t < 0.8 ? 2 : 1;
        ctx.fillStyle = t < 0.4 ? WHITE : '#c2c9d6';
        ctx.fillRect(Math.round(f.x + Math.cos(a) * r), Math.round(f.y + Math.sin(a) * r), size, size);
      }
      break;
    case 'spark':
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.8;
        const r = 2 + t * 9;
        ctx.fillStyle = i % 2 ? GOLD : WHITE;
        ctx.fillRect(Math.round(f.x + Math.cos(a) * r), Math.round(f.y + Math.sin(a) * r), 2, 2);
      }
      break;
    case 'cut': {
      const color = g.area === 'cafe' ? '#9c6238' : g.area === 'desert' ? '#6b3e26' : '#38b764';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const r = t * 12;
        const fall = t * t * 10;
        ctx.fillStyle = i % 2 ? color : '#ffcd75';
        ctx.fillRect(Math.round(f.x + Math.cos(a) * r), Math.round(f.y + Math.sin(a) * r * 0.6 - 4 + fall), 2, 2);
      }
      break;
    }
    case 'boom': {
      const r = 3 + t * 13;
      pixelCircle(ctx, f.x, f.y, r, t < 0.3 ? WHITE : t < 0.6 ? GOLD : '#ef7d57', true);
      if (t > 0.35) pixelCircle(ctx, f.x, f.y, r * (t - 0.2), '#1a1c2c', true);
      break;
    }
    case 'ring':
      ctx.globalAlpha = 1 - t;
      pixelCircle(ctx, f.x, f.y, 4 + t * 20, LIME, false);
      ctx.globalAlpha = 1;
      break;
  }
}

/* ----------------------------------- world --------------------------------- */

function drawGround(ctx: Ctx, g: Game, layer: Layer, area: Area, ox: number, oy: number, live: boolean): void {
  const art = getArt();
  const frame = Math.floor(g.clock * 2.5) % 2;
  ctx.drawImage(layer.frames[frame]!, Math.round(ox), Math.round(oy));
  const local = art.npc[area];
  if (local) {
    for (const n of layer.locals) {
      const blink = Math.floor(g.clock * 1.5) % 2;
      shadow(ctx, ox + n.x + 8, oy + n.y + 14, 10);
      blit(ctx, local, ox + n.x, oy + n.y - 2 - blink);
    }
  }
  if (!live || !isShipArea(area)) return;
  for (const t of layer.terminals) {
    if (canShip(g, area)) {
      const hop = Math.abs(Math.sin(g.clock * 5)) * 3;
      blit(ctx, art.rocket, ox + t.x + 4, oy + t.y - 10 - hop);
    } else if (g.shipped[area]) {
      drawTextShadow(ctx, 'LIVE', ox + t.x + 8, oy + t.y - 8, LIME, 'center');
    }
  }
}

function drawWorld(ctx: Ctx, g: Game): void {
  ctx.save();
  ctx.translate(0, HUD_H);
  ctx.beginPath();
  ctx.rect(0, 0, VIEW_W, VIEW_H);
  ctx.clip();

  if (g.shake > 0) {
    const power = Math.min(3, g.shake * 8);
    ctx.translate(Math.round(Math.sin(g.clock * 90) * power), Math.round(Math.cos(g.clock * 70) * power));
  }

  const tr = g.transition;
  if (tr) {
    const k = ease(Math.min(1, tr.t / TRANSITION_TIME));
    const from = layerFor(g, tr.fromTiles, tr.fromArea, false);
    const to = layerFor(g, g.tiles, g.area, true);
    const ox = -tr.dx * VIEW_W * k;
    const oy = -tr.dy * VIEW_H * k;
    drawGround(ctx, g, from, tr.fromArea, ox, oy, false);
    drawGround(ctx, g, to, g.area, ox + tr.dx * VIEW_W, oy + tr.dy * VIEW_H, false);
    const tx = g.player.x + tr.dx * VIEW_W;
    const ty = g.player.y + tr.dy * VIEW_H;
    const px = tr.fromX + (tx - tr.fromX) * k + ox;
    const py = tr.fromY + (ty - tr.fromY) * k + oy;
    drawPlayer(ctx, g, px, py, true);
    ctx.restore();
    return;
  }

  const layer = layerFor(g, g.tiles, g.area, true);
  drawGround(ctx, g, layer, g.area, 0, 0, true);

  for (const k of g.pickups) drawPickup(ctx, g, k);

  // Draw back to front by where each actor stands, so the boss can pass behind the player.
  const actors: { y: number; draw: () => void }[] = g.enemies.map((e) => ({
    y: e.y + e.half,
    draw: () => drawEnemy(ctx, g, e),
  }));
  actors.push({
    y: g.player.y + PLAYER_HALF,
    draw: () => drawPlayer(ctx, g, g.player.x, g.player.y, g.player.moving && g.mode === 'playing'),
  });
  actors.sort((a, b) => a.y - b.y);
  for (const a of actors) a.draw();

  const art = getArt();
  for (const s of g.shots) {
    const spin = Math.floor(g.clock * 12) % 2 === 0;
    if (s.fromPlayer) blit(ctx, art.hotfix, s.x - 4, s.y - 4, spin);
    else blit(ctx, g.area === 'boss' ? art.cancel : art.hotTake, s.x - 4, s.y - 4, spin);
  }
  for (const f of g.fx) drawFx(ctx, g, f);
  for (const t of g.texts) {
    ctx.globalAlpha = t.t > 0.8 ? Math.max(0, 1 - (t.t - 0.8) / 0.3) : 1;
    const half = textWidth(t.text) / 2;
    const x = Math.min(VIEW_W - half - 2, Math.max(half + 2, t.x));
    drawTextShadow(ctx, t.text, x, Math.max(2, t.y), t.color, 'center');
    ctx.globalAlpha = 1;
  }

  const boss = g.enemies.find((e) => e.kind === 'boss');
  if (boss && g.bossActive) {
    const w = 120;
    const x = (VIEW_W - w) / 2;
    drawTextShadow(ctx, 'THE CHURN KING', VIEW_W / 2, 4, RED, 'center');
    ctx.fillStyle = INK;
    ctx.fillRect(x - 1, 13, w + 2, 6);
    ctx.fillStyle = '#5d275d';
    ctx.fillRect(x, 14, w, 4);
    ctx.fillStyle = RED;
    ctx.fillRect(x, 14, Math.round((w * Math.max(0, boss.hp)) / boss.maxHp), 4);
  } else if (g.banner > 0 && g.mode !== 'title') {
    ctx.globalAlpha = Math.min(1, g.banner / 0.5);
    const w = textWidth(g.screenName) + 12;
    ctx.fillStyle = 'rgba(26, 28, 44, 0.75)';
    ctx.fillRect(Math.round((VIEW_W - w) / 2), 3, w, 13);
    drawText(ctx, g.screenName, VIEW_W / 2, 6, WHITE, 'center');
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/* ------------------------------------ hud ---------------------------------- */

function drawHud(ctx: Ctx, g: Game, ui: Ui): void {
  const art = getArt();
  const p = g.player;
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, CANVAS_W, HUD_H);
  ctx.fillStyle = '#333c57';
  ctx.fillRect(0, HUD_H - 1, CANVAS_W, 1);

  const cups = Math.ceil(p.maxHp / 2);
  for (let i = 0; i < cups; i++) {
    const fill = p.hp - i * 2;
    const low = p.hp <= 2 && Math.floor(g.clock * 6) % 2 === 0;
    const sprite = fill >= 2 ? art.cupFull : fill === 1 ? art.cupHalf : art.cupEmpty;
    blit(ctx, sprite, 6 + i * 9, 4 + (low && fill > 0 ? 1 : 0));
  }
  drawText(ctx, 'MRR', 6, 19, GRAY);
  drawText(ctx, formatMrr(p.mrr), 28, 19, GOLD);

  const mid = 96;
  if (isShipArea(g.area)) {
    if (g.shipped[g.area]) {
      drawText(ctx, 'SHIPPED', mid, 5, LIME);
    } else {
      drawText(ctx, 'COMMITS', mid, 5, GRAY);
      for (let i = 0; i < COMMITS_TO_SHIP; i++) {
        blit(ctx, i < g.commits[g.area] ? art.commit : art.slot, mid + 46 + i * 9, 4);
      }
    }
  } else {
    drawText(ctx, 'FINAL BOSS', mid, 5, RED);
  }
  drawText(ctx, 'PRODUCTS', mid, 19, GRAY);
  SHIP_AREAS.forEach((a, i) => blit(ctx, g.shipped[a] ? art.rocket : art.slot, mid + 52 + i * 9, 18));

  drawText(ctx, formatTime(g.time), CANVAS_W - 6, 5, WHITE, 'right');
  drawText(ctx, LAND_NAME[g.area], CANVAS_W - 6, 19, CYAN, 'right');
  if (ui.muted) drawText(ctx, 'MUTE', CANVAS_W - 40, 5, GRAY, 'right');
}

/* --------------------------------- overlays -------------------------------- */

function panel(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = INK;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = WHITE;
  ctx.fillRect(x + 1, y + 1, w - 2, 1);
  ctx.fillRect(x + 1, y + h - 2, w - 2, 1);
  ctx.fillRect(x + 1, y + 1, 1, h - 2);
  ctx.fillRect(x + w - 2, y + 1, 1, h - 2);
}

function dim(ctx: Ctx, alpha: number): void {
  ctx.fillStyle = `rgba(16, 17, 30, ${alpha})`;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

function actWord(ui: Ui): string {
  return ui.touch ? 'TAP A' : 'PRESS SPACE';
}

function drawDialog(ctx: Ctx, g: Game): void {
  const d = g.dialog;
  if (!d) return;
  const x = 6;
  const w = CANVAS_W - 12;
  const h = 44;
  const y = CANVAS_H - h - 6;
  panel(ctx, x, y, w, h);
  if (d.speaker) {
    const tw = textWidth(d.speaker) + 8;
    ctx.fillStyle = INK;
    ctx.fillRect(x + 6, y - 6, tw, 11);
    ctx.fillStyle = GOLD;
    ctx.fillRect(x + 6, y - 6, tw, 1);
    drawText(ctx, d.speaker, x + 10, y - 3, GOLD);
  }
  const page = d.pages[d.page] ?? '';
  const shown = page.slice(0, Math.floor(d.shown));
  shown.split('\n').forEach((line, i) => drawText(ctx, line, x + 8, y + 9 + i * (LINE_H + 1), WHITE));
  if (d.shown >= page.length && Math.floor(g.clock * 3) % 2 === 0) {
    const last = d.page >= d.pages.length - 1;
    drawText(ctx, last ? 'OK' : '>', x + w - 8, y + h - 12, GOLD, 'right');
  }
}

function drawTitle(ctx: Ctx, g: Game, ui: Ui): void {
  const art = getArt();
  const t = g.clock;
  // Sunset sky in bands.
  const bands = ['#29366f', '#3b3f8f', '#5d4a9b', '#9b4fa5', '#d9607f', '#ef7d57', '#f2a63c', '#ffcd75'];
  bands.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, i * 14, CANVAS_W, 14);
  });
  for (let i = 0; i < 18; i++) {
    const sx = (i * 53 + 17) % CANVAS_W;
    const sy = (i * 29 + 5) % 40;
    if (Math.floor(t * 2 + i) % 3 !== 0) {
      ctx.fillStyle = WHITE;
      ctx.fillRect(sx, sy, 1, 1);
    }
  }
  pixelCircle(ctx, 196, 104, 20, '#ffe9a8', true);
  pixelCircle(ctx, 196, 104, 17, '#fff6d6', true);
  // Sea.
  ctx.fillStyle = '#3b5dc9';
  ctx.fillRect(0, 112, CANVAS_W, 40);
  ctx.fillStyle = '#41a6f6';
  for (let i = 0; i < 14; i++) {
    const wy = 115 + i * 3;
    const wx = ((i * 47 + Math.floor(t * (6 + (i % 3) * 3))) % (CANVAS_W + 30)) - 30;
    ctx.fillRect(wx, wy, 14 + (i % 4) * 5, 1);
  }
  ctx.fillStyle = '#ffe9a8';
  for (let i = 0; i < 8; i++) {
    const w = 30 - i * 3 + (Math.floor(t * 4 + i) % 2) * 4;
    ctx.fillRect(196 - w / 2, 114 + i * 3, w, 1);
  }
  // Beach.
  ctx.fillStyle = '#ecd9a0';
  ctx.fillRect(0, 150, CANVAS_W, CANVAS_H - 150);
  ctx.fillStyle = '#f6e8b8';
  ctx.fillRect(0, 150, CANVAS_W, 2);
  ctx.fillStyle = '#d9c182';
  for (let i = 0; i < 40; i++) ctx.fillRect((i * 37) % CANVAS_W, 156 + ((i * 13) % 48), 2, 1);

  const big = (b: Baked, x: number, y: number, s: number, flip = false): void => {
    ctx.drawImage(flip ? b.flip : b.img, 0, 0, b.w, b.h, Math.round(x), Math.round(y), b.w * s, b.h * s);
  };
  big(art.palm, 2, 100, 4);
  big(art.palm, 200, 118, 3, true);
  big(art.terminal, 150, 150, 2);
  const step = Math.floor(t * 4) % 2 === 0;
  big(step ? art.playerDown : art.playerDownIdle, 104, 140, 3, false);
  big(Math.floor(t * 5) % 2 ? art.bugA : art.bugB, 62, 170, 2);
  ctx.globalAlpha = 0.9;
  big(art.ghostA, 22 + Math.sin(t * 1.3) * 6, 150 + Math.sin(t * 2) * 4, 2);
  ctx.globalAlpha = 1;
  big(Math.floor(t * 4) % 2 ? art.crabA : art.crabB, 196 + Math.sin(t) * 10, 176, 2);

  // Logo.
  const ly = 22 + Math.round(Math.sin(t * 2) * 2);
  drawText(ctx, 'INDIE QUEST', CANVAS_W / 2 + 2, ly + 3, INK, 'center', 3);
  drawText(ctx, 'INDIE QUEST', CANVAS_W / 2, ly, GOLD, 'center', 3);
  drawText(ctx, 'INDIE QUEST', CANVAS_W / 2, ly - 1, '#fff6d6', 'center', 3);
  drawTextShadow(ctx, 'SHIP IT. GROW IT. BEAT CHURN.', CANVAS_W / 2, 52, WHITE, 'center');

  if (Math.floor(t * 2) % 2 === 0) {
    const label = ui.touch ? 'TAP TO START' : 'PRESS ENTER OR CLICK TO START';
    const w = textWidth(label) + 12;
    ctx.fillStyle = 'rgba(26, 28, 44, 0.8)';
    ctx.fillRect(Math.round((CANVAS_W - w) / 2), 80, w, 13);
    drawText(ctx, label, CANVAS_W / 2, 83, WHITE, 'center');
  }
  if (!ui.touch) drawTextShadow(ctx, 'MOVE: ARROWS OR WASD   ACT: SPACE', CANVAS_W / 2, 64, '#fff6d6', 'center');
  if (ui.best > 0) drawTextShadow(ctx, `BEST MRR ${formatMrr(ui.best)}`, CANVAS_W / 2, 196, INK, 'center', 1, '#f6e8b8');
}

function drawPause(ctx: Ctx, g: Game, ui: Ui): void {
  dim(ctx, 0.7);
  panel(ctx, 58, 48, 140, 112);
  if (g.confirmRestart) {
    drawText(ctx, 'RESTART?', CANVAS_W / 2, 58, RED, 'center', 2);
    drawText(ctx, 'THIS RUN WILL BE LOST.', CANVAS_W / 2, 76, GRAY, 'center');
    CONFIRM_ITEMS.forEach((item, i) => {
      const y = 96 + i * 14;
      const on = g.menuIndex === i;
      if (on) drawText(ctx, '>', 70, y, GOLD);
      drawText(ctx, item, 82, y, on ? WHITE : GRAY);
    });
    drawText(ctx, ui.touch ? 'II: BACK' : 'P: BACK', CANVAS_W / 2, 140, GRAY, 'center');
    return;
  }
  drawText(ctx, 'PAUSED', CANVAS_W / 2, 58, GOLD, 'center', 2);
  PAUSE_ITEMS.forEach((item, i) => {
    const y = 84 + i * 14;
    const on = g.menuIndex === i;
    if (on) drawText(ctx, '>', 84, y, GOLD);
    drawText(ctx, item, 96, y, on ? WHITE : GRAY);
  });
  const lines = ui.touch
    ? ['PAD: MOVE AND PICK', 'A: ACT']
    : ['MOVE: ARROWS / WASD', 'ACT: SPACE / Z / J', 'P: PAUSE  M: MUTE'];
  lines.forEach((line, i) => drawText(ctx, line, CANVAS_W / 2, 118 + i * 11, GRAY, 'center'));
}

function drawGameOver(ctx: Ctx, g: Game, ui: Ui): void {
  dim(ctx, Math.min(0.78, g.modeTime * 1.2));
  if (g.modeTime < 0.4) return;
  drawText(ctx, 'BURNED OUT', CANVAS_W / 2 + 2, 72, INK, 'center', 3);
  drawText(ctx, 'BURNED OUT', CANVAS_W / 2, 70, RED, 'center', 3);
  drawText(ctx, 'YOU WORKED TOO HARD. 20% OF MRR CHURNS.', CANVAS_W / 2, 104, WHITE, 'center');
  drawText(ctx, 'YOUR PRODUCTS AND COMMITS ARE SAFE.', CANVAS_W / 2, 116, GRAY, 'center');
  if (g.modeTime > 0.9 && Math.floor(g.clock * 2) % 2 === 0) {
    drawText(ctx, `${actWord(ui)} TO NAP AND RETRY`, CANVAS_W / 2, 140, GOLD, 'center');
  }
}

function drawWin(ctx: Ctx, g: Game, ui: Ui): void {
  dim(ctx, Math.min(0.82, g.modeTime));
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, CANVAS_W, 54);
  const colors = [GOLD, LIME, CYAN, RED, '#e86fb0', WHITE];
  for (let i = 0; i < 60; i++) {
    const x = (i * 71 + Math.sin(g.clock * 2 + i) * 8) % CANVAS_W;
    const y = ((i * 37 + g.clock * (26 + (i % 5) * 9)) % (CANVAS_H + 10)) - 5;
    ctx.fillStyle = colors[i % colors.length]!;
    ctx.fillRect(Math.round(x < 0 ? x + CANVAS_W : x), Math.round(y), 2, 2);
  }
  drawText(ctx, 'YOU BEAT CHURN!', CANVAS_W / 2 + 2, 22, INK, 'center', 2);
  drawText(ctx, 'YOU BEAT CHURN!', CANVAS_W / 2, 20, GOLD, 'center', 2);
  drawText(ctx, 'THE CHURN KING IS GONE. CUSTOMERS STAY.', CANVAS_W / 2, 42, WHITE, 'center');

  panel(ctx, 48, 58, 160, 88);
  const p = g.player;
  const rows: [string, string, string][] = [
    ['FINAL MRR', formatMrr(p.mrr), GOLD],
    ['TIME', formatTime(g.time), WHITE],
    ['BURNOUTS', String(g.deaths), g.deaths === 0 ? LIME : RED],
    ['FOES SQUASHED', String(g.kills), WHITE],
    ['PRODUCTS', '3 OF 3', LIME],
  ];
  rows.forEach(([label, value, color], i) => {
    const y = 66 + i * 12;
    drawText(ctx, label, 58, y, GRAY);
    drawText(ctx, value, 198, y, color, 'right');
  });
  drawText(ctx, 'RANK', 58, 130, GRAY);
  drawText(ctx, rankFor(p.mrr), 198, 130, CYAN, 'right');
  if (ui.newBest) {
    // Badge under the panel, clear of the stats.
    const label = 'NEW BEST MRR!';
    const w = textWidth(label) + 12;
    ctx.fillStyle = GOLD;
    ctx.fillRect(Math.round((CANVAS_W - w) / 2), 151, w, 13);
    drawText(ctx, label, CANVAS_W / 2, 154, INK, 'center');
  }

  if (g.modeTime > 1.5 && Math.floor(g.clock * 2) % 2 === 0) {
    drawText(ctx, `${actWord(ui)} TO PLAY AGAIN`, CANVAS_W / 2, 178, WHITE, 'center');
  }
}

export function render(ctx: Ctx, g: Game, ui: Ui): void {
  ctx.imageSmoothingEnabled = false;
  if (g.mode === 'title') {
    drawTitle(ctx, g, ui);
    return;
  }
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  drawWorld(ctx, g);
  drawHud(ctx, g, ui);
  switch (g.mode) {
    case 'dialog':
      drawDialog(ctx, g);
      break;
    case 'paused':
      drawPause(ctx, g, ui);
      break;
    case 'gameover':
      drawGameOver(ctx, g, ui);
      break;
    case 'win':
      drawWin(ctx, g, ui);
      break;
    default:
      break;
  }
}
