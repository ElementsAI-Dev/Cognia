'use client';

/**
 * Confetti Celebration Component
 * Renders animated confetti particles for completion celebrations
 */

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  shape: 'square' | 'circle' | 'triangle';
  delay: number;
  duration: number;
  // Pre-computed random values to avoid calling Math.random during render
  xDrift: number;
  rotationDirection: number;
  angle: number;
  velocity: number;
}

interface ConfettiProps {
  isActive: boolean;
  particleCount?: number;
  duration?: number;
  colors?: string[];
  onComplete?: () => void;
}

const DEFAULT_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Gold
  '#BB8FCE', // Purple
  '#85C1E9', // Sky Blue
];

function generateConfettiPieces(count: number, colors: string[]): ConfettiPiece[] {
  const pieces: ConfettiPiece[] = [];
  const shapes: ConfettiPiece['shape'][] = ['square', 'circle', 'triangle'];

  for (let i = 0; i < count; i++) {
    pieces.push({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 0.8,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      delay: Math.random() * 0.5,
      duration: 2.5 + Math.random() * 1.5,
      // Pre-compute random values for animation
      xDrift: (Math.random() - 0.5) * 200,
      rotationDirection: Math.random() > 0.5 ? 1 : -1,
      angle: Math.random() * Math.PI * 2,
      velocity: 100 + Math.random() * 200,
    });
  }

  return pieces;
}

function ConfettiShape({ shape, color }: { shape: ConfettiPiece['shape']; color: string }) {
  switch (shape) {
    case 'circle':
      return (
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: color }}
        />
      );
    case 'triangle':
      return (
        <div
          className="w-0 h-0"
          style={{
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderBottom: `10px solid ${color}`,
          }}
        />
      );
    case 'square':
    default:
      return (
        <div
          className="w-3 h-3 rounded-sm"
          style={{ backgroundColor: color }}
        />
      );
  }
}

export function Confetti({
  isActive,
  particleCount = 50,
  duration = 4000,
  colors = DEFAULT_COLORS,
  onComplete,
}: ConfettiProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [activationCount, setActivationCount] = useState(0);

  // Generate pieces when activation count changes (triggered by isActive)
  const pieces = useMemo(() => {
    if (activationCount === 0) return [];
    return generateConfettiPieces(particleCount, colors);
  }, [activationCount, particleCount, colors]);

  useEffect(() => {
    if (isActive) {
      // Increment activation count to trigger piece regeneration
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActivationCount((c) => c + 1);
      setIsVisible(true);

      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isActive, duration, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[200] pointer-events-none overflow-hidden">
          {pieces.map((piece) => (
            <motion.div
              key={piece.id}
              className="absolute"
              style={{
                left: `${piece.x}%`,
                top: `${piece.y}%`,
                transformOrigin: 'center',
              }}
              initial={{
                y: 0,
                x: 0,
                rotate: piece.rotation,
                scale: 0,
                opacity: 1,
              }}
              animate={{
                y: ['0vh', '120vh'],
                x: [0, piece.xDrift],
                rotate: [piece.rotation, piece.rotation + 360 * piece.rotationDirection * 3],
                scale: [0, piece.scale, piece.scale, piece.scale * 0.5],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: piece.duration,
                delay: piece.delay,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              <ConfettiShape shape={piece.shape} color={piece.color} />
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * Burst confetti from a specific point
 */
interface ConfettiBurstProps {
  isActive: boolean;
  x?: number;
  y?: number;
  particleCount?: number;
  colors?: string[];
  onComplete?: () => void;
}

export function ConfettiBurst({
  isActive,
  x = 50,
  y = 50,
  particleCount = 30,
  colors = DEFAULT_COLORS,
  onComplete,
}: ConfettiBurstProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isActive) {
      const newPieces = generateConfettiPieces(particleCount, colors).map((p) => ({
        ...p,
        x,
        y,
      }));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPieces(newPieces);
      setIsVisible(true);

      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isActive, x, y, particleCount, colors, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[200] pointer-events-none overflow-hidden">
          {pieces.map((piece) => {
            const endX = Math.cos(piece.angle) * piece.velocity;
            const endY = Math.sin(piece.angle) * piece.velocity - 50;

            return (
              <motion.div
                key={piece.id}
                className="absolute"
                style={{
                  left: `${piece.x}%`,
                  top: `${piece.y}%`,
                }}
                initial={{
                  x: 0,
                  y: 0,
                  scale: 0,
                  opacity: 1,
                  rotate: 0,
                }}
                animate={{
                  x: endX,
                  y: [0, endY - 50, endY + 200],
                  scale: [0, piece.scale, piece.scale * 0.3],
                  opacity: [0, 1, 0],
                  rotate: piece.rotation + 720,
                }}
                transition={{
                  duration: 2,
                  delay: piece.delay * 0.3,
                  ease: 'easeOut',
                }}
              >
                <ConfettiShape shape={piece.shape} color={piece.color} />
              </motion.div>
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
}

export default Confetti;
