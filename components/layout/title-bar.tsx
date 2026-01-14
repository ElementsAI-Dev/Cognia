'use client';

import { useEffect, useCallback, useState } from 'react';
import Link from 'next/link';
import { 
  Pin, 
  PinOff, 
  Plus, 
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
  ExternalLink,
  Shield,
  Eye,
  EyeOff,
  MonitorSmartphone,
  Square,
  Layers,
  Settings,
  PanelLeft,
  PanelRight,
  PanelTop,
  PanelBottom,
  Grid2X2,
  Scaling,
} from 'lucide-react';
import { DebugButton } from './debug-button';
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
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { useSessionStore, useSettingsStore, useWindowStore } from '@/stores';
import { useWindowControls } from '@/hooks';
import { useRouter } from 'next/navigation';
import { isMainWindow } from '@/lib/native/utils';

export function TitleBar() {
  const router = useRouter();
  const [isMain, setIsMain] = useState<boolean | null>(null);
  
  // Window controls hook
  const {
    isTauri,
    isMaximized,
    isFullscreen,
    isAlwaysOnTop,
    minimize,
    toggleMaximize,
    close,
    toggleFullscreen,
    toggleAlwaysOnTop,
    center,
    setResizable,
    setContentProtected,
    setSkipTaskbar,
    setVisibleOnAllWorkspaces,
    setShadow,
    handleDragMouseDown,
    requestUserAttention,
    autoFitToScreen,
    snapToEdge,
    snapToCorner,
  } = useWindowControls();

  // Check if this is the main window
  useEffect(() => {
    if (!isTauri) return;
    
    let mounted = true;
    isMainWindow().then((result) => {
      if (mounted) setIsMain(result);
    });
    return () => { mounted = false; };
  }, [isTauri]);

  // Window store for additional state
  const {
    contentProtected,
    skipTaskbar,
    shadow,
    visibleOnAllWorkspaces,
    isResizable,
    preferences,
    setContentProtected: setContentProtectedStore,
    setSkipTaskbar: setSkipTaskbarStore,
    setShadow: setShadowStore,
    setVisibleOnAllWorkspaces: setVisibleOnAllWorkspacesStore,
    setIsResizable,
    setEnableDoubleClickMaximize,
    setEnableDragToMove,
  } = useWindowStore();

  // Settings store
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const createSession = useSessionStore((state) => state.createSession);

  // Setup Tauri-specific document classes
  useEffect(() => {
    if (isTauri) {
      document.documentElement.style.setProperty('--titlebar-height', '32px');
      document.documentElement.classList.add('tauri-app');
    }
    return () => {
      document.documentElement.style.removeProperty('--titlebar-height');
      document.documentElement.classList.remove('tauri-app');
    };
  }, [isTauri]);

  // Window property toggle handlers
  const handleToggleContentProtected = useCallback(async () => {
    const newValue = !contentProtected;
    await setContentProtected(newValue);
    setContentProtectedStore(newValue);
  }, [contentProtected, setContentProtected, setContentProtectedStore]);

  const handleToggleSkipTaskbar = useCallback(async () => {
    const newValue = !skipTaskbar;
    await setSkipTaskbar(newValue);
    setSkipTaskbarStore(newValue);
  }, [skipTaskbar, setSkipTaskbar, setSkipTaskbarStore]);

  const handleToggleShadow = useCallback(async () => {
    const newValue = !shadow;
    await setShadow(newValue);
    setShadowStore(newValue);
  }, [shadow, setShadow, setShadowStore]);

  const handleToggleVisibleOnAllWorkspaces = useCallback(async () => {
    const newValue = !visibleOnAllWorkspaces;
    await setVisibleOnAllWorkspaces(newValue);
    setVisibleOnAllWorkspacesStore(newValue);
  }, [visibleOnAllWorkspaces, setVisibleOnAllWorkspaces, setVisibleOnAllWorkspacesStore]);

  const handleToggleResizable = useCallback(async () => {
    const newValue = !isResizable;
    await setResizable(newValue);
    setIsResizable(newValue);
  }, [isResizable, setResizable, setIsResizable]);

  const handleRequestAttention = useCallback(async () => {
    await requestUserAttention('informational');
  }, [requestUserAttention]);

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

  if (!isTauri || isMain === false) {
    return null;
  }

  // Still loading window label check, don't render yet
  if (isMain === null) {
    return null;
  }

  // Determine if we should use manual drag handling
  const shouldUseManualDrag = preferences.enableDragToMove && preferences.enableDoubleClickMaximize;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex h-8 select-none items-center bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40"
      data-tauri-drag-region
      onMouseDown={shouldUseManualDrag ? handleDragMouseDown : undefined}
    >
      {/* App Logo & Title - left side */}
      <div 
        className="flex items-center gap-2 px-3 h-full" 
        data-tauri-drag-region
        onMouseDown={shouldUseManualDrag ? handleDragMouseDown : undefined}
      >
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
              onClick={toggleAlwaysOnTop}
              className={`flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-accent hover:text-accent-foreground ${
                isAlwaysOnTop ? 'text-primary bg-primary/10' : ''
              }`}
              type="button"
              data-no-drag
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
              onClick={toggleFullscreen}
              className={`flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-accent hover:text-accent-foreground ${
                isFullscreen ? 'text-primary bg-primary/10' : ''
              }`}
              type="button"
              data-no-drag
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

        {/* Debug Button (Dev Only) */}
        <DebugButton />

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
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Window Controls
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={center}>
              <Move className="mr-2 h-4 w-4" />
              Center Window
            </DropdownMenuItem>
            <DropdownMenuItem onClick={autoFitToScreen}>
              <Scaling className="mr-2 h-4 w-4" />
              Auto Fit to Screen
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <PanelLeft className="mr-2 h-4 w-4" />
                <span>Snap to Edge</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => snapToEdge('left')}>
                  <PanelLeft className="mr-2 h-4 w-4" />
                  Left Half
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => snapToEdge('right')}>
                  <PanelRight className="mr-2 h-4 w-4" />
                  Right Half
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => snapToEdge('top')}>
                  <PanelTop className="mr-2 h-4 w-4" />
                  Top Half
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => snapToEdge('bottom')}>
                  <PanelBottom className="mr-2 h-4 w-4" />
                  Bottom Half
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Grid2X2 className="mr-2 h-4 w-4" />
                <span>Snap to Corner</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => snapToCorner('topLeft')}>
                  Top Left
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => snapToCorner('topRight')}>
                  Top Right
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => snapToCorner('bottomLeft')}>
                  Bottom Left
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => snapToCorner('bottomRight')}>
                  Bottom Right
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onClick={toggleFullscreen}>
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
            <DropdownMenuItem onClick={toggleAlwaysOnTop}>
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
            <DropdownMenuItem onClick={handleRequestAttention}>
              <MonitorSmartphone className="mr-2 h-4 w-4" />
              Flash Taskbar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Window Properties
            </DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={isResizable}
              onCheckedChange={handleToggleResizable}
            >
              <Maximize2 className="mr-2 h-4 w-4" />
              Resizable
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={shadow}
              onCheckedChange={handleToggleShadow}
            >
              <Square className="mr-2 h-4 w-4" />
              Window Shadow
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={contentProtected}
              onCheckedChange={handleToggleContentProtected}
            >
              <Shield className="mr-2 h-4 w-4" />
              Content Protected
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={skipTaskbar}
              onCheckedChange={handleToggleSkipTaskbar}
            >
              {skipTaskbar ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
              Hide from Taskbar
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibleOnAllWorkspaces}
              onCheckedChange={handleToggleVisibleOnAllWorkspaces}
            >
              <Layers className="mr-2 h-4 w-4" />
              All Workspaces
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Drag Behavior
            </DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={preferences.enableDragToMove}
              onCheckedChange={(checked) => setEnableDragToMove(checked)}
            >
              <Move className="mr-2 h-4 w-4" />
              Drag to Move
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={preferences.enableDoubleClickMaximize}
              onCheckedChange={(checked) => setEnableDoubleClickMaximize(checked)}
            >
              <Maximize2 className="mr-2 h-4 w-4" />
              Double-click Maximize
            </DropdownMenuCheckboxItem>
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
      <div 
        className="flex-1 h-full" 
        data-tauri-drag-region
        onMouseDown={shouldUseManualDrag ? handleDragMouseDown : undefined}
      />

      {/* Status indicator when pinned */}
      {isAlwaysOnTop && (
        <div className="flex items-center gap-1 px-2 mr-1" data-tauri-drag-region>
          <Pin className="h-3 w-3 text-primary" />
          <span className="text-[10px] text-primary font-medium">Pinned</span>
        </div>
      )}

      {/* Window controls */}
      <div className="flex h-full items-center" data-no-drag>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                minimize();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex h-full w-11 items-center justify-center transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label="Minimize"
              type="button"
              data-no-drag
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleMaximize();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex h-full w-11 items-center justify-center transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label={isMaximized ? 'Restore' : 'Maximize'}
              type="button"
              data-no-drag
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                close();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex h-full w-11 items-center justify-center transition-colors hover:bg-destructive hover:text-destructive-foreground"
              aria-label="Close"
              type="button"
              data-no-drag
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
