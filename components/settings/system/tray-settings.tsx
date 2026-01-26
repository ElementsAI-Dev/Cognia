'use client';

/**
 * TraySettings - System tray configuration settings
 * Allows users to customize the system tray menu
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Monitor,
  Layout,
  Eye,
  EyeOff,
  Keyboard,
  Smile,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Check,
  GripVertical,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTray } from '@/hooks/native';
import { useTrayStore } from '@/stores/system/tray-store';
import { isTauri } from '@/lib/native/utils';
import type { TrayMenuItem, TrayMenuCategory } from '@/types/system/tray';
import { DEFAULT_TRAY_ITEMS, DEFAULT_COMPACT_ITEMS } from '@/types/system/tray';

const CATEGORY_LABELS: Record<TrayMenuCategory, string> = {
  window: '窗口控制',
  tools: '工具',
  settings: '设置',
  help: '帮助',
  exit: '退出',
};

const CATEGORY_ORDER: TrayMenuCategory[] = ['window', 'tools', 'settings', 'help', 'exit'];

interface TrayItemRowProps {
  item: TrayMenuItem;
  isVisible: boolean;
  isCompactItem: boolean;
  onVisibilityChange: (visible: boolean) => void;
  onCompactToggle: (include: boolean) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  showShortcuts: boolean;
  showIcons: boolean;
}

function TrayItemRow({
  item,
  isVisible,
  isCompactItem,
  onVisibilityChange,
  onCompactToggle,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  showShortcuts,
  showIcons,
}: TrayItemRowProps) {
  return (
    <div className="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-muted/50 group">
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={!canMoveUp}
          onClick={onMoveUp}
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={!canMoveDown}
          onClick={onMoveDown}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>

      <GripVertical className="h-4 w-4 text-muted-foreground/50" />

      <div className="flex-1 flex items-center gap-2 min-w-0">
        {showIcons && item.icon && <span className="text-sm">{item.icon}</span>}
        <span className="text-sm truncate">{item.label}</span>
        {item.isSubmenu && (
          <Badge variant="secondary" className="text-xs">
            子菜单
          </Badge>
        )}
        {showShortcuts && item.shortcut && (
          <span className="text-xs text-muted-foreground ml-auto">{item.shortcut}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <Checkbox
                  checked={isCompactItem}
                  onCheckedChange={(checked) => onCompactToggle(checked === true)}
                  className="h-4 w-4"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>精简模式中显示</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Switch
          checked={isVisible}
          onCheckedChange={onVisibilityChange}
          className="scale-75"
        />
      </div>
    </div>
  );
}

export function TraySettings() {
  const t = useTranslations('settings');
  const [isDesktop, setIsDesktop] = useState(() => isTauri());

  const {
    displayMode,
    config,
    isSyncing,
    error,
    setDisplayMode,
    toggleMode,
    setItemVisibility,
    setCompactItems,
    setShowShortcuts,
    setShowIcons,
    syncConfig,
    resetConfig,
  } = useTray();

  const {
    menuItems,
    moveItemUp,
    moveItemDown,
  } = useTrayStore();

  const compactModeItems = config.compactModeItems || DEFAULT_COMPACT_ITEMS;

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<TrayMenuCategory, TrayMenuItem[]> = {
      window: [],
      tools: [],
      settings: [],
      help: [],
      exit: [],
    };

    // Sort by order first
    const sortedItems = [...menuItems].sort((a, b) => {
      const aIndex = config.itemOrder.indexOf(a.id);
      const bIndex = config.itemOrder.indexOf(b.id);
      if (aIndex === -1 && bIndex === -1) return a.order - b.order;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    // Group by category (only top-level items, not children)
    for (const item of sortedItems) {
      if (!item.parentId) {
        groups[item.category].push(item);
      }
    }

    return groups;
  }, [menuItems, config.itemOrder]);

  const handleCompactToggle = (itemId: string, include: boolean) => {
    const newItems = include
      ? [...new Set([...compactModeItems, itemId])]
      : compactModeItems.filter((id) => id !== itemId);
    setCompactItems(newItems);
  };

  const handleResetCompactItems = () => {
    setCompactItems(DEFAULT_COMPACT_ITEMS);
  };

  if (!isDesktop) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            系统托盘设置
          </CardTitle>
          <CardDescription>此功能仅在桌面应用中可用</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Monitor className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">请下载桌面应用以使用系统托盘功能</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Display Mode */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layout className="h-4 w-4 text-muted-foreground" />
            显示模式
          </CardTitle>
          <CardDescription className="text-xs">
            选择系统托盘菜单的显示模式
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>当前模式</Label>
              <p className="text-sm text-muted-foreground">
                {displayMode === 'full' ? '完整模式 - 显示所有功能' : '精简模式 - 仅显示核心功能'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={displayMode === 'compact' ? 'default' : 'secondary'}>
                {displayMode === 'full' ? '完整' : '精简'}
              </Badge>
              <Button variant="outline" size="sm" onClick={toggleMode} disabled={isSyncing}>
                切换模式
              </Button>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant={displayMode === 'full' ? 'default' : 'outline'}
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => setDisplayMode('full')}
              disabled={isSyncing}
            >
              <Eye className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">完整模式</div>
                <div className="text-xs text-muted-foreground">显示所有菜单项</div>
              </div>
              {displayMode === 'full' && <Check className="h-4 w-4 absolute top-2 right-2" />}
            </Button>

            <Button
              variant={displayMode === 'compact' ? 'default' : 'outline'}
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => setDisplayMode('compact')}
              disabled={isSyncing}
            >
              <EyeOff className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">精简模式</div>
                <div className="text-xs text-muted-foreground">仅核心功能</div>
              </div>
              {displayMode === 'compact' && <Check className="h-4 w-4 absolute top-2 right-2" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Display Options */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Smile className="h-4 w-4 text-muted-foreground" />
            显示选项
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Smile className="h-4 w-4" />
                显示图标
              </Label>
              <p className="text-sm text-muted-foreground">在菜单项前显示表情图标</p>
            </div>
            <Switch checked={config.showIcons} onCheckedChange={setShowIcons} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Keyboard className="h-4 w-4" />
                显示快捷键
              </Label>
              <p className="text-sm text-muted-foreground">在菜单项后显示快捷键提示</p>
            </div>
            <Switch checked={config.showShortcuts} onCheckedChange={setShowShortcuts} />
          </div>
        </CardContent>
      </Card>

      {/* Menu Items Configuration */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                菜单项配置
              </CardTitle>
              <CardDescription className="text-xs">
                自定义菜单项的显示和顺序（勾选框表示在精简模式中显示）
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetCompactItems}
                disabled={isSyncing}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                重置精简
              </Button>
              <Button variant="ghost" size="sm" onClick={resetConfig} disabled={isSyncing}>
                <RotateCcw className="h-4 w-4 mr-1" />
                重置全部
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {CATEGORY_ORDER.map((category) => {
                const items = groupedItems[category];
                if (items.length === 0) return null;

                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        {CATEGORY_LABELS[category]}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {items.length}
                      </Badge>
                    </div>
                    <div className="space-y-1 border rounded-md p-2">
                      {items.map((item, index) => (
                        <TrayItemRow
                          key={item.id}
                          item={item}
                          isVisible={config.visibleItems.includes(item.id)}
                          isCompactItem={compactModeItems.includes(item.id)}
                          onVisibilityChange={(visible) => setItemVisibility(item.id, visible)}
                          onCompactToggle={(include) => handleCompactToggle(item.id, include)}
                          onMoveUp={() => moveItemUp(item.id)}
                          onMoveDown={() => moveItemDown(item.id)}
                          canMoveUp={index > 0}
                          canMoveDown={index < items.length - 1}
                          showShortcuts={config.showShortcuts}
                          showIcons={config.showIcons}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Compact Mode Preview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <EyeOff className="h-4 w-4 text-muted-foreground" />
            精简模式预览
          </CardTitle>
          <CardDescription className="text-xs">
            精简模式下将显示以下 {compactModeItems.length} 个项目
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md p-3 bg-muted/30 space-y-1">
            {compactModeItems.map((itemId) => {
              const item = menuItems.find((i) => i.id === itemId);
              if (!item) return null;
              return (
                <div key={itemId} className="flex items-center gap-2 py-1.5 px-2 text-sm">
                  {config.showIcons && item.icon && <span>{item.icon}</span>}
                  <span>{item.label}</span>
                  {config.showShortcuts && item.shortcut && (
                    <span className="text-xs text-muted-foreground ml-auto">{item.shortcut}</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sync Status */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Apply Button */}
      <div className="flex justify-end">
        <Button onClick={syncConfig} disabled={isSyncing}>
          {isSyncing ? '同步中...' : '应用更改'}
        </Button>
      </div>
    </div>
  );
}

export default TraySettings;
