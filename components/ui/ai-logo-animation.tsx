'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSafeTheme } from '@/hooks/ui/use-safe-theme';
import { getThemeColors } from '@/lib/constants/splash-theme';

interface AILogoAnimationProps {
  className?: string;
  /** Override primary brand color (defaults to theme) */
  primaryColor?: string;
  /** Override secondary accent color (defaults to theme) */
  secondaryColor?: string;
  /** Size of the logo container */
  size?: number;
  /** Whether the animation is playing */
  isAnimating?: boolean;
}

/**
 * Animated AI Logo Component
 * 
 * Features:
 * - Central neural hub with pulsing nodes
 * - Rotating outer rings with gradient
 * - Glassmorphism container
 * - Breathing glow effects
 */
export function AILogoAnimation({
  className,
  primaryColor,
  secondaryColor,
  size = 120,
  isAnimating = true,
}: AILogoAnimationProps) {
  const { resolvedTheme } = useSafeTheme();

  // Use theme-aware colors with optional overrides
  const themeColors = getThemeColors(resolvedTheme);
  const effectivePrimaryColor = primaryColor ?? themeColors.primary;
  const effectiveSecondaryColor = secondaryColor ?? themeColors.secondary;
  const nodePositions = [
    { x: 0, y: -14, delay: 0 },
    { x: 12, y: -7, delay: 0.1 },
    { x: 12, y: 7, delay: 0.2 },
    { x: 0, y: 14, delay: 0.3 },
    { x: -12, y: 7, delay: 0.4 },
    { x: -12, y: -7, delay: 0.5 },
  ];

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      {/* Outer rotating gradient ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(from 0deg, transparent 0%, ${effectivePrimaryColor}40 25%, transparent 50%, ${effectiveSecondaryColor}40 75%, transparent 100%)`,
        }}
        animate={isAnimating ? { rotate: 360 } : {}}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Secondary counter-rotating ring */}
      <motion.div
        className="absolute inset-3 rounded-full"
        style={{
          background: `conic-gradient(from 180deg, transparent 0%, ${effectiveSecondaryColor}30 25%, transparent 50%, ${effectivePrimaryColor}30 75%, transparent 100%)`,
        }}
        animate={isAnimating ? { rotate: -360 } : {}}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Pulsing ring 1 */}
      <motion.div
        className="absolute inset-4 rounded-full border"
        style={{ borderColor: `${effectivePrimaryColor}30` }}
        animate={isAnimating ? { scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] } : {}}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Pulsing ring 2 */}
      <motion.div
        className="absolute inset-6 rounded-full border"
        style={{ borderColor: `${effectiveSecondaryColor}25` }}
        animate={isAnimating ? { scale: [1, 1.08, 1], opacity: [0.2, 0.5, 0.2] } : {}}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.3,
        }}
      />

      {/* Center container with glassmorphism */}
      <motion.div
        className="absolute inset-6 rounded-2xl flex items-center justify-center overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${effectivePrimaryColor}15 0%, ${effectiveSecondaryColor}15 100%)`,
          backdropFilter: 'blur(12px)',
          boxShadow: `0 0 40px ${effectivePrimaryColor}50, inset 0 0 20px ${effectivePrimaryColor}10`,
        }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          duration: 0.6,
          ease: 'easeOut',
        }}
      >
        {/* Shimmer overlay */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(45deg, transparent 30%, ${effectivePrimaryColor}20 50%, transparent 70%)`,
          }}
          animate={isAnimating ? { x: ['-100%', '200%'] } : {}}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
            repeatDelay: 1,
          }}
        />

        {/* Neural network SVG */}
        <svg
          width={size * 0.4}
          height={size * 0.4}
          viewBox="-24 -24 48 48"
          className="relative z-10"
        >
          {/* Connection lines */}
          {nodePositions.map((node, i) => (
            <motion.line
              key={`line-${i}`}
              x1="0"
              y1="0"
              x2={node.x}
              y2={node.y}
              stroke={effectivePrimaryColor}
              strokeWidth="1.5"
              strokeOpacity="0.4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: 0.8,
                delay: node.delay + 0.3,
                ease: 'easeOut',
              }}
            />
          ))}

          {/* Inter-node connections */}
          {nodePositions.map((node, i) => {
            const nextNode = nodePositions[(i + 1) % nodePositions.length];
            return (
              <motion.line
                key={`interline-${i}`}
                x1={node.x}
                y1={node.y}
                x2={nextNode.x}
                y2={nextNode.y}
                stroke={effectiveSecondaryColor}
                strokeWidth="1"
                strokeOpacity="0.25"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: 0.6,
                  delay: node.delay + 0.6,
                  ease: 'easeOut',
                }}
              />
            );
          })}

          {/* Central hub */}
          <motion.circle
            cx="0"
            cy="0"
            r="5"
            fill={effectivePrimaryColor}
            animate={isAnimating ? { scale: [1, 1.15, 1], opacity: [1, 0.8, 1] } : {}}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Central hub glow */}
          <motion.circle
            cx="0"
            cy="0"
            r="8"
            fill="none"
            stroke={effectivePrimaryColor}
            strokeWidth="2"
            strokeOpacity="0.3"
            animate={isAnimating ? { scale: [1, 1.3, 1], opacity: [0.3, 0.1, 0.3] } : {}}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Outer nodes */}
          {nodePositions.map((node, i) => (
            <motion.g key={`node-${i}`}>
              {/* Node glow */}
              <motion.circle
                cx={node.x}
                cy={node.y}
                r="4"
                fill={i % 2 === 0 ? effectivePrimaryColor : effectiveSecondaryColor}
                fillOpacity="0.2"
                animate={
                  isAnimating
                    ? { scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }
                    : {}
                }
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: node.delay,
                }}
              />
              {/* Node core */}
              <motion.circle
                cx={node.x}
                cy={node.y}
                r="2.5"
                fill={i % 2 === 0 ? effectivePrimaryColor : effectiveSecondaryColor}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  duration: 0.4,
                  delay: node.delay + 0.2,
                  ease: 'backOut',
                }}
              />
            </motion.g>
          ))}

          {/* Data flow particles */}
          {isAnimating &&
            [0, 1, 2].map((i) => (
              <motion.circle
                key={`particle-${i}`}
                r="1.5"
                fill="#ffffff"
                fillOpacity="0.8"
                initial={{ cx: 0, cy: 0 }}
                animate={{
                  cx: [0, nodePositions[i * 2].x, 0],
                  cy: [0, nodePositions[i * 2].y, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.7,
                }}
              />
            ))}
        </svg>
      </motion.div>

      {/* Ambient glow */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${effectivePrimaryColor}20 0%, transparent 70%)`,
        }}
        animate={isAnimating ? { scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] } : {}}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
}

export default AILogoAnimation;
