'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { AlertCircle, SkipForward } from 'lucide-react';
import { NeuralParticles } from '@/components/ui/neural-particles';
import { AILogoAnimation } from '@/components/ui/ai-logo-animation';
import { useSafeTheme } from '@/hooks/ui/use-safe-theme';
import {
  getThemeColors,
  SPLASH_ANIMATION_CONFIG,
} from '@/lib/constants/splash-theme';
import { isTauri } from '@/lib/utils';

/** Progress event payload from Tauri backend */
interface InitProgress {
  stage: string;
  progress: number;
  message: string;
}

/**
 * Splash Screen Page
 *
 * Modern AI-themed loading screen with:
 * - Neural network particle background
 * - Animated AI logo with pulsing nodes
 * - Smooth progress animations
 * - Glassmorphism effects
 */

export default function SplashScreenPage() {
  const t = useTranslations('splashscreen');
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canSkip, setCanSkip] = useState(false);
  const { resolvedTheme } = useSafeTheme();
  const prefersReducedMotion = useReducedMotion();

  // Theme-aware colors
  const colors = useMemo(() => getThemeColors(resolvedTheme), [resolvedTheme]);

  // Handle skip action
  const handleSkip = useCallback(async () => {
    if (!isTauri()) return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('close_splashscreen');
    } catch (err) {
      console.error('Failed to skip splash:', err);
    }
  }, []);

  // Listen for real progress events from Tauri backend
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let fallbackInterval: ReturnType<typeof setInterval> | undefined;

    const setupListener = async () => {
      if (isTauri()) {
        try {
          const { listen } = await import('@tauri-apps/api/event');
          unlisten = await listen<InitProgress>('init-progress', (event) => {
            const { progress: p, message } = event.payload;
            setProgress(p);
            setLoadingText(message);
            if (p === 100) {
              setIsReady(true);
            }
          });

          // Also listen for errors
          const unlistenError = await listen<string>('init-error', (event) => {
            setError(event.payload);
          });

          return () => {
            unlisten?.();
            unlistenError();
          };
        } catch (err) {
          console.error('Failed to setup Tauri listener:', err);
        }
      }

      // Fallback: simulate progress in web mode
      const stages = [
        { progress: 0, text: t('initializing') },
        { progress: 15, text: t('loadingCore') },
        { progress: 35, text: t('initializingProviders') },
        { progress: 55, text: t('loadingThemes') },
        { progress: 75, text: t('preparingWorkspace') },
        { progress: 90, text: t('almostReady') },
        { progress: 100, text: t('ready') },
      ];

      setLoadingText(stages[0].text);
      let currentStage = 0;

      fallbackInterval = setInterval(() => {
        if (currentStage < stages.length) {
          setProgress(stages[currentStage].progress);
          setLoadingText(stages[currentStage].text);
          if (stages[currentStage].progress === 100) {
            setIsReady(true);
          }
          currentStage++;
        } else {
          clearInterval(fallbackInterval);
        }
      }, 400);
    };

    setupListener();

    return () => {
      unlisten?.();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enable skip button after delay and minimum progress
  useEffect(() => {
    const timer = setTimeout(() => {
      if (progress >= SPLASH_ANIMATION_CONFIG.skipMinProgress) {
        setCanSkip(true);
      }
    }, SPLASH_ANIMATION_CONFIG.skipButtonDelay);

    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <div 
      className="relative flex h-screen w-screen items-center justify-center overflow-hidden"
      style={{ backgroundColor: colors.background }}
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 50% -20%, ${colors.primary}20, transparent),
              radial-gradient(ellipse 60% 40% at 80% 100%, ${colors.secondary}15, transparent),
              radial-gradient(ellipse 40% 30% at 10% 80%, ${colors.accent}10, transparent)
            `,
          }}
          animate={{
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Neural network particles background - disabled for reduced motion */}
      {!prefersReducedMotion && (
        <div className="absolute inset-0">
          <NeuralParticles
            className="w-full h-full"
            primaryColor={colors.primary}
            secondaryColor={colors.secondary}
            particleCount={50}
            interactive={false}
            speed={0.8}
          />
        </div>
      )}

      {/* Scan line effect - disabled for reduced motion */}
      {!prefersReducedMotion && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(transparent 50%, rgba(59, 130, 246, 0.03) 50%)',
            backgroundSize: '100% 4px',
          }}
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Main content */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        {/* AI Logo Animation */}
        <AILogoAnimation
          primaryColor={colors.primary}
          secondaryColor={colors.secondary}
          size={140}
          isAnimating={!isReady}
        />

        {/* Brand name with glow */}
        <motion.div
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <motion.h1
            className="text-4xl font-bold tracking-tight"
            style={{
              color: colors.foreground,
              textShadow: `0 0 30px ${colors.primary}60, 0 0 60px ${colors.primary}30`,
            }}
          >
            {t('appName')}
          </motion.h1>

          <motion.p
            className="text-sm font-medium"
            style={{ color: `${colors.foreground}80` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {t('appDescription')}
          </motion.p>
        </motion.div>

        {/* Progress section */}
        <motion.div
          className="w-64 flex flex-col items-center gap-3 mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {/* Circular progress indicator */}
          <div className="relative w-full">
            {/* Progress bar background */}
            <div
              className="relative w-full h-1 rounded-full overflow-hidden"
              style={{ backgroundColor: `${colors.foreground}15` }}
            >
              {/* Progress bar fill with gradient */}
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary}, ${colors.accent})`,
                  boxShadow: `0 0 20px ${colors.primary}60`,
                }}
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />

              {/* Shimmer overlay */}
              <motion.div
                className="absolute inset-0"
                style={{
                  background:
                    `linear-gradient(90deg, transparent, ${colors.foreground}60, transparent)`,
                  width: '30%',
                }}
                animate={{ x: ['-100%', '400%'] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </div>

            {/* Glow effect at progress tip */}
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full"
              style={{
                left: `calc(${progress}% - 8px)`,
                background: `radial-gradient(circle, ${colors.primary}, transparent)`,
                filter: 'blur(4px)',
              }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </div>

          {/* Progress text and percentage */}
          <div className="flex items-center justify-between w-full">
            <AnimatePresence mode="wait">
              <motion.span
                key={loadingText}
                className="text-xs font-medium"
                style={{ color: `${colors.foreground}80` }}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
              >
                {loadingText}
              </motion.span>
            </AnimatePresence>

            <motion.span
              className="text-xs font-mono font-bold"
              style={{
                color: colors.primary,
                textShadow: `0 0 10px ${colors.primary}60`,
              }}
            >
              {progress}%
            </motion.span>
          </div>
        </motion.div>

        {/* Error display */}
        {error && (
          <motion.div
            className="flex items-center gap-2 px-4 py-2 rounded-lg"
            style={{
              backgroundColor: `${colors.foreground}10`,
              color: '#ef4444',
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs">{error}</span>
          </motion.div>
        )}

        {/* Version info with pulse on ready */}
        <motion.p
          className="text-xs mt-4"
          style={{ color: `${colors.foreground}40` }}
          animate={isReady && !prefersReducedMotion ? { opacity: [0.25, 0.6, 0.25] } : {}}
          transition={isReady ? { duration: 1.5, repeat: Infinity } : {}}
        >
          Version 0.1.0
        </motion.p>

        {/* Skip button */}
        <AnimatePresence>
          {canSkip && !isReady && !error && (
            <motion.button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{
                backgroundColor: `${colors.foreground}10`,
                color: `${colors.foreground}60`,
              }}
              onClick={handleSkip}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              whileHover={{ backgroundColor: `${colors.foreground}20` }}
            >
              <SkipForward className="w-3 h-3" />
              {t('skipLoading')}
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Corner decorations - simplified for reduced motion */}
      {!prefersReducedMotion ? (
        <>
          <motion.div
            className="absolute top-4 left-4 w-8 h-8"
            style={{
              borderLeft: `2px solid ${colors.primary}40`,
              borderTop: `2px solid ${colors.primary}40`,
            }}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute top-4 right-4 w-8 h-8"
            style={{
              borderRight: `2px solid ${colors.secondary}40`,
              borderTop: `2px solid ${colors.secondary}40`,
            }}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          />
          <motion.div
            className="absolute bottom-4 left-4 w-8 h-8"
            style={{
              borderLeft: `2px solid ${colors.secondary}40`,
              borderBottom: `2px solid ${colors.secondary}40`,
            }}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
          />
          <motion.div
            className="absolute bottom-4 right-4 w-8 h-8"
            style={{
              borderRight: `2px solid ${colors.primary}40`,
              borderBottom: `2px solid ${colors.primary}40`,
            }}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
          />
        </>
      ) : (
        <>
          <div
            className="absolute top-4 left-4 w-8 h-8 opacity-60"
            style={{
              borderLeft: `2px solid ${colors.primary}40`,
              borderTop: `2px solid ${colors.primary}40`,
            }}
          />
          <div
            className="absolute top-4 right-4 w-8 h-8 opacity-60"
            style={{
              borderRight: `2px solid ${colors.secondary}40`,
              borderTop: `2px solid ${colors.secondary}40`,
            }}
          />
          <div
            className="absolute bottom-4 left-4 w-8 h-8 opacity-60"
            style={{
              borderLeft: `2px solid ${colors.secondary}40`,
              borderBottom: `2px solid ${colors.secondary}40`,
            }}
          />
          <div
            className="absolute bottom-4 right-4 w-8 h-8 opacity-60"
            style={{
              borderRight: `2px solid ${colors.primary}40`,
              borderBottom: `2px solid ${colors.primary}40`,
            }}
          />
        </>
      )}
    </div>
  );
}
