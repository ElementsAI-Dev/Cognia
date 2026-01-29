'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { Container, ISourceOptions } from '@tsparticles/engine';
import * as React from 'react';

// Safe theme hook that doesn't throw when used outside provider
function useSafeTheme() {
  const [resolvedTheme, setResolvedTheme] = React.useState<'dark' | 'light'>('dark');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      setResolvedTheme(isDark ? 'dark' : 'light');

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

interface NeuralParticlesProps {
  className?: string;
  /** Override primary color (defaults to theme primary) */
  primaryColor?: string;
  /** Override secondary color (defaults to theme accent) */
  secondaryColor?: string;
  /** Number of particles (will be adjusted based on performance) */
  particleCount?: number;
  /** Enable mouse interaction */
  interactive?: boolean;
  /** Animation speed multiplier */
  speed?: number;
  /** Callback when particles are loaded */
  onLoaded?: (container: Container) => void;
}

// Theme-aware color defaults
const LIGHT_THEME_COLORS = {
  primary: '#3b82f6',    // Blue
  secondary: '#8b5cf6',  // Purple
  accent: '#06b6d4',     // Cyan
};

const DARK_THEME_COLORS = {
  primary: '#60a5fa',    // Lighter blue for dark mode
  secondary: '#a78bfa',  // Lighter purple for dark mode
  accent: '#22d3ee',     // Lighter cyan for dark mode
};

/**
 * Neural Network Particles Background
 * 
 * Creates an animated particle system that resembles a neural network
 * with connected nodes, perfect for AI application loading screens.
 */
export function NeuralParticles({
  className,
  primaryColor,
  secondaryColor,
  particleCount = 80,
  interactive = true,
  speed = 1,
  onLoaded,
}: NeuralParticlesProps) {
  const [init, setInit] = useState(false);
  const { resolvedTheme } = useSafeTheme();

  // Use theme-aware colors with optional overrides
  const themeColors = resolvedTheme === 'dark' ? DARK_THEME_COLORS : LIGHT_THEME_COLORS;
  const effectivePrimaryColor = primaryColor ?? themeColors.primary;
  const effectiveSecondaryColor = secondaryColor ?? themeColors.secondary;
  const effectiveAccentColor = themeColors.accent;

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const particlesLoaded = useCallback(
    async (container?: Container) => {
      if (container && onLoaded) {
        onLoaded(container);
      }
    },
    [onLoaded]
  );

  const options: ISourceOptions = useMemo(
    () => ({
      fullScreen: false,
      fpsLimit: 60,
      particles: {
        number: {
          value: particleCount,
          density: {
            enable: true,
            width: 800,
            height: 800,
          },
        },
        color: {
          value: [effectivePrimaryColor, effectiveSecondaryColor, effectiveAccentColor],
        },
        shape: {
          type: 'circle',
        },
        opacity: {
          value: { min: 0.3, max: 0.8 },
          animation: {
            enable: true,
            speed: 0.5 * speed,
            sync: false,
          },
        },
        size: {
          value: { min: 1, max: 4 },
          animation: {
            enable: true,
            speed: 2 * speed,
            sync: false,
          },
        },
        links: {
          enable: true,
          distance: 120,
          color: effectivePrimaryColor,
          opacity: 0.3,
          width: 1,
          triangles: {
            enable: true,
            opacity: 0.05,
          },
        },
        move: {
          enable: true,
          speed: 1 * speed,
          direction: 'none' as const,
          random: true,
          straight: false,
          outModes: {
            default: 'bounce' as const,
          },
          attract: {
            enable: true,
            rotate: {
              x: 600,
              y: 1200,
            },
          },
        },
        twinkle: {
          particles: {
            enable: true,
            frequency: 0.03,
            opacity: 1,
            color: {
              value: '#ffffff',
            },
          },
        },
      },
      interactivity: {
        detectsOn: 'canvas' as const,
        events: {
          onHover: {
            enable: interactive,
            mode: ['grab', 'connect'],
          },
          onClick: {
            enable: interactive,
            mode: 'push',
          },
          resize: {
            enable: true,
          },
        },
        modes: {
          grab: {
            distance: 150,
            links: {
              opacity: 0.6,
              color: effectivePrimaryColor,
            },
          },
          connect: {
            distance: 100,
            radius: 200,
            links: {
              opacity: 0.3,
            },
          },
          push: {
            quantity: 3,
          },
        },
      },
      detectRetina: true,
      smooth: true,
    }),
    [effectivePrimaryColor, effectiveSecondaryColor, effectiveAccentColor, particleCount, interactive, speed]
  );

  if (!init) {
    return null;
  }

  return (
    <Particles
      id="neural-particles"
      className={className}
      options={options}
      particlesLoaded={particlesLoaded}
    />
  );
}

export default NeuralParticles;
