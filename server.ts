/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Server } from 'socket.io';
import { createServer } from 'http';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import {
  GameState,
  Player,
  Orb,
  OrbType,
  LeaderboardEntry,
  WORLD_SIZE,
  BASE_SPEED,
  BOOST_SPEED,
  TICK_RATE,
  MAX_ORBS,
  INITIAL_LENGTH,
  SEGMENT_SPACING,
  TURN_SPEED,
  MAX_LIVES,
} from './src/shared/types.ts';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

const PORT = 3000;

const COLORS = [
  '#ff007f', // Cyber Pink
  '#00f0ff', // Cyber Cyan
  '#39ff14', // Neon Lime
  '#ffe600', // Electric Yellow
  '#bf00ff', // Plasma Purple
  '#ff4500', // Neon Orange
  '#00ffff', // Aqua
];

const BOT_NAMES = [
  'Viper-X',
  'CyberPhantom',
  'VoltStrike',
  'NeonHydra',
  'ApexHunter',
  'ZeroGlitch',
];

const state: GameState = {
  players: {},
  orbs: {},
  leaderboard: [],
};

function pickRandomOrbType(): { type: OrbType; color: string; value: number } {
  const rand = Math.random();
  if (rand < 0.68) {
    return {
      type: 'energy',
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      value: 1,
    };
  } else if (rand < 0.74) {
    return {
      type: 'mega_gem',
      color: '#ffd700', // Gold
      value: 15,
    };
  } else if (rand < 0.80) {
    return {
      type: 'speed',
      color: '#00ffff', // Cyan lightning
      value: 2,
    };
  } else if (rand < 0.85) {
    return {
      type: 'shield',
      color: '#00ff88', // Emerald Aegis
      value: 1,
    };
  } else if (rand < 0.90) {
    return {
      type: 'magnet',
      color: '#e040fb', // Magenta Vortex
      value: 1,
    };
  } else if (rand < 0.94) {
    return {
      type: 'freeze',
      color: '#67e8f9', // Frosted ice
      value: 0,
    };
  } else if (rand < 0.97) {
    return {
      type: 'ghost',
      color: '#c084fc', // Phase purple
      value: 1,
    };
  } else {
    return {
      type: 'skull',
      color: '#ff0033', // Spiky Death Mine
      value: -5,
    };
  }
}

function spawnOrb(
  x?: number,
  y?: number,
  forcedType?: OrbType,
  forcedColor?: string,
  forcedValue?: number,
  force = false
) {
  if (!force && Object.keys(state.orbs).length >= MAX_ORBS) return;
  const id = uuidv4();
  const orbConfig = pickRandomOrbType();

  const type = forcedType ?? orbConfig.type;
  const color = forcedColor ?? orbConfig.color;
  const value = forcedValue ?? orbConfig.value;

  state.orbs[id] = {
    id,
    x: x ?? (Math.random() - 0.5) * (WORLD_SIZE - 10),
    y: y ?? (Math.random() - 0.5) * (WORLD_SIZE - 10),
    type,
    value,
    color,
    createdAt: Date.now(),
  };
}

// Initial populate of orbs
for (let i = 0; i < 220; i++) {
  spawnOrb();
}

let snakeCounter = 1;

// Initialize Server-side AI Bots
function createBot(index: number) {
  const botId = `bot-${index}`;
  const name = BOT_NAMES[index % BOT_NAMES.length];
  const color = COLORS[(index + 2) % COLORS.length];
  const startX = (Math.random() - 0.5) * (WORLD_SIZE - 30);
  const startY = (Math.random() - 0.5) * (WORLD_SIZE - 30);
  const angle = Math.random() * Math.PI * 2;

  const segments = [];
  const len = INITIAL_LENGTH + Math.floor(Math.random() * 8);
  for (let i = 0; i < len; i++) {
    segments.push({
      x: startX - Math.cos(angle) * i * SEGMENT_SPACING,
      y: startY - Math.sin(angle) * i * SEGMENT_SPACING,
    });
  }

  state.players[botId] = {
    id: botId,
    name: `🤖 ${name}`,
    color,
    segments,
    score: len,
    isBoosting: false,
    state: 'alive',
    currentAngle: angle,
    lives: MAX_LIVES,
    buffs: {},
    isBot: true,
  };
}

for (let i = 0; i < 5; i++) {
  createBot(i);
}

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('join', () => {
    const name = `Neon-${snakeCounter++}`;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const startX = (Math.random() - 0.5) * (WORLD_SIZE - 30);
    const startY = (Math.random() - 0.5) * (WORLD_SIZE - 30);
    const angle = Math.random() * Math.PI * 2;

    const segments = [];
    for (let i = 0; i < INITIAL_LENGTH; i++) {
      segments.push({
        x: startX - Math.cos(angle) * i * SEGMENT_SPACING,
        y: startY - Math.sin(angle) * i * SEGMENT_SPACING,
      });
    }

    state.players[socket.id] = {
      id: socket.id,
      name,
      color,
      segments,
      score: INITIAL_LENGTH,
      isBoosting: false,
      state: 'alive',
      currentAngle: angle,
      lives: MAX_LIVES,
      buffs: {},
      isBot: false,
    };

    socket.emit('init', socket.id);
  });

  socket.on('update_state', (data: {
    segments: any[];
    score: number;
    currentAngle: number;
    isBoosting: boolean;
    state: 'alive' | 'dead';
    lives?: number;
    buffs?: any;
  }) => {
    const player = state.players[socket.id];
    if (player && player.state === 'alive') {
      player.segments = data.segments;
      player.score = data.score;
      player.currentAngle = data.currentAngle;
      player.isBoosting = data.isBoosting;
      if (typeof data.lives === 'number') player.lives = data.lives;
      if (data.buffs) player.buffs = data.buffs;

      if (data.state === 'dead') {
        player.state = 'dead';
        // Drop orbs along the body
        player.segments.forEach((seg, i) => {
          if (i % 2 === 0) spawnOrb(seg.x, seg.y, 'energy', player.color, 2, true);
        });
      }
    }
  });

  socket.on('drop_severed_tail', (orbsToSpawn: Array<{ x: number; y: number; color?: string }>) => {
    if (Array.isArray(orbsToSpawn)) {
      orbsToSpawn.forEach((pt) => {
        spawnOrb(pt.x, pt.y, 'energy', pt.color || '#ff0055', 2, true);
      });
    }
  });

  socket.on('collect_orb', (orbId: string) => {
    if (state.orbs[orbId]) {
      delete state.orbs[orbId];
    }
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    const player = state.players[socket.id];
    if (player && player.state === 'alive') {
      player.segments.forEach((seg, i) => {
        if (i % 2 === 0) spawnOrb(seg.x, seg.y, 'energy', player.color, 2, true);
      });
    }
    delete state.players[socket.id];
  });
});

// Update AI Bots
function updateBots(delta: number) {
  const orbList = Object.values(state.orbs);
  const now = Date.now();

  for (let b = 0; b < 5; b++) {
    const botId = `bot-${b}`;
    let bot = state.players[botId];

    if (!bot || bot.state !== 'alive' || bot.segments.length === 0) {
      // Respawn after short delay
      if (!bot || Math.random() < 0.02) {
        createBot(b);
      }
      continue;
    }

    const head = { ...bot.segments[0] };

    // Find nearest favorable orb
    let nearestDist = Infinity;
    let targetX = 0;
    let targetY = 0;

    for (let i = 0; i < orbList.length; i++) {
      const orb = orbList[i];
      // Avoid skulls unless bot has shield
      const hasShield = bot.buffs?.shieldUntil && bot.buffs.shieldUntil > now;
      if (orb.type === 'skull' && !hasShield) continue;

      const d2 = (head.x - orb.x) ** 2 + (head.y - orb.y) ** 2;
      if (d2 < nearestDist) {
        nearestDist = d2;
        targetX = orb.x;
        targetY = orb.y;
      }
    }

    let desiredAngle = bot.currentAngle;
    if (nearestDist < 2500) {
      desiredAngle = Math.atan2(targetY - head.y, targetX - head.x);
    }

    // Boundary repulsion
    const limit = WORLD_SIZE / 2 - 12;
    if (head.x < -limit) desiredAngle = 0;
    else if (head.x > limit) desiredAngle = Math.PI;
    else if (head.y < -limit) desiredAngle = Math.PI / 2;
    else if (head.y > limit) desiredAngle = -Math.PI / 2;

    // Smooth turn
    let diff = desiredAngle - bot.currentAngle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    const maxRot = TURN_SPEED * 0.7 * delta;
    if (Math.abs(diff) < maxRot) {
      bot.currentAngle = desiredAngle;
    } else {
      bot.currentAngle += Math.sign(diff) * maxRot;
    }

    const speed = BASE_SPEED * 0.95;
    head.x += Math.cos(bot.currentAngle) * speed * delta;
    head.y += Math.sin(bot.currentAngle) * speed * delta;

    bot.segments.unshift(head);

    // Bot orb consumption
    for (const orb of orbList) {
      const dx = head.x - orb.x;
      const dy = head.y - orb.y;
      if (dx * dx + dy * dy < 3.5) {
        if (state.orbs[orb.id]) {
          delete state.orbs[orb.id];
          if (orb.type === 'skull') {
            bot.score = Math.max(10, bot.score - 5);
            bot.lives -= 1;
            if (bot.lives <= 0) {
              bot.state = 'dead';
              bot.segments.forEach((seg, idx) => {
                if (idx % 2 === 0) spawnOrb(seg.x, seg.y, 'energy', bot.color, 1, true);
              });
              break;
            }
          } else {
            bot.score += orb.value;
          }
        }
      }
    }

    if (bot.state === 'alive') {
      const targetLen = Math.floor(bot.score);
      while (bot.segments.length > targetLen) {
        bot.segments.pop();
      }
    }
  }
}

// Game Loop
let lastTick = Date.now();
setInterval(() => {
  const now = Date.now();
  const delta = (now - lastTick) / 1000;
  lastTick = now;

  // Update AI Bots
  updateBots(delta);

  // Player boost orb drops
  for (const id in state.players) {
    const player = state.players[id];
    if (player.state === 'alive' && player.isBoosting && player.score > 10) {
      if (Math.random() < 0.12 && player.segments.length > 0) {
        const tail = player.segments[player.segments.length - 1];
        spawnOrb(tail.x, tail.y, 'energy', player.color, 1, true);
      }
    }
  }

  // Periodic random orbs replenish
  if (Math.random() < 0.28) {
    spawnOrb();
  }

  // Update leaderboard
  state.leaderboard = Object.values(state.players)
    .filter((p) => p.state === 'alive')
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((p) => ({
      id: p.id,
      name: p.name,
      score: Math.floor(p.score),
      color: p.color,
      lives: p.lives ?? MAX_LIVES,
    }));

  // Broadcast state
  io.emit('state', state);
}, 1000 / TICK_RATE);

async function startServer() {
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get(['/neon-snake.apk', '/download-apk'], (req, res) => {
    res.download('./neon-snake.apk', 'neon-snake.apk');
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on:`);
    console.log(`  - Local:   http://localhost:${PORT}`);
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          console.log(`  - Network (Wi-Fi/AP): http://${iface.address}:${PORT}`);
        }
      }
    }
  });
}

startServer();
