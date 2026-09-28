import {
  ATTACK_COOLDOWN,
  ATTACK_TIME,
  CHURN_STEAL,
  COLS,
  HOTFIX_SPEED,
  INVULN_TIME,
  PLAYER_HALF,
  PLAYER_SPEED,
  ROWS,
  TILE,
  VIEW_H,
  VIEW_W,
} from './constants';
import { addFx, addText, emit, setMode } from './helpers';
import { boxBlocked, clamp, dirVec, moveBox, overlaps, tileAt, vecDir } from './physics';
import { addCommit, hasHotfix, playerDamage, readSign, talkToNpc, useTerminal } from './progress';
import type { Dir, Enemy, EnemyKind, Game, Input, PickupKind } from './types';
import { isCuttable, isInteractive, isSolid } from './world';

const DIRS: readonly Dir[] = ['up', 'down', 'left', 'right'];

export const ENEMY_STATS: Record<EnemyKind, { hp: number; half: number; damage: number }> = {
  bug: { hp: 1, half: 6, damage: 1 },
  crab: { hp: 2, half: 6, damage: 1 },
  ghost: { hp: 3, half: 6, damage: 1 },
  troll: { hp: 3, half: 6, damage: 1 },
  scorpion: { hp: 4, half: 6, damage: 2 },
  boss: { hp: 36, half: 13, damage: 2 },
};

/** The boss breaks away with a ring of shots after this many hits. */
export const BOSS_RING_EVERY = 5;

export const COIN_VALUE = 10;
export const GEM_VALUE = 50;

export function spawnEnemy(g: Game, kind: EnemyKind, x: number, y: number): Enemy {
  const s = ENEMY_STATS[kind];
  const e: Enemy = {
    id: g.nextId++,
    kind,
    x,
    y,
    hp: s.hp,
    maxHp: s.hp,
    dir: kind === 'crab' ? (g.rng.next() < 0.5 ? 'left' : 'right') : 'down',
    state: kind === 'crab' ? 'side' : 'idle',
    timer: g.rng.range(0.2, 1),
    timer2: g.rng.range(1.2, 2.4),
    stun: 0.6,
    flash: 0,
    kx: 0,
    ky: 0,
    anim: g.rng.range(0, 1),
    half: s.half,
    tx: x,
    ty: y,
    count: 0,
    hits: 0,
    phase: 1,
  };
  g.enemies.push(e);
  return e;
}

export function spawnPickup(
  g: Game,
  kind: PickupKind,
  x: number,
  y: number,
  key: string | null = null,
): void {
  g.pickups.push({ kind, x, y, key, life: key ? Infinity : 9, age: 0 });
}

/* ---------------------------------- player --------------------------------- */

export function updatePlayer(g: Game, input: Input, attackPressed: boolean, dt: number): void {
  const p = g.player;
  p.invuln = Math.max(0, p.invuln - dt);
  p.cooldown = Math.max(0, p.cooldown - dt);

  if (Math.abs(p.kx) + Math.abs(p.ky) > 6) {
    moveBox(g, p, p.kx * dt, p.ky * dt, PLAYER_HALF, PLAYER_HALF, false);
    const decay = Math.exp(-9 * dt);
    p.kx *= decay;
    p.ky *= decay;
  } else {
    p.kx = 0;
    p.ky = 0;
  }

  if (p.attack > 0) {
    p.attack = Math.max(0, p.attack - dt);
    p.moving = false;
    swingHits(g);
    return;
  }

  if (attackPressed && p.cooldown <= 0) {
    const [fx, fy] = dirVec(p.dir);
    const near = tileAt(g, p.x + fx * 9, p.y + fy * 9);
    const ch = isInteractive(near) ? near : tileAt(g, p.x + fx * 16, p.y + fy * 16);
    if (isInteractive(ch)) {
      p.moving = false;
      if (ch === 'L') useTerminal(g);
      else if (ch === 'N') talkToNpc(g);
      else readSign(g);
      return;
    }
    startSwing(g);
    return;
  }

  const mx = Math.sign(input.x);
  const my = Math.sign(input.y);
  if (mx === 0 && my === 0) {
    p.moving = false;
    return;
  }
  if (mx !== 0 && my === 0) p.dir = mx < 0 ? 'left' : 'right';
  else if (my !== 0 && mx === 0) p.dir = my < 0 ? 'up' : 'down';
  else {
    // Diagonal: keep facing if it still matches one of the pressed axes.
    const [fx, fy] = dirVec(p.dir);
    if (!(fx === mx || fy === my)) p.dir = mx < 0 ? 'left' : 'right';
  }
  const step = (PLAYER_SPEED * dt) / Math.hypot(mx, my);
  const res = moveBox(g, p, mx * step, my * step, PLAYER_HALF, PLAYER_HALF, false);
  if (res.hitX && my === 0) nudge(g, 'y', mx, dt);
  if (res.hitY && mx === 0) nudge(g, 'x', my, dt);
  p.walk += dt;
  p.moving = true;
}

/** Slide around a corner when the way forward is open a few pixels to the side. */
function nudge(g: Game, axis: 'x' | 'y', forward: number, dt: number): void {
  const p = g.player;
  for (let off = 1; off <= 7; off++) {
    for (const s of [-1, 1]) {
      const x = axis === 'y' ? p.x + forward * 2 : p.x + off * s;
      const y = axis === 'y' ? p.y + off * s : p.y + forward * 2;
      if (!boxBlocked(g, x, y, PLAYER_HALF, PLAYER_HALF)) {
        const d = Math.min(off, PLAYER_SPEED * dt);
        if (axis === 'y') moveBox(g, p, 0, s * d, PLAYER_HALF, PLAYER_HALF, false);
        else moveBox(g, p, s * d, 0, PLAYER_HALF, PLAYER_HALF, false);
        return;
      }
    }
  }
}

/** Box covered by the keyboard swing: [centerX, centerY, halfW, halfH]. */
export function swingBox(g: Game): [number, number, number, number] {
  const p = g.player;
  const [fx, fy] = dirVec(p.dir);
  const along = 9;
  const across = 10;
  return [p.x + fx * 13, p.y + fy * 13, fx !== 0 ? along : across, fy !== 0 ? along : across];
}

function startSwing(g: Game): void {
  const p = g.player;
  p.attack = ATTACK_TIME;
  p.cooldown = ATTACK_COOLDOWN;
  p.swingHits = [];
  p.moving = false;
  emit(g, 'swing');

  const [fx, fy] = dirVec(p.dir);
  // Cut clutter anywhere under the swing, near or far.
  for (const dist of [8, 19]) {
    for (const off of [-6, 0, 6]) {
      cutAt(g, p.x + fx * dist + fy * off, p.y + fy * dist + fx * off);
    }
  }

  if (hasHotfix(g) && p.hp >= p.maxHp) {
    g.shots.push({
      x: p.x + fx * 10,
      y: p.y + fy * 10,
      vx: fx * HOTFIX_SPEED,
      vy: fy * HOTFIX_SPEED,
      fromPlayer: true,
      damage: 1,
      life: 1.6,
    });
    emit(g, 'hotfix');
  }
  swingHits(g);
}

function cutAt(g: Game, px: number, py: number): void {
  const col = Math.floor(px / TILE);
  const row = Math.floor(py / TILE);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
  if (!isCuttable(g.tiles[row]![col]!)) return;
  g.tiles[row]![col] = ',';
  g.tilesVersion++;
  const x = col * TILE + TILE / 2;
  const y = row * TILE + TILE / 2;
  addFx(g, 'cut', x, y, 0.4);
  emit(g, 'cut');
  const r = g.rng.next();
  if (r < 0.3) spawnPickup(g, 'coin', x, y);
  else if (r < 0.36) spawnPickup(g, 'coffee', x, y);
}

function swingHits(g: Game): void {
  const p = g.player;
  const [cx, cy, hw, hh] = swingBox(g);
  const [fx, fy] = dirVec(p.dir);
  for (const e of [...g.enemies]) {
    if (p.swingHits.includes(e.id)) continue;
    if (!overlaps(cx, cy, hw, hh, e.x, e.y, e.half, e.half)) continue;
    p.swingHits.push(e.id);
    hurtEnemy(g, e, playerDamage(g), fx, fy);
  }
  for (let i = g.shots.length - 1; i >= 0; i--) {
    const s = g.shots[i]!;
    if (s.fromPlayer) continue;
    if (overlaps(cx, cy, hw, hh, s.x, s.y, 3, 3)) {
      g.shots.splice(i, 1);
      addFx(g, 'spark', s.x, s.y, 0.25);
      emit(g, 'hit');
    }
  }
}

export function hurtPlayer(g: Game, damage: number, fromX: number, fromY: number): void {
  const p = g.player;
  if (p.invuln > 0 || g.mode !== 'playing') return;
  p.hp = Math.max(0, p.hp - damage);
  p.invuln = INVULN_TIME;
  let nx = p.x - fromX;
  let ny = p.y - fromY;
  const len = Math.hypot(nx, ny) || 1;
  nx /= len;
  ny /= len;
  p.kx = nx * 170;
  p.ky = ny * 170;
  g.shake = 0.25;
  addFx(g, 'spark', p.x, p.y, 0.25);
  if (p.hp <= 0) {
    g.deaths++;
    p.attack = 0;
    p.kx = 0;
    p.ky = 0;
    addFx(g, 'poof', p.x, p.y, 0.6);
    emit(g, 'die');
    setMode(g, 'gameover');
  } else {
    emit(g, 'hurt');
  }
}

/* ---------------------------------- enemies -------------------------------- */

export function hurtEnemy(g: Game, e: Enemy, damage: number, nx: number, ny: number): void {
  if (e.kind === 'boss') {
    if (e.flash > 0 || !g.bossActive) return;
    e.flash = 0.45;
    e.hits++;
    if (e.hits % BOSS_RING_EVERY === 0 && e.hp - damage > 0) bossBreakAway(g, e);
  } else {
    e.flash = 0.2;
    e.stun = 0.3;
    const force = e.kind === 'ghost' ? 120 : 170;
    e.kx = nx * force;
    e.ky = ny * force;
    if (e.kind === 'scorpion') e.state = 'idle';
  }
  e.hp -= damage;
  addFx(g, 'spark', e.x, e.y, 0.25);
  if (e.hp <= 0) killEnemy(g, e);
  else emit(g, e.kind === 'boss' ? 'bosshit' : 'hit');
}

function killEnemy(g: Game, e: Enemy): void {
  const i = g.enemies.indexOf(e);
  if (i >= 0) g.enemies.splice(i, 1);
  g.kills++;
  if (e.kind === 'boss') {
    g.bossDefeated = true;
    g.bossActive = false;
    g.tilesVersion++;
    g.winDelay = 2.6;
    g.shake = 0.8;
    for (const other of g.enemies) addFx(g, 'poof', other.x, other.y, 0.5);
    g.enemies = [];
    g.shots = [];
    for (let k = 0; k < 7; k++) {
      addFx(g, 'boom', e.x + g.rng.range(-18, 18), e.y + g.rng.range(-18, 18), 0.5 + k * 0.25);
    }
    emit(g, 'bossdie');
    return;
  }
  addFx(g, 'poof', e.x, e.y, 0.4);
  emit(g, 'kill');
  const p = g.player;
  const r = g.rng.next();
  if (r < 0.4) spawnPickup(g, 'coin', e.x, e.y);
  else if (r < 0.52) spawnPickup(g, 'gem', e.x, e.y);
  else if (r < 0.7) spawnPickup(g, p.hp < p.maxHp ? 'coffee' : 'coin', e.x, e.y);
}

/** After a few hits the boss blasts a ring and rushes to the far side of the room. */
function bossBreakAway(g: Game, e: Enemy): void {
  const p = g.player;
  for (let k = 0; k < 6; k++) fire(g, e.x, e.y, (k * Math.PI) / 3 + Math.PI / 6, 60);
  // A tired player gets a coffee where the boss stood.
  if (p.hp <= p.maxHp / 2 && !g.pickups.some((k) => k.kind === 'coffee')) {
    spawnPickup(g, 'coffee', e.x, e.y);
  }
  e.state = 'flee';
  e.timer = 0.9;
  e.tx = p.x < VIEW_W / 2 ? VIEW_W - 44 : 44;
  e.ty = p.y < VIEW_H / 2 ? VIEW_H - 44 : 44;
  addFx(g, 'ring', e.x, e.y, 0.5);
  emit(g, 'shoot');
}

function fire(g: Game, x: number, y: number, angle: number, speed: number): void {
  g.shots.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    fromPlayer: false,
    damage: 1,
    life: 4,
  });
}

function wander(g: Game, e: Enemy, speed: number, chase: number, dt: number): void {
  const p = g.player;
  e.timer -= dt;
  if (e.timer <= 0) {
    if (e.state === 'walk' && g.rng.next() < 0.35) {
      e.state = 'idle';
      e.timer = g.rng.range(0.3, 0.9);
    } else {
      e.state = 'walk';
      e.dir = g.rng.next() < chase ? vecDir(p.x - e.x, p.y - e.y) : g.rng.pick(DIRS);
      e.timer = g.rng.range(0.5, 1.4);
    }
  }
  if (e.state === 'walk') {
    const [vx, vy] = dirVec(e.dir);
    const r = moveBox(g, e, vx * speed * dt, vy * speed * dt, e.half, e.half, true);
    if (r.hitX || r.hitY) e.timer = 0;
  }
}

function updateBoss(g: Game, e: Enemy, dt: number): void {
  if (!g.bossActive) return;
  const p = g.player;
  const phase = e.hp > e.maxHp * 0.66 ? 1 : e.hp > e.maxHp * 0.33 ? 2 : 3;
  if (phase > e.phase) {
    // New phase: the room shakes and a coffee drops to keep the fight fair.
    e.phase = phase;
    g.shake = 0.5;
    const cx = g.rng.range(48, VIEW_W - 48);
    const cy = g.rng.range(44, VIEW_H - 44);
    spawnPickup(g, 'coffee', cx, cy);
    addFx(g, 'ring', cx, cy, 0.6);
    emit(g, 'bossroar');
  }
  const fleeing = e.state === 'flee';
  const speed = fleeing ? 130 : phase === 1 ? 30 : phase === 2 ? 40 : 54;

  e.timer -= dt;
  if (fleeing) {
    if (e.timer <= 0) e.state = 'idle';
  } else if (e.timer <= 0) {
    if (phase === 3 || g.rng.next() < 0.4) {
      e.tx = p.x;
      e.ty = p.y;
    } else {
      e.tx = g.rng.range(48, VIEW_W - 48);
      e.ty = g.rng.range(44, VIEW_H - 44);
    }
    e.timer = phase === 3 ? 1.3 : 2;
  }
  const dx = e.tx - e.x;
  const dy = e.ty - e.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 2) {
    e.x = clamp(e.x + (dx / dist) * speed * dt, 30, VIEW_W - 30);
    e.y = clamp(e.y + (dy / dist) * speed * dt, 30, VIEW_H - 30);
  }

  e.timer2 -= dt;
  if (e.timer2 <= 0) {
    e.count++;
    const aim = Math.atan2(p.y - e.y, p.x - e.x);
    if (phase === 3) {
      const offset = e.count % 2 === 0 ? 0 : Math.PI / 8;
      for (let k = 0; k < 8; k++) fire(g, e.x, e.y, offset + (k * Math.PI) / 4, 62);
      e.timer2 = 1.9;
    } else {
      for (const spread of [-0.35, 0, 0.35]) fire(g, e.x, e.y, aim + spread, 70);
      e.timer2 = phase === 1 ? 2.1 : 1.7;
    }
    if (phase >= 2 && e.count % 3 === 0) {
      const ghosts = g.enemies.filter((o) => o.kind === 'ghost').length;
      if (ghosts < 2) {
        const gx = clamp(e.x + g.rng.range(-30, 30), 24, VIEW_W - 24);
        const gy = clamp(e.y + g.rng.range(-30, 30), 24, VIEW_H - 24);
        spawnEnemy(g, 'ghost', gx, gy);
        addFx(g, 'ring', gx, gy, 0.5);
      }
    }
    emit(g, 'shoot');
  }
}

function updateEnemy(g: Game, e: Enemy, dt: number): void {
  const p = g.player;
  e.anim += dt;
  e.flash = Math.max(0, e.flash - dt);

  if (Math.abs(e.kx) + Math.abs(e.ky) > 6) {
    if (e.kind === 'ghost') {
      e.x = clamp(e.x + e.kx * dt, 8, VIEW_W - 8);
      e.y = clamp(e.y + e.ky * dt, 8, VIEW_H - 8);
    } else {
      moveBox(g, e, e.kx * dt, e.ky * dt, e.half, e.half, true);
    }
    const decay = Math.exp(-9 * dt);
    e.kx *= decay;
    e.ky *= decay;
  } else {
    e.kx = 0;
    e.ky = 0;
  }

  if (e.stun > 0) {
    e.stun -= dt;
    return;
  }

  switch (e.kind) {
    case 'bug':
      wander(g, e, 34, 0.5, dt);
      break;

    case 'crab': {
      e.timer -= dt;
      if (e.state === 'side') {
        const vx = e.dir === 'left' ? -1 : 1;
        const r = moveBox(g, e, vx * 55 * dt, 0, e.half, e.half, true);
        if (r.hitX) e.dir = e.dir === 'left' ? 'right' : 'left';
        if (e.timer <= 0) {
          e.state = p.y < e.y ? 'shiftUp' : 'shiftDown';
          e.timer = 0.35;
        }
      } else {
        const vy = e.state === 'shiftUp' ? -1 : 1;
        moveBox(g, e, 0, vy * 40 * dt, e.half, e.half, true);
        if (e.timer <= 0) {
          e.state = 'side';
          e.timer = g.rng.range(1.2, 2.6);
        }
      }
      break;
    }

    case 'ghost': {
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      const wobble = Math.sin(e.anim * 3) * 0.6;
      const vx = dx / dist - (dy / dist) * wobble;
      const vy = dy / dist + (dx / dist) * wobble;
      e.x = clamp(e.x + vx * 24 * dt, 8, VIEW_W - 8);
      e.y = clamp(e.y + vy * 24 * dt, 8, VIEW_H - 8);
      e.dir = vecDir(dx, dy);
      break;
    }

    case 'troll': {
      e.timer2 -= dt;
      if (e.timer2 <= 0.45) {
        // Stand still and wind up before throwing a hot take.
        e.state = 'aim';
        e.dir = vecDir(p.x - e.x, p.y - e.y);
        if (e.timer2 <= 0) {
          const dist = Math.hypot(p.x - e.x, p.y - e.y);
          if (dist < 170) {
            fire(g, e.x, e.y, Math.atan2(p.y - e.y, p.x - e.x), 85);
            emit(g, 'shoot');
          }
          e.timer2 = g.rng.range(1.4, 2.2);
          e.state = 'idle';
          e.timer = 0.2;
        }
      } else {
        wander(g, e, 16, 0.2, dt);
      }
      break;
    }

    case 'scorpion': {
      if (e.state === 'windup') {
        e.timer -= dt;
        if (e.timer <= 0) {
          e.state = 'charge';
          e.timer = 0.9;
        }
      } else if (e.state === 'charge') {
        e.timer -= dt;
        const [vx, vy] = dirVec(e.dir);
        const r = moveBox(g, e, vx * 105 * dt, vy * 105 * dt, e.half, e.half, true);
        if (r.hitX || r.hitY || e.timer <= 0) {
          e.state = 'rest';
          e.timer = 0.7;
        }
      } else if (e.state === 'rest') {
        e.timer -= dt;
        if (e.timer <= 0) e.state = 'idle';
      } else {
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const lined = Math.abs(dx) < 8 || Math.abs(dy) < 8;
        if (lined && Math.hypot(dx, dy) < 110) {
          e.dir = vecDir(dx, dy);
          e.state = 'windup';
          e.timer = 0.32;
        } else {
          wander(g, e, 22, 0.4, dt);
        }
      }
      break;
    }

    case 'boss':
      updateBoss(g, e, dt);
      break;
  }
}

export function updateEnemies(g: Game, dt: number): void {
  const p = g.player;
  for (const e of [...g.enemies]) {
    updateEnemy(g, e, dt);
    if (p.invuln > 0 || g.mode !== 'playing') continue;
    if (e.kind === 'boss' && !g.bossActive) continue;
    if (!overlaps(p.x, p.y, PLAYER_HALF - 1, PLAYER_HALF - 1, e.x, e.y, e.half - 1, e.half - 1)) {
      continue;
    }
    hurtPlayer(g, ENEMY_STATS[e.kind].damage, e.x, e.y);
    if (e.kind === 'ghost') {
      const take = Math.min(p.mrr, CHURN_STEAL);
      if (take > 0) {
        p.mrr -= take;
        addText(g, `-$${take} CHURN`, p.x, p.y - 12, '#e0566b');
        emit(g, 'churn');
      }
      // Back off so the ghost does not sit on the player.
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const len = Math.hypot(dx, dy) || 1;
      e.kx = (dx / len) * 120;
      e.ky = (dy / len) * 120;
      e.stun = 0.7;
    }
  }
}

/* ----------------------------- shots and pickups --------------------------- */

export function updateShots(g: Game, dt: number): void {
  const p = g.player;
  for (let i = g.shots.length - 1; i >= 0; i--) {
    const s = g.shots[i]!;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    let dead = s.life <= 0 || s.x < -4 || s.x > VIEW_W + 4 || s.y < -4 || s.y > VIEW_H + 4;
    if (!dead) {
      const ch = tileAt(g, s.x, s.y);
      if (ch !== '~' && isSolid(ch, g)) {
        dead = true;
        addFx(g, 'spark', s.x, s.y, 0.2);
      }
    }
    if (!dead && s.fromPlayer) {
      for (const e of g.enemies) {
        if (overlaps(s.x, s.y, 3, 3, e.x, e.y, e.half, e.half)) {
          const len = Math.hypot(s.vx, s.vy) || 1;
          hurtEnemy(g, e, s.damage, s.vx / len, s.vy / len);
          dead = true;
          break;
        }
      }
    } else if (!dead && overlaps(s.x, s.y, 2, 2, p.x, p.y, PLAYER_HALF, PLAYER_HALF)) {
      if (p.invuln <= 0) {
        hurtPlayer(g, s.damage, s.x - s.vx, s.y - s.vy);
        dead = true;
      }
    }
    // killEnemy may already have emptied the list when the boss falls.
    if (dead && g.shots[i] === s) g.shots.splice(i, 1);
  }
}

export function updatePickups(g: Game, dt: number): void {
  const p = g.player;
  for (let i = g.pickups.length - 1; i >= 0; i--) {
    const k = g.pickups[i]!;
    k.age += dt;
    k.life -= dt;
    if (k.life <= 0) {
      g.pickups.splice(i, 1);
      continue;
    }
    if (k.age < 0.25 || Math.abs(k.x - p.x) > 11 || Math.abs(k.y - p.y) > 11) continue;
    g.pickups.splice(i, 1);
    if (k.key) g.collected.add(k.key);
    switch (k.kind) {
      case 'coin':
        p.mrr += COIN_VALUE;
        addText(g, `+$${COIN_VALUE}`, k.x, k.y - 8, '#ffcd75');
        emit(g, 'coin');
        break;
      case 'gem':
        p.mrr += GEM_VALUE;
        addText(g, `+$${GEM_VALUE}`, k.x, k.y - 8, '#73eff7');
        emit(g, 'gem');
        break;
      case 'coffee':
        p.hp = Math.min(p.maxHp, p.hp + 2);
        addText(g, 'COFFEE!', k.x, k.y - 8, '#f4f4f4');
        emit(g, 'coffee');
        break;
      case 'commit':
        addCommit(g, g.area, k.x, k.y);
        addFx(g, 'ring', k.x, k.y, 0.5);
        break;
    }
  }
}
