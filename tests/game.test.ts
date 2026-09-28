import { describe, expect, it } from 'vitest';
import { BOSS_RING_EVERY, ENEMY_STATS, hurtEnemy, hurtPlayer, spawnEnemy, spawnPickup } from '../src/game/actors';
import {
  BOSS_BONUS,
  CHURN_STEAL,
  COMMITS_TO_SHIP,
  PLAYER_START_HP,
  SHIP_BONUS,
  STEP,
  TILE,
  VIEW_W,
} from '../src/game/constants';
import { createGame, enterScreen, update } from '../src/game/game';
import { tileCenter } from '../src/game/helpers';
import { boxBlocked, moveBox } from '../src/game/physics';
import { canShip, hasHotfix, playerDamage, shippedCount } from '../src/game/progress';
import type { Game, Input } from '../src/game/types';
import { NO_INPUT } from '../src/game/types';

function run(g: Game, input: Partial<Input>, seconds: number): void {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i++) update(g, { ...NO_INPUT, ...input }, STEP);
}

/** Press and release one button. */
function tap(g: Game, input: Partial<Input>): void {
  update(g, { ...NO_INPUT, ...input }, STEP);
  update(g, NO_INPUT, STEP);
}

function skipDialog(g: Game): void {
  let guard = 0;
  while (g.mode === 'dialog' && guard++ < 50) tap(g, { attack: true });
  // Closing a dialog leaves a short cooldown so a mashed button does not swing.
  g.player.cooldown = 0;
}

/** A game that is past the title and intro, standing in the cafe. */
function started(seed = 3): Game {
  const g = createGame(seed);
  tap(g, { attack: true });
  skipDialog(g);
  expect(g.mode).toBe('playing');
  return g;
}

function place(g: Game, col: number, row: number): void {
  const c = tileCenter(col, row);
  g.player.x = c.x;
  g.player.y = c.y;
}

function goTo(g: Game, sx: number, sy: number, col: number, row: number): void {
  enterScreen(g, sx, sy);
  place(g, col, row);
}

describe('flow', () => {
  it('starts on the title and opens with the intro', () => {
    const g = createGame(1);
    expect(g.mode).toBe('title');
    run(g, {}, 0.5);
    expect(g.mode).toBe('title');
    tap(g, { attack: true });
    expect(g.mode).toBe('dialog');
    expect(g.events).toContain('start');
    skipDialog(g);
    expect(g.mode).toBe('playing');
    expect(g.player.hp).toBe(PLAYER_START_HP);
    expect(g.screenName).toBe('COWORKING CAFE');
  });

  it('first tap fills the page, second tap turns it', () => {
    const g = createGame(1);
    tap(g, { attack: true });
    const d = g.dialog!;
    expect(d.shown).toBeLessThan(d.pages[0]!.length);
    tap(g, { attack: true });
    expect(d.page).toBe(0);
    expect(d.shown).toBe(d.pages[0]!.length);
    tap(g, { attack: true });
    expect(d.page).toBe(1);
  });

  it('pauses, resumes and restarts', () => {
    const g = started();
    g.player.mrr = 90;
    tap(g, { pause: true });
    expect(g.mode).toBe('paused');
    const t = g.time;
    run(g, { x: 1 }, 0.5);
    expect(g.time).toBe(t);
    tap(g, { pause: true });
    expect(g.mode).toBe('playing');

    tap(g, { pause: true });
    tap(g, { y: 1 });
    expect(g.menuIndex).toBe(1);
    tap(g, { attack: true });
    expect(g.mode).toBe('paused');
    expect(g.confirmRestart).toBe(true);
    tap(g, { y: 1 });
    tap(g, { attack: true });
    expect(g.mode).toBe('title');
    expect(g.player.mrr).toBe(0);
    expect(g.lastMrr).toBe(90);
    expect(g.events).toContain('restart');
  });

  it('asks before a restart and defaults to no', () => {
    const g = started();
    g.player.mrr = 40;
    tap(g, { pause: true });
    tap(g, { y: 1 });
    tap(g, { attack: true });
    expect(g.confirmRestart).toBe(true);
    // A stray second tap lands on NO.
    tap(g, { attack: true });
    expect(g.mode).toBe('paused');
    expect(g.confirmRestart).toBe(false);
    expect(g.player.mrr).toBe(40);

    // Pause backs out of the question without resuming.
    tap(g, { attack: true });
    expect(g.confirmRestart).toBe(true);
    tap(g, { pause: true });
    expect(g.mode).toBe('paused');
    expect(g.confirmRestart).toBe(false);
    tap(g, { pause: true });
    expect(g.mode).toBe('playing');
  });
});

describe('movement', () => {
  it('walks and faces the way it moves', () => {
    const g = started();
    const x = g.player.x;
    run(g, { x: 1 }, 0.5);
    expect(g.player.x).toBeGreaterThan(x + 30);
    expect(g.player.dir).toBe('right');
    run(g, { y: -1 }, 0.1);
    expect(g.player.dir).toBe('up');
  });

  it('is not faster on the diagonal', () => {
    const a = started();
    const b = started();
    place(a, 6, 5);
    place(b, 6, 5);
    run(a, { x: 1 }, 0.3);
    run(b, { x: 1, y: 1 }, 0.3);
    const da = a.player.x - tileCenter(6, 5).x;
    const db = Math.hypot(b.player.x - tileCenter(6, 5).x, b.player.y - tileCenter(6, 5).y);
    expect(db).toBeCloseTo(da, 1);
  });

  it('stops at walls', () => {
    const g = started();
    place(g, 2, 5);
    run(g, { x: -1 }, 2);
    expect(g.player.x).toBeGreaterThan(TILE);
    expect(boxBlocked(g, g.player.x, g.player.y, 5, 5)).toBe(false);
    expect(g.sx).toBe(0);
  });

  it('moveBox reports what it hit', () => {
    const g = started();
    const e = { ...tileCenter(1, 1) };
    const res = moveBox(g, e, -40, 0, 5, 5, false);
    expect(res.hitX).toBe(true);
    expect(e.x).toBeGreaterThanOrEqual(TILE + 5 - 0.01);
  });

  it('scrolls to the next screen through an exit', () => {
    const g = started();
    place(g, 14, 5);
    run(g, { x: 1 }, 1);
    expect(g.sx).toBe(1);
    expect(g.sy).toBe(1);
    run(g, {}, 1);
    expect(g.mode).toBe('playing');
    expect(g.player.x).toBeLessThan(TILE);
    expect(g.enemies.length).toBeGreaterThan(0);
  });

  it('cannot pass a locked gate', () => {
    const g = started();
    goTo(g, 1, 1, 13, 5);
    g.enemies = [];
    run(g, { x: 1 }, 2);
    expect(g.sx).toBe(1);
    expect(g.player.x).toBeLessThan(VIEW_W - TILE);
    g.shipped.cafe = true;
    run(g, { x: 1 }, 2);
    expect(g.sx).toBe(2);
    expect(g.area).toBe('bali');
  });
});

describe('combat', () => {
  it('kills a bug with one swing', () => {
    const g = started();
    goTo(g, 1, 1, 5, 5);
    g.enemies = [];
    const bug = spawnEnemy(g, 'bug', g.player.x + 14, g.player.y);
    g.player.dir = 'right';
    tap(g, { attack: true });
    expect(g.enemies).not.toContain(bug);
    expect(g.kills).toBe(1);
    expect(g.events).toContain('kill');
  });

  it('does not hit what is behind the player', () => {
    const g = started();
    goTo(g, 1, 1, 5, 5);
    g.enemies = [];
    const bug = spawnEnemy(g, 'bug', g.player.x - 14, g.player.y);
    bug.stun = 5;
    g.player.dir = 'right';
    g.player.invuln = 5;
    tap(g, { attack: true });
    expect(g.enemies).toContain(bug);
  });

  it('hits each enemy once per swing', () => {
    const g = started();
    goTo(g, 1, 1, 5, 5);
    g.enemies = [];
    const s = spawnEnemy(g, 'scorpion', g.player.x + 14, g.player.y);
    s.stun = 5;
    s.kx = 0;
    g.player.dir = 'right';
    g.player.invuln = 5;
    update(g, { ...NO_INPUT, attack: true }, STEP);
    s.x = g.player.x + 14;
    s.kx = 0;
    run(g, {}, 0.1);
    expect(s.hp).toBe(ENEMY_STATS.scorpion.hp - 1);
  });

  it('takes damage, gets a grace period, then burns out', () => {
    const g = started();
    goTo(g, 1, 1, 5, 5);
    g.enemies = [];
    hurtPlayer(g, 1, 0, 0);
    expect(g.player.hp).toBe(PLAYER_START_HP - 1);
    hurtPlayer(g, 1, 0, 0);
    expect(g.player.hp).toBe(PLAYER_START_HP - 1);
    g.player.invuln = 0;
    g.player.mrr = 1000;
    hurtPlayer(g, 99, 0, 0);
    expect(g.mode).toBe('gameover');
    expect(g.deaths).toBe(1);

    run(g, {}, 1);
    tap(g, { attack: true });
    expect(g.mode).toBe('playing');
    expect(g.player.hp).toBe(g.player.maxHp);
    expect(g.player.mrr).toBe(800);
    expect([g.sx, g.sy]).toEqual([0, 1]);
  });

  it('loses MRR to a churn ghost', () => {
    const g = started();
    goTo(g, 1, 1, 5, 5);
    g.enemies = [];
    g.player.mrr = 100;
    const ghost = spawnEnemy(g, 'ghost', g.player.x + 2, g.player.y);
    ghost.stun = 0;
    run(g, {}, 0.1);
    expect(g.player.mrr).toBe(100 - CHURN_STEAL);
    expect(g.player.hp).toBe(PLAYER_START_HP - 1);
    expect(g.events).toContain('churn');
  });

  it('cuts clutter and opens the way', () => {
    const g = started();
    goTo(g, 1, 2, 10, 2);
    g.enemies = [];
    expect(g.tiles[2]![11]).toBe('g');
    g.player.dir = 'right';
    tap(g, { attack: true });
    expect(g.tiles[2]![11]).toBe(',');
    expect(g.events).toContain('cut');
    run(g, {}, 0.4);
    run(g, { x: 1 }, 1);
    expect(g.commits.cafe).toBe(1);
  });

  it('a troll throws hot takes that a swing can knock down', () => {
    const g = started();
    goTo(g, 3, 2, 3, 5);
    g.enemies = [];
    const troll = spawnEnemy(g, 'troll', g.player.x + 60, g.player.y);
    troll.stun = 0;
    troll.timer2 = 0.1;
    run(g, {}, 0.2);
    expect(g.shots.length).toBe(1);
    expect(g.shots[0]!.vx).toBeLessThan(0);
    g.shots[0]!.x = g.player.x + 12;
    g.player.dir = 'right';
    tap(g, { attack: true });
    expect(g.shots.length).toBe(0);
    expect(g.player.hp).toBe(PLAYER_START_HP);
  });

  it('a scope creep charges when lined up', () => {
    const g = started();
    goTo(g, 1, 0, 3, 5);
    g.enemies = [];
    g.player.invuln = 10;
    const s = spawnEnemy(g, 'scorpion', g.player.x + 80, g.player.y);
    s.stun = 0;
    const x = s.x;
    run(g, {}, 0.9);
    expect(s.x).toBeLessThan(x - 30);
  });
});

describe('progress', () => {
  it('drops the hidden commit when the room is clear', () => {
    const g = started();
    goTo(g, 0, 2, 7, 8);
    expect(g.pickups.some((p) => p.kind === 'commit')).toBe(false);
    for (const e of [...g.enemies]) hurtEnemy(g, e, 99, 1, 0);
    run(g, {}, 0.1);
    const commit = g.pickups.find((p) => p.kind === 'commit')!;
    expect(commit).toBeDefined();
    expect(g.events).toContain('secret');
    g.player.x = commit.x;
    g.player.y = commit.y;
    run(g, {}, 0.5);
    expect(g.commits.cafe).toBe(1);

    // It does not come back.
    goTo(g, 0, 1, 7, 5);
    goTo(g, 0, 2, 7, 8);
    run(g, {}, 0.1);
    expect(g.pickups.some((p) => p.kind === 'commit')).toBe(false);
  });

  it('keeps a cleared room quiet for a while, then fills it again', () => {
    const g = started();
    goTo(g, 0, 2, 7, 8);
    for (const e of [...g.enemies]) hurtEnemy(g, e, 99, 1, 0);
    run(g, {}, 0.1);
    goTo(g, 0, 1, 7, 5);
    goTo(g, 0, 2, 7, 8);
    expect(g.enemies.length).toBe(0);
    for (let i = 0; i < 3; i++) goTo(g, 0, 1, 7, 5);
    goTo(g, 0, 2, 7, 8);
    expect(g.enemies.length).toBeGreaterThan(0);
  });

  it('picks up coins, gems and coffee', () => {
    const g = started();
    goTo(g, 0, 1, 7, 5);
    g.player.hp = 2;
    spawnPickup(g, 'coin', g.player.x, g.player.y);
    spawnPickup(g, 'gem', g.player.x, g.player.y);
    spawnPickup(g, 'coffee', g.player.x, g.player.y);
    run(g, {}, 0.5);
    expect(g.player.mrr).toBe(60);
    expect(g.player.hp).toBe(4);
    expect(g.pickups.length).toBe(0);
  });

  it('will not ship without enough commits', () => {
    const g = started();
    place(g, 7, 2);
    g.player.dir = 'up';
    g.commits.cafe = COMMITS_TO_SHIP - 1;
    expect(canShip(g, 'cafe')).toBe(false);
    tap(g, { attack: true });
    expect(g.mode).toBe('dialog');
    expect(g.dialog!.pages.join(' ')).toContain('FIND 1 MORE');
    expect(g.shipped.cafe).toBe(false);
    expect(g.events).toContain('deny');
  });

  it('ships a product, pays out and opens the gate', () => {
    const g = started();
    place(g, 7, 2);
    g.player.dir = 'up';
    g.player.hp = 1;
    g.commits.cafe = COMMITS_TO_SHIP;
    tap(g, { attack: true });
    expect(g.shipped.cafe).toBe(true);
    expect(g.player.mrr).toBe(SHIP_BONUS);
    expect(g.player.maxHp).toBe(PLAYER_START_HP + 2);
    expect(g.player.hp).toBe(g.player.maxHp);
    expect(g.events).toContain('ship');
    expect(shippedCount(g)).toBe(1);
    skipDialog(g);

    // Shipping twice pays once.
    tap(g, { attack: true });
    skipDialog(g);
    expect(g.player.mrr).toBe(SHIP_BONUS);
  });

  it('talks to locals and reads signs', () => {
    const g = started();
    place(g, 3, 4);
    g.player.dir = 'up';
    tap(g, { attack: true });
    expect(g.dialog!.speaker).toBe('BARISTA');
    skipDialog(g);
    place(g, 11, 7);
    g.player.dir = 'down';
    tap(g, { attack: true });
    expect(g.dialog!.speaker).toBe('SIGN');
  });

  it('unlocks hotfix and double damage', () => {
    const g = started();
    expect(hasHotfix(g)).toBe(false);
    expect(playerDamage(g)).toBe(1);
    g.shipped.bali = true;
    g.shipped.desert = true;
    expect(playerDamage(g)).toBe(2);
    goTo(g, 2, 1, 7, 5);
    g.player.dir = 'right';
    tap(g, { attack: true });
    expect(g.shots.some((s) => s.fromPlayer)).toBe(true);

    g.shots = [];
    g.player.hp = g.player.maxHp - 1;
    run(g, {}, 0.5);
    tap(g, { attack: true });
    expect(g.shots.length).toBe(0);
  });
});

describe('boss', () => {
  function atBoss(): Game {
    const g = started();
    g.shipped = { cafe: true, bali: true, desert: true };
    goTo(g, 2, 0, 14, 5);
    run(g, { x: 1 }, 1);
    run(g, {}, 1);
    expect(g.area).toBe('boss');
    return g;
  }

  it('gives a speech, then seals the room', () => {
    const g = atBoss();
    expect(g.mode).toBe('dialog');
    expect(g.dialog!.speaker).toBe('THE CHURN KING');
    skipDialog(g);
    expect(g.bossActive).toBe(false);
    run(g, { x: 1 }, 0.6);
    expect(g.bossActive).toBe(true);
    run(g, { x: -1 }, 2);
    expect(g.sx).toBe(3);
  });

  it('cannot be hurt before the fight starts', () => {
    const g = atBoss();
    skipDialog(g);
    const boss = g.enemies.find((e) => e.kind === 'boss')!;
    hurtEnemy(g, boss, 5, 1, 0);
    expect(boss.hp).toBe(ENEMY_STATS.boss.hp);
  });

  it('gets meaner as it loses health', () => {
    const g = atBoss();
    skipDialog(g);
    run(g, { x: 1 }, 0.6);
    g.player.invuln = 999;
    const boss = g.enemies.find((e) => e.kind === 'boss')!;
    boss.timer2 = 0;
    run(g, {}, 0.1);
    expect(g.shots.length).toBe(3);
    g.shots = [];
    boss.hp = 5;
    boss.timer2 = 0;
    run(g, {}, 0.1);
    expect(g.shots.length).toBe(8);
  });

  it('breaks away with a ring only every few hits, and drops coffee when you are low', () => {
    const g = atBoss();
    skipDialog(g);
    run(g, { x: 1 }, 0.6);
    g.player.invuln = 999;
    g.player.hp = 2;
    const boss = g.enemies.find((e) => e.kind === 'boss')!;
    boss.timer2 = 99;
    g.shots = [];
    for (let i = 1; i < BOSS_RING_EVERY; i++) {
      boss.flash = 0;
      hurtEnemy(g, boss, 1, 1, 0);
    }
    expect(g.shots.length).toBe(0);
    boss.flash = 0;
    hurtEnemy(g, boss, 1, 1, 0);
    expect(g.shots.length).toBe(6);
    expect(boss.state).toBe('flee');
    expect(g.pickups.some((k) => k.kind === 'coffee')).toBe(true);
  });

  it('falls, pays out and ends the run', () => {
    const g = atBoss();
    skipDialog(g);
    run(g, { x: 1 }, 0.6);
    g.player.invuln = 999;
    const mrr = g.player.mrr;
    const boss = g.enemies.find((e) => e.kind === 'boss')!;
    let guard = 0;
    while (g.enemies.includes(boss) && guard++ < 100) {
      boss.flash = 0;
      hurtEnemy(g, boss, 2, 1, 0);
    }
    expect(g.bossDefeated).toBe(true);
    expect(g.bossActive).toBe(false);
    expect(g.events).toContain('bossdie');
    run(g, {}, 3);
    expect(g.mode).toBe('win');
    expect(g.player.mrr).toBe(mrr + BOSS_BONUS);

    run(g, {}, 2);
    tap(g, { attack: true });
    expect(g.mode).toBe('title');
    expect(g.bossDefeated).toBe(false);
  });
});

describe('full run', () => {
  it('can be won by collecting every commit and shipping in order', () => {
    const g = started(11);
    g.player.invuln = 1e9;
    const lands = [
      { area: 'cafe', hub: [0, 1], stand: [7, 2], rooms: [[1, 1], [0, 2], [1, 2]] },
      { area: 'bali', hub: [2, 1], stand: [3, 3], rooms: [[3, 1], [2, 2], [3, 2]] },
      { area: 'desert', hub: [2, 0], stand: [3, 3], rooms: [[1, 0], [0, 0]] },
    ] as const;
    for (const land of lands) {
      for (const [sx, sy] of land.rooms) {
        goTo(g, sx, sy, 7, 5);
        for (const e of [...g.enemies]) hurtEnemy(g, e, 99, 1, 0);
        run(g, {}, 0.1);
        for (const p of [...g.pickups].filter((k) => k.kind === 'commit')) {
          g.player.x = p.x;
          g.player.y = p.y;
          run(g, {}, 0.4);
        }
      }
      expect(g.commits[land.area], land.area).toBe(COMMITS_TO_SHIP);
      goTo(g, land.hub[0], land.hub[1], land.stand[0], land.stand[1]);
      g.player.dir = 'up';
      tap(g, { attack: true });
      skipDialog(g);
      expect(g.shipped[land.area], land.area).toBe(true);
    }
    expect(shippedCount(g)).toBe(3);
    expect(g.player.maxHp).toBe(PLAYER_START_HP + 6);
  });
});
