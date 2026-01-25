'use client';

import { useEffect, useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Pin,
  PinOff,
  Plus,
  Moon,
  Sun,
  Monitor,
  Minus,
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { useSessionStore, useSettingsStore, useWindowStore } from '@/stores';
import { useWindowControls } from '@/hooks';
import { useRouter } from 'next/navigation';
import { isMainWindow } from '@/lib/native/utils';
import { cn } from '@/lib/utils';
import { TRANSPARENCY_CONFIG } from '@/lib/constants/transparency';
import { registerTitleBarItem, useTitleBarRegistry } from './title-bar-registry';

registerTitleBarItem({
  id: 'builtin.settings',
  label: 'Settings',
  labelKey: 'settings',
  defaultArea: 'left',
  render: ({ t }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href="/settings"
          className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Settings className="h-3.5 w-3.5" />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {t ? t('settings') : 'Settings'}
      </TooltipContent>
    </Tooltip>
  ),
});

registerTitleBarItem({
  id: 'builtin.reload',
  label: 'Reload',
  labelKey: 'reload',
  defaultArea: 'left',
  render: ({ t }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => window.location.reload()}
          className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-accent hover:text-accent-foreground"
          type="button"
          data-no-drag
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {t ? t('reload') : 'Reload'}
      </TooltipContent>
    </Tooltip>
  ),
});

export function TitleBar() {
  const t = useTranslations('window');
  const router = useRouter();
  const [isMain, setIsMain] = useState<boolean | null>(null);

  // Window controls hook
  const {
    isTauri,
    platform,
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
    return () => {
      mounted = false;
    };
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
    setTitleBarCustomLayout,
    setTitleBarHeight,
  } = useWindowStore();

  const titleBarRegistryItems = useTitleBarRegistry((state) => state.items);

  // Settings store
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const backgroundSettings = useSettingsStore((state) => state.backgroundSettings);
  const createSession = useSessionStore((state) => state.createSession);

  // Setup Tauri-specific document classes
  useEffect(() => {
    if (!isTauri || !isMain) {
      document.documentElement.style.removeProperty('--titlebar-height');
      document.documentElement.classList.remove('tauri-app');
      return;
    }

    document.documentElement.style.setProperty(
      '--titlebar-height',
      `${preferences.titleBarHeight}px`
    );
    document.documentElement.classList.add('tauri-app');

    return () => {
      document.documentElement.style.removeProperty('--titlebar-height');
      document.documentElement.classList.remove('tauri-app');
    };
  }, [isTauri, isMain, preferences.titleBarHeight]);

  const getRegisteredTitleBarItems = useCallback(() => {
    return Object.values(titleBarRegistryItems).sort((a, b) => a.label.localeCompare(b.label));
  }, [titleBarRegistryItems]);

  const renderCustomItems = useCallback(
    (area: 'left' | 'center' | 'right') => {
      const ids = preferences.titleBarCustomLayout[area];
      return ids
        .map((id) => ({ id, def: titleBarRegistryItems[id] }))
        .filter(
          (e): e is { id: string; def: NonNullable<(typeof titleBarRegistryItems)[string]> } =>
            Boolean(e.def)
        )
        .map(({ id, def }) => (
          <div key={id} className="flex items-center" data-no-drag>
            {def.render({ isTauri, t })}
          </div>
        ));
    },
    [isTauri, preferences.titleBarCustomLayout, titleBarRegistryItems, t]
  );

  const toggleCustomItem = useCallback(
    (area: 'left' | 'center' | 'right', id: string, checked: boolean) => {
      const current = preferences.titleBarCustomLayout[area];
      const next = checked
        ? current.includes(id)
          ? current
          : [...current, id]
        : current.filter((x) => x !== id);

      setTitleBarCustomLayout({
        ...preferences.titleBarCustomLayout,
        [area]: next,
      });
    },
    [preferences.titleBarCustomLayout, setTitleBarCustomLayout]
  );

  const isMacos = platform === 'macos';
  const shouldUseManualDrag = preferences.enableDragToMove && preferences.enableDoubleClickMaximize;

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
    if (theme === 'dark') return t('themeDark');
    if (theme === 'light') return t('themeLight');
    return t('themeSystem');
  }, [theme, t]);

  if (!isTauri || isMain === false) {
    return null;
  }

  // Still loading window label check, don't render yet
  if (isMain === null) {
    return null;
  }

  const minimizeButton = (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            minimize();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className={
            isMacos
              ? 'flex h-3 w-3 items-center justify-center rounded-full bg-yellow-500/90 hover:bg-yellow-500'
              : 'flex h-full w-11 items-center justify-center transition-colors hover:bg-accent hover:text-accent-foreground'
          }
          type="button"
          data-no-drag
          aria-label={t('minimize')}
        >
          {!isMacos && <Minus className="h-4 w-4" />}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {t('minimize')}
      </TooltipContent>
    </Tooltip>
  );

  const maximizeButton = (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isMacos) {
              toggleFullscreen();
            } else {
              toggleMaximize();
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className={
            isMacos
              ? 'flex h-3 w-3 items-center justify-center rounded-full bg-green-500/90 hover:bg-green-500'
              : 'flex h-full w-11 items-center justify-center transition-colors hover:bg-accent hover:text-accent-foreground'
          }
          type="button"
          data-no-drag
          aria-label={
            isMacos
              ? isFullscreen
                ? t('exitFullscreen')
                : t('enterFullscreen')
              : isMaximized
                ? t('restore')
                : t('maximize')
          }
        >
          {!isMacos &&
            (isMaximized ? <Minimize2 className="h-4 w-4" /> : <Square className="h-4 w-4" />)}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {isMacos
          ? isFullscreen
            ? t('exitFullscreen')
            : t('enterFullscreen')
          : isMaximized
            ? t('restore')
            : t('maximize')}
      </TooltipContent>
    </Tooltip>
  );

  const closeButton = (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            close();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className={
            isMacos
              ? 'flex h-3 w-3 items-center justify-center rounded-full bg-red-500/90 hover:bg-red-500'
              : 'flex h-full w-11 items-center justify-center transition-colors hover:bg-red-500/10 hover:text-red-500'
          }
          type="button"
          data-no-drag
          aria-label={t('close')}
        >
          {!isMacos && <X className="h-4 w-4" />}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {t('close')}
      </TooltipContent>
    </Tooltip>
  );

  const windowControlButtons = isMacos ? (
    <>
      {closeButton}
      {minimizeButton}
      {maximizeButton}
    </>
  ) : (
    <>
      {minimizeButton}
      {maximizeButton}
      {closeButton}
    </>
  );

  const isBackgroundActive = backgroundSettings.enabled && backgroundSettings.source !== 'none';

  return (
    <div
      data-titlebar
      className={cn(
        'fixed top-0 left-0 right-0 z-50 flex h-(--titlebar-height) select-none items-center border-b transition-all duration-300',
        isBackgroundActive
          ? TRANSPARENCY_CONFIG.container
          : 'bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-border/40'
      )}
      data-tauri-drag-region
      onMouseDown={shouldUseManualDrag ? handleDragMouseDown : undefined}
    >
      {isMacos && (
        <div className="flex items-center gap-1.5 px-3 h-full" data-no-drag>
          {windowControlButtons}
        </div>
      )}

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
        {renderCustomItems('left')}

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
            {t('newChat')}
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
              {isAlwaysOnTop ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {isAlwaysOnTop ? t('unpin') : t('pin')}
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
            {isFullscreen ? t('exitFullscreen') : t('enterFullscreen')}
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
            {t('theme')}: {getThemeLabel()}
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
            {t('projects')}
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
            {t('designer')}
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
              {t('moreOptions')}
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-56">
            {getRegisteredTitleBarItems().length > 0 && (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {t('toolbar')}
                </DropdownMenuLabel>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <PanelLeft className="mr-2 h-4 w-4" />
                    <span>{t('left')}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {getRegisteredTitleBarItems().map((item) => (
                      <DropdownMenuCheckboxItem
                        key={`titlebar-left-${item.id}`}
                        checked={preferences.titleBarCustomLayout.left.includes(item.id)}
                        onCheckedChange={(checked) => toggleCustomItem('left', item.id, checked)}
                      >
                        {item.labelKey ? t(item.labelKey) : item.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <PanelTop className="mr-2 h-4 w-4" />
                    <span>{t('center')}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {getRegisteredTitleBarItems().map((item) => (
                      <DropdownMenuCheckboxItem
                        key={`titlebar-center-${item.id}`}
                        checked={preferences.titleBarCustomLayout.center.includes(item.id)}
                        onCheckedChange={(checked) => toggleCustomItem('center', item.id, checked)}
                      >
                        {item.labelKey ? t(item.labelKey) : item.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <PanelRight className="mr-2 h-4 w-4" />
                    <span>{t('right')}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {getRegisteredTitleBarItems().map((item) => (
                      <DropdownMenuCheckboxItem
                        key={`titlebar-right-${item.id}`}
                        checked={preferences.titleBarCustomLayout.right.includes(item.id)}
                        onCheckedChange={(checked) => toggleCustomItem('right', item.id, checked)}
                      >
                        {item.labelKey ? t(item.labelKey) : item.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {t('height')}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={String(preferences.titleBarHeight)}
              onValueChange={(value) => setTitleBarHeight(Number(value))}
            >
              <DropdownMenuRadioItem value="28">28px</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="32">32px</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="36">36px</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="40">40px</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {t('controls')}
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={center}>
              <Move className="mr-2 h-4 w-4" />
              {t('centerWindow')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={autoFitToScreen}>
              <Scaling className="mr-2 h-4 w-4" />
              {t('autoFit')}
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <PanelLeft className="mr-2 h-4 w-4" />
                <span>{t('snapToEdge')}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => snapToEdge('left')}>
                  <PanelLeft className="mr-2 h-4 w-4" />
                  {t('snapLeft')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => snapToEdge('right')}>
                  <PanelRight className="mr-2 h-4 w-4" />
                  {t('snapRight')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => snapToEdge('top')}>
                  <PanelTop className="mr-2 h-4 w-4" />
                  {t('snapTop')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => snapToEdge('bottom')}>
                  <PanelBottom className="mr-2 h-4 w-4" />
                  {t('snapBottom')}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Grid2X2 className="mr-2 h-4 w-4" />
                <span>{t('snapToCorner')}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => snapToCorner('topLeft')}>
                  {t('snapTopLeft')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => snapToCorner('topRight')}>
                  {t('snapTopRight')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => snapToCorner('bottomLeft')}>
                  {t('snapBottomLeft')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => snapToCorner('bottomRight')}>
                  {t('snapBottomRight')}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onClick={toggleFullscreen}>
              {isFullscreen ? (
                <>
                  <Minimize2 className="mr-2 h-4 w-4" />
                  {t('exitFullscreen')}
                </>
              ) : (
                <>
                  <Maximize className="mr-2 h-4 w-4" />
                  {t('enterFullscreen')}
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleAlwaysOnTop}>
              {isAlwaysOnTop ? (
                <>
                  <PinOff className="mr-2 h-4 w-4" />
                  {t('unpin')}
                </>
              ) : (
                <>
                  <Pin className="mr-2 h-4 w-4" />
                  {t('pin')}
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleRequestAttention}>
              <MonitorSmartphone className="mr-2 h-4 w-4" />
              {t('flashTaskbar')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {t('properties')}
            </DropdownMenuLabel>
            <DropdownMenuCheckboxItem checked={isResizable} onCheckedChange={handleToggleResizable}>
              <Maximize2 className="mr-2 h-4 w-4" />
              {t('resizable')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={shadow} onCheckedChange={handleToggleShadow}>
              <Square className="mr-2 h-4 w-4" />
              {t('shadow')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={contentProtected}
              onCheckedChange={handleToggleContentProtected}
            >
              <Shield className="mr-2 h-4 w-4" />
              {t('contentProtected')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={skipTaskbar}
              onCheckedChange={handleToggleSkipTaskbar}
            >
              {skipTaskbar ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
              {t('hideFromTaskbar')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibleOnAllWorkspaces}
              onCheckedChange={handleToggleVisibleOnAllWorkspaces}
            >
              <Layers className="mr-2 h-4 w-4" />
              {t('allWorkspaces')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {t('dragBehavior')}
            </DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={preferences.enableDragToMove}
              onCheckedChange={(checked) => setEnableDragToMove(checked)}
            >
              <Move className="mr-2 h-4 w-4" />
              {t('dragToMove')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={preferences.enableDoubleClickMaximize}
              onCheckedChange={(checked) => setEnableDoubleClickMaximize(checked)}
            >
              <Maximize2 className="mr-2 h-4 w-4" />
              {t('doubleClickMaximize')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {t('theme')}
            </DropdownMenuLabel>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                {getThemeIcon()}
                <span className="ml-2">
                  {t('theme')}: {getThemeLabel()}
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => setTheme('light')}>
                  <Sun className="mr-2 h-4 w-4" />
                  {t('themeLight')}
                  {theme === 'light' && <span className="ml-auto text-primary">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>
                  <Moon className="mr-2 h-4 w-4" />
                  {t('themeDark')}
                  {theme === 'dark' && <span className="ml-auto text-primary">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')}>
                  <Monitor className="mr-2 h-4 w-4" />
                  {t('themeSystem')}
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
        className="flex-1 h-full flex items-center justify-center px-2"
        data-tauri-drag-region
        onMouseDown={shouldUseManualDrag ? handleDragMouseDown : undefined}
      >
        <div className="flex items-center gap-1" data-no-drag>
          {renderCustomItems('center')}
        </div>
      </div>

      {/* Status indicator when pinned */}
      {isAlwaysOnTop && (
        <div className="flex items-center gap-1 px-2 mr-1" data-tauri-drag-region>
          <Pin className="h-3 w-3 text-primary" />
          <span className="text-[10px] text-primary font-medium">Pinned</span>
        </div>
      )}

      {/* Window controls */}
      <div className="flex h-full items-center" data-no-drag>
        {renderCustomItems('right')}
        {!isMacos && windowControlButtons}
      </div>
    </div>
  );
}
