'use client';

/**
 * Shared credibility icon and style utilities for source verification badges.
 * Used by both SourcesPart (compact) and SourcesDisplay (detailed).
 */

import {
  ShieldCheck,
  Shield,
  ShieldAlert,
  ShieldQuestion,
} from 'lucide-react';
import type { CredibilityLevel } from '@/types/search';

interface CredibilityConfig {
  icon: React.ReactNode;
  /** Base text color class */
  textClassName: string;
  /** Extended class with background and border (for badge-style display) */
  badgeClassName: string;
}

/**
 * Credibility level → icon + styling configuration.
 *
 * - Use `textClassName` for inline icon coloring (e.g. SourcesPart).
 * - Use `badgeClassName` for badge/card-style display (e.g. SourcesDisplay).
 */
export const credibilityConfig: Record<CredibilityLevel, CredibilityConfig> = {
  high: {
    icon: <ShieldCheck className="h-3 w-3" />,
    textClassName: 'text-green-600',
    badgeClassName: 'text-green-600 bg-green-500/10 border-green-500/20',
  },
  medium: {
    icon: <Shield className="h-3 w-3" />,
    textClassName: 'text-yellow-600',
    badgeClassName: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20',
  },
  low: {
    icon: <ShieldAlert className="h-3 w-3" />,
    textClassName: 'text-red-600',
    badgeClassName: 'text-red-600 bg-red-500/10 border-red-500/20',
  },
  unknown: {
    icon: <ShieldQuestion className="h-3 w-3" />,
    textClassName: 'text-gray-600',
    badgeClassName: 'text-gray-600 bg-gray-500/10 border-gray-500/20',
  },
};
