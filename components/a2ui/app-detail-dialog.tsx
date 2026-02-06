'use client';

/**
 * A2UI App Detail Dialog Component
 * Displays detailed app information and metadata editing
 */

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Clock,
  Eye,
  Play,
  Star,
  User,
  Tag,
  FolderOpen,
  Info,
  Edit2,
  Save,
  X,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import type { A2UIAppInstance } from '@/hooks/a2ui/use-app-builder';
import type { A2UIAppTemplate } from '@/lib/a2ui/templates';

export interface AppDetailDialogProps {
  app: A2UIAppInstance | null;
  template?: A2UIAppTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (appId: string, metadata: Partial<A2UIAppInstance>) => void;
  onGenerateThumbnail?: (appId: string) => void;
  onPreparePublish?: (appId: string) => { valid: boolean; missing: string[] };
  className?: string;
}

const CATEGORY_OPTIONS = [
  { value: 'productivity', label: '效率工具' },
  { value: 'data', label: '数据分析' },
  { value: 'form', label: '表单' },
  { value: 'utility', label: '实用工具' },
  { value: 'social', label: '社交' },
];

export function AppDetailDialog({
  app,
  template,
  open,
  onOpenChange,
  onSave,
  onGenerateThumbnail,
  onPreparePublish,
  className,
}: AppDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<A2UIAppInstance>>({});
  const [publishCheck, setPublishCheck] = useState<{ valid: boolean; missing: string[] } | null>(
    null
  );

  // Reset state when dialog opens/closes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setIsEditing(false);
        setEditedData({});
        setPublishCheck(null);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  // Start editing
  const handleStartEdit = useCallback(() => {
    if (app) {
      setEditedData({
        name: app.name,
        description: app.description || '',
        version: app.version || '1.0.0',
        category: app.category || template?.category,
        tags: app.tags || template?.tags || [],
        author: app.author || {},
      });
      setIsEditing(true);
    }
  }, [app, template]);

  // Cancel editing
  const handleCancelEdit = useCallback(() => {
    setEditedData({});
    setIsEditing(false);
  }, []);

  // Save changes
  const handleSave = useCallback(() => {
    if (app && onSave) {
      onSave(app.id, editedData);
      setIsEditing(false);
    }
  }, [app, editedData, onSave]);

  // Check publish readiness
  const handleCheckPublish = useCallback(() => {
    if (app && onPreparePublish) {
      const result = onPreparePublish(app.id);
      setPublishCheck(result);
    }
  }, [app, onPreparePublish]);

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Update edited field
  const updateField = useCallback((field: keyof A2UIAppInstance, value: unknown) => {
    setEditedData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Update author field
  const updateAuthorField = useCallback((field: string, value: string) => {
    setEditedData((prev) => ({
      ...prev,
      author: { ...(prev.author || {}), [field]: value },
    }));
  }, []);

  // Update tags
  const handleTagsChange = useCallback(
    (tagsString: string) => {
      const tags = tagsString
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      updateField('tags', tags);
    },
    [updateField]
  );

  if (!app) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn('max-w-2xl max-h-[90vh] overflow-y-auto', className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            应用详情
          </DialogTitle>
          <DialogDescription>查看和编辑应用的详细信息</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">基本信息</TabsTrigger>
            <TabsTrigger value="metadata">元数据</TabsTrigger>
            <TabsTrigger value="publish">发布准备</TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="info" className="space-y-4 mt-4">
            {/* Thumbnail */}
            <div className="flex gap-4">
              <div className="w-40 h-28 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                {app.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={app.thumbnail} alt={app.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                {isEditing ? (
                  <>
                    <div>
                      <Label>应用名称</Label>
                      <Input
                        value={editedData.name || ''}
                        onChange={(e) => updateField('name', e.target.value)}
                        placeholder="应用名称"
                      />
                    </div>
                    <div>
                      <Label>版本号</Label>
                      <Input
                        value={editedData.version || ''}
                        onChange={(e) => updateField('version', e.target.value)}
                        placeholder="1.0.0"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold">{app.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="secondary">{template?.name || '自定义应用'}</Badge>
                      {app.version && <Badge variant="outline">v{app.version}</Badge>}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onGenerateThumbnail?.(app.id)}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      刷新缩略图
                    </Button>
                  </>
                )}
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <Label>应用描述</Label>
              {isEditing ? (
                <Textarea
                  value={editedData.description || ''}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="描述应用的功能和用途..."
                  rows={3}
                  className="mt-1"
                />
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  {app.description || '暂无描述'}
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <Label>分类</Label>
              {isEditing ? (
                <Select
                  value={editedData.category || ''}
                  onValueChange={(value) => updateField('category', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {CATEGORY_OPTIONS.find((c) => c.value === (app.category || template?.category))
                      ?.label || '未分类'}
                  </span>
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <Label>标签</Label>
              {isEditing ? (
                <Input
                  value={(editedData.tags || []).join(', ')}
                  onChange={(e) => handleTagsChange(e.target.value)}
                  placeholder="输入标签，用逗号分隔"
                  className="mt-1"
                />
              ) : (
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  {(app.tags || template?.tags || []).length > 0 ? (
                    (app.tags || template?.tags || []).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">暂无标签</span>
                  )}
                </div>
              )}
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  创建时间
                </Label>
                <p className="text-sm text-muted-foreground mt-1">{formatDate(app.createdAt)}</p>
              </div>
              <div>
                <Label className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  最后修改
                </Label>
                <p className="text-sm text-muted-foreground mt-1">{formatDate(app.lastModified)}</p>
              </div>
            </div>
          </TabsContent>

          {/* Metadata Tab */}
          <TabsContent value="metadata" className="space-y-4 mt-4">
            {/* Author Info */}
            <div className="space-y-3">
              <Label className="flex items-center gap-1">
                <User className="h-4 w-4" />
                作者信息
              </Label>
              {isEditing ? (
                <div className="space-y-2 pl-5">
                  <div>
                    <Label className="text-xs">名称</Label>
                    <Input
                      value={editedData.author?.name || ''}
                      onChange={(e) => updateAuthorField('name', e.target.value)}
                      placeholder="作者名称"
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">邮箱</Label>
                    <Input
                      value={editedData.author?.email || ''}
                      onChange={(e) => updateAuthorField('email', e.target.value)}
                      placeholder="email@example.com"
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">网站</Label>
                    <Input
                      value={editedData.author?.url || ''}
                      onChange={(e) => updateAuthorField('url', e.target.value)}
                      placeholder="https://..."
                      className="h-8"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground pl-5 space-y-1">
                  {app.author?.name ? (
                    <>
                      <p>名称: {app.author.name}</p>
                      {app.author.email && <p>邮箱: {app.author.email}</p>}
                      {app.author.url && <p>网站: {app.author.url}</p>}
                    </>
                  ) : (
                    <p>暂无作者信息</p>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Statistics */}
            <div>
              <Label>统计数据</Label>
              <div className="grid grid-cols-4 gap-4 mt-2">
                <div className="text-center p-3 rounded-lg bg-muted">
                  <Eye className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-semibold">{app.stats?.views || 0}</p>
                  <p className="text-xs text-muted-foreground">查看</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <Play className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-semibold">{app.stats?.uses || 0}</p>
                  <p className="text-xs text-muted-foreground">使用</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <Star className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
                  <p className="text-lg font-semibold">{app.stats?.rating?.toFixed(1) || '-'}</p>
                  <p className="text-xs text-muted-foreground">评分</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <User className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-semibold">{app.stats?.ratingCount || 0}</p>
                  <p className="text-xs text-muted-foreground">评价</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Template Info */}
            <div>
              <Label>模板信息</Label>
              <div className="text-sm text-muted-foreground mt-2 space-y-1">
                <p>模板 ID: {app.templateId}</p>
                {template && (
                  <>
                    <p>模板名称: {template.name}</p>
                    <p>模板描述: {template.description}</p>
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Publish Tab */}
          <TabsContent value="publish" className="space-y-4 mt-4">
            <div className="text-center py-4">
              <h4 className="font-medium mb-2">发布准备检查</h4>
              <p className="text-sm text-muted-foreground mb-4">
                检查应用是否满足发布到应用商店的要求
              </p>
              <Button onClick={handleCheckPublish}>
                <CheckCircle className="h-4 w-4 mr-2" />
                检查发布要求
              </Button>
            </div>

            {publishCheck && (
              <div
                className={cn(
                  'p-4 rounded-lg',
                  publishCheck.valid
                    ? 'bg-green-50 dark:bg-green-950'
                    : 'bg-yellow-50 dark:bg-yellow-950'
                )}
              >
                {publishCheck.valid ? (
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">应用已准备好发布！</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 mb-2">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">需要补充以下信息：</span>
                    </div>
                    <ul className="list-disc list-inside text-sm text-yellow-600 dark:text-yellow-400 space-y-1">
                      {publishCheck.missing.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            {app.isPublished && (
              <div className="text-center p-4 bg-muted rounded-lg">
                <Badge variant="default" className="mb-2">
                  已发布
                </Badge>
                <p className="text-sm text-muted-foreground">
                  发布时间: {app.publishedAt ? formatDate(app.publishedAt) : '未知'}
                </p>
                {app.storeId && (
                  <p className="text-xs text-muted-foreground mt-1">商店 ID: {app.storeId}</p>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancelEdit}>
                <X className="h-4 w-4 mr-1" />
                取消
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-1" />
                保存
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                关闭
              </Button>
              <Button onClick={handleStartEdit}>
                <Edit2 className="h-4 w-4 mr-1" />
                编辑信息
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AppDetailDialog;
