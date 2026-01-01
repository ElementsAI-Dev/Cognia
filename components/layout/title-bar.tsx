'use client';

import { useEffect, useState, useCallback } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import Link from 'next/link';
import { 
  Pin, 
  PinOff, 
  Plus, 
  Settings, 
  Moon, 
  Sun, 
  Monitor,
  Minus,
  Copy,
  X,
  Maximize2,
  Maximize,
  Minimize2,
  MoreVertical,
  RefreshCw,
  Move,
  FolderKanban,
  Wand2,
  ExternalLink
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useSessionStore, useSettingsStore } from '@/stores';
import { useRouter } from 'next/navigation';

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isTauri, setIsTauri] = useState(false);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const router = useRouter();
  
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const createSession = useSessionStore((state) => state.createSession);

  useEffect(() => {
    const checkTauri = async () => {
      if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
        setIsTauri(false);
        return;
      }

      try {
        setIsTauri(true);
        document.documentElement.style.setProperty('--titlebar-height', '32px');
        document.documentElement.classList.add('tauri-app');
        
        const appWindow = getCurrentWindow();
        const maximized = await appWindow.isMaximized();
        setIsMaximized(maximized);

        const unlisten = await appWindow.onResized(() => {
          appWindow.isMaximized().then(setIsMaximized);
        });

        return () => {
          unlisten();
          document.documentElement.style.removeProperty('--titlebar-height');
          document.documentElement.classList.remove('tauri-app');
        };
      } catch {
        setIsTauri(false);
        document.documentElement.style.removeProperty('--titlebar-height');
        document.documentElement.classList.remove('tauri-app');
      }
    };

    checkTauri();
  }, []);

  const handleMinimize = useCallback(async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  }, []);

  const handleMaximize = useCallback(async () => {
    try {
      const appWindow = getCurrentWindow();
      if (isMaximized) {
        await appWindow.unmaximize();
      } else {
        await appWindow.maximize();
      }
    } catch (error) {
      console.error('Failed to toggle maximize:', error);
    }
  }, [isMaximized]);

  const handleClose = useCallback(async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  }, []);

  const handleToggleAlwaysOnTop = useCallback(async () => {
    try {
      const appWindow = getCurrentWindow();
      const newValue = !isAlwaysOnTop;
      await appWindow.setAlwaysOnTop(newValue);
      setIsAlwaysOnTop(newValue);
    } catch (error) {
      console.error('Failed to toggle always on top:', error);
    }
  }, [isAlwaysOnTop]);

  const handleToggleFullscreen = useCallback(async () => {
    try {
      const appWindow = getCurrentWindow();
      const newValue = !isFullscreen;
      await appWindow.setFullscreen(newValue);
      setIsFullscreen(newValue);
    } catch (error) {
      console.error('Failed to toggle fullscreen:', error);
    }
  }, [isFullscreen]);

  const handleCenterWindow = useCallback(async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.center();
    } catch (error) {
      console.error('Failed to center window:', error);
    }
  }, []);

  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  const handleNewChat = useCallback(() => {
    createSession();
  }, [createSession]);

  const cycleTheme = useCallback(() => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  }, [theme, setTheme]);

  const getThemeIcon = useCallback(() => {
    if (theme === 'dark') return <Moon className="h-3.5 w-3.5" />;
    if (theme === 'light') return <Sun className="h-3.5 w-3.5" />;
    return <Monitor className="h-3.5 w-3.5" />;
  }, [theme]);

  const getThemeLabel = useCallback(() => {
    if (theme === 'dark') return 'Dark';
    if (theme === 'light') return 'Light';
    return 'System';
  }, [theme]);

  if (!isTauri) {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex h-8 select-none items-center bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40"
      data-tauri-drag-region
    >
      {/* App Logo & Title - left side */}
      <div className="flex items-center gap-2 px-3 h-full" data-tauri-drag-region>
        <div className="w-4 h-4 rounded bg-primary flex items-center justify-center">
          <span className="text-[10px] font-bold text-primary-foreground">C</span>
        </div>
        <span className="text-xs font-medium text-foreground/80">Cognia</span>
      </div>

      {/* Quick Actions - left area */}
      <div className="flex items-center h-full gap-0.5 pl-1">
        {/* New Chat */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleNewChat}
              className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-accent hover:text-accent-foreground"
              type="button"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            New Chat (Ctrl+N)
          </TooltipContent>
        </Tooltip>

        {/* Always on Top Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleToggleAlwaysOnTop}
              className={`flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-accent hover:text-accent-foreground ${
                isAlwaysOnTop ? 'text-primary bg-primary/10' : ''
              }`}
              type="button"
            >
              {isAlwaysOnTop ? (
                <PinOff className="h-3.5 w-3.5" />
              ) : (
                <Pin className="h-3.5 w-3.5" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {isAlwaysOnTop ? 'Unpin Window' : 'Pin Window on Top'}
          </TooltipContent>
        </Tooltip>

        {/* Fullscreen Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleToggleFullscreen}
              className={`flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-accent hover:text-accent-foreground ${
                isFullscreen ? 'text-primary bg-primary/10' : ''
              }`}
              type="button"
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize className="h-3.5 w-3.5" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {isFullscreen ? 'Exit Fullscreen (F11)' : 'Fullscreen (F11)'}
          </TooltipContent>
        </Tooltip>

        {/* Theme Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={cycleTheme}
              className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-accent hover:text-accent-foreground"
              type="button"
            >
              {getThemeIcon()}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Theme: {getThemeLabel()}
          </TooltipContent>
        </Tooltip>

        {/* Divider */}
        <div className="h-4 w-px bg-border/50 mx-1" />

        {/* Quick Links */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/projects"
              className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <FolderKanban className="h-3.5 w-3.5 text-blue-500" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Projects
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/designer"
              className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Wand2 className="h-3.5 w-3.5 text-purple-500" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Designer
          </TooltipContent>
        </Tooltip>

        {/* More Menu */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-accent hover:text-accent-foreground"
                  type="button"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              More Options
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Window
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={handleCenterWindow}>
              <Move className="mr-2 h-4 w-4" />
              Center Window
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggleFullscreen}>
              {isFullscreen ? (
                <>
                  <Minimize2 className="mr-2 h-4 w-4" />
                  Exit Fullscreen
                </>
              ) : (
                <>
                  <Maximize className="mr-2 h-4 w-4" />
                  Enter Fullscreen
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggleAlwaysOnTop}>
              {isAlwaysOnTop ? (
                <>
                  <PinOff className="mr-2 h-4 w-4" />
                  Unpin from Top
                </>
              ) : (
                <>
                  <Pin className="mr-2 h-4 w-4" />
                  Pin on Top
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Theme
            </DropdownMenuLabel>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                {getThemeIcon()}
                <span className="ml-2">Theme: {getThemeLabel()}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => setTheme('light')}>
                  <Sun className="mr-2 h-4 w-4" />
                  Light
                  {theme === 'light' && <span className="ml-auto text-primary">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                  {theme === 'dark' && <span className="ml-auto text-primary">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')}>
                  <Monitor className="mr-2 h-4 w-4" />
                  System
                  {theme === 'system' && <span className="ml-auto text-primary">✓</span>}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Navigation
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/projects')}>
              <FolderKanban className="mr-2 h-4 w-4" />
              Projects
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/designer')}>
              <Wand2 className="mr-2 h-4 w-4" />
              Designer
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleReload}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload App
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a
                href="https://github.com/ElementsAI-Dev/Cognia"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                GitHub
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Drag region - takes all available space */}
      <div className="flex-1 h-full" data-tauri-drag-region />

      {/* Status indicator when pinned */}
      {isAlwaysOnTop && (
        <div className="flex items-center gap-1 px-2 mr-1" data-tauri-drag-region>
          <Pin className="h-3 w-3 text-primary" />
          <span className="text-[10px] text-primary font-medium">Pinned</span>
        </div>
      )}

      {/* Window controls */}
      <div className="flex h-full items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleMinimize}
              className="flex h-full w-11 items-center justify-center transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label="Minimize"
              type="button"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Minimize
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleMaximize}
              className="flex h-full w-11 items-center justify-center transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label={isMaximized ? 'Restore' : 'Maximize'}
              type="button"
            >
              {isMaximized ? (
                <Copy className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {isMaximized ? 'Restore' : 'Maximize'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleClose}
              className="flex h-full w-11 items-center justify-center transition-colors hover:bg-destructive hover:text-destructive-foreground"
              aria-label="Close"
              type="button"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Close
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
