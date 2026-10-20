/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useGameStore, globalInputs } from '../store/gameStore';
import { Joystick } from './Joystick';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Shield,
  Zap,
  Magnet,
  Skull,
  Volume2,
  VolumeX,
  Flame,
  Radio,
  Sparkles,
  Heart,
  AlertTriangle,
} from 'lucide-react';
import { MAX_LIVES, WORLD_SIZE } from '../shared/types';

export function UI() {
  const { gameState, playerId, joinGame, notifications, isMuted, toggleMute } = useGameStore();
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const player = playerId && gameState ? gameState.players[playerId] : null;
  const isAlive = player?.state === 'alive';
  const isDead = player?.state === 'dead';

  // Handle Quick Respawn with Space or Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.code === 'Enter') && (!player || isDead)) {
        joinGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [player, isDead, joinGame]);

  const now = Date.now();
  const buffs = player?.buffs || {};
  const activeBuffsList = [
    {
      key: 'speed',
      name: 'HYPER BOOST',
      icon: Zap,
      color: 'text-cyan-400 border-cyan-400/40 bg-cyan-950/40',
      active: buffs.speedUntil && buffs.speedUntil > now,
      remaining: buffs.speedUntil ? Math.max(0, (buffs.speedUntil - now) / 1000).toFixed(1) : 0,
    },
    {
      key: 'shield',
      name: 'AEGIS SHIELD',
      icon: Shield,
      color: 'text-emerald-400 border-emerald-400/40 bg-emerald-950/40',
      active: buffs.shieldUntil && buffs.shieldUntil > now,
      remaining: buffs.shieldUntil ? Math.max(0, (buffs.shieldUntil - now) / 1000).toFixed(1) : 0,
    },
    {
      key: 'magnet',
      name: 'GRAVITY VORTEX',
      icon: Magnet,
      color: 'text-fuchsia-400 border-fuchsia-400/40 bg-fuchsia-950/40',
      active: buffs.magnetUntil && buffs.magnetUntil > now,
      remaining: buffs.magnetUntil ? Math.max(0, (buffs.magnetUntil - now) / 1000).toFixed(1) : 0,
    },
    {
      key: 'freeze',
      name: 'FROST SLOWDOWN',
      icon: AlertTriangle,
      color: 'text-blue-300 border-blue-400/40 bg-blue-950/40',
      active: buffs.freezeUntil && buffs.freezeUntil > now,
      remaining: buffs.freezeUntil ? Math.max(0, (buffs.freezeUntil - now) / 1000).toFixed(1) : 0,
    },
    {
      key: 'ghost',
      name: 'PHASE SHIFT',
      icon: Sparkles,
      color: 'text-purple-300 border-purple-400/40 bg-purple-950/40',
      active: buffs.ghostUntil && buffs.ghostUntil > now,
      remaining: buffs.ghostUntil ? Math.max(0, (buffs.ghostUntil - now) / 1000).toFixed(1) : 0,
    },
  ].filter((b) => b.active);

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-4 sm:p-6 overflow-hidden font-sans">
      {/* Top Header Bar */}
      <div className="flex justify-between items-start gap-4">
        {/* Left: Player Vital HUD */}
        {isAlive && player ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 shadow-lg">
              <div
                className="w-3.5 h-3.5 rounded-full ring-2 ring-white/30 animate-pulse"
                style={{ backgroundColor: player.color }}
              />
              <div className="flex flex-col">
                <span className="text-white font-black text-sm tracking-wide">{player.name}</span>
                <span className="text-xs font-mono text-cyan-400">
                  MASS: <strong className="text-white text-sm">{Math.floor(player.score)}</strong>
                </span>
              </div>

              {/* Hull Integrity / Lives (3 Strikes) */}
              <div className="ml-4 pl-4 border-l border-white/10 flex flex-col items-center">
                <span className="text-[10px] font-mono text-white/50 tracking-wider uppercase mb-1">
                  Hull Integrity
                </span>
                <div className="flex gap-1.5">
                  {Array.from({ length: MAX_LIVES }).map((_, i) => {
                    const isFilled = i < (player.lives ?? MAX_LIVES);
                    return (
                      <div
                        key={i}
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                          isFilled
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/60 shadow-[0_0_8px_rgba(52,211,153,0.4)]'
                            : 'bg-red-950/40 text-red-500/30 border border-red-500/20'
                        }`}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${isFilled ? 'fill-emerald-400 text-emerald-400' : 'text-zinc-600'}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Active Buffs Bar */}
            {activeBuffsList.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {activeBuffsList.map((buff) => {
                  const Icon = buff.icon;
                  return (
                    <motion.div
                      key={buff.key}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full border backdrop-blur-md shadow-md text-xs font-mono font-bold ${buff.color}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{buff.name}</span>
                      <span className="text-[10px] opacity-80">{buff.remaining}s</span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-400 to-amber-300 drop-shadow-[0_0_15px_rgba(0,240,255,0.4)]">
              CYBER SNAKE 3D
            </h1>
          </div>
        )}

        {/* Center: Controls Hint & Action Banner Notifications */}
        <div className="flex-1 flex flex-col items-center pointer-events-none">
          {/* Controls Hint */}
          <div className="hidden sm:flex gap-2 opacity-80 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-mono text-white bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
              <span className="font-bold bg-white/20 px-1.5 py-0.5 rounded text-[10px]">W A S D</span>
              <span className="text-white/60 text-[10px] uppercase">Steer</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-white bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
              <span className="font-bold bg-white/20 px-1.5 py-0.5 rounded text-[10px]">SPACE</span>
              <span className="text-white/60 text-[10px] uppercase">Boost</span>
            </div>
            <button
              onClick={() => setShowRulesModal(true)}
              className="pointer-events-auto text-[10px] font-mono text-cyan-300 hover:text-cyan-200 bg-cyan-950/40 hover:bg-cyan-900/40 px-2.5 py-1 rounded-full border border-cyan-500/30 transition-all cursor-pointer"
            >
              📖 Rules
            </button>
          </div>

          {/* Floating Combat Event Notifications */}
          <div className="flex flex-col items-center gap-1.5">
            <AnimatePresence>
              {notifications.map((notif) => (
                <motion.div
                  key={notif.id}
                  initial={{ y: -15, opacity: 0, scale: 0.9 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: -10, opacity: 0, scale: 0.9 }}
                  className={`px-4 py-1.5 rounded-full backdrop-blur-md border shadow-lg flex items-center gap-2 text-xs font-mono font-bold ${
                    notif.type === 'tail_cut'
                      ? 'bg-amber-950/80 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                      : notif.type === 'hazard'
                      ? 'bg-red-950/80 border-red-500 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                      : 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                  }`}
                >
                  <span>{notif.title}</span>
                  <span className="text-[10px] font-normal opacity-85">{notif.message}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Audio Toggle & Leaderboard */}
        <div className="flex flex-col items-end gap-3">
          {/* Sound Toggle */}
          <button
            onClick={toggleMute}
            className="pointer-events-auto p-2 rounded-xl bg-black/50 hover:bg-black/80 border border-white/10 text-white/80 hover:text-white transition-all backdrop-blur-sm cursor-pointer"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Leaderboard */}
          <div className="bg-black/60 backdrop-blur-md rounded-2xl p-3 border border-white/10 w-44 sm:w-48 shadow-lg">
            <div className="flex items-center gap-2 pb-2 mb-2 border-b border-white/10 text-white font-bold text-xs uppercase tracking-wider">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Leaderboard</span>
            </div>
            <div className="space-y-1">
              {gameState?.leaderboard.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between text-xs px-2 py-1 rounded-md transition-colors ${
                    entry.id === playerId ? 'bg-white/15 font-bold text-white' : 'text-white/70'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate max-w-[105px]">
                    <span className="text-[10px] font-mono text-white/40">#{index + 1}</span>
                    <span className="truncate">{entry.name}</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[11px] text-white/90">
                    <span>{entry.score}</span>
                    {entry.lives < MAX_LIVES && (
                      <span className="text-[9px] text-amber-400">♥{entry.lives}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cyber Minimap Radar (Bottom-Right) */}
      {isAlive && gameState && (
        <div className="absolute bottom-6 right-6 pointer-events-none hidden md:block">
          <div className="w-36 h-36 rounded-2xl bg-black/70 border border-cyan-500/30 backdrop-blur-md relative overflow-hidden shadow-[0_0_20px_rgba(0,240,255,0.15)]">
            {/* Radar Scanline */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 border border-cyan-500/10 rounded-2xl pointer-events-none" />
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-cyan-500/10 pointer-events-none" />
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-cyan-500/10 pointer-events-none" />

            {/* Radar Players & Bots */}
            {Object.values(gameState.players).map((p) => {
              if (p.state !== 'alive' || !p.segments[0]) return null;
              const normX = ((p.segments[0].x + WORLD_SIZE / 2) / WORLD_SIZE) * 100;
              const normY = ((-p.segments[0].y + WORLD_SIZE / 2) / WORLD_SIZE) * 100;
              const isMe = p.id === playerId;

              return (
                <div
                  key={p.id}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all ${
                    isMe
                      ? 'w-3 h-3 bg-white ring-2 ring-cyan-400 shadow-[0_0_8px_#00ffff] z-10'
                      : 'w-2 h-2 opacity-80'
                  }`}
                  style={{
                    left: `${normX}%`,
                    top: `${normY}%`,
                    backgroundColor: isMe ? '#ffffff' : p.color,
                  }}
                />
              );
            })}

            {/* Rare Special Orbs on Radar */}
            {Object.values(gameState.orbs).map((orb) => {
              if (orb.type === 'energy') return null;
              const normX = ((orb.x + WORLD_SIZE / 2) / WORLD_SIZE) * 100;
              const normY = ((-orb.y + WORLD_SIZE / 2) / WORLD_SIZE) * 100;

              return (
                <div
                  key={orb.id}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full animate-ping ${
                    orb.type === 'skull' ? 'w-2 h-2 bg-red-500' : 'w-2 h-2 bg-yellow-400'
                  }`}
                  style={{ left: `${normX}%`, top: `${normY}%` }}
                />
              );
            })}

            <div className="absolute bottom-1 right-1.5 text-[8px] font-mono text-cyan-400/50">
              RADAR
            </div>
          </div>
        </div>
      )}

      {/* Rules & Powerups Modal */}
      <AnimatePresence>
        {showRulesModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 pointer-events-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-white/20 rounded-3xl p-6 max-w-lg w-full text-white shadow-2xl relative"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
                <h3 className="text-lg font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-amber-300">
                  ARENA MECHANICS & TARGETS
                </h3>
                <button
                  onClick={() => setShowRulesModal(false)}
                  className="text-white/60 hover:text-white px-2 py-1 text-sm rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3 bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    ✂️
                  </div>
                  <div>
                    <strong className="text-amber-400 block font-mono text-sm">
                      Self-Cut & Tail Severing
                    </strong>
                    <p className="text-white/70">
                      You can cut through your own body! Crossing your tail severs the back half into
                      collectible energy orbs, but costs <strong>1 Hull Strike</strong>. On the 3rd
                      cut (0 Hull), your snake explodes!
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                    <span className="text-cyan-400 font-bold block mb-0.5">⚡ Hyper Boost</span>
                    <p className="text-white/60 text-[11px]">
                      Max speed for 6s without burning mass/score.
                    </p>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                    <span className="text-emerald-400 font-bold block mb-0.5">🛡️ Aegis Shield</span>
                    <p className="text-white/60 text-[11px]">
                      7s total invulnerability against cuts, mines & collisions.
                    </p>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                    <span className="text-fuchsia-400 font-bold block mb-0.5">🧲 Gravity Vortex</span>
                    <p className="text-white/60 text-[11px]">
                      Pulls all nearby orbs into your head for 8s.
                    </p>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                    <span className="text-red-400 font-bold block mb-0.5">💀 Death Mine</span>
                    <p className="text-white/60 text-[11px]">
                      Detonates! Costs 1 Hull & blows away 40% of tail!
                    </p>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                    <span className="text-blue-300 font-bold block mb-0.5">❄️ Frost Trap</span>
                    <p className="text-white/60 text-[11px]">
                      Slows movement by 50% for 4s.
                    </p>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                    <span className="text-amber-300 font-bold block mb-0.5">💎 Mega Gem</span>
                    <p className="text-white/60 text-[11px]">
                      Rare prismatic diamond giving +15 mass immediately!
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowRulesModal(false)}
                className="w-full mt-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs tracking-wider uppercase rounded-xl transition-all cursor-pointer"
              >
                Got It, Let's Play!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Join / Respawn Modal Screen */}
      <AnimatePresence>
        {(!player || isDead) && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center p-4 pointer-events-auto bg-black/40 backdrop-blur-sm"
          >
            <div className="bg-zinc-950/90 border border-white/15 p-6 sm:p-8 rounded-3xl max-w-md w-full text-center shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-xl relative">
              {isDead ? (
                <div>
                  <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/40 text-red-500 flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <Skull className="w-8 h-8" />
                  </div>
                  <h2 className="text-3xl font-black text-white mb-1">ELIMINATED</h2>
                  <p className="text-white/50 text-xs mb-4">
                    Mass: <strong className="text-white">{Math.floor(player.score)}</strong>
                  </p>
                </div>
              ) : (
                <div>
                  <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-400/40 text-cyan-400 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(0,240,255,0.2)]">
                    <Radio className="w-8 h-8 animate-pulse" />
                  </div>
                  <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-amber-300 mb-1">
                    CYBER SNAKE 3D
                  </h2>
                  <p className="text-white/60 text-xs mb-5">
                    Dynamic tactical multiplayer arena with powerups and tail-severing mechanics!
                  </p>
                </div>
              )}

              {/* Quick Feature Badges */}
              <div className="flex justify-center gap-2 mb-6">
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[11px] font-mono">
                  3 Hull Lives
                </span>
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full text-[11px] font-mono">
                  Self-Tail Sever
                </span>
                <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-1 rounded-full text-[11px] font-mono">
                  6 Powerups
                </span>
              </div>

              <button
                onClick={joinGame}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-black text-sm tracking-widest uppercase rounded-2xl shadow-[0_0_30px_rgba(34,211,238,0.4)] transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                {isDead ? 'RESPAWN (SPACE / ENTER)' : 'ENTER ARENA (SPACE)'}
              </button>

              <div className="flex justify-center items-center gap-4 mt-4">
                <button
                  onClick={() => setShowRulesModal(true)}
                  className="text-xs text-white/50 hover:text-white transition-colors cursor-pointer"
                >
                  View Targets & Special Abilities
                </button>
                <span className="text-white/20">•</span>
                <a
                  href="/neon-snake.apk"
                  download="neon-snake.apk"
                  className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  📱 Download APK
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Controls Overlay */}
      {isTouchDevice && isAlive && (
        <div className="absolute bottom-6 left-0 right-0 px-6 flex justify-between items-end pointer-events-auto z-10">
          <Joystick />

          <button
            onTouchStart={() => {
              globalInputs.boost = true;
            }}
            onTouchEnd={() => {
              globalInputs.boost = false;
            }}
            onTouchCancel={() => {
              globalInputs.boost = false;
            }}
            className="w-20 h-20 rounded-full border-2 border-pink-500 bg-black/60 backdrop-blur-md shadow-[0_0_20px_rgba(236,72,153,0.4)] active:bg-pink-500/30 active:scale-95 flex flex-col items-center justify-center text-pink-400 font-bold tracking-widest text-xs transition-all uppercase select-none cursor-pointer"
          >
            <Flame className="w-5 h-5 text-pink-400 mb-0.5 animate-pulse" />
            <span className="text-[11px] font-black tracking-tight">BOOST</span>
          </button>
        </div>
      )}
    </div>
  );
}
