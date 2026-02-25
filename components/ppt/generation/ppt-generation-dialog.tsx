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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { LoadingSpinner } from '@/components/ui/loading-states';
import { Sparkles, Users, Target, MessageSquare, Palette } from 'lucide-react';
import { DEFAULT_PPT_THEMES } from '@/types/workflow';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PPT_WORKFLOW_TEMPLATES } from '@/lib/ai/workflows/ppt-workflow';
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

const THEME_IDS_BY_GROUP: Record<string, string[]> = {
  'Basic': ['modern-dark', 'modern-light', 'professional', 'creative', 'minimal', 'nature'],
  'Business': ['corporate-blue', 'executive', 'finance'],
  'Technology': ['tech-startup', 'cyber', 'ai-future'],
  'Education': ['academic', 'classroom', 'research'],
  'Creative': ['gradient-wave', 'sunset', 'ocean'],
  'Special': ['pitch-deck', 'medical', 'legal'],
};

const THEME_GROUPS = Object.entries(THEME_IDS_BY_GROUP).map(([label, ids]) => ({
  label,
  themes: ids
    .map((id) => DEFAULT_PPT_THEMES.find((th) => th.id === id))
    .filter(Boolean) as typeof DEFAULT_PPT_THEMES,
}));

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

  const handleSelectTemplate = useCallback((templateId: string) => {
    const tpl = PPT_WORKFLOW_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    const inputs = tpl.presetInputs as Record<string, unknown> | undefined;
    const presetConfig = tpl.presetConfig as Record<string, unknown> | undefined;
    setConfig((prev) => ({
      ...prev,
      ...(inputs?.style ? { tone: inputs.style as PPTGenerationConfig['tone'] } : {}),
      ...(inputs?.slideCount ? { slideCount: inputs.slideCount as number } : {}),
      ...(presetConfig?.includeImages !== undefined ? { includeImages: presetConfig.includeImages as boolean } : {}),
      ...(presetConfig?.includeNotes !== undefined ? {} : {}),
    }));
  }, []);

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
          {/* Quick Templates */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {PPT_WORKFLOW_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleSelectTemplate(tpl.id)}
                className="shrink-0 flex flex-col items-center gap-1 rounded-lg border px-3 py-2 text-xs hover:bg-accent hover:border-primary/50 transition-colors"
              >
                <span className="font-medium">{tpl.name}</span>
                <span className="text-[10px] text-muted-foreground max-w-[100px] truncate">{tpl.description}</span>
              </button>
            ))}
          </div>

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

          {/* Theme — grouped by category, showing all available themes */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              {t('theme')}
            </Label>
            <ScrollArea className="max-h-48">
              <ToggleGroup
                type="single"
                value={config.theme.id}
                onValueChange={(value) => {
                  const found = DEFAULT_PPT_THEMES.find((th) => th.id === value);
                  if (found) setConfig((prev) => ({ ...prev, theme: found }));
                }}
                className="flex flex-col gap-2"
              >
                {THEME_GROUPS.filter((group) => group.themes.length > 0).map((group) => (
                  <div key={group.label}>
                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      {group.label}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {group.themes.map((theme) => (
                        <ToggleGroupItem
                          key={theme.id}
                          value={theme.id}
                          className="p-1.5 h-auto data-[state=on]:border-primary data-[state=on]:ring-2 data-[state=on]:ring-primary/20"
                        >
                          <div className="flex items-center gap-1">
                            <div
                              className="w-3 h-3 rounded-full shrink-0 ring-1 ring-black/10"
                              style={{ backgroundColor: theme.primaryColor }}
                            />
                            <span className="text-[10px] truncate">{theme.name}</span>
                          </div>
                        </ToggleGroupItem>
                      ))}
                    </div>
                  </div>
                ))}
              </ToggleGroup>
            </ScrollArea>
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
                <LoadingSpinner size="sm" className="mr-2" />
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
