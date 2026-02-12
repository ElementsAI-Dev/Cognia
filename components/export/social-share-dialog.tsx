'use client';

/**
 * SocialShareDialog - Share chat conversations to social media platforms
 *
 * Supports: Twitter/X, LinkedIn, Reddit, WeChat, Weibo, Telegram, Facebook, Email
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Share2,
  Copy,
  Check,
  Loader2,
  Image as ImageIcon,
  FileText,
  Link2,
  Mail,
  MessageCircle,
  QrCode,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SocialShareDialogProps, ShareFormat } from '@/types/export/social-share';
import { useExportMessages, useSocialShare } from '@/hooks/export';
import {
  type SocialPlatform,
  PLATFORM_CONFIGS,
  isNativeShareAvailable,
  generateShareableMarkdown,
} from '@/lib/export/social/social-share';
import { QRCodeGenerator } from '@/components/export/qr';

const PLATFORM_ICONS: Record<SocialPlatform, React.ReactNode> = {
  twitter: <span className="font-bold">𝕏</span>,
  linkedin: <span className="font-bold text-[#0a66c2]">in</span>,
  reddit: <span className="text-[#ff4500]">●</span>,
  wechat: <MessageCircle className="h-4 w-4 text-[#07c160]" />,
  weibo: <span className="text-[#e6162d]">●</span>,
  telegram: <span className="text-[#0088cc]">✈</span>,
  facebook: <span className="font-bold text-[#1877f2]">f</span>,
  email: <Mail className="h-4 w-4" />,
};

export function SocialShareDialog({ session, trigger }: SocialShareDialogProps) {
  const t = useTranslations('export');
  const [open, setOpen] = useState(false);

  const { messages, isLoading } = useExportMessages(session.id, open);

  const {
    shareFormat,
    setShareFormat,
    copied,
    wechatQR,
    isGeneratingImage,
    includeTitle,
    setIncludeTitle,
    includeTimestamps,
    setIncludeTimestamps,
    includeModel,
    setIncludeModel,
    maxMessages,
    content,
    handlePlatformShare,
    handleNativeShare,
    handleCopy,
    handleImageExport,
    closeQRCode,
  } = useSocialShare(session, messages, t);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            {t('share')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            {t('shareConversation')}
          </DialogTitle>
          <DialogDescription>{t('shareConversationDesc')}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* WeChat QR Code Modal */}
            {wechatQR && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-background rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
                  <h3 className="text-lg font-semibold mb-4 text-center">
                    {t('wechatScanToShare')}
                  </h3>
                  <div className="flex justify-center mb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={wechatQR} alt="WeChat QR Code" className="w-48 h-48" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    {t('wechatScanHint')}
                  </p>
                  <Button onClick={closeQRCode} className="w-full">
                    {t('close')}
                  </Button>
                </div>
              </div>
            )}

            {/* Platform Buttons */}
            <div className="space-y-3">
              <Label>{t('shareToLabel')}</Label>
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(PLATFORM_CONFIGS) as SocialPlatform[]).map((platform) => {
                  const config = PLATFORM_CONFIGS[platform];
                  return (
                    <Button
                      key={platform}
                      variant="outline"
                      className="flex flex-col items-center gap-1 h-auto py-3"
                      onClick={() => handlePlatformShare(platform)}
                    >
                      <div className="text-xl">{PLATFORM_ICONS[platform]}</div>
                      <span className="text-xs">{config.name}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Native Share Button (if available) */}
            {isNativeShareAvailable() && (
              <Button onClick={handleNativeShare} className="w-full" variant="secondary">
                <Share2 className="h-4 w-4 mr-2" />
                {t('useSystemShareBtn')}
              </Button>
            )}

            {/* Share Format */}
            <Tabs value={shareFormat} onValueChange={(v) => setShareFormat(v as ShareFormat)}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="text" className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {t('textTab')}
                </TabsTrigger>
                <TabsTrigger value="markdown" className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {t('mdTab')}
                </TabsTrigger>
                <TabsTrigger value="image" className="flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" />
                  {t('imageTab')}
                </TabsTrigger>
                <TabsTrigger value="link" className="flex items-center gap-1">
                  <Link2 className="h-3 w-3" />
                  {t('linkTab')}
                </TabsTrigger>
                <TabsTrigger value="qrcode" className="flex items-center gap-1">
                  <QrCode className="h-3 w-3" />
                  {t('qrTab')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-3">
                <ScrollArea className="h-[120px] rounded-md border p-3">
                  <pre className="text-sm whitespace-pre-wrap">{content?.text || t('loading')}</pre>
                </ScrollArea>
                <Button onClick={handleCopy} className="w-full">
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? t('copied') : t('copyTextBtn')}
                </Button>
              </TabsContent>

              <TabsContent value="markdown" className="space-y-3">
                <ScrollArea className="h-[120px] rounded-md border p-3">
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {messages.length > 0
                      ? generateShareableMarkdown(session, messages.slice(0, 3), {
                          includeMetadata: includeModel,
                        })
                      : t('loading')}
                  </pre>
                </ScrollArea>
                <Button onClick={handleCopy} className="w-full">
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? t('copied') : t('copyMarkdownBtn')}
                </Button>
              </TabsContent>

              <TabsContent value="image" className="space-y-3">
                <div className="rounded-md border p-4 text-center">
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">{t('exportImageDescription')}</p>
                </div>
                <Button onClick={handleImageExport} className="w-full" disabled={isGeneratingImage}>
                  {isGeneratingImage ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ImageIcon className="h-4 w-4 mr-2" />
                  )}
                  {isGeneratingImage ? t('generating') : t('exportImageBtn')}
                </Button>
              </TabsContent>

              <TabsContent value="link" className="space-y-3">
                <div className="flex items-center gap-2 rounded-md border p-3">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm truncate flex-1">{window.location.href}</span>
                </div>
                <Button onClick={handleCopy} className="w-full">
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? t('copied') : t('copyLinkBtn')}
                </Button>
              </TabsContent>

              <TabsContent value="qrcode" className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">{t('qrContentDesc')}</p>
                <QRCodeGenerator
                  data={window.location.href}
                  defaultPreset="cognia"
                  showDownload
                  showCopy
                  showPresetSelector
                />
              </TabsContent>
            </Tabs>

            {/* Options */}
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-sm font-medium">{t('shareOptionsLabel')}</Label>
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="include-title" className="text-sm font-normal">
                    {t('includeTitleOption')}
                  </Label>
                  <Switch
                    id="include-title"
                    checked={includeTitle}
                    onCheckedChange={setIncludeTitle}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="include-timestamps" className="text-sm font-normal">
                    {t('includeTimestampsShareOption')}
                  </Label>
                  <Switch
                    id="include-timestamps"
                    checked={includeTimestamps}
                    onCheckedChange={setIncludeTimestamps}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="include-model" className="text-sm font-normal">
                    {t('includeModelOption')}
                  </Label>
                  <Switch
                    id="include-model"
                    checked={includeModel}
                    onCheckedChange={setIncludeModel}
                  />
                </div>
              </div>
            </div>

            {/* Message count info */}
            <p className="text-xs text-muted-foreground text-center">
              {t('messagesInfo', { count: messages.length, max: maxMessages })}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default SocialShareDialog;
