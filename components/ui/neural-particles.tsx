'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { Container, ISourceOptions } from '@tsparticles/engine';
import { useSafeTheme } from '@/hooks/ui/use-safe-theme';
import {
  getThemeColors,
  SPLASH_ANIMATION_CONFIG,
} from '@/lib/constants/splash-theme';

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

/**
 * Calculate particle count based on device capability
 */
function calcParticleCount(count: number): number {
  if (typeof navigator === 'undefined') return count;
  const cores = navigator.hardwareConcurrency || 4;
  if (cores <= SPLASH_ANIMATION_CONFIG.performanceThreshold) {
    return Math.min(count, SPLASH_ANIMATION_CONFIG.particleCountLow);
  }
  return Math.min(count, SPLASH_ANIMATION_CONFIG.particleCountHigh);
}

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
  const themeColors = getThemeColors(resolvedTheme);
  const effectivePrimaryColor = primaryColor ?? themeColors.primary;
  const effectiveSecondaryColor = secondaryColor ?? themeColors.secondary;
  const effectiveAccentColor = themeColors.accent;

  // Calculate effective particle count based on device capability
  const effectiveParticleCount = useMemo(
    () => calcParticleCount(particleCount),
    [particleCount]
  );

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
          value: effectiveParticleCount,
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
    [effectivePrimaryColor, effectiveSecondaryColor, effectiveAccentColor, effectiveParticleCount, interactive, speed]
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
