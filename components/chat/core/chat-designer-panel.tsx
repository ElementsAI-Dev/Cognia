'use client';

/**
 * ChatDesignerPanel - Integrated designer panel for chat interface
 * Shows live preview when in web-design agent mode
 * Enhanced with AI editing capabilities
 */

import { useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { X, Maximize2, Minimize2, ExternalLink, Sparkles, Send, Loader2, ChevronUp, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ReactSandbox } from '@/components/designer';
import { useArtifactStore } from '@/stores';
import { AI_SUGGESTIONS } from '@/lib/designer';
import { useAIConversation } from '@/hooks/designer';

interface ChatDesignerPanelProps {
  code: string;
  onCodeChange?: (code: string) => void;
  onClose?: () => void;
  className?: string;
  showAIPanel?: boolean;
}

export function ChatDesignerPanel({
  code,
  onCodeChange,
  onClose,
  className,
  showAIPanel: initialShowAI = false,
}: ChatDesignerPanelProps) {
  const t = useTranslations('designer');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(initialShowAI);
  const [aiPrompt, setAIPrompt] = useState('');
  const [aiError, setAIError] = useState<string | null>(null);
  const aiAppliedRef = useRef(false);
  const handleAICodeChange = useCallback((nextCode: string) => {
    aiAppliedRef.current = true;
    onCodeChange?.(nextCode);
  }, [onCodeChange]);
  const { sendMessage, isProcessing: isAIProcessing } = useAIConversation({
    designerId: 'chat-designer-panel',
    initialCode: code,
    onCodeChange: handleAICodeChange,
    onError: setAIError,
  });

  // Canvas integration
  const createCanvasDocument = useArtifactStore((state) => state.createCanvasDocument);
  const setActiveCanvas = useArtifactStore((state) => state.setActiveCanvas);
  const openPanel = useArtifactStore((state) => state.openPanel);

  const handleOpenInCanvas = useCallback(() => {
    const docId = createCanvasDocument({
      title: 'Chat Design Code',
      content: code,
      language: 'jsx',
      type: 'code',
    });
    setActiveCanvas(docId);
    openPanel('canvas');
  }, [code, createCanvasDocument, setActiveCanvas, openPanel]);

  const handleOpenInDesigner = useCallback(() => {
    // Store code in sessionStorage to avoid URL length limits
    const designerKey = `designer-code-${Date.now()}`;
    sessionStorage.setItem(designerKey, code);
    window.open(`/designer?key=${designerKey}`, '_blank');
  }, [code]);

  const handleAIEdit = useCallback(async () => {
    if (!aiPrompt.trim() || !onCodeChange) return;

    setAIError(null);
    aiAppliedRef.current = false;
    await sendMessage(aiPrompt);

    if (aiAppliedRef.current) {
      setAIPrompt('');
      setShowAIPanel(false);
    }
  }, [aiPrompt, onCodeChange, sendMessage]);

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex flex-col border rounded-lg bg-background overflow-hidden transition-all duration-300',
          isExpanded ? 'h-[600px]' : 'h-[400px]',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-3 py-2 bg-muted/30">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {t('livePreview')}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {/* AI Edit Toggle */}
            {onCodeChange && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showAIPanel ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setShowAIPanel(!showAIPanel)}
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('aiEdit')}</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleOpenInCanvas}
                >
                  <FileCode className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('editInCanvas')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleOpenInDesigner}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('openFullDesigner')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isExpanded ? t('minimize') : t('maximize')}</TooltipContent>
            </Tooltip>
            {onClose && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onClose}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('close')}</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* AI Panel */}
        {showAIPanel && (
          <div className="border-b bg-muted/30 p-3">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <Textarea
                  value={aiPrompt}
                  onChange={(e) => setAIPrompt(e.target.value)}
                  placeholder={t('aiEditPlaceholder')}
                  className="min-h-[60px] resize-none text-sm"
                  disabled={isAIProcessing}
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {AI_SUGGESTIONS.slice(0, 3).map((suggestion) => (
                    <Badge
                      key={suggestion}
                      variant="outline"
                      className="cursor-pointer hover:bg-muted text-xs"
                      onClick={() => setAIPrompt(suggestion)}
                    >
                      {suggestion}
                    </Badge>
                  ))}
                </div>
                {aiError && (
                  <Alert variant="destructive" className="mt-2 py-2">
                    <AlertDescription className="text-xs">{aiError}</AlertDescription>
                  </Alert>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  size="sm"
                  onClick={handleAIEdit}
                  disabled={!aiPrompt.trim() || isAIProcessing}
                >
                  {isAIProcessing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5 mr-1" />
                      {t('edit')}
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAIPanel(false)}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Sandbox */}
        <div className="flex-1 overflow-hidden">
          <ReactSandbox
            code={code}
            onCodeChange={onCodeChange}
            showFileExplorer={false}
            showConsole={false}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

export default ChatDesignerPanel;
