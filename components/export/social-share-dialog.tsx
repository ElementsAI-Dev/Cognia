'use client';

/**
 * SocialShareDialog - Share chat conversations to social media platforms
 * 
 * Supports: Twitter/X, LinkedIn, Reddit, WeChat, Weibo, Telegram, Facebook, Email
 */

import { useState, useEffect, useCallback } from 'react';
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
import { toast } from 'sonner';
import { messageRepository } from '@/lib/db';
import type { Session, UIMessage } from '@/types';
import {
  type SocialPlatform,
  PLATFORM_CONFIGS,
  generateShareContent,
  openSharePopup,
  copyToClipboard,
  generateWeChatQRCode,
  nativeShare,
  isNativeShareAvailable,
  generateShareableMarkdown,
} from '@/lib/export/social/social-share';
import { exportToImage } from '@/lib/export/image/image-export';
import { QRCodeGenerator } from '@/components/export/qr';

interface SocialShareDialogProps {
  session: Session;
  trigger?: React.ReactNode;
}

type ShareFormat = 'text' | 'markdown' | 'image' | 'link' | 'qrcode';

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
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [shareFormat, setShareFormat] = useState<ShareFormat>('text');
  const [copied, setCopied] = useState(false);
  const [wechatQR, setWechatQR] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  // Share options
  const [includeTitle, setIncludeTitle] = useState(true);
  const [includeTimestamps, setIncludeTimestamps] = useState(false);
  const [includeModel, setIncludeModel] = useState(true);
  const [maxMessages] = useState(10);

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

  // Generate share content
  const shareContent = useCallback(() => {
    if (messages.length === 0) return null;
    
    return generateShareContent(session, messages, {
      maxMessages,
      includeTimestamps,
      includeModel,
    });
  }, [session, messages, maxMessages, includeTimestamps, includeModel]);

  // Handle platform share
  const handlePlatformShare = useCallback(async (platform: SocialPlatform) => {
    const content = shareContent();
    if (!content) return;

    if (platform === 'wechat') {
      // Generate QR code for WeChat
      try {
        const qrCode = await generateWeChatQRCode(content.text, { width: 256 });
        setWechatQR(qrCode);
      } catch (error) {
        console.error('Failed to generate QR code:', error);
        toast.error(t('qrCodeFailed'));
      }
      return;
    }

    const shareUrl = window.location.href;
    openSharePopup(platform, {
      title: content.title,
      description: content.summary,
      url: shareUrl,
      hashtags: ['AI', 'Cognia'],
    });
  }, [shareContent, t]);

  // Handle native share
  const handleNativeShare = useCallback(async () => {
    const content = shareContent();
    if (!content) return;

    const success = await nativeShare({
      title: content.title,
      text: content.text,
      url: window.location.href,
    });

    if (!success) {
      toast.error(t('shareFailed'));
    }
  }, [shareContent, t]);

  // Handle copy
  const handleCopy = useCallback(async () => {
    const content = shareContent();
    if (!content) return;

    let textToCopy: string;
    
    switch (shareFormat) {
      case 'markdown':
        textToCopy = generateShareableMarkdown(session, messages, {
          includeMetadata: includeModel,
          maxMessages,
        });
        break;
      case 'link':
        textToCopy = window.location.href;
        break;
      case 'text':
      default:
        textToCopy = content.text;
    }

    const success = await copyToClipboard(textToCopy);
    if (success) {
      setCopied(true);
      toast.success(t('copiedToClipboard'));
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error(t('copyFailed'));
    }
  }, [shareContent, shareFormat, session, messages, includeModel, maxMessages, t]);

  // Handle image export
  const handleImageExport = useCallback(async () => {
    if (messages.length === 0) return;

    setIsGeneratingImage(true);
    try {
      const result = await exportToImage(session, messages.slice(0, maxMessages), {
        format: 'png',
        scale: 2,
        theme: 'light',
        includeHeader: includeTitle,
        showTimestamps: includeTimestamps,
        showModel: includeModel,
      });

      // Download the image
      const link = document.createElement('a');
      link.href = result.dataUrl;
      link.download = `${session.title}-share.png`;
      link.click();

      toast.success(t('imageExported'));
    } catch (error) {
      console.error('Image export failed:', error);
      toast.error(t('imageExportFailed'));
    } finally {
      setIsGeneratingImage(false);
    }
  }, [session, messages, maxMessages, includeTitle, includeTimestamps, includeModel, t]);

  // Close QR code modal
  const closeQRCode = useCallback(() => {
    setWechatQR(null);
  }, []);

  const content = shareContent();

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
          <DialogDescription>
            {t('shareConversationDesc')}
          </DialogDescription>
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
                  <h3 className="text-lg font-semibold mb-4 text-center">{t('wechatScanToShare')}</h3>
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
                  <pre className="text-sm whitespace-pre-wrap">
                    {content?.text || t('loading')}
                  </pre>
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
                  <p className="text-sm text-muted-foreground">
                    {t('exportImageDescription')}
                  </p>
                </div>
                <Button
                  onClick={handleImageExport}
                  className="w-full"
                  disabled={isGeneratingImage}
                >
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
                <p className="text-sm text-muted-foreground text-center">
                  {t('qrContentDesc')}
                </p>
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
