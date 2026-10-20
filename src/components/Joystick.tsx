/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { globalInputs } from '../store/gameStore';

export function Joystick() {
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  const baseRef = useRef<HTMLDivElement>(null);
  const touchIdRef = useRef<number | null>(null);

  const handleStart = (clientX: number, clientY: number, touchId: number | null) => {
    if (!baseRef.current) return;
    setIsActive(true);
    globalInputs.joystickActive = true;
    touchIdRef.current = touchId;
    handleMove(clientX, clientY);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = rect.width / 2;

    let targetX = dx;
    let targetY = dy;

    if (distance > maxRadius) {
      targetX = (dx / distance) * maxRadius;
      targetY = (dy / distance) * maxRadius;
    }

    setKnobPos({ x: targetX, y: targetY });

    // Calculate game angle (Y inverted since screen Y increases downwards)
    const angle = Math.atan2(-targetY, targetX);
    globalInputs.joystickAngle = angle;
  };

  const handleEnd = () => {
    setIsActive(false);
    globalInputs.joystickActive = false;
    touchIdRef.current = null;
    setKnobPos({ x: 0, y: 0 });
  };

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (touchIdRef.current === null) return;
      const touch = Array.from(e.touches).find(t => t.identifier === touchIdRef.current);
      if (touch) {
        // Prevent default zooming/scrolling on mobile while dragging joystick
        e.preventDefault();
        handleMove(touch.clientX, touch.clientY);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (touchIdRef.current === null) return;
      const touch = Array.from(e.changedTouches).find(t => t.identifier === touchIdRef.current);
      if (touch) {
        handleEnd();
      }
    };

    // Use non-passive listener to allow preventDefault()
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  return (
    <div className="flex items-center justify-center pointer-events-auto">
      <div
        ref={baseRef}
        onTouchStart={(e) => {
          const touch = e.touches[0];
          handleStart(touch.clientX, touch.clientY, touch.identifier);
        }}
        className={`w-28 h-28 rounded-full border-2 bg-black/40 backdrop-blur-md flex items-center justify-center transition-all relative ${
          isActive 
            ? 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)] scale-105' 
            : 'border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.05)]'
        }`}
      >
        {/* Inner track guide */}
        <div className="absolute inset-2 rounded-full border border-dashed border-white/5 pointer-events-none" />
        
        {/* Joystick Knob */}
        <div
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            transition: isActive ? 'none' : 'transform 0.15s ease-out',
          }}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg pointer-events-none ${
            isActive 
              ? 'bg-gradient-to-br from-cyan-400 to-blue-500 shadow-cyan-500/50' 
              : 'bg-gradient-to-br from-zinc-700 to-zinc-900 border border-white/10'
          }`}
        >
          <div className="w-4 h-4 rounded-full bg-white/20 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
