'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useSafeTheme } from '@/hooks/ui/use-safe-theme';
import { getThemeColors, SPLASH_ANIMATION_CONFIG } from '@/lib/constants/splash-theme';
import { isTauri } from '@/lib/utils';

interface AppLoadingScreenProps {
  /** Whether the loading screen is visible */
  visible: boolean;
  /** Called when the exit animation completes */
  onExitComplete?: () => void;
}

interface LoadingStage {
  progress: number;
  messageKey: string;
}

const LOADING_STAGES: LoadingStage[] = [
  { progress: 15, messageKey: 'loadingCore' },
  { progress: 35, messageKey: 'initializingProviders' },
  { progress: 55, messageKey: 'loadingThemes' },
  { progress: 75, messageKey: 'preparingWorkspace' },
  { progress: 90, messageKey: 'almostReady' },
  { progress: 100, messageKey: 'ready' },
];

/**
 * AppLoadingScreen - Shows during initial app hydration
 *
 * Features:
 * - Theme-adaptive colors via splash-theme.ts
 * - i18n support (en/zh-CN)
 * - Reduced motion support
 * - Smooth fade-out exit transition
 * - ARIA accessibility
 * - Tauri real progress events (when available)
 * - Performance-aware animations
 */
export function AppLoadingScreen({ visible, onExitComplete }: AppLoadingScreenProps) {
  const t = useTranslations('splashscreen');
  const { resolvedTheme } = useSafeTheme();
  const prefersReducedMotion = useReducedMotion();
  const [progress, setProgress] = useState(0);
  const [stageKey, setStageKey] = useState('initializing');

  const colors = useMemo(() => getThemeColors(resolvedTheme), [resolvedTheme]);

  const loadingText = t(stageKey);

  // Listen for real Tauri progress events, fallback to simulated stages
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let fallbackInterval: ReturnType<typeof setInterval> | undefined;

    const setup = async () => {
      if (isTauri()) {
        try {
          const { listen } = await import('@tauri-apps/api/event');
          unlisten = await listen<{ stage: string; progress: number; message: string }>(
            'init-progress',
            (event) => {
              setProgress(event.payload.progress);
              setStageKey(event.payload.stage);
            }
          );
          return;
        } catch {
          // Fall through to simulated progress
        }
      }

      // Simulated progress for web mode
      let currentStage = 0;
      fallbackInterval = setInterval(() => {
        if (currentStage < LOADING_STAGES.length) {
          const stage = LOADING_STAGES[currentStage];
          setProgress(stage.progress);
          setStageKey(stage.messageKey);
          currentStage++;
        } else {
          clearInterval(fallbackInterval);
        }
      }, SPLASH_ANIMATION_CONFIG.progressDuration);
    };

    setup();

    return () => {
      unlisten?.();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, []);

  // Node positions for the neural network logo SVG
  const nodePositions = useMemo(
    () => [
      { x: 0, y: -14, delay: 0 },
      { x: 12, y: -7, delay: 0.15 },
      { x: 12, y: 7, delay: 0.3 },
      { x: 0, y: 14, delay: 0.45 },
      { x: -12, y: 7, delay: 0.6 },
      { x: -12, y: -7, delay: 0.75 },
    ],
    []
  );

  const handleExitComplete = useCallback(() => {
    onExitComplete?.();
  }, [onExitComplete]);

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {visible && (
        <motion.div
          key="app-loading-screen"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ backgroundColor: colors.background }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          role="status"
          aria-live="polite"
          aria-label={loadingText}
        >
          {/* Subtle background gradient */}
          <div
            className="absolute inset-0 opacity-60 pointer-events-none"
            style={{
              background: `
                radial-gradient(ellipse 80% 50% at 50% -20%, ${colors.primary}20, transparent),
                radial-gradient(ellipse 60% 40% at 80% 100%, ${colors.secondary}15, transparent)
              `,
            }}
          />

          <motion.div
            className="relative flex flex-col items-center gap-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            {/* Animated Logo */}
            <div className="relative" style={{ width: 120, height: 120 }}>
              {/* Outer rotating gradient ring */}
              {!prefersReducedMotion ? (
                <>
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(from 0deg, transparent 0%, ${colors.primary}40 25%, transparent 50%, ${colors.secondary}40 75%, transparent 100%)`,
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  />
                  <motion.div
                    className="absolute inset-3 rounded-full"
                    style={{
                      background: `conic-gradient(from 180deg, transparent 0%, ${colors.secondary}30 25%, transparent 50%, ${colors.primary}30 75%, transparent 100%)`,
                    }}
                    animate={{ rotate: -360 }}
                    transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                  />
                  <motion.div
                    className="absolute inset-4 rounded-full border"
                    style={{ borderColor: `${colors.primary}30` }}
                    animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </>
              ) : (
                <>
                  <div
                    className="absolute inset-0 rounded-full opacity-30"
                    style={{
                      background: `conic-gradient(from 0deg, transparent 0%, ${colors.primary}40 25%, transparent 50%, ${colors.secondary}40 75%, transparent 100%)`,
                    }}
                  />
                  <div
                    className="absolute inset-4 rounded-full border opacity-40"
                    style={{ borderColor: `${colors.primary}30` }}
                  />
                </>
              )}

              {/* Center container with glass effect */}
              <motion.div
                className="absolute inset-6 rounded-2xl flex items-center justify-center overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.secondary}15 100%)`,
                  backdropFilter: 'blur(12px)',
                  boxShadow: `0 0 40px ${colors.primary}50, inset 0 0 20px ${colors.primary}10`,
                }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              >
                {/* Neural network SVG */}
                <svg width={48} height={48} viewBox="-24 -24 48 48" className="relative z-10">
                  {/* Connection lines from center to nodes */}
                  {nodePositions.map((node, i) => (
                    <line
                      key={`line-${i}`}
                      x1="0"
                      y1="0"
                      x2={node.x}
                      y2={node.y}
                      stroke={colors.primary}
                      strokeWidth="1.5"
                      strokeOpacity="0.4"
                    />
                  ))}

                  {/* Inter-node connections */}
                  {nodePositions.map((node, i) => {
                    const nextNode = nodePositions[(i + 1) % nodePositions.length];
                    return (
                      <line
                        key={`interline-${i}`}
                        x1={node.x}
                        y1={node.y}
                        x2={nextNode.x}
                        y2={nextNode.y}
                        stroke={colors.secondary}
                        strokeWidth="1"
                        strokeOpacity="0.25"
                      />
                    );
                  })}

                  {/* Central hub */}
                  {!prefersReducedMotion ? (
                    <motion.circle
                      cx="0"
                      cy="0"
                      r="5"
                      fill={colors.primary}
                      animate={{ scale: [1, 1.15, 1], opacity: [1, 0.8, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  ) : (
                    <circle cx="0" cy="0" r="5" fill={colors.primary} />
                  )}

                  {/* Outer nodes */}
                  {nodePositions.map((node, i) => (
                    <circle
                      key={`node-${i}`}
                      cx={node.x}
                      cy={node.y}
                      r="2.5"
                      fill={i % 2 === 0 ? colors.primary : colors.secondary}
                      opacity="0.8"
                    />
                  ))}
                </svg>
              </motion.div>

              {/* Ambient glow */}
              {!prefersReducedMotion && (
                <motion.div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    background: `radial-gradient(circle, ${colors.primary}20 0%, transparent 70%)`,
                  }}
                  animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
            </div>

            {/* Brand name and progress */}
            <motion.div
              className="flex flex-col items-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <h1
                className="text-2xl font-semibold tracking-tight"
                style={{
                  color: colors.foreground,
                  textShadow: !prefersReducedMotion
                    ? `0 0 20px ${colors.primary}40`
                    : 'none',
                }}
              >
                {t('appName')}
              </h1>

              {/* Progress bar */}
              <div className="w-48 flex flex-col items-center gap-2">
                <div
                  className="relative w-full h-1 rounded-full overflow-hidden"
                  style={{ backgroundColor: `${colors.foreground}15` }}
                >
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
                      boxShadow: `0 0 12px ${colors.primary}60`,
                    }}
                    initial={{ width: '0%' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />

                  {/* Shimmer overlay */}
                  {!prefersReducedMotion && (
                    <motion.div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${colors.foreground}40, transparent)`,
                        width: '30%',
                      }}
                      animate={{ x: ['-100%', '400%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                </div>

                {/* Progress text */}
                <div className="flex items-center justify-between w-full">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={stageKey}
                      className="text-xs font-medium"
                      style={{ color: `${colors.foreground}80` }}
                      initial={prefersReducedMotion ? undefined : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                      aria-live="polite"
                    >
                      {loadingText}
                    </motion.span>
                  </AnimatePresence>
                  <span
                    className="text-xs font-mono font-bold"
                    style={{ color: colors.primary }}
                  >
                    {progress}%
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AppLoadingScreen;
