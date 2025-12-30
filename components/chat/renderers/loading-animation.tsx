'use client';

/**
 * LoadingAnimation - Beautiful, theme-adaptive loading animations for renderers
 * Features:
 * - Multiple animation variants (pulse, dots, wave, spinner, skeleton)
 * - Auto theme adaptation
 * - Customizable colors and sizes
 * - Smooth CSS animations
 */

import { memo } from 'react';
import { cn } from '@/lib/utils';

type LoadingVariant = 'pulse' | 'dots' | 'wave' | 'spinner' | 'bars' | 'ring';
type LoadingSize = 'sm' | 'md' | 'lg';

interface LoadingAnimationProps {
  variant?: LoadingVariant;
  size?: LoadingSize;
  text?: string;
  className?: string;
  showText?: boolean;
}

const sizeConfig: Record<LoadingSize, { container: string; element: string; text: string; gap: string }> = {
  sm: { container: 'p-4', element: 'h-3 w-3', text: 'text-xs', gap: 'gap-1.5' },
  md: { container: 'p-6', element: 'h-4 w-4', text: 'text-sm', gap: 'gap-2' },
  lg: { container: 'p-8', element: 'h-5 w-5', text: 'text-base', gap: 'gap-2.5' },
};

/**
 * Pulse Loading - Elegant pulsing circle with glow effect
 */
const PulseLoader = memo(function PulseLoader({ size }: { size: LoadingSize }) {
  const config = sizeConfig[size];
  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow ring */}
      <div
        className={cn(
          'absolute rounded-full bg-primary/20 animate-ping',
          size === 'sm' && 'h-6 w-6',
          size === 'md' && 'h-8 w-8',
          size === 'lg' && 'h-10 w-10'
        )}
      />
      {/* Middle ring */}
      <div
        className={cn(
          'absolute rounded-full bg-primary/30 animate-pulse',
          size === 'sm' && 'h-5 w-5',
          size === 'md' && 'h-6 w-6',
          size === 'lg' && 'h-8 w-8'
        )}
      />
      {/* Core dot */}
      <div
        className={cn(
          'relative rounded-full bg-primary shadow-lg shadow-primary/50',
          config.element
        )}
      />
    </div>
  );
});

/**
 * Dots Loading - Three bouncing dots
 */
const DotsLoader = memo(function DotsLoader({ size }: { size: LoadingSize }) {
  const dotSize = size === 'sm' ? 'h-2 w-2' : size === 'md' ? 'h-2.5 w-2.5' : 'h-3 w-3';
  
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'rounded-full bg-primary',
            dotSize,
            'animate-bounce'
          )}
          style={{
            animationDelay: `${i * 150}ms`,
            animationDuration: '600ms',
          }}
        />
      ))}
    </div>
  );
});

/**
 * Wave Loading - Animated wave bars
 */
const WaveLoader = memo(function WaveLoader({ size }: { size: LoadingSize }) {
  const barHeight = size === 'sm' ? 'h-4' : size === 'md' ? 'h-5' : 'h-6';
  const barWidth = size === 'sm' ? 'w-1' : size === 'md' ? 'w-1.5' : 'w-2';
  
  return (
    <div className="flex items-center gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={cn(
            'rounded-full bg-gradient-to-t from-primary/60 to-primary',
            barWidth,
            barHeight
          )}
          style={{
            animation: 'wave 1s ease-in-out infinite',
            animationDelay: `${i * 100}ms`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes wave {
          0%, 100% {
            transform: scaleY(0.5);
            opacity: 0.5;
          }
          50% {
            transform: scaleY(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
});

/**
 * Spinner Loading - Modern gradient spinner
 */
const SpinnerLoader = memo(function SpinnerLoader({ size }: { size: LoadingSize }) {
  const spinnerSize = size === 'sm' ? 'h-5 w-5' : size === 'md' ? 'h-6 w-6' : 'h-8 w-8';
  
  return (
    <div className="relative">
      {/* Background ring */}
      <div
        className={cn(
          'rounded-full border-2 border-muted-foreground/20',
          spinnerSize
        )}
      />
      {/* Spinning gradient arc */}
      <div
        className={cn(
          'absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary/50 animate-spin',
          spinnerSize
        )}
        style={{ animationDuration: '800ms' }}
      />
    </div>
  );
});

/**
 * Bars Loading - Animated progress bars
 */
const BarsLoader = memo(function BarsLoader({ size }: { size: LoadingSize }) {
  const barHeight = size === 'sm' ? 'h-1' : size === 'md' ? 'h-1.5' : 'h-2';
  
  return (
    <div className="flex flex-col gap-1.5 w-16">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn('rounded-full bg-muted overflow-hidden', barHeight)}
        >
          <div
            className={cn(
              'h-full bg-gradient-to-r from-primary via-primary/80 to-primary rounded-full',
              barHeight
            )}
            style={{
              animation: 'shimmer 1.5s ease-in-out infinite',
              animationDelay: `${i * 200}ms`,
            }}
          />
        </div>
      ))}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            width: 20%;
            opacity: 0.5;
          }
          50% {
            width: 80%;
            opacity: 1;
          }
          100% {
            width: 20%;
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
});

/**
 * Ring Loading - Elegant rotating ring with gradient
 */
const RingLoader = memo(function RingLoader({ size }: { size: LoadingSize }) {
  const ringSize = size === 'sm' ? 'h-6 w-6' : size === 'md' ? 'h-8 w-8' : 'h-10 w-10';
  
  return (
    <div className="relative">
      {/* Outer decorative ring */}
      <div
        className={cn(
          'absolute inset-0 rounded-full border border-primary/20',
          ringSize
        )}
      />
      {/* Main rotating ring */}
      <svg
        className={cn('animate-spin', ringSize)}
        style={{ animationDuration: '1.2s' }}
        viewBox="0 0 24 24"
      >
        <defs>
          <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" className="[stop-color:hsl(var(--primary))]" stopOpacity="1" />
            <stop offset="50%" className="[stop-color:hsl(var(--primary))]" stopOpacity="0.5" />
            <stop offset="100%" className="[stop-color:hsl(var(--primary))]" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke="url(#ring-gradient)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="50 20"
        />
      </svg>
      {/* Center dot */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
      </div>
    </div>
  );
});

const loaderComponents: Record<LoadingVariant, React.ComponentType<{ size: LoadingSize }>> = {
  pulse: PulseLoader,
  dots: DotsLoader,
  wave: WaveLoader,
  spinner: SpinnerLoader,
  bars: BarsLoader,
  ring: RingLoader,
};

export const LoadingAnimation = memo(function LoadingAnimation({
  variant = 'ring',
  size = 'md',
  text,
  className,
  showText = true,
}: LoadingAnimationProps) {
  const config = sizeConfig[size];
  const LoaderComponent = loaderComponents[variant];

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg',
        'bg-gradient-to-br from-muted/30 via-muted/20 to-muted/30',
        'border border-border/50',
        'backdrop-blur-sm',
        config.container,
        className
      )}
      role="status"
      aria-label={text || 'Loading'}
    >
      <div className={cn('flex items-center', config.gap)}>
        <LoaderComponent size={size} />
        {showText && text && (
          <span className={cn('text-muted-foreground font-medium', config.text)}>
            {text}
          </span>
        )}
      </div>
    </div>
  );
});

/**
 * Skeleton shimmer effect for content placeholders
 */
export const SkeletonShimmer = memo(function SkeletonShimmer({
  className,
  lines = 3,
}: {
  className?: string;
  lines?: number;
}) {
  return (
    <div className={cn('space-y-3 p-4', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded-md bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%] animate-shimmer"
          style={{
            width: i === lines - 1 ? '60%' : '100%',
            animationDelay: `${i * 100}ms`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
});

export default LoadingAnimation;
