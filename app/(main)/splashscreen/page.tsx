'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { NeuralParticles } from '@/components/ui/neural-particles';
import { AILogoAnimation } from '@/components/ui/ai-logo-animation';
// Safe theme hook that doesn't throw when used outside provider
function useSafeTheme() {
  const [resolvedTheme, setResolvedTheme] = React.useState<'dark' | 'light'>('dark');

  React.useEffect(() => {
    // Check if we're in a browser and detect theme
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      setResolvedTheme(isDark ? 'dark' : 'light');

      // Listen for theme changes
      const observer = new MutationObserver(() => {
        const isDark = document.documentElement.classList.contains('dark');
        setResolvedTheme(isDark ? 'dark' : 'light');
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      return () => observer.disconnect();
    }
  }, []);

  return { resolvedTheme };
}

import * as React from 'react';

// Theme-aware color defaults
const LIGHT_THEME_COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  accent: '#06b6d4',
  background: '#ffffff',
  foreground: '#09090b',
};

const DARK_THEME_COLORS = {
  primary: '#60a5fa',
  secondary: '#a78bfa',
  accent: '#22d3ee',
  background: '#09090b',
  foreground: '#fafafa',
};

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
  const { resolvedTheme } = useSafeTheme();

  // Theme-aware colors
  const colors = useMemo(
    () => resolvedTheme === 'dark' ? DARK_THEME_COLORS : LIGHT_THEME_COLORS,
    [resolvedTheme]
  );

  // Simulate loading progress with realistic stages
  useEffect(() => {
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
    const interval = setInterval(() => {
      if (currentStage < stages.length) {
        setProgress(stages[currentStage].progress);
        setLoadingText(stages[currentStage].text);
        if (stages[currentStage].progress === 100) {
          setIsReady(true);
        }
        currentStage++;
      } else {
        clearInterval(interval);
      }
    }, 400);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      {/* Neural network particles background */}
      <div className="absolute inset-0">
        <NeuralParticles
          className="w-full h-full"
          primaryColor={colors.primary}
          secondaryColor={colors.secondary}
          particleCount={60}
          interactive={false}
          speed={0.8}
        />
      </div>

      {/* Scan line effect */}
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

        {/* Version info with pulse on ready */}
        <motion.p
          className="text-xs mt-4"
          style={{ color: `${colors.foreground}40` }}
          animate={isReady ? { opacity: [0.25, 0.6, 0.25] } : {}}
          transition={isReady ? { duration: 1.5, repeat: Infinity } : {}}
        >
          Version 0.1.0
        </motion.p>
      </motion.div>

      {/* Corner decorations */}
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
    </div>
  );
}
