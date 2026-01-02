'use client';

import { useSyncExternalStore } from 'react';
import { WifiOff, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

function useOnlineStatus() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

interface NetworkStatusIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

export function NetworkStatusIndicator({ className, showLabel = false }: NetworkStatusIndicatorProps) {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1.5 text-sm text-destructive',
        className
      )}
    >
      <WifiOff className="h-4 w-4" />
      {showLabel && <span>Offline</span>}
    </div>
  );
}

interface OfflineBannerProps {
  className?: string;
}

export function OfflineBanner({ className }: OfflineBannerProps) {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      className={cn(
        'flex w-full items-center justify-center gap-2 bg-destructive px-4 py-2 text-sm text-destructive-foreground',
        className
      )}
    >
      <AlertCircle className="h-4 w-4" />
      <span>You are currently offline. Some features may be unavailable.</span>
    </div>
  );
}

export default NetworkStatusIndicator;
