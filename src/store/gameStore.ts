/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { GameState, GameEventNotification, MAX_LIVES } from '../shared/types';
import { soundManager } from '../utils/audio';

interface GameStore {
  socket: Socket | null;
  gameState: GameState | null;
  playerId: string | null;
  notifications: GameEventNotification[];
  isMuted: boolean;
  toggleMute: () => void;
  connect: () => void;
  joinGame: () => void;
  sendPlayerState: (data: any) => void;
  sendCollectOrb: (orbId: string) => void;
  sendDropSeveredTail: (orbs: Array<{ x: number; y: number; color?: string }>) => void;
  addNotification: (title: string, message: string, type: GameEventNotification['type'], color?: string) => void;
}

export const globalGameState: { current: GameState | null } = { current: null };

export const globalInputs = {
  up: false,
  down: false,
  left: false,
  right: false,
  boost: false,
  joystickActive: false,
  joystickAngle: 0,
};

let lastUiUpdate = 0;

export const useGameStore = create<GameStore>((set, get) => ({
  socket: null,
  gameState: null,
  playerId: null,
  notifications: [],
  isMuted: false,

  toggleMute: () => {
    const isMuted = soundManager.toggleMute();
    set({ isMuted });
  },

  connect: () => {
    if (get().socket) return;

    const socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('init', (id: string) => {
      set({ playerId: id });
    });

    socket.on('state', (state: GameState) => {
      globalGameState.current = state;
      const now = Date.now();
      if (now - lastUiUpdate > 80) {
        set({ gameState: state });
        lastUiUpdate = now;
      }
    });

    set({ socket });
  },

  joinGame: () => {
    const { socket } = get();
    if (socket) {
      socket.emit('join');
    }
  },

  sendPlayerState: (data) => {
    const { socket } = get();
    if (socket) {
      socket.emit('update_state', data);
    }
  },

  sendCollectOrb: (orbId) => {
    const { socket } = get();
    if (socket) {
      socket.emit('collect_orb', orbId);
    }
  },

  sendDropSeveredTail: (orbs) => {
    const { socket } = get();
    if (socket) {
      socket.emit('drop_severed_tail', orbs);
    }
  },

  addNotification: (title, message, type, color) => {
    const notif: GameEventNotification = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      message,
      type,
      color,
      timestamp: Date.now(),
    };
    set((state) => ({
      notifications: [notif, ...state.notifications].slice(0, 4),
    }));
  },
}));
