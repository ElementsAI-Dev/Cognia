'use client';

/**
 * ImageExportDialog - Export chat conversations as images
 * 
 * Supports: PNG, JPG, WebP with customization options
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Image as ImageIcon,
  Download,
  Copy,
  Check,
  Loader2,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { messageRepository } from '@/lib/db';
import type { Session, UIMessage } from '@/types';
import {
  downloadAsImage,
  generateThumbnail,
  copyImageToClipboard,
  getImageExportFormats,
  estimateImageSize,
} from '@/lib/export/image-export';

interface ImageExportDialogProps {
  session: Session;
  trigger?: React.ReactNode;
}

type ThemeOption = 'light' | 'dark' | 'system';
type FormatOption = 'png' | 'jpg' | 'webp';
type ScaleOption = 1 | 2 | 3;

const THEME_OPTIONS: { value: ThemeOption; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: '浅色', icon: <Sun className="h-4 w-4" /> },
  { value: 'dark', label: '深色', icon: <Moon className="h-4 w-4" /> },
  { value: 'system', label: '跟随系统', icon: <Monitor className="h-4 w-4" /> },
];

const SCALE_OPTIONS: { value: ScaleOption; label: string }[] = [
  { value: 1, label: '1x (标准)' },
  { value: 2, label: '2x (高清)' },
  { value: 3, label: '3x (超清)' },
];

export function ImageExportDialog({ session, trigger }: ImageExportDialogProps) {
  const _t = useTranslations('export');
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  
  // Export options
  const [format, setFormat] = useState<FormatOption>('png');
  const [theme, setTheme] = useState<ThemeOption>('light');
  const [scale, setScale] = useState<ScaleOption>(2);
  const [quality, setQuality] = useState(92);
  const [includeHeader, setIncludeHeader] = useState(true);
  const [includeFooter, setIncludeFooter] = useState(true);
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [showModel, setShowModel] = useState(true);
  const [maxMessages] = useState(20);

  const formats = getImageExportFormats();

  // Load messages when dialog opens
  useEffect(() => {
    if (open && messages.length === 0) {
      setIsLoading(true);
      messageRepository
        .getBySessionId(session.id)
        .then(setMessages)
        .finally(() => setIsLoading(false));
    }
  }, [open, session.id, messages.length]);

  // Generate preview when options change
  useEffect(() => {
    if (!open || messages.length === 0) return;

    const generatePreviewAsync = async () => {
      setIsGeneratingPreview(true);
      try {
        const thumbnail = await generateThumbnail(session, messages.slice(0, 3), {
          width: 400,
          maxMessages: 3,
        });
        setPreview(thumbnail);
      } catch (error) {
        console.error('Preview generation failed:', error);
      } finally {
        setIsGeneratingPreview(false);
      }
    };

    const timeoutId = setTimeout(generatePreviewAsync, 300);
    return () => clearTimeout(timeoutId);
  }, [open, messages, session, theme]);

  // Handle export
  const handleExport = useCallback(async () => {
    if (messages.length === 0) return;

    setIsExporting(true);
    try {
      await downloadAsImage(session, messages.slice(0, maxMessages), {
        format,
        theme,
        scale,
        quality: quality / 100,
        includeHeader,
        includeFooter,
        showTimestamps,
        showModel,
      });
      toast.success('图片已导出');
      setOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  }, [session, messages, maxMessages, format, theme, scale, quality, includeHeader, includeFooter, showTimestamps, showModel]);

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    if (messages.length === 0) return;

    setIsCopying(true);
    try {
      const success = await copyImageToClipboard(session, messages.slice(0, maxMessages), {
        theme,
        scale,
        includeHeader,
        includeFooter,
        showTimestamps,
        showModel,
      });

      if (success) {
        setCopied(true);
        toast.success('图片已复制到剪贴板');
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast.error('复制失败，请尝试下载');
      }
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error('复制失败');
    } finally {
      setIsCopying(false);
    }
  }, [session, messages, maxMessages, theme, scale, includeHeader, includeFooter, showTimestamps, showModel]);

  const estimatedSize = estimateImageSize(Math.min(messages.length, maxMessages), {
    format,
    scale,
    width: 800,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <ImageIcon className="h-4 w-4 mr-2" />
            导出图片
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            导出为图片
          </DialogTitle>
          <DialogDescription>
            将对话导出为图片，方便分享到社交媒体
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-6">
            {/* Preview */}
            <div className="space-y-2">
              <Label>预览</Label>
              <div className="relative rounded-lg border bg-muted/50 p-4 flex items-center justify-center min-h-[200px]">
                {isGeneratingPreview ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : preview ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-w-full max-h-[200px] rounded shadow-md"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-sm">预览将在这里显示</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Format */}
              <div className="space-y-2">
                <Label>格式</Label>
                <RadioGroup
                  value={format}
                  onValueChange={(v) => setFormat(v as FormatOption)}
                  className="flex gap-2"
                >
                  {formats.map((f) => (
                    <div key={f.value} className="flex items-center">
                      <RadioGroupItem value={f.value} id={f.value} className="peer sr-only" />
                      <Label
                        htmlFor={f.value}
                        className={cn(
                          'flex items-center justify-center px-4 py-2 rounded-lg border cursor-pointer transition-colors',
                          'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10',
                          'hover:bg-muted'
                        )}
                      >
                        {f.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Theme */}
              <div className="space-y-2">
                <Label>主题</Label>
                <RadioGroup
                  value={theme}
                  onValueChange={(v) => setTheme(v as ThemeOption)}
                  className="flex gap-2"
                >
                  {THEME_OPTIONS.map((t) => (
                    <div key={t.value} className="flex items-center">
                      <RadioGroupItem value={t.value} id={`theme-${t.value}`} className="peer sr-only" />
                      <Label
                        htmlFor={`theme-${t.value}`}
                        className={cn(
                          'flex items-center gap-1 px-3 py-2 rounded-lg border cursor-pointer transition-colors',
                          'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10',
                          'hover:bg-muted'
                        )}
                      >
                        {t.icon}
                        <span className="text-xs">{t.label}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>

            {/* Scale */}
            <div className="space-y-2">
              <Label>分辨率</Label>
              <RadioGroup
                value={String(scale)}
                onValueChange={(v) => setScale(Number(v) as ScaleOption)}
                className="flex gap-2"
              >
                {SCALE_OPTIONS.map((s) => (
                  <div key={s.value} className="flex items-center">
                    <RadioGroupItem value={String(s.value)} id={`scale-${s.value}`} className="peer sr-only" />
                    <Label
                      htmlFor={`scale-${s.value}`}
                      className={cn(
                        'px-4 py-2 rounded-lg border cursor-pointer transition-colors',
                        'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10',
                        'hover:bg-muted'
                      )}
                    >
                      {s.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Quality (for JPG/WebP) */}
            {format !== 'png' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>质量</Label>
                  <span className="text-sm text-muted-foreground">{quality}%</span>
                </div>
                <Slider
                  value={[quality]}
                  onValueChange={([v]) => setQuality(v)}
                  min={10}
                  max={100}
                  step={5}
                />
              </div>
            )}

            {/* Options */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="include-header" className="text-sm font-normal">
                  包含标题头
                </Label>
                <Switch
                  id="include-header"
                  checked={includeHeader}
                  onCheckedChange={setIncludeHeader}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="include-footer" className="text-sm font-normal">
                  包含页脚
                </Label>
                <Switch
                  id="include-footer"
                  checked={includeFooter}
                  onCheckedChange={setIncludeFooter}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="show-timestamps" className="text-sm font-normal">
                  显示时间戳
                </Label>
                <Switch
                  id="show-timestamps"
                  checked={showTimestamps}
                  onCheckedChange={setShowTimestamps}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="show-model" className="text-sm font-normal">
                  显示模型信息
                </Label>
                <Switch
                  id="show-model"
                  checked={showModel}
                  onCheckedChange={setShowModel}
                />
              </div>
            </div>

            {/* Info */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>共 {messages.length} 条消息（最多导出 {maxMessages} 条）</span>
              <Badge variant="outline">预估大小: {estimatedSize}</Badge>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleCopy}
                variant="outline"
                className="flex-1"
                disabled={isCopying || messages.length === 0}
              >
                {isCopying ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : copied ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                {copied ? '已复制' : '复制图片'}
              </Button>
              <Button
                onClick={handleExport}
                className="flex-1"
                disabled={isExporting || messages.length === 0}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {isExporting ? '导出中...' : `下载 ${format.toUpperCase()}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ImageExportDialog;
