'use client';

/**
 * A2UI Loading Component
 * Displays loading states with various styles
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import type { A2UIComponentProps, A2UIBaseComponent } from '@/types/artifact/a2ui';

export interface A2UILoadingComponent extends A2UIBaseComponent {
  component: 'Loading';
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'pulse';
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export function A2UILoading({ component }: A2UIComponentProps<A2UILoadingComponent>) {
  const size = component.size || 'md';
  const variant = component.variant || 'spinner';

  const renderLoader = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  'rounded-full bg-primary',
                  size === 'sm' && 'h-1.5 w-1.5',
                  size === 'md' && 'h-2 w-2',
                  size === 'lg' && 'h-3 w-3'
                )}
                style={{
                  animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        );

      case 'pulse':
        return (
          <div
            className={cn(
              'rounded-full bg-primary/30',
              size === 'sm' && 'h-8 w-8',
              size === 'md' && 'h-12 w-12',
              size === 'lg' && 'h-16 w-16'
            )}
            style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
          />
        );

      case 'spinner':
      default:
        return <Loader2 className={cn(sizeClasses[size], 'animate-spin text-primary')} />;
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2',
        component.className
      )}
      style={component.style as React.CSSProperties}
      role="status"
      aria-label={component.text || 'Loading'}
    >
      {renderLoader()}
      {component.text && (
        <span className={cn('text-muted-foreground', textSizeClasses[size])}>
          {component.text}
        </span>
      )}
    </div>
  );
}
