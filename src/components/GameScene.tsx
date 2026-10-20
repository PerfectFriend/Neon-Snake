/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore, globalGameState, globalInputs } from '../store/gameStore';
import {
  WORLD_SIZE,
  TURN_SPEED,
  BASE_SPEED,
  BOOST_SPEED,
  HYPER_SPEED,
  SLOW_SPEED,
  MAX_LIVES,
  Orb,
  OrbType,
  PlayerBuffs,
} from '../shared/types';
import * as THREE from 'three';
import { Sphere, Grid, Torus, Octahedron, Icosahedron, Dodecahedron } from '@react-three/drei';
import { soundManager } from '../utils/audio';

const localCollectedOrbs = new Set<string>();

// High-tech cyber snake rendering with visor and buff auras
function Snake({
  playerId,
  color,
  isLocal,
}: {
  playerId: string;
  color: string;
  isLocal: boolean;
}) {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const headGroupRef = useRef<THREE.Group>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const currentPositions = useRef<{ x: number; y: number }[]>([]);

  // Buff visualization states
  const [activeShield, setActiveShield] = useState(false);
  const [activeSpeed, setActiveSpeed] = useState(false);
  const [activeFreeze, setActiveFreeze] = useState(false);
  const [activeGhost, setActiveGhost] = useState(false);
  const [activeMagnet, setActiveMagnet] = useState(false);

  useFrame((state, delta) => {
    if (!bodyRef.current || !headGroupRef.current) return;
    const gs = globalGameState.current;
    if (!gs) return;

    const player = gs.players[playerId];
    if (!player || player.segments.length === 0 || player.state !== 'alive') {
      bodyRef.current.count = 0;
      headGroupRef.current.visible = false;
      return;
    }

    const now = Date.now();
    const buffs: PlayerBuffs = player.buffs || {};
    setActiveShield(Boolean(buffs.shieldUntil && buffs.shieldUntil > now));
    setActiveSpeed(Boolean(buffs.speedUntil && buffs.speedUntil > now));
    setActiveFreeze(Boolean(buffs.freezeUntil && buffs.freezeUntil > now));
    setActiveGhost(Boolean(buffs.ghostUntil && buffs.ghostUntil > now));
    setActiveMagnet(Boolean(buffs.magnetUntil && buffs.magnetUntil > now));

    headGroupRef.current.visible = true;
    const count = player.segments.length;
    bodyRef.current.count = Math.max(0, count - 1);

    while (currentPositions.current.length < count) {
      const idx = currentPositions.current.length;
      currentPositions.current.push({
        x: player.segments[idx]?.x || 0,
        y: player.segments[idx]?.y || 0,
      });
    }

    for (let i = 0; i < count; i++) {
      const targetX = player.segments[i].x;
      const targetY = player.segments[i].y;

      const curr = currentPositions.current[i];
      if (isLocal) {
        curr.x = targetX;
        curr.y = targetY;
      } else {
        const dist = Math.abs(targetX - curr.x) + Math.abs(targetY - curr.y);
        if (dist > 10) {
          curr.x = targetX;
          curr.y = targetY;
        } else {
          const lerpFactor = 15;
          curr.x += (targetX - curr.x) * lerpFactor * delta;
          curr.y += (targetY - curr.y) * lerpFactor * delta;
        }
      }

      if (i === 0) {
        headGroupRef.current.position.set(curr.x, curr.y, 0.6);
        headGroupRef.current.rotation.z = player.currentAngle;
      } else {
        dummy.position.set(curr.x, curr.y, 0.5);
        // Taper tail towards end
        const scale = Math.max(0.4, Math.min(1.0, 1.0 - (i / count) * 0.4));
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        bodyRef.current.setMatrixAt(i - 1, dummy.matrix);
      }
    }
    bodyRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {/* Snake Head Assembly */}
      <group ref={headGroupRef}>
        {/* Main Head Dome */}
        <Sphere args={[0.85, 20, 20]} castShadow receiveShadow>
          <meshStandardMaterial
            color={color}
            roughness={0.2}
            metalness={0.8}
            transparent={activeGhost}
            opacity={activeGhost ? 0.45 : 1}
            toneMapped={false}
          />
        </Sphere>

        {/* Visor / Cyber Eye Glow */}
        <mesh position={[0.55, 0, 0.2]} rotation={[0, Math.PI / 2, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.6, 12]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>

        {/* Left and right micro-lights */}
        <mesh position={[0.4, 0.4, 0.3]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color="#00ffff" />
        </mesh>
        <mesh position={[0.4, -0.4, 0.3]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color="#00ffff" />
        </mesh>

        {/* Active Aegis Shield Aura */}
        {activeShield && (
          <Sphere args={[1.5, 24, 24]}>
            <meshStandardMaterial
              color="#00ff88"
              emissive="#00ff88"
              emissiveIntensity={1.8}
              transparent
              opacity={0.35}
              wireframe
            />
          </Sphere>
        )}

        {/* Active Speed Overdrive Aura */}
        {activeSpeed && (
          <mesh position={[-0.7, 0, 0]}>
            <coneGeometry args={[0.7, 1.4, 12]} />
            <meshBasicMaterial color="#ffff00" transparent opacity={0.6} wireframe />
          </mesh>
        )}

        {/* Active Freeze Frost Aura */}
        {activeFreeze && (
          <Sphere args={[1.3, 16, 16]}>
            <meshStandardMaterial
              color="#67e8f9"
              emissive="#67e8f9"
              emissiveIntensity={1.2}
              transparent
              opacity={0.3}
            />
          </Sphere>
        )}

        {/* Active Magnet Swirl */}
        {activeMagnet && (
          <Torus args={[1.4, 0.08, 8, 24]} rotation={[Math.PI / 2, 0, 0]}>
            <meshBasicMaterial color="#e040fb" transparent opacity={0.7} />
          </Torus>
        )}
      </group>

      {/* Snake Instanced Body */}
      <instancedMesh
        ref={bodyRef}
        args={[null as any, null as any, 2500]}
        castShadow
        receiveShadow
        frustumCulled={false}
      >
        <sphereGeometry args={[0.65, 16, 16]} />
        <meshStandardMaterial
          color={color}
          roughness={0.25}
          metalness={0.75}
          transparent={activeGhost}
          opacity={activeGhost ? 0.35 : 1}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}

// Specialized 3D Orbs Renderer
function Orbs() {
  const normalMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorObj = useMemo(() => new THREE.Color(), []);

  // Separate list for special rare orbs to render with distinctive 3D geometry
  const [specialOrbs, setSpecialOrbs] = useState<Orb[]>([]);

  useFrame((state) => {
    const gs = globalGameState.current;
    if (!gs) return;

    const time = state.clock.getElapsedTime();
    const specials: Orb[] = [];
    let normCount = 0;

    for (const orbId in gs.orbs) {
      if (localCollectedOrbs.has(orbId)) continue;
      const orb = gs.orbs[orbId];

      if (orb.type === 'energy') {
        if (normalMeshRef.current) {
          dummy.position.set(orb.x, orb.y, 0.4 + Math.sin(time * 3 + orb.x) * 0.1);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          normalMeshRef.current.setMatrixAt(normCount, dummy.matrix);
          colorObj.set(orb.color);
          normalMeshRef.current.setColorAt(normCount, colorObj);
          normCount++;
        }
      } else {
        // Collect special orbs for custom 3D mesh rendering
        specials.push(orb);
      }
    }

    if (normalMeshRef.current) {
      normalMeshRef.current.count = normCount;
      normalMeshRef.current.instanceMatrix.needsUpdate = true;
      if (normalMeshRef.current.instanceColor) {
        normalMeshRef.current.instanceColor.needsUpdate = true;
      }
    }

    // Update specials if changed or throttled
    if (specials.length !== specialOrbs.length || Math.random() < 0.05) {
      setSpecialOrbs(specials);
    }
  });

  return (
    <group>
      {/* Standard Energy Orbs */}
      <instancedMesh
        ref={normalMeshRef}
        args={[null as any, null as any, 1000]}
        castShadow
        receiveShadow
        frustumCulled={false}
      >
        <sphereGeometry args={[0.45, 12, 12]} />
        <meshStandardMaterial roughness={0.3} metalness={0.2} toneMapped={false} />
      </instancedMesh>

      {/* Special Powerups & Hazards with unique 3D models */}
      {specialOrbs.map((orb) => (
        <SpecialOrbItem key={orb.id} orb={orb} />
      ))}
    </group>
  );
}

function SpecialOrbItem({ orb }: { orb: Orb }) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    meshRef.current.rotation.x = t * 1.5;
    meshRef.current.rotation.y = t * 2.0;
    meshRef.current.position.z = 0.5 + Math.sin(t * 4 + orb.x) * 0.15;
  });

  if (orb.type === 'mega_gem') {
    return (
      <group ref={meshRef} position={[orb.x, orb.y, 0.5]}>
        <Icosahedron args={[0.9, 0]}>
          <meshStandardMaterial
            color="#ffd700"
            emissive="#ffaa00"
            emissiveIntensity={2}
            metalness={0.9}
            roughness={0.1}
          />
        </Icosahedron>
      </group>
    );
  }

  if (orb.type === 'speed') {
    return (
      <group ref={meshRef} position={[orb.x, orb.y, 0.5]}>
        <Octahedron args={[0.8, 0]}>
          <meshStandardMaterial
            color="#00ffff"
            emissive="#00f0ff"
            emissiveIntensity={2.5}
            wireframe
          />
        </Octahedron>
        <Sphere args={[0.4, 8, 8]}>
          <meshBasicMaterial color="#ffffff" />
        </Sphere>
      </group>
    );
  }

  if (orb.type === 'shield') {
    return (
      <group ref={meshRef} position={[orb.x, orb.y, 0.5]}>
        <Sphere args={[0.7, 16, 16]}>
          <meshStandardMaterial
            color="#00ff88"
            emissive="#00ff88"
            emissiveIntensity={2}
            wireframe
          />
        </Sphere>
        <Torus args={[0.9, 0.06, 8, 24]}>
          <meshBasicMaterial color="#00ffaa" />
        </Torus>
      </group>
    );
  }

  if (orb.type === 'magnet') {
    return (
      <group ref={meshRef} position={[orb.x, orb.y, 0.5]}>
        <Torus args={[0.8, 0.25, 12, 24]}>
          <meshStandardMaterial
            color="#e040fb"
            emissive="#bf00ff"
            emissiveIntensity={2}
            metalness={0.5}
          />
        </Torus>
      </group>
    );
  }

  if (orb.type === 'freeze') {
    return (
      <group ref={meshRef} position={[orb.x, orb.y, 0.5]}>
        <Dodecahedron args={[0.75, 0]}>
          <meshStandardMaterial
            color="#67e8f9"
            emissive="#38bdf8"
            emissiveIntensity={1.8}
            roughness={0.1}
            metalness={0.9}
          />
        </Dodecahedron>
      </group>
    );
  }

  if (orb.type === 'ghost') {
    return (
      <group ref={meshRef} position={[orb.x, orb.y, 0.5]}>
        <Octahedron args={[0.75, 0]}>
          <meshStandardMaterial
            color="#c084fc"
            emissive="#a855f7"
            emissiveIntensity={2}
            transparent
            opacity={0.6}
            wireframe
          />
        </Octahedron>
      </group>
    );
  }

  if (orb.type === 'skull') {
    return (
      <group ref={meshRef} position={[orb.x, orb.y, 0.5]}>
        {/* Dark crimson spiky mine */}
        <Dodecahedron args={[0.85, 0]}>
          <meshStandardMaterial
            color="#220005"
            emissive="#ff0033"
            emissiveIntensity={2.5}
            roughness={0.4}
            metalness={0.8}
          />
        </Dodecahedron>
        {/* Pulsing hazard spikes */}
        <Octahedron args={[1.1, 0]}>
          <meshBasicMaterial color="#ff0033" wireframe />
        </Octahedron>
      </group>
    );
  }

  return null;
}

export function GameScene() {
  const { gameState, playerId, sendPlayerState, sendCollectOrb, sendDropSeveredTail, addNotification } =
    useGameStore();
  const { camera } = useThree();
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const [lightTarget] = useState(() => new THREE.Object3D());

  // Screen shake ref
  const shakeRef = useRef(0);

  // Local predicted player
  const localPlayerRef = useRef({
    segments: [] as { x: number; y: number }[],
    score: 10,
    currentAngle: 0,
    isBoosting: false,
    active: false,
    lastSendTime: 0,
    lives: MAX_LIVES,
    buffs: {} as PlayerBuffs,
    lastSeverTime: 0, // Grace cooldown between cuts
  });

  // Track initial spawn / join
  useEffect(() => {
    if (playerId && gameState?.players[playerId]) {
      const serverPlayer = gameState.players[playerId];
      if (serverPlayer.state === 'alive') {
        localPlayerRef.current = {
          segments: [...serverPlayer.segments],
          score: serverPlayer.score,
          currentAngle: serverPlayer.currentAngle,
          isBoosting: serverPlayer.isBoosting,
          active: true,
          lastSendTime: Date.now(),
          lives: serverPlayer.lives ?? MAX_LIVES,
          buffs: serverPlayer.buffs || {},
          lastSeverTime: 0,
        };
      }
    }
  }, [playerId, gameState?.players[playerId]?.state]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') globalInputs.left = true;
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') globalInputs.right = true;
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') globalInputs.up = true;
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') globalInputs.down = true;
      if (e.key === ' ' || e.key === 'Shift') globalInputs.boost = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') globalInputs.left = false;
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') globalInputs.right = false;
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') globalInputs.up = false;
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') globalInputs.down = false;
      if (e.key === ' ' || e.key === 'Shift') globalInputs.boost = false;
    };

    const handleBlur = () => {
      globalInputs.left = false;
      globalInputs.right = false;
      globalInputs.up = false;
      globalInputs.down = false;
      globalInputs.boost = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useFrame((state, delta) => {
    const gs = globalGameState.current;
    if (!gs || !playerId) return;

    const serverPlayer = gs.players[playerId];

    if (serverPlayer && serverPlayer.state === 'alive') {
      if (!localPlayerRef.current.active) {
        localPlayerRef.current.segments = [...serverPlayer.segments];
        localPlayerRef.current.score = serverPlayer.score;
        localPlayerRef.current.currentAngle = serverPlayer.currentAngle;
        localPlayerRef.current.lives = serverPlayer.lives ?? MAX_LIVES;
        localPlayerRef.current.buffs = serverPlayer.buffs || {};
        localPlayerRef.current.active = true;
      }

      if (!localPlayerRef.current.active) return;

      const now = Date.now();
      const buffs = localPlayerRef.current.buffs;

      // Handle Direction Steering
      let targetAngle: number | null = null;
      if (globalInputs.joystickActive) {
        targetAngle = globalInputs.joystickAngle;
      } else {
        let dx = 0;
        let dy = 0;
        if (globalInputs.left) dx -= 1;
        if (globalInputs.right) dx += 1;
        if (globalInputs.up) dy += 1;
        if (globalInputs.down) dy -= 1;

        if (dx !== 0 || dy !== 0) {
          targetAngle = Math.atan2(dy, dx);
        }
      }

      if (targetAngle !== null) {
        let diff = targetAngle - localPlayerRef.current.currentAngle;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));

        const maxRotation = TURN_SPEED * delta;
        if (Math.abs(diff) < maxRotation) {
          localPlayerRef.current.currentAngle = targetAngle;
        } else {
          localPlayerRef.current.currentAngle += Math.sign(diff) * maxRotation;
        }
      }

      // Calculate Effective Speed & Boost
      const isHyperSpeed = Boolean(buffs.speedUntil && buffs.speedUntil > now);
      const isFrozen = Boolean(buffs.freezeUntil && buffs.freezeUntil > now);
      const isShielded = Boolean(buffs.shieldUntil && buffs.shieldUntil > now);
      const isGhost = Boolean(buffs.ghostUntil && buffs.ghostUntil > now);
      const isMagnet = Boolean(buffs.magnetUntil && buffs.magnetUntil > now);

      localPlayerRef.current.isBoosting = (globalInputs.boost || isHyperSpeed) && localPlayerRef.current.score > 10;

      let currentSpeed = BASE_SPEED;
      if (isFrozen) {
        currentSpeed = SLOW_SPEED;
      } else if (isHyperSpeed) {
        currentSpeed = HYPER_SPEED;
      } else if (localPlayerRef.current.isBoosting) {
        currentSpeed = BOOST_SPEED;
      }

      const head = { ...localPlayerRef.current.segments[0] };
      head.x += Math.cos(localPlayerRef.current.currentAngle) * currentSpeed * delta;
      head.y += Math.sin(localPlayerRef.current.currentAngle) * currentSpeed * delta;

      // World Boundary Check
      const boundary = WORLD_SIZE / 2;
      if (head.x < -boundary) head.x = -boundary;
      if (head.x > boundary) head.x = boundary;
      if (head.y < -boundary) head.y = -boundary;
      if (head.y > boundary) head.y = boundary;

      localPlayerRef.current.segments.unshift(head);

      // Score burn when manual boosting (Hyper speed doesn't burn score)
      if (localPlayerRef.current.isBoosting && !isHyperSpeed) {
        localPlayerRef.current.score -= 2.2 * delta;
        if (localPlayerRef.current.score <= 10) {
          localPlayerRef.current.isBoosting = false;
          localPlayerRef.current.score = 10;
        }
      }

      const targetLength = Math.floor(localPlayerRef.current.score);
      while (localPlayerRef.current.segments.length > targetLength) {
        localPlayerRef.current.segments.pop();
      }

      // 1. Magnet Effect (pull nearby orbs towards player head)
      if (isMagnet) {
        const magnetRadius = 16;
        for (const orbId in gs.orbs) {
          if (localCollectedOrbs.has(orbId)) continue;
          const orb = gs.orbs[orbId];
          const dx = head.x - orb.x;
          const dy = head.y - orb.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < magnetRadius * magnetRadius && distSq > 0.1) {
            const pullSpeed = 25 * delta;
            const dist = Math.sqrt(distSq);
            orb.x += (dx / dist) * pullSpeed;
            orb.y += (dy / dist) * pullSpeed;
          }
        }
      }

      // 2. Check Orb Collisions (Special properties & Powerups)
      for (const orbId in gs.orbs) {
        if (localCollectedOrbs.has(orbId)) continue;
        const orb = gs.orbs[orbId];
        const dx = head.x - orb.x;
        const dy = head.y - orb.y;
        if (dx * dx + dy * dy < 4) {
          localCollectedOrbs.add(orbId);
          delete gs.orbs[orbId];
          sendCollectOrb(orbId);

          // Handle Orb Specific Gameplay Properties
          if (orb.type === 'energy') {
            localPlayerRef.current.score += orb.value;
            soundManager.playEatOrb(false);
          } else if (orb.type === 'mega_gem') {
            localPlayerRef.current.score += orb.value;
            soundManager.playEatOrb(true);
            addNotification('💎 MEGA GEM!', `+${orb.value} MASS BURST`, 'buff', '#ffd700');
          } else if (orb.type === 'speed') {
            buffs.speedUntil = Date.now() + 6500;
            soundManager.playPowerup('speed');
            addNotification('⚡ HYPER BOOST!', 'TURBO CHARGE (6s)', 'buff', '#00ffff');
          } else if (orb.type === 'shield') {
            buffs.shieldUntil = Date.now() + 7500;
            soundManager.playPowerup('shield');
            addNotification('🛡️ AEGIS SHIELD!', 'INVULNERABLE TO HITS & HAZARDS (7s)', 'buff', '#00ff88');
          } else if (orb.type === 'magnet') {
            buffs.magnetUntil = Date.now() + 8500;
            soundManager.playPowerup('magnet');
            addNotification('🧲 GRAVITY VORTEX!', 'ATTRACTING ALL ORBS (8s)', 'buff', '#e040fb');
          } else if (orb.type === 'ghost') {
            buffs.ghostUntil = Date.now() + 5500;
            soundManager.playPowerup('ghost');
            addNotification('👻 PHASE SHIFT!', 'PASS THROUGH SNAKES (5s)', 'buff', '#c084fc');
          } else if (orb.type === 'freeze') {
            if (!isShielded) {
              buffs.freezeUntil = Date.now() + 4500;
              soundManager.playHazardHit();
              addNotification('❄️ FROST TRAP!', 'SPEED REDUCED BY 50% (4s)', 'hazard', '#67e8f9');
            } else {
              soundManager.playPowerup('shield');
            }
          } else if (orb.type === 'skull') {
            // Hazard Mine Collision
            if (isShielded) {
              soundManager.playPowerup('shield');
              addNotification('🛡️ SHIELD DEFLECTION!', 'MINE BLOWN SAFELY', 'buff', '#00ff88');
            } else {
              // Detonate mine: takes 1 life strike & cuts 40% mass
              localPlayerRef.current.lives -= 1;
              shakeRef.current = 1.2;
              soundManager.playHazardHit();

              const cutLength = Math.floor(localPlayerRef.current.segments.length * 0.4);
              const dropped: Array<{ x: number; y: number; color?: string }> = [];
              for (let c = 0; c < cutLength; c++) {
                const seg = localPlayerRef.current.segments.pop();
                if (seg && c % 2 === 0) {
                  dropped.push({ x: seg.x, y: seg.y, color: serverPlayer.color });
                }
              }
              localPlayerRef.current.score = Math.max(10, localPlayerRef.current.segments.length);
              if (dropped.length > 0) sendDropSeveredTail(dropped);

              if (localPlayerRef.current.lives <= 0) {
                soundManager.playDeath();
                localPlayerRef.current.active = false;
                sendPlayerState({
                  segments: localPlayerRef.current.segments,
                  score: localPlayerRef.current.score,
                  currentAngle: localPlayerRef.current.currentAngle,
                  isBoosting: localPlayerRef.current.isBoosting,
                  lives: 0,
                  state: 'dead',
                });
                return;
              } else {
                addNotification(
                  '💀 MINE DETONATED!',
                  `-1 HULL! (${localPlayerRef.current.lives}/${MAX_LIVES} LIVES LEFT)`,
                  'hazard',
                  '#ff0033'
                );
              }
            }
          }
        }
      }

      // 3. SELF-COLLISION MECHANIC: TAIL SEVERING ("змейка может сама себе отломать хвост...")
      // If head hits own body past segment index 11:
      // - Cuts the tail at the collision point, dropping it into glowing food
      // - Decreases lives / hull integrity strike by 1
      // - On 3rd cut (0 lives remaining), the snake dies!
      if (now - localPlayerRef.current.lastSeverTime > 1500) {
        const segs = localPlayerRef.current.segments;
        let selfCutIndex = -1;

        // Skip head and neck (first 12 segments) to allow tight turns
        for (let i = 12; i < segs.length; i++) {
          const seg = segs[i];
          const dx = head.x - seg.x;
          const dy = head.y - seg.y;
          if (dx * dx + dy * dy < 1.9) {
            selfCutIndex = i;
            break;
          }
        }

        if (selfCutIndex !== -1) {
          if (isShielded) {
            // Shield protects against self-severing
            soundManager.playPowerup('shield');
          } else {
            localPlayerRef.current.lastSeverTime = now;
            localPlayerRef.current.lives -= 1;
            shakeRef.current = 1.5;

            // Cut tail from selfCutIndex to the end
            const severedSegments = segs.splice(selfCutIndex);
            localPlayerRef.current.score = Math.max(10, segs.length);

            // Convert severed segments into dropped food orbs for arena
            const dropped: Array<{ x: number; y: number; color?: string }> = [];
            severedSegments.forEach((seg, idx) => {
              if (idx % 2 === 0) {
                dropped.push({ x: seg.x, y: seg.y, color: serverPlayer.color });
              }
            });
            if (dropped.length > 0) {
              sendDropSeveredTail(dropped);
            }

            soundManager.playTailCut();

            if (localPlayerRef.current.lives <= 0) {
              // Total destruction on 3rd cut!
              soundManager.playDeath();
              localPlayerRef.current.active = false;
              sendPlayerState({
                segments: localPlayerRef.current.segments,
                score: localPlayerRef.current.score,
                currentAngle: localPlayerRef.current.currentAngle,
                isBoosting: localPlayerRef.current.isBoosting,
                lives: 0,
                state: 'dead',
              });
              return;
            } else {
              addNotification(
                '⚠️ TAIL SEVERED!',
                `TAIL CUT OFF! ${localPlayerRef.current.lives}/${MAX_LIVES} HULL REMAINING`,
                'tail_cut',
                '#ffaa00'
              );
            }
          }
        }
      }

      // 4. Check Opponent Snakes Collision
      let collidedWithOpponent = false;
      if (!isGhost && !isShielded) {
        for (const otherId in gs.players) {
          if (otherId === playerId) continue;
          const other = gs.players[otherId];
          if (other.state !== 'alive') continue;

          for (const seg of other.segments) {
            const dx = head.x - seg.x;
            const dy = head.y - seg.y;
            if (dx * dx + dy * dy < 2.25) {
              collidedWithOpponent = true;
              break;
            }
          }
          if (collidedWithOpponent) break;
        }
      }

      if (collidedWithOpponent) {
        soundManager.playDeath();
        localPlayerRef.current.active = false;
        sendPlayerState({
          segments: localPlayerRef.current.segments,
          score: localPlayerRef.current.score,
          currentAngle: localPlayerRef.current.currentAngle,
          isBoosting: localPlayerRef.current.isBoosting,
          lives: 0,
          state: 'dead',
        });
        return;
      }

      // Overwrite global state for smooth local rendering
      gs.players[playerId].segments = localPlayerRef.current.segments;
      gs.players[playerId].score = localPlayerRef.current.score;
      gs.players[playerId].currentAngle = localPlayerRef.current.currentAngle;
      gs.players[playerId].isBoosting = localPlayerRef.current.isBoosting;
      gs.players[playerId].lives = localPlayerRef.current.lives;
      gs.players[playerId].buffs = localPlayerRef.current.buffs;

      // Send state to server at 20Hz
      if (now - localPlayerRef.current.lastSendTime > 50) {
        sendPlayerState({
          segments: localPlayerRef.current.segments,
          score: localPlayerRef.current.score,
          currentAngle: localPlayerRef.current.currentAngle,
          isBoosting: localPlayerRef.current.isBoosting,
          lives: localPlayerRef.current.lives,
          buffs: localPlayerRef.current.buffs,
          state: 'alive',
        });
        localPlayerRef.current.lastSendTime = now;
      }

      // Smooth Camera Follow & Screen Shake
      const targetZ = Math.min(48, Math.max(20, 20 + localPlayerRef.current.score * 0.18));
      const shakeX = (Math.random() - 0.5) * shakeRef.current * 1.5;
      const shakeY = (Math.random() - 0.5) * shakeRef.current * 1.5;
      if (shakeRef.current > 0.01) {
        shakeRef.current *= 0.9;
      } else {
        shakeRef.current = 0;
      }

      camera.position.x += (head.x + shakeX - camera.position.x) * 10 * delta;
      camera.position.y += (head.y + shakeY - camera.position.y) * 10 * delta;
      camera.position.z += (targetZ - camera.position.z) * 4 * delta;
      camera.lookAt(camera.position.x, camera.position.y, 0);

      // Keep light aligned with camera
      if (lightRef.current) {
        lightRef.current.position.set(camera.position.x + 12, camera.position.y - 12, 35);
        lightTarget.position.set(camera.position.x, camera.position.y, 0);
      }
    } else {
      localPlayerRef.current.active = false;
    }
  });

  if (!gameState) return null;

  return (
    <>
      <ambientLight intensity={0.45} />

      <directionalLight
        ref={lightRef}
        target={lightTarget}
        castShadow
        intensity={2.2}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-camera-near={0.1}
        shadow-camera-far={120}
        shadow-bias={-0.001}
      />
      <primitive object={lightTarget} />

      {/* Cyber Arena Floor */}
      <mesh receiveShadow position={[0, 0, -0.2]}>
        <planeGeometry args={[WORLD_SIZE, WORLD_SIZE]} />
        <meshStandardMaterial color="#050810" roughness={0.8} />
      </mesh>

      {/* Cyber Grid Lines */}
      <Grid
        position={[0, 0, -0.1]}
        rotation={[Math.PI / 2, 0, 0]}
        args={[WORLD_SIZE, WORLD_SIZE]}
        cellSize={1.5}
        cellThickness={0.6}
        cellColor="#0e2a47"
        sectionSize={12}
        sectionThickness={1.2}
        sectionColor="#00f0ff"
        fadeDistance={120}
        fadeStrength={1}
      />

      {/* Arena Boundary Walls Glow */}
      <mesh position={[0, WORLD_SIZE / 2, 1]}>
        <boxGeometry args={[WORLD_SIZE, 0.4, 2]} />
        <meshBasicMaterial color="#ff0055" />
      </mesh>
      <mesh position={[0, -WORLD_SIZE / 2, 1]}>
        <boxGeometry args={[WORLD_SIZE, 0.4, 2]} />
        <meshBasicMaterial color="#ff0055" />
      </mesh>
      <mesh position={[WORLD_SIZE / 2, 0, 1]}>
        <boxGeometry args={[0.4, WORLD_SIZE, 2]} />
        <meshBasicMaterial color="#ff0055" />
      </mesh>
      <mesh position={[-WORLD_SIZE / 2, 0, 1]}>
        <boxGeometry args={[0.4, WORLD_SIZE, 2]} />
        <meshBasicMaterial color="#ff0055" />
      </mesh>

      <Orbs />

      {Object.values(gameState.players).map((player) => {
        if (player.state !== 'alive' || player.segments.length === 0) return null;
        return (
          <Snake
            key={player.id}
            playerId={player.id}
            color={player.color}
            isLocal={player.id === playerId}
          />
        );
      })}
    </>
  );
}
