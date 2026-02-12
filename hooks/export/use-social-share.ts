import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { Session, UIMessage } from '@/types';
import type { ShareFormat } from '@/types/export/social-share';
import {
  type SocialPlatform,
  generateShareContent,
  openSharePopup,
  copyToClipboard,
  generateWeChatQRCode,
  nativeShare,
  generateShareableMarkdown,
} from '@/lib/export/social/social-share';
import { exportToImage } from '@/lib/export/image/image-export';

/**
 * Hook for social share — content generation, platform sharing, copy, image export, QR
 */
export function useSocialShare(
  session: Session,
  messages: UIMessage[],
  t: (key: string) => string
) {
  const [shareFormat, setShareFormat] = useState<ShareFormat>('text');
  const [copied, setCopied] = useState(false);
  const [wechatQR, setWechatQR] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Share options
  const [includeTitle, setIncludeTitle] = useState(true);
  const [includeTimestamps, setIncludeTimestamps] = useState(false);
  const [includeModel, setIncludeModel] = useState(true);
  const [maxMessages] = useState(10);

  const shareContent = useCallback(() => {
    if (messages.length === 0) return null;

    return generateShareContent(session, messages, {
      maxMessages,
      includeTimestamps,
      includeModel,
    });
  }, [session, messages, maxMessages, includeTimestamps, includeModel]);

  const handlePlatformShare = useCallback(
    async (platform: SocialPlatform) => {
      const content = shareContent();
      if (!content) return;

      if (platform === 'wechat') {
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
    },
    [shareContent, t]
  );

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

  const closeQRCode = useCallback(() => {
    setWechatQR(null);
  }, []);

  const content = shareContent();

  return {
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
  };
}
