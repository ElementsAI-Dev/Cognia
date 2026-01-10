'use client';

/**
 * Spotlight Overlay Component
 * Creates a dark overlay with a spotlight effect on the target element
 * Uses SVG mask for smooth cutout effect
 */

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SpotlightOverlayProps {
  targetRect: DOMRect | null;
  isVisible: boolean;
  padding?: number;
  borderRadius?: number;
  className?: string;
  onClick?: () => void;
}

export function SpotlightOverlay({
  targetRect,
  isVisible,
  padding = 8,
  borderRadius = 12,
  className,
  onClick,
}: SpotlightOverlayProps) {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const spotlightPath = useMemo(() => {
    if (!targetRect || windowSize.width === 0) return '';

    const x = targetRect.left - padding;
    const y = targetRect.top - padding;
    const width = targetRect.width + padding * 2;
    const height = targetRect.height + padding * 2;
    const r = Math.min(borderRadius, width / 2, height / 2);

    // Create outer rectangle (full screen)
    const outer = `M 0 0 H ${windowSize.width} V ${windowSize.height} H 0 Z`;

    // Create inner rounded rectangle (cutout)
    const inner = `
      M ${x + r} ${y}
      H ${x + width - r}
      Q ${x + width} ${y} ${x + width} ${y + r}
      V ${y + height - r}
      Q ${x + width} ${y + height} ${x + width - r} ${y + height}
      H ${x + r}
      Q ${x} ${y + height} ${x} ${y + height - r}
      V ${y + r}
      Q ${x} ${y} ${x + r} ${y}
      Z
    `;

    return `${outer} ${inner}`;
  }, [targetRect, windowSize, padding, borderRadius]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={cn('fixed inset-0 z-[100] pointer-events-auto', className)}
          onClick={onClick}
        >
          <svg
            className="absolute inset-0 w-full h-full"
            style={{ pointerEvents: 'none' }}
          >
            <defs>
              <filter id="spotlight-blur" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
              </filter>
            </defs>
            
            {/* Dark overlay with cutout */}
            <motion.path
              d={spotlightPath}
              fill="rgba(0, 0, 0, 0.75)"
              fillRule="evenodd"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              style={{ pointerEvents: 'auto' }}
            />

            {/* Glow effect around spotlight */}
            {targetRect && (
              <motion.rect
                x={targetRect.left - padding - 4}
                y={targetRect.top - padding - 4}
                width={targetRect.width + padding * 2 + 8}
                height={targetRect.height + padding * 2 + 8}
                rx={borderRadius + 4}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                filter="url(#spotlight-blur)"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 0.6, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              />
            )}
          </svg>

          {/* Animated ring around target */}
          {targetRect && (
            <motion.div
              className="absolute pointer-events-none"
              style={{
                left: targetRect.left - padding,
                top: targetRect.top - padding,
                width: targetRect.width + padding * 2,
                height: targetRect.height + padding * 2,
                borderRadius: borderRadius,
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <div
                className="absolute inset-0 rounded-[inherit] ring-2 ring-primary ring-offset-2 ring-offset-background"
                style={{ borderRadius: 'inherit' }}
              />
              {/* Pulsing ring animation */}
              <motion.div
                className="absolute inset-0 rounded-[inherit] ring-2 ring-primary/50"
                style={{ borderRadius: 'inherit' }}
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.5, 0.2, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SpotlightOverlay;
