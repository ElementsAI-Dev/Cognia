import type { FeatureNavigationContext } from '@/types/routing/feature-router';

const FEATURE_NAV_CONTEXT_PREFIX = 'feature-nav-context-';

export type StoredFeatureNavigationContext = FeatureNavigationContext & {
  [key: string]: unknown;
};

export function storeFeatureNavigationContext(
  context: StoredFeatureNavigationContext
): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const contextKey = `${FEATURE_NAV_CONTEXT_PREFIX}${Date.now()}`;
  sessionStorage.setItem(contextKey, JSON.stringify(context));
  return contextKey;
}

export function consumeFeatureNavigationContext(
  contextKey: string | null | undefined
): StoredFeatureNavigationContext | null {
  if (!contextKey || typeof window === 'undefined') {
    return null;
  }

  if (!contextKey.startsWith(FEATURE_NAV_CONTEXT_PREFIX)) {
    return null;
  }

  const raw = sessionStorage.getItem(contextKey);
  if (!raw) {
    return null;
  }

  sessionStorage.removeItem(contextKey);
  try {
    return JSON.parse(raw) as StoredFeatureNavigationContext;
  } catch {
    return null;
  }
}

