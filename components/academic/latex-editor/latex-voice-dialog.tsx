'use client';

/**
 * LaTeX Voice Dialog - Voice input for mathematical expressions
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Mic,
  MicOff,
  Check,
  Copy,
  Volume2,
  AlertCircle,
} from 'lucide-react';
import {
  VoiceToLaTeXService,
  isVoiceRecognitionSupported,
  getMathVocabulary,
  type VoiceRecognitionState,
} from '@/lib/latex';
import { cn } from '@/lib/utils';

export interface LatexVoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (latex: string) => void;
}

const SUPPORTED_LANGUAGES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'zh-CN', label: '中文 (简体)' },
  { value: 'zh-TW', label: '中文 (繁體)' },
  { value: 'ja-JP', label: '日本語' },
  { value: 'ko-KR', label: '한국어' },
  { value: 'de-DE', label: 'Deutsch' },
  { value: 'fr-FR', label: 'Français' },
  { value: 'es-ES', label: 'Español' },
];

export function LatexVoiceDialog({
  open,
  onOpenChange,
  onInsert,
}: LatexVoiceDialogProps) {
  const t = useTranslations('latex');
  const [language, setLanguage] = useState('en-US');
  const [state, setState] = useState<Omit<VoiceRecognitionState, 'isSupported'>>({
    isListening: false,
    error: null,
    interimTranscript: '',
    finalTranscript: '',
    latex: '',
  });
  const [copied, setCopied] = useState(false);
  const [showVocabulary, setShowVocabulary] = useState(false);

  const serviceRef = useRef<VoiceToLaTeXService | null>(null);

  // Check support on mount - use separate state for static value
  const isSupported = isVoiceRecognitionSupported();

  // Initialize service when language changes
  useEffect(() => {
    serviceRef.current = new VoiceToLaTeXService(
      {
        language,
        continuous: true,
        interimResults: true,
      },
      {
        onResult: (result) => {
          setState((prev) => ({
            ...prev,
            finalTranscript: result.transcript,
            latex: result.latex,
            isListening: false,
          }));
        },
        onError: (error) => {
          setState((prev) => ({
            ...prev,
            error,
            isListening: false,
          }));
        },
        onInterim: (transcript, latex) => {
          setState((prev) => ({
            ...prev,
            interimTranscript: transcript,
            latex,
          }));
        },
        onEnd: () => {
          setState((prev) => ({ ...prev, isListening: false }));
        },
      }
    );
  }, [language]);

  const handleStartListening = useCallback(() => {
    if (!serviceRef.current) return;

    setState((prev) => ({
      ...prev,
      isListening: true,
      error: null,
      interimTranscript: '',
    }));

    serviceRef.current.start();
  }, []);

  const handleStopListening = useCallback(() => {
    serviceRef.current?.stop();
    setState((prev) => ({ ...prev, isListening: false }));
  }, []);

  const handleClear = useCallback(() => {
    setState((prev) => ({
      ...prev,
      interimTranscript: '',
      finalTranscript: '',
      latex: '',
      error: null,
    }));
  }, []);

  const handleCopyLatex = useCallback(async () => {
    if (!state.latex) return;
    await navigator.clipboard.writeText(state.latex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [state.latex]);

  const handleInsert = useCallback(() => {
    if (state.latex) {
      onInsert(state.latex);
      onOpenChange(false);
      handleClear();
    }
  }, [state.latex, onInsert, onOpenChange, handleClear]);

  const vocabulary = getMathVocabulary(language);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            {t('voiceInput', { defaultValue: 'Voice Input' })}
          </DialogTitle>
          <DialogDescription>
            {t('voiceDescription', {
              defaultValue: 'Speak mathematical expressions to convert them to LaTeX',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Not supported warning */}
          {!isSupported && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">
                {t('voiceNotSupported', {
                  defaultValue: 'Voice recognition is not supported in this browser',
                })}
              </span>
            </div>
          )}

          {/* Language Selection */}
          <div className="flex items-center gap-3">
            <Label htmlFor="language" className="shrink-0">
              {t('language', { defaultValue: 'Language' })}
            </Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language" className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Recording Area */}
          <div className="flex flex-col items-center py-6 space-y-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={state.isListening ? handleStopListening : handleStartListening}
              disabled={!isSupported}
              className={cn(
                'w-24 h-24 rounded-full flex items-center justify-center transition-all',
                'border-4',
                state.isListening
                  ? 'bg-red-500 border-red-600 text-white animate-pulse hover:bg-red-600'
                  : 'bg-primary/10 border-primary text-primary hover:bg-primary/20',
                !isSupported && 'opacity-50 cursor-not-allowed'
              )}
            >
              {state.isListening ? (
                <MicOff className="h-10 w-10" />
              ) : (
                <Mic className="h-10 w-10" />
              )}
            </Button>

            <p className="text-sm text-muted-foreground">
              {state.isListening
                ? t('listening', { defaultValue: 'Listening...' })
                : t('clickToSpeak', { defaultValue: 'Click to start speaking' })}
            </p>
          </div>

          {/* Error Display */}
          {state.error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{state.error}</span>
            </div>
          )}

          {/* Transcript Display */}
          {(state.interimTranscript || state.finalTranscript) && (
            <div className="space-y-2">
              <Label>{t('transcript', { defaultValue: 'Transcript' })}</Label>
              <div className="p-3 bg-muted rounded-md text-sm">
                <span>{state.finalTranscript}</span>
                {state.interimTranscript && (
                  <span className="text-muted-foreground italic">
                    {state.interimTranscript}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* LaTeX Result */}
          {state.latex && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('convertedLatex', { defaultValue: 'Converted LaTeX' })}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyLatex}
                  className="h-8 gap-1"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <div className="p-3 bg-muted rounded-md font-mono text-sm break-all">
                {state.latex}
              </div>
            </div>
          )}

          <Separator />

          {/* Vocabulary Reference */}
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowVocabulary(!showVocabulary)}
              className="gap-2 text-muted-foreground"
            >
              <Volume2 className="h-4 w-4" />
              {showVocabulary
                ? t('hideVocabulary', { defaultValue: 'Hide vocabulary' })
                : t('showVocabulary', { defaultValue: 'Show vocabulary hints' })}
            </Button>

            {showVocabulary && (
              <ScrollArea className="h-40 border rounded-md p-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(vocabulary)
                    .slice(0, 40)
                    .map(([word, latex]) => (
                      <div key={word} className="flex justify-between gap-2">
                        <span className="text-muted-foreground">{word}</span>
                        <Badge variant="outline" className="font-mono text-xs">
                          {latex}
                        </Badge>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClear} disabled={!state.latex}>
            {t('clear', { defaultValue: 'Clear' })}
          </Button>
          <Button onClick={handleInsert} disabled={!state.latex}>
            {t('insert', { defaultValue: 'Insert' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default LatexVoiceDialog;
