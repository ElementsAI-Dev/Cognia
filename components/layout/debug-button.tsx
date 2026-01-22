'use client';

/**
 * Debug Button - provides quick access to debugging tools in development mode
 *
 * Features:
 * - Opens CrabNebula DevTools (Tauri debug)
 * - Opens browser console
 * - Shows current app state
 * - Performance monitoring
 */

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Bug,
  Terminal,
  Activity,
  RotateCcw,
  Cpu,
  HardDrive,
  Zap,
  Network,
  Eye,
  Layers,
} from 'lucide-react';
import { isTauri } from '@/lib/native/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface PerformanceInfo {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  timing?: {
    loadTime: number;
    domContentLoaded: number;
  };
}

export function DebugButton() {
  const t = useTranslations('debug');
  const [isTauriEnv, setIsTauriEnv] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);
  const [perfInfo, setPerfInfo] = useState<PerformanceInfo>({});
  const [showPerfOverlay, setShowPerfOverlay] = useState(false);

  useEffect(() => {
    // Check if running in Tauri and development mode
    setIsTauriEnv(isTauri());
    setIsDevMode(process.env.NODE_ENV === 'development');

    // Get performance info
    if (typeof window !== 'undefined') {
      const updatePerfInfo = () => {
        const info: PerformanceInfo = {};

        // Memory info (Chrome only)
        if ('memory' in performance) {
          const mem = (performance as unknown as { memory: PerformanceInfo['memory'] }).memory;
          if (mem) {
            info.memory = {
              usedJSHeapSize: mem.usedJSHeapSize,
              totalJSHeapSize: mem.totalJSHeapSize,
              jsHeapSizeLimit: mem.jsHeapSizeLimit,
            };
          }
        }

        // Timing info
        const timing = performance.timing;
        if (timing && timing.loadEventEnd > 0) {
          info.timing = {
            loadTime: timing.loadEventEnd - timing.navigationStart,
            domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
          };
        }

        setPerfInfo(info);
      };

      updatePerfInfo();
      const interval = setInterval(updatePerfInfo, 2000);
      return () => clearInterval(interval);
    }
  }, []);

  const openDevTools = useCallback(async () => {
    if (isTauriEnv) {
      try {
        // CrabNebula DevTools is automatically initialized in debug builds
        // This just logs to console since DevTools opens via the plugin
        console.log('[Debug] DevTools should be available - check for CrabNebula DevTools window');

        // Log current window info
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const currentWindow = getCurrentWindow();
        const label = currentWindow.label;
        console.log('[Debug] Current window:', label);
      } catch (e) {
        console.error('[Debug] Failed to access DevTools:', e);
      }
    }
  }, [isTauriEnv]);

  const openBrowserConsole = useCallback(() => {
    console.log('='.repeat(50));
    console.log('%c🔧 Cognia Debug Console', 'font-size: 16px; font-weight: bold; color: #3b82f6;');
    console.log('='.repeat(50));
    console.log('Tauri Environment:', isTauriEnv);
    console.log('Development Mode:', isDevMode);
    console.log('Performance:', perfInfo);
    console.log('Window:', {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    });
    console.log('Navigator:', {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      onLine: navigator.onLine,
    });
    console.log('='.repeat(50));

    // Show hint
    alert('Debug info logged to browser console. Press F12 to open DevTools.');
  }, [isTauriEnv, isDevMode, perfInfo]);

  const clearStorageAndReload = useCallback(() => {
    if (confirm('This will clear all local storage and reload the app. Continue?')) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  }, []);

  const forceGC = useCallback(() => {
    if ('gc' in window) {
      (window as unknown as { gc: () => void }).gc();
      console.log('[Debug] Garbage collection triggered');
    } else {
      console.log('[Debug] GC not available. Run Chrome with --js-flags="--expose-gc" to enable.');
    }
  }, []);

  const logStoreState = useCallback(async () => {
    console.log('='.repeat(50));
    console.log('%c📦 Store State Dump', 'font-size: 14px; font-weight: bold; color: #10b981;');
    console.log('='.repeat(50));

    try {
      // Dynamically import stores to log their state
      const stores = await Promise.all([
        import('@/stores').then((m) => ({
          name: 'Settings',
          state: m.useSettingsStore.getState(),
        })),
        import('@/stores').then((m) => ({ name: 'Session', state: m.useSessionStore.getState() })),
        import('@/stores/chat').then((m) => ({
          name: 'ChatWidget',
          state: m.useChatWidgetStore.getState(),
        })),
        import('@/stores/context').then((m) => ({
          name: 'Selection',
          state: m.useSelectionStore.getState(),
        })),
      ]);

      stores.forEach(({ name, state }) => {
        console.group(`📦 ${name} Store`);
        console.log(state);
        console.groupEnd();
      });
    } catch (e) {
      console.error('[Debug] Failed to load stores:', e);
    }

    console.log('='.repeat(50));
  }, []);

  const togglePerfOverlay = useCallback(() => {
    setShowPerfOverlay((prev) => !prev);
  }, []);

  const inspectChatWidget = useCallback(async () => {
    if (!isTauriEnv) {
      console.log('[Debug] Chat Widget inspection only available in Tauri');
      return;
    }

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const status = await invoke('chat_widget_get_status');
      console.log('[Debug] Chat Widget Status:', status);
    } catch (e) {
      console.error('[Debug] Failed to get chat widget status:', e);
    }
  }, [isTauriEnv]);

  const inspectSelectionToolbar = useCallback(async () => {
    if (!isTauriEnv) {
      console.log('[Debug] Selection Toolbar inspection only available in Tauri');
      return;
    }

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const status = await invoke('selection_get_status');
      console.log('[Debug] Selection Toolbar Status:', status);
    } catch (e) {
      console.error('[Debug] Failed to get selection toolbar status:', e);
    }
  }, [isTauriEnv]);

  const testChatWidget = useCallback(async () => {
    if (!isTauriEnv) {
      console.log('[Debug] Chat Widget test only available in Tauri');
      window.open('/chat-widget', '_blank', 'width=420,height=600');
      return;
    }

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('chat_widget_show');
      console.log('[Debug] Chat Widget shown');
    } catch (e) {
      console.error('[Debug] Failed to show chat widget:', e);
    }
  }, [isTauriEnv]);

  const testSelectionToolbar = useCallback(async () => {
    if (!isTauriEnv) {
      console.log('[Debug] Selection Toolbar test only available in Tauri');
      window.open('/selection-toolbar', '_blank', 'width=300,height=60');
      return;
    }

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('selection_trigger');
      console.log('[Debug] Selection Toolbar triggered');
    } catch (e) {
      console.error('[Debug] Failed to trigger selection toolbar:', e);
    }
  }, [isTauriEnv]);

  // Only show in development mode
  if (!isDevMode) {
    return null;
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-amber-500/20 text-amber-500"
                type="button"
              >
                <Bug className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {t('tools')} (DEV)
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="flex items-center gap-2 text-xs text-amber-500">
            <Bug className="h-3.5 w-3.5" />
            {t('tools')}
            <Badge variant="outline" className="ml-auto text-[10px] h-4 px-1">
              DEV
            </Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* DevTools */}
          <DropdownMenuItem onClick={openDevTools} disabled={!isTauriEnv}>
            <Terminal className="mr-2 h-4 w-4" />
            {t('openDevTools')}
            {!isTauriEnv && (
              <span className="ml-auto text-[10px] text-muted-foreground">{t('tauriOnly')}</span>
            )}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={openBrowserConsole}>
            <Activity className="mr-2 h-4 w-4" />
            {t('logInfo')}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={logStoreState}>
            <Layers className="mr-2 h-4 w-4" />
            {t('dumpStore')}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {t('testing')}
          </DropdownMenuLabel>

          <DropdownMenuItem onClick={testChatWidget}>
            <Eye className="mr-2 h-4 w-4" />
            {t('testChat')}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={testSelectionToolbar}>
            <Eye className="mr-2 h-4 w-4" />
            {t('testSelection')}
          </DropdownMenuItem>

          {isTauriEnv && (
            <>
              <DropdownMenuItem onClick={inspectChatWidget}>
                <Bug className="mr-2 h-4 w-4" />
                {t('inspectChat')}
              </DropdownMenuItem>

              <DropdownMenuItem onClick={inspectSelectionToolbar}>
                <Bug className="mr-2 h-4 w-4" />
                {t('inspectSelection')}
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {t('performance')}
          </DropdownMenuLabel>

          <DropdownMenuItem onClick={togglePerfOverlay}>
            <Cpu className="mr-2 h-4 w-4" />
            {showPerfOverlay ? t('hidePerf') : t('showPerf')}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={forceGC}>
            <Zap className="mr-2 h-4 w-4" />
            {t('forceGC')}
          </DropdownMenuItem>

          {perfInfo.memory && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <HardDrive className="mr-2 h-4 w-4" />
                {t('memory')}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-48">
                <div className="px-2 py-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('heapUsed')}:</span>
                    <span>{formatBytes(perfInfo.memory.usedJSHeapSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('heapTotal')}:</span>
                    <span>{formatBytes(perfInfo.memory.totalJSHeapSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('heapLimit')}:</span>
                    <span>{formatBytes(perfInfo.memory.jsHeapSizeLimit)}</span>
                  </div>
                </div>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {t('actions')}
          </DropdownMenuLabel>

          <DropdownMenuItem onClick={clearStorageAndReload} className="text-destructive">
            <RotateCcw className="mr-2 h-4 w-4" />
            {t('clearStorage')}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <Network className="h-3 w-3" />
              {isTauriEnv ? t('tauriDesktop') : t('browser')} |{' '}
              {isDevMode ? t('development') : t('production')}
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Performance Overlay */}
      {showPerfOverlay && (
        <div className="fixed bottom-4 right-4 z-[9999] bg-black/90 text-white text-xs font-mono p-3 rounded-lg shadow-xl border border-white/10">
          <div className="flex items-center gap-2 mb-2 text-amber-400">
            <Cpu className="h-3 w-3" />
            {t('performance')}
            <button onClick={() => setShowPerfOverlay(false)} className="ml-auto hover:text-white">
              ×
            </button>
          </div>
          {perfInfo.memory && (
            <div className="space-y-1">
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">{t('heapUsed')}:</span>
                <span>{formatBytes(perfInfo.memory.usedJSHeapSize)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">{t('heapTotal')}:</span>
                <span>{formatBytes(perfInfo.memory.totalJSHeapSize)}</span>
              </div>
              <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-amber-500"
                  style={{
                    width: `${(perfInfo.memory.usedJSHeapSize / perfInfo.memory.jsHeapSizeLimit) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
          {perfInfo.timing && (
            <div className="mt-2 pt-2 border-t border-white/10">
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">{t('loadTime')}:</span>
                <span>{perfInfo.timing.loadTime}ms</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">{t('domReady')}:</span>
                <span>{perfInfo.timing.domContentLoaded}ms</span>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
