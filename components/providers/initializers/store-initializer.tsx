'use client';

/**
 * StoreInitializer - Initializes store subscriptions and side effects
 * 
 * This component sets up necessary store subscriptions that need to run
 * once during app initialization, such as activity logging.
 */

import { useEffect } from 'react';
import { initProjectActivitySubscriber } from '@/stores/project';

/**
 * Initialize all store-related subscriptions
 */
export function StoreInitializer() {
  useEffect(() => {
    // Initialize project activity subscriber to auto-log activities
    const unsubscribe = initProjectActivitySubscriber();

    return () => {
      unsubscribe();
    };
  }, []);

  return null;
}

export default StoreInitializer;
