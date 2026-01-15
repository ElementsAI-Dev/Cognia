'use client';

/**
 * Quick App Builder Component
 * AI-driven interface for quickly building and managing A2UI mini-apps
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Search,
  Sparkles,
  Grid3X3,
  List,
  Trash2,
  Copy,
  Play,
  X,
  RefreshCw,
  Zap,
  Loader2,
  Send,
  Download,
  Upload,
  MoreVertical,
  FileJson,
  Share2,
  Link,
  Check,
  Twitter,
  Facebook,
  Mail,
  MessageCircle,
} from 'lucide-react';
import { icons } from 'lucide-react';
import { useA2UIAppBuilder, type A2UIAppInstance } from '@/hooks/a2ui/use-app-builder';
import { A2UIInlineSurface } from './a2ui-surface';
import { templateCategories, type A2UIAppTemplate } from '@/lib/a2ui/templates';
import { generateAppFromDescription } from '@/lib/a2ui/app-generator';
import { useA2UI } from '@/hooks/a2ui';
import type { A2UIUserAction, A2UIDataModelChange } from '@/types/artifact/a2ui';

interface QuickAppBuilderProps {
  className?: string;
  onAction?: (action: A2UIUserAction) => void;
  onDataChange?: (change: A2UIDataModelChange) => void;
  onAppSelect?: (appId: string) => void;
}

type ViewMode = 'grid' | 'list';
type TabValue = 'flash' | 'templates' | 'my-apps';

export function QuickAppBuilder({
  className,
  onAction,
  onDataChange,
  onAppSelect,
}: QuickAppBuilderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeTab, setActiveTab] = useState<TabValue>('flash');
  const [previewAppId, setPreviewAppId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Flash App state (like Lingguang)
  const [flashPrompt, setFlashPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // File input ref for import
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const a2ui = useA2UI({ onAction, onDataChange });

  const appBuilder = useA2UIAppBuilder({
    onAction: (action) => {
      appBuilder.handleAppAction(action);
      onAction?.(action);
    },
    onDataChange,
    onAppCreated: (appId) => {
      setPreviewAppId(appId);
      setActiveTab('my-apps');
    },
  });

  // Filter templates based on search and category
  const filteredTemplates = useMemo(() => {
    let templates = appBuilder.templates;

    if (searchQuery) {
      templates = appBuilder.searchTemplates(searchQuery);
    }

    if (selectedCategory) {
      templates = templates.filter((t) => t.category === selectedCategory);
    }

    return templates;
  }, [appBuilder, searchQuery, selectedCategory]);

  // Get user's apps
  const myApps = useMemo(() => appBuilder.getAllApps(), [appBuilder]);

  // Handle Flash App generation (like Lingguang)
  const handleFlashGenerate = useCallback(async () => {
    if (!flashPrompt.trim() || isGenerating) return;
    
    setIsGenerating(true);
    try {
      // Generate app from description
      const generatedApp = generateAppFromDescription({
        description: flashPrompt,
      });
      
      // Process the generated app messages
      a2ui.processMessages(generatedApp.messages);
      
      // Set as preview and switch to my-apps
      setPreviewAppId(generatedApp.id);
      setFlashPrompt('');
      onAppSelect?.(generatedApp.id);
    } catch (error) {
      console.error('[QuickAppBuilder] Flash generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [flashPrompt, isGenerating, a2ui, onAppSelect]);

  // Handle template selection
  const handleCreateFromTemplate = useCallback(
    (template: A2UIAppTemplate) => {
      const appId = appBuilder.createFromTemplate(template.id);
      if (appId) {
        setPreviewAppId(appId);
        onAppSelect?.(appId);
      }
    },
    [appBuilder, onAppSelect]
  );

  // Handle app deletion
  const handleDeleteApp = useCallback(
    (appId: string) => {
      appBuilder.deleteApp(appId);
      if (previewAppId === appId) {
        setPreviewAppId(null);
      }
      setDeleteConfirmId(null);
    },
    [appBuilder, previewAppId]
  );

  // Handle app duplication
  const handleDuplicateApp = useCallback(
    (appId: string) => {
      const newAppId = appBuilder.duplicateApp(appId);
      if (newAppId) {
        setPreviewAppId(newAppId);
      }
    },
    [appBuilder]
  );

  // Handle import click (opens file dialog)
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle file import
  const handleFileImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const appId = await appBuilder.importAppFromFile(file);
        if (appId) {
          setPreviewAppId(appId);
          setActiveTab('my-apps');
        }
      } catch (error) {
        console.error('[QuickAppBuilder] Import failed:', error);
      }

      // Reset input value to allow importing same file again
      e.target.value = '';
    },
    [appBuilder]
  );

  // Handle export all apps
  const handleExportAllApps = useCallback(() => {
    const jsonData = appBuilder.exportAllApps();
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `a2ui-apps-backup-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [appBuilder]);

  // Handle single app download
  const handleDownloadApp = useCallback(
    (appId: string) => {
      appBuilder.downloadApp(appId);
    },
    [appBuilder]
  );

  // Share state
  const [shareMenuAppId, setShareMenuAppId] = useState<string | null>(null);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  // Handle copy to clipboard
  const handleCopyToClipboard = useCallback(
    async (appId: string, format: 'json' | 'code' | 'url') => {
      const success = await appBuilder.copyAppToClipboard(appId, format);
      if (success) {
        setCopiedFormat(format);
        setTimeout(() => setCopiedFormat(null), 2000);
      }
    },
    [appBuilder]
  );

  // Handle native share
  const handleNativeShare = useCallback(
    async (appId: string) => {
      await appBuilder.shareAppNative(appId);
    },
    [appBuilder]
  );

  // Handle social share
  const handleSocialShare = useCallback(
    (appId: string, platform: string) => {
      const urls = appBuilder.getSocialShareUrls(appId);
      if (urls && urls[platform]) {
        window.open(urls[platform], '_blank', 'noopener,noreferrer');
      }
      setShareMenuAppId(null);
    },
    [appBuilder]
  );

  // Render template card
  const renderTemplateCard = (template: A2UIAppTemplate) => {
    const IconComponent = icons[template.icon as keyof typeof icons];

    return (
      <Card
        key={template.id}
        className={cn(
          'group cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
          viewMode === 'list' && 'flex flex-row items-center'
        )}
        onClick={() => handleCreateFromTemplate(template)}
      >
        <CardHeader className={cn(viewMode === 'list' && 'flex-1 py-3')}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              {IconComponent ? (
                <IconComponent className="h-5 w-5 text-primary" />
              ) : (
                <Sparkles className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm">{template.name}</CardTitle>
              <CardDescription className="text-xs line-clamp-2">
                {template.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        {viewMode === 'grid' && (
          <CardFooter className="pt-0">
            <div className="flex flex-wrap gap-1">
              {template.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardFooter>
        )}
        {viewMode === 'list' && (
          <div className="flex items-center gap-2 pr-4">
            <Button
              size="sm"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                handleCreateFromTemplate(template);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Create
            </Button>
          </div>
        )}
      </Card>
    );
  };

  // Render app instance card
  const renderAppCard = (app: A2UIAppInstance) => {
    const template = appBuilder.getTemplate(app.templateId);
    const IconComponent = template?.icon
      ? icons[template.icon as keyof typeof icons]
      : null;

    return (
      <Card
        key={app.id}
        className={cn(
          'group relative transition-all hover:shadow-md',
          previewAppId === app.id && 'ring-2 ring-primary',
          viewMode === 'list' && 'flex flex-row items-center'
        )}
      >
        <CardHeader
          className={cn(
            'cursor-pointer',
            viewMode === 'list' && 'flex-1 py-3'
          )}
          onClick={() => {
            setPreviewAppId(app.id);
            onAppSelect?.(app.id);
          }}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              {IconComponent ? (
                <IconComponent className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Sparkles className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm">{app.name}</CardTitle>
              <CardDescription className="text-xs">
                {template?.name || 'Custom App'} •{' '}
                {new Date(app.lastModified).toLocaleDateString()}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardFooter
          className={cn(
            'gap-1',
            viewMode === 'grid' ? 'pt-0' : 'py-3 pr-4'
          )}
        >
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => {
              setPreviewAppId(app.id);
              onAppSelect?.(app.id);
            }}
          >
            <Play className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => handleDuplicateApp(app.id)}
            title="复制"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => handleDownloadApp(app.id)}
            title="导出"
          >
            <Download className="h-4 w-4" />
          </Button>
          <DropdownMenu open={shareMenuAppId === app.id} onOpenChange={(open) => setShareMenuAppId(open ? app.id : null)}>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8" title="分享">
                <Share2 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleCopyToClipboard(app.id, 'url')}>
                <Link className="h-4 w-4 mr-2" />
                {copiedFormat === 'url' ? '已复制!' : '复制链接'}
                {copiedFormat === 'url' && <Check className="h-4 w-4 ml-auto text-green-500" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCopyToClipboard(app.id, 'code')}>
                <FileJson className="h-4 w-4 mr-2" />
                {copiedFormat === 'code' ? '已复制!' : '复制分享码'}
                {copiedFormat === 'code' && <Check className="h-4 w-4 ml-auto text-green-500" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNativeShare(app.id)}>
                <Share2 className="h-4 w-4 mr-2" />
                系统分享
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleSocialShare(app.id, 'twitter')}>
                <Twitter className="h-4 w-4 mr-2" />
                分享到 Twitter
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSocialShare(app.id, 'facebook')}>
                <Facebook className="h-4 w-4 mr-2" />
                分享到 Facebook
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSocialShare(app.id, 'telegram')}>
                <MessageCircle className="h-4 w-4 mr-2" />
                分享到 Telegram
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSocialShare(app.id, 'email')}>
                <Mail className="h-4 w-4 mr-2" />
                通过邮件分享
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => setDeleteConfirmId(app.id)}
            title="删除"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header - Mobile optimized */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-sm sm:text-base">Quick Apps</h2>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            size="icon"
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            className="h-8 w-8 touch-manipulation"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            className="h-8 w-8 touch-manipulation"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8 touch-manipulation">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleImportClick}>
                <Upload className="h-4 w-4 mr-2" />
                导入应用
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportAllApps}>
                <Download className="h-4 w-4 mr-2" />
                导出所有应用
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <FileJson className="h-4 w-4 mr-2" />
                从文件导入
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileImport}
          />
        </div>
      </div>

      {/* Search - Mobile optimized */}
      <div className="p-3 sm:p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索模板和应用..."
            className="pl-9 text-sm sm:text-base"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabValue)}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="mx-3 sm:mx-4 mt-2 h-auto flex-wrap sm:flex-nowrap">
          <TabsTrigger value="flash" className="flex-1 text-xs sm:text-sm py-2 touch-manipulation">
            <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            <span className="hidden xs:inline">闪</span>应用
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex-1 text-xs sm:text-sm py-2 touch-manipulation">
            模板
          </TabsTrigger>
          <TabsTrigger value="my-apps" className="flex-1 text-xs sm:text-sm py-2 touch-manipulation">
            我的 ({myApps.length})
          </TabsTrigger>
        </TabsList>

        {/* Flash App Tab - Like Lingguang's 30-second app generation */}
        {/* Flash App Tab - Mobile optimized */}
        <TabsContent value="flash" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="flex flex-col p-3 sm:p-4">
              <div className="text-center mb-4 sm:mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 mb-3 sm:mb-4">
                  <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">一句话生成应用</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  描述你想要的应用，30秒内生成
                </p>
              </div>
              
              {/* Input area */}
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="relative">
                  <Input
                    value={flashPrompt}
                    onChange={(e) => setFlashPrompt(e.target.value)}
                    placeholder="例如：做一个番茄钟..."
                    className="pr-12 text-sm sm:text-base h-10 sm:h-11"
                    onKeyDown={(e) => e.key === 'Enter' && handleFlashGenerate()}
                  />
                  <Button
                    size="icon"
                    className="absolute right-1 top-1 h-8 w-8 sm:h-9 sm:w-9 touch-manipulation"
                    onClick={handleFlashGenerate}
                    disabled={!flashPrompt.trim() || isGenerating}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {/* Quick suggestions - scrollable on mobile */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">快速尝试：</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 sm:flex-wrap sm:overflow-visible">
                    {[
                      '📝 待办',
                      '🧮 计算器',
                      '⏱️ 番茄钟',
                      '💰 记账',
                      '🎯 打卡',
                      '📊 图表',
                    ].map((suggestion) => (
                      <Button
                        key={suggestion}
                        variant="outline"
                        size="sm"
                        className="text-xs whitespace-nowrap flex-shrink-0 touch-manipulation h-8 sm:h-9"
                        onClick={() => setFlashPrompt(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* Example apps showcase */}
                <div className="pt-3 sm:pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2 sm:mb-3">示例应用</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: 'Calculator', name: '计算器', desc: '四则运算' },
                      { icon: 'Timer', name: '计时器', desc: '倒计时' },
                      { icon: 'CheckSquare', name: '待办', desc: '任务管理' },
                      { icon: 'BarChart3', name: '仪表盘', desc: '数据展示' },
                    ].map((example) => {
                      const ExIcon = icons[example.icon as keyof typeof icons];
                      return (
                        <Card
                          key={example.name}
                          className="p-2.5 sm:p-3 cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors touch-manipulation"
                          onClick={() => setFlashPrompt(`做一个${example.name}`)}
                        >
                          <div className="flex items-center gap-2">
                            {ExIcon && <ExIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{example.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{example.desc}</p>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Templates Tab - Mobile optimized */}
        <TabsContent value="templates" className="flex-1 overflow-hidden mt-0">
          <div className="flex flex-col sm:flex-row h-full">
            {/* Category filter - horizontal scroll on mobile, sidebar on desktop */}
            <div className="sm:w-36 md:w-40 sm:border-r border-b sm:border-b-0">
              {/* Mobile: horizontal scrollable categories */}
              <div className="flex sm:hidden gap-1 p-2 overflow-x-auto">
                <Button
                  variant={selectedCategory === null ? 'secondary' : 'outline'}
                  size="sm"
                  className="flex-shrink-0 text-xs h-8 touch-manipulation"
                  onClick={() => setSelectedCategory(null)}
                >
                  全部
                </Button>
                {templateCategories.map((cat) => {
                  const CatIcon = icons[cat.icon as keyof typeof icons];
                  return (
                    <Button
                      key={cat.id}
                      variant={selectedCategory === cat.id ? 'secondary' : 'outline'}
                      size="sm"
                      className="flex-shrink-0 text-xs h-8 touch-manipulation"
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      {CatIcon && <CatIcon className="h-3 w-3 mr-1" />}
                      {cat.name}
                    </Button>
                  );
                })}
              </div>
              {/* Desktop: vertical sidebar */}
              <div className="hidden sm:block p-2 space-y-1">
                <Button
                  variant={selectedCategory === null ? 'secondary' : 'ghost'}
                  className="w-full justify-start text-xs sm:text-sm touch-manipulation"
                  onClick={() => setSelectedCategory(null)}
                >
                  全部模板
                </Button>
                {templateCategories.map((cat) => {
                  const CatIcon = icons[cat.icon as keyof typeof icons];
                  return (
                    <Button
                      key={cat.id}
                      variant={selectedCategory === cat.id ? 'secondary' : 'ghost'}
                      className="w-full justify-start text-xs sm:text-sm touch-manipulation"
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      {CatIcon && <CatIcon className="h-4 w-4 mr-2" />}
                      {cat.name}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Templates grid - responsive */}
            <ScrollArea className="flex-1">
              <div
                className={cn(
                  'p-3 sm:p-4',
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3'
                    : 'space-y-2'
                )}
              >
                {filteredTemplates.map(renderTemplateCard)}
                {filteredTemplates.length === 0 && (
                  <div className="col-span-full text-center py-8 text-muted-foreground text-sm">
                    未找到模板
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        {/* My Apps Tab - Mobile optimized */}
        <TabsContent value="my-apps" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div
              className={cn(
                'p-3 sm:p-4',
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3'
                  : 'space-y-2'
              )}
            >
              {myApps.map(renderAppCard)}
              {myApps.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  <p className="mb-2 text-sm">还没有应用</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="touch-manipulation"
                    onClick={() => setActiveTab('flash')}
                  >
                    创建第一个应用
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Preview panel - Mobile optimized */}
      {previewAppId && (
        <div className="border-t">
          <div className="flex items-center justify-between p-2 bg-muted/50">
            <span className="text-xs sm:text-sm font-medium px-2 truncate flex-1">
              {appBuilder.getAppInstance(previewAppId)?.name || '应用预览'}
            </span>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 touch-manipulation"
                onClick={() => appBuilder.resetAppData(previewAppId)}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 touch-manipulation"
                onClick={() => setPreviewAppId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="max-h-80 overflow-auto">
            <A2UIInlineSurface
              surfaceId={previewAppId}
              onAction={onAction}
              onDataChange={onDataChange}
            />
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete App</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this app? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDeleteApp(deleteConfirmId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default QuickAppBuilder;
