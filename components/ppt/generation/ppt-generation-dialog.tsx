'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Sparkles, Users, Target, MessageSquare, Palette } from 'lucide-react';
import { DEFAULT_PPT_THEMES } from '@/types/workflow';
import type { PPTGenerationConfig } from '@/hooks/ppt';

// Re-export for convenience
export type { PPTGenerationConfig };

export interface PPTGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (config: PPTGenerationConfig) => Promise<void>;
  isGenerating?: boolean;
  initialTopic?: string;
}

const PURPOSES = [
  { value: 'informative', label: 'Informative', icon: '📚' },
  { value: 'persuasive', label: 'Persuasive', icon: '💡' },
  { value: 'educational', label: 'Educational', icon: '🎓' },
  { value: 'pitch', label: 'Business Pitch', icon: '📈' },
  { value: 'report', label: 'Report', icon: '📊' },
];

const TONES = [
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
  { value: 'professional', label: 'Professional' },
  { value: 'creative', label: 'Creative' },
];

const AUDIENCES = [
  'General Public',
  'Business Professionals',
  'Students',
  'Technical Experts',
  'Executives',
  'Sales Team',
  'Custom...',
];

/**
 * PPTGenerationDialog - Dialog for collecting PPT generation requirements
 */
export function PPTGenerationDialog({
  open,
  onOpenChange,
  onGenerate,
  isGenerating = false,
  initialTopic = '',
}: PPTGenerationDialogProps) {
  const t = useTranslations('pptGenerator');

  const [config, setConfig] = useState<PPTGenerationConfig>({
    topic: initialTopic,
    description: '',
    audience: 'General Public',
    purpose: 'informative',
    tone: 'professional',
    slideCount: 10,
    theme: DEFAULT_PPT_THEMES[0],
    language: 'zh-CN',
    includeImages: true,
    includeCharts: false,
  });

  const [customAudience, setCustomAudience] = useState('');
  const [showCustomAudience, setShowCustomAudience] = useState(false);

  const handleAudienceChange = useCallback(
    (value: string) => {
      if (value === 'Custom...') {
        setShowCustomAudience(true);
        setConfig((prev) => ({ ...prev, audience: customAudience || '' }));
      } else {
        setShowCustomAudience(false);
        setConfig((prev) => ({ ...prev, audience: value }));
      }
    },
    [customAudience]
  );

  const handleGenerate = useCallback(async () => {
    if (!config.topic.trim()) return;
    await onGenerate(config);
  }, [config, onGenerate]);

  const isValid = config.topic.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('generatePPT')}
          </DialogTitle>
          <DialogDescription>{t('generateDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Topic */}
          <div className="space-y-2">
            <Label htmlFor="topic" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {t('topic')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="topic"
              placeholder={t('topicPlaceholder')}
              value={config.topic}
              onChange={(e) => setConfig((prev) => ({ ...prev, topic: e.target.value }))}
              className="font-medium"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('additionalDetails')}</Label>
            <Textarea
              id="description"
              placeholder={t('descriptionPlaceholder')}
              value={config.description}
              onChange={(e) => setConfig((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Audience & Purpose Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Audience */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('audience')}
              </Label>
              <Select
                value={showCustomAudience ? 'Custom...' : config.audience}
                onValueChange={handleAudienceChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUDIENCES.map((audience) => (
                    <SelectItem key={audience} value={audience}>
                      {audience}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showCustomAudience && (
                <Input
                  placeholder={t('customAudiencePlaceholder')}
                  value={customAudience}
                  onChange={(e) => {
                    setCustomAudience(e.target.value);
                    setConfig((prev) => ({ ...prev, audience: e.target.value }));
                  }}
                  className="mt-2"
                />
              )}
            </div>

            {/* Purpose */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                {t('purpose')}
              </Label>
              <Select
                value={config.purpose}
                onValueChange={(value) =>
                  setConfig((prev) => ({
                    ...prev,
                    purpose: value as PPTGenerationConfig['purpose'],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PURPOSES.map((purpose) => (
                    <SelectItem key={purpose.value} value={purpose.value}>
                      <span className="flex items-center gap-2">
                        <span>{purpose.icon}</span>
                        <span>{purpose.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <Label>{t('tone')}</Label>
            <div className="flex flex-wrap gap-2">
              {TONES.map((tone) => (
                <Badge
                  key={tone.value}
                  variant={config.tone === tone.value ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      tone: tone.value as PPTGenerationConfig['tone'],
                    }))
                  }
                >
                  {tone.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Slide Count */}
          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span>{t('slideCount')}</span>
              <span className="text-muted-foreground">
                {config.slideCount} {t('slides')}
              </span>
            </Label>
            <Slider
              value={[config.slideCount]}
              onValueChange={([value]) => setConfig((prev) => ({ ...prev, slideCount: value }))}
              min={5}
              max={30}
              step={1}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5 {t('slides')}</span>
              <span>30 {t('slides')}</span>
            </div>
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              {t('theme')}
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {DEFAULT_PPT_THEMES.slice(0, 8).map((theme) => (
                <button
                  key={theme.id}
                  className={`p-2 rounded-lg border transition-all ${
                    config.theme.id === theme.id
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setConfig((prev) => ({ ...prev, theme }))}
                >
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: theme.primaryColor }}
                    />
                    <span className="text-xs truncate">{theme.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-images"
                checked={config.includeImages}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, includeImages: checked === true }))
                }
              />
              <Label htmlFor="include-images" className="text-sm cursor-pointer">
                {t('includeImages')}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-charts"
                checked={config.includeCharts}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, includeCharts: checked === true }))
                }
              />
              <Label htmlFor="include-charts" className="text-sm cursor-pointer">
                {t('includeCharts')}
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            {t('cancel')}
          </Button>
          <Button onClick={handleGenerate} disabled={!isValid || isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('generating')}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {t('generate')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PPTGenerationDialog;
