'use client';

/**
 * StoreInitializer - Initializes store subscriptions and side effects
 * 
 * This component sets up necessary store subscriptions that need to run
 * once during app initialization, such as activity logging.
 */

import { useEffect } from 'react';
import { initProjectActivitySubscriber, initSessionMessageCountSubscriber } from '@/stores/project';

/**
 * Initialize all store-related subscriptions
 */
export function StoreInitializer() {
  useEffect(() => {
    // Initialize project activity subscriber to auto-log activities
    const unsubscribe = initProjectActivitySubscriber();

    // Initialize session messageCount tracking for projects
    const unsubscribeMessageCount = initSessionMessageCountSubscriber();

    return () => {
      unsubscribe();
      unsubscribeMessageCount?.();
    };
  }, []);

  return null;
}

export default StoreInitializer;
