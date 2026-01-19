'use client';

/**
 * ProviderIcon Component
 * Renders provider icons from SVG files or falls back to emoji
 */

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ProviderIconProps {
  icon?: string;
  className?: string;
  size?: number;
  alt?: string;
}

export function ProviderIcon({ icon, className, size = 20, alt = 'Provider icon' }: ProviderIconProps) {
  // If icon is a path to an SVG file, render it as an image
  if (icon && icon.startsWith('/')) {
    return (
      <Image
        src={icon}
        alt={alt}
        width={size}
        height={size}
        className={cn('inline-flex', className)}
        unoptimized
      />
    );
  }

  // If icon is an emoji, render it directly
  if (icon && !icon.startsWith('/')) {
    return <span className={cn('inline-flex', className)} style={{ fontSize: size }}>{icon}</span>;
  }

  // Default fallback icon
  return (
    <div 
      className={cn('inline-flex items-center justify-center bg-muted rounded', className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    </div>
  );
}
