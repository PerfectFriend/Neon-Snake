/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type OrbType =
  | 'energy'
  | 'mega_gem'
  | 'speed'
  | 'freeze'
  | 'shield'
  | 'magnet'
  | 'ghost'
  | 'skull';

export type PlayerState = 'alive' | 'dead' | 'spectating';

export type PlayerBuffs = {
  speedUntil?: number;
  freezeUntil?: number;
  shieldUntil?: number;
  magnetUntil?: number;
  ghostUntil?: number;
};

export type Player = {
  id: string;
  name: string;
  color: string;
  segments: { x: number; y: number }[];
  score: number;
  isBoosting: boolean;
  state: PlayerState;
  currentAngle: number;
  inputs?: { left: boolean; right: boolean; boost: boolean };
  lives: number; // 3 lives max (hull integrity strikes)
  buffs: PlayerBuffs;
  isBot?: boolean;
};

export type Orb = {
  id: string;
  x: number;
  y: number;
  type: OrbType;
  value: number;
  color: string;
  createdAt?: number;
};

export type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
  color: string;
  lives: number;
};

export type GameEventNotification = {
  id: string;
  type: 'tail_cut' | 'buff' | 'kill' | 'hazard' | 'info';
  title: string;
  message: string;
  timestamp: number;
  color?: string;
};

export type GameState = {
  players: Record<string, Player>;
  orbs: Record<string, Orb>;
  leaderboard: LeaderboardEntry[];
  recentEvent?: GameEventNotification;
};

export const WORLD_SIZE = 160;
export const BASE_SPEED = 14;
export const BOOST_SPEED = 28;
export const HYPER_SPEED = 36;
export const SLOW_SPEED = 8;
export const TICK_RATE = 60; // 60 updates per second
export const MAX_ORBS = 400;
export const INITIAL_LENGTH = 12;
export const SEGMENT_SPACING = 0.55;
export const TURN_SPEED = Math.PI * 3.2; // Radians per second
export const MAX_LIVES = 3;
