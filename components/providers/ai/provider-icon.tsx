'use client';

/**
 * ProviderIcon Component
 * Renders provider icons from SVG files or falls back to emoji/initial avatar.
 * Supports direct icon path, providerId-based auto-resolution, and avatar variant.
 */

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  getProviderIconPath,
  getProviderBrandColor,
  getProviderInitial,
  getProviderDisplayName,
} from '@/lib/ai/icons';

export interface ProviderIconProps {
  /** Direct icon path or emoji string */
  icon?: string;
  /** Provider ID — auto-resolves icon path, color, and alt text */
  providerId?: string;
  className?: string;
  size?: number;
  alt?: string;
  /** Display variant: 'icon' (default), 'avatar' (with brand-color bg) */
  variant?: 'icon' | 'avatar';
}

// Fallback icon component - defined outside to avoid recreation on each render
function FallbackIcon({ className, size }: { className?: string; size: number }) {
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

// Initial-letter avatar fallback for when icon loading fails
function InitialAvatar({
  initial,
  brandColor,
  size,
  className,
}: {
  initial: string;
  brandColor: string;
  size: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full text-white font-semibold select-none',
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.45,
        backgroundColor: brandColor,
      }}
    >
      {initial}
    </div>
  );
}

export function ProviderIcon({
  icon,
  providerId,
  className,
  size = 20,
  alt,
  variant = 'icon',
}: ProviderIconProps) {
  const [hasError, setHasError] = useState(false);

  // Resolve icon path from providerId if not directly provided
  const resolvedIcon = useMemo(() => {
    if (icon) return icon;
    if (providerId) return getProviderIconPath(providerId);
    return undefined;
  }, [icon, providerId]);

  // Resolve alt text
  const resolvedAlt = useMemo(() => {
    if (alt) return alt;
    if (providerId) return `${getProviderDisplayName(providerId)} icon`;
    return 'Provider icon';
  }, [alt, providerId]);

  // Avatar variant: wrap icon in a colored background circle
  if (variant === 'avatar' && providerId) {
    const brandColor = getProviderBrandColor(providerId);
    const iconSize = Math.round(size * 0.6);

    if (resolvedIcon && resolvedIcon.startsWith('/') && !hasError) {
      return (
        <div
          className={cn(
            'inline-flex items-center justify-center rounded-full',
            className
          )}
          style={{
            width: size,
            height: size,
            backgroundColor: `${brandColor}15`,
          }}
        >
          <Image
            src={resolvedIcon}
            alt={resolvedAlt}
            width={iconSize}
            height={iconSize}
            className="inline-flex"
            unoptimized
            onError={() => setHasError(true)}
          />
        </div>
      );
    }

    // Avatar fallback with initial letter
    return (
      <InitialAvatar
        initial={getProviderInitial(providerId)}
        brandColor={brandColor}
        size={size}
        className={className}
      />
    );
  }

  // If icon is a path to an SVG file, render it as an image with error handling
  if (resolvedIcon && resolvedIcon.startsWith('/') && !hasError) {
    return (
      <Image
        src={resolvedIcon}
        alt={resolvedAlt}
        width={size}
        height={size}
        className={cn('inline-flex', className)}
        unoptimized
        onError={() => setHasError(true)}
      />
    );
  }

  // If icon is a URL (CDN fallback), render as img element
  if (resolvedIcon && (resolvedIcon.startsWith('http://') || resolvedIcon.startsWith('https://')) && !hasError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedIcon}
        alt={resolvedAlt}
        width={size}
        height={size}
        className={cn('inline-flex', className)}
        onError={() => setHasError(true)}
      />
    );
  }

  // If icon is an emoji, render it directly
  if (resolvedIcon && !resolvedIcon.startsWith('/') && !resolvedIcon.startsWith('http')) {
    return <span className={cn('inline-flex', className)} style={{ fontSize: size }}>{resolvedIcon}</span>;
  }

  // If we have a providerId, show initial avatar instead of generic fallback
  if (providerId) {
    return (
      <InitialAvatar
        initial={getProviderInitial(providerId)}
        brandColor={getProviderBrandColor(providerId)}
        size={size}
        className={className}
      />
    );
  }

  // Default fallback icon (including when image fails to load)
  return <FallbackIcon className={className} size={size} />;
}
