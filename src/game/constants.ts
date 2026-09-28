/** Shared sizes and tuning values for Indie Quest. */

export const TILE = 16;
export const COLS = 16;
export const ROWS = 11;
export const VIEW_W = COLS * TILE; // 256
export const VIEW_H = ROWS * TILE; // 176
export const HUD_H = 32;
export const CANVAS_W = VIEW_W;
export const CANVAS_H = VIEW_H + HUD_H; // 208

/** Fixed simulation step in seconds. */
export const STEP = 1 / 60;

export const PLAYER_SPEED = 72;
export const PLAYER_HALF = 5;
export const PLAYER_START_HP = 6; // half-cups
export const PLAYER_MAX_HP = 12;
export const ATTACK_TIME = 0.22;
export const ATTACK_COOLDOWN = 0.32;
export const INVULN_TIME = 1.0;
export const HOTFIX_SPEED = 170;

export const TRANSITION_TIME = 0.55;
export const COMMITS_TO_SHIP = 3;
export const SHIP_BONUS = 500;
export const BOSS_BONUS = 5000;
export const CHURN_STEAL = 30;
/** Share of MRR lost when the player burns out. */
export const BURNOUT_PENALTY = 0.2;
/** Screens visited before a cleared room fills up again. */
export const RESPAWN_VISITS = 3;
