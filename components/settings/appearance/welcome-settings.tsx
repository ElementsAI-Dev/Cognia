'use client';

/**
 * WelcomeSettings - Configure welcome page appearance and content
 * Includes greeting customization, section visibility, custom suggestions, and quick access links
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Sparkles,
  RotateCcw,
  Eye,
  EyeOff,
  MessageSquare,
  Link2,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  GripVertical,
  ChevronDown,
  ChevronUp,
  User,
  Clock,
  Layout,
  Smile,
  Palette,
  Zap,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { useSettingsStore } from '@/stores';
import type { ChatMode } from '@/types/core';
import type {
  CustomSuggestion,
  SuggestionIconType,
  WelcomeSectionVisibility,
  WelcomeLayoutStyle,
} from '@/types/settings/welcome';
import { DEFAULT_QUICK_ACCESS_LINKS } from '@/types/settings/welcome';
import { cn } from '@/lib/utils';

// Icon options for suggestions
const ICON_OPTIONS: { value: SuggestionIconType; label: string }[] = [
  { value: 'MessageSquare', label: '💬 Message' },
  { value: 'Code', label: '💻 Code' },
  { value: 'FileText', label: '📄 File' },
  { value: 'Globe', label: '🌐 Globe' },
  { value: 'Brain', label: '🧠 Brain' },
  { value: 'Wrench', label: '🔧 Wrench' },
  { value: 'BookOpen', label: '📖 Book' },
  { value: 'TrendingUp', label: '📈 Trend' },
  { value: 'Lightbulb', label: '💡 Idea' },
  { value: 'Database', label: '🗃️ Data' },
  { value: 'Image', label: '🖼️ Image' },
  { value: 'Languages', label: '🌍 Languages' },
  { value: 'Search', label: '🔍 Search' },
  { value: 'Zap', label: '⚡ Zap' },
  { value: 'HelpCircle', label: '❓ Help' },
  { value: 'Target', label: '🎯 Target' },
  { value: 'Sparkles', label: '✨ Sparkles' },
  { value: 'Bot', label: '🤖 Bot' },
  { value: 'GraduationCap', label: '🎓 Learn' },
  { value: 'Wand2', label: '🪄 Wand' },
  { value: 'FolderKanban', label: '📁 Folder' },
];

// Color options for quick access links
const COLOR_OPTIONS = [
  { value: 'purple', label: '💜 Purple', class: 'bg-purple-500' },
  { value: 'blue', label: '💙 Blue', class: 'bg-blue-500' },
  { value: 'green', label: '💚 Green', class: 'bg-green-500' },
  { value: 'orange', label: '🧡 Orange', class: 'bg-orange-500' },
  { value: 'red', label: '❤️ Red', class: 'bg-red-500' },
  { value: 'pink', label: '💗 Pink', class: 'bg-pink-500' },
  { value: 'yellow', label: '💛 Yellow', class: 'bg-yellow-500' },
  { value: 'cyan', label: '💠 Cyan', class: 'bg-cyan-500' },
];

// Mode options
const MODE_OPTIONS: { value: ChatMode; label: string }[] = [
  { value: 'chat', label: '💬 Chat' },
  { value: 'agent', label: '🤖 Agent' },
  { value: 'research', label: '🔍 Research' },
  { value: 'learning', label: '🎓 Learning' },
];

// Section visibility options
const SECTION_OPTIONS: { key: keyof WelcomeSectionVisibility; labelKey: string }[] = [
  { key: 'header', labelKey: 'showHeader' },
  { key: 'featureBadges', labelKey: 'showFeatureBadges' },
  { key: 'modeSwitcher', labelKey: 'showModeSwitcher' },
  { key: 'templateSelector', labelKey: 'showTemplateSelector' },
  { key: 'suggestions', labelKey: 'showSuggestions' },
  { key: 'quickAccess', labelKey: 'showQuickAccess' },
  { key: 'a2uiDemo', labelKey: 'showA2UIDemo' },
];

interface SuggestionEditorProps {
  suggestion: CustomSuggestion;
  onUpdate: (updates: Partial<CustomSuggestion>) => void;
  onDelete: () => void;
  t: (key: string) => string;
}

function SuggestionEditor({ suggestion, onUpdate, onDelete, t }: SuggestionEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(suggestion);

  const handleSave = () => {
    onUpdate(editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData(suggestion);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-2">
          <Select
            value={editData.icon}
            onValueChange={(value) =>
              setEditData({ ...editData, icon: value as SuggestionIconType })
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ICON_OPTIONS.map((icon) => (
                <SelectItem key={icon.value} value={icon.value}>
                  {icon.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={editData.title}
            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
            placeholder={t('suggestionTitle')}
            className="flex-1"
          />
        </div>
        <Input
          value={editData.description}
          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
          placeholder={t('suggestionDescription')}
        />
        <Textarea
          value={editData.prompt}
          onChange={(e) => setEditData({ ...editData, prompt: e.target.value })}
          placeholder={t('suggestionPrompt')}
          rows={2}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              checked={editData.enabled}
              onCheckedChange={(enabled) => setEditData({ ...editData, enabled })}
            />
            <span className="text-sm text-muted-foreground">{t('enabled')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="h-4 w-4 mr-1" />
              {t('cancel')}
            </Button>
            <Button variant="default" size="sm" onClick={handleSave}>
              <Check className="h-4 w-4 mr-1" />
              {t('save')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border bg-card/50 transition-colors',
        !suggestion.enabled && 'opacity-50'
      )}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{suggestion.title}</span>
          {!suggestion.enabled && (
            <span className="text-xs text-muted-foreground">({t('disabled')})</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{suggestion.description}</p>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditing(true)}>
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function WelcomeSettings() {
  const t = useTranslations('welcomeSettings');
  const [selectedMode, setSelectedMode] = useState<ChatMode>('chat');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [quickAccessOpen, setQuickAccessOpen] = useState(false);
  const [personalizationOpen, setPersonalizationOpen] = useState(false);
  const [simplifiedSuggestionsOpen, setSimplifiedSuggestionsOpen] = useState(false);
  const [selectedSimplifiedMode, setSelectedSimplifiedMode] = useState<ChatMode>('chat');

  // Store selectors
  const welcomeSettings = useSettingsStore((state) => state.welcomeSettings);
  const setWelcomeEnabled = useSettingsStore((state) => state.setWelcomeEnabled);
  const setWelcomeCustomGreeting = useSettingsStore((state) => state.setWelcomeCustomGreeting);
  const setWelcomeCustomDescription = useSettingsStore(
    (state) => state.setWelcomeCustomDescription
  );
  const setWelcomeSectionVisibility = useSettingsStore(
    (state) => state.setWelcomeSectionVisibility
  );
  const addWelcomeCustomSuggestion = useSettingsStore((state) => state.addWelcomeCustomSuggestion);
  const updateWelcomeCustomSuggestion = useSettingsStore(
    (state) => state.updateWelcomeCustomSuggestion
  );
  const removeWelcomeCustomSuggestion = useSettingsStore(
    (state) => state.removeWelcomeCustomSuggestion
  );
  const setWelcomeHideDefaultSuggestions = useSettingsStore(
    (state) => state.setWelcomeHideDefaultSuggestions
  );
  const setWelcomeQuickAccessLinks = useSettingsStore((state) => state.setWelcomeQuickAccessLinks);
  const addWelcomeQuickAccessLink = useSettingsStore((state) => state.addWelcomeQuickAccessLink);
  const updateWelcomeQuickAccessLink = useSettingsStore(
    (state) => state.updateWelcomeQuickAccessLink
  );
  const removeWelcomeQuickAccessLink = useSettingsStore(
    (state) => state.removeWelcomeQuickAccessLink
  );
  const setWelcomeUseCustomQuickAccess = useSettingsStore(
    (state) => state.setWelcomeUseCustomQuickAccess
  );
  const setWelcomeDefaultMode = useSettingsStore((state) => state.setWelcomeDefaultMode);
  const setWelcomeMaxSuggestions = useSettingsStore((state) => state.setWelcomeMaxSuggestions);
  const setWelcomeUserName = useSettingsStore((state) => state.setWelcomeUserName);
  const setWelcomeTimeBasedGreeting = useSettingsStore((state) => state.setWelcomeTimeBasedGreeting);
  const setWelcomeTimeBasedGreetingEnabled = useSettingsStore(
    (state) => state.setWelcomeTimeBasedGreetingEnabled
  );
  const setWelcomeLayoutStyle = useSettingsStore((state) => state.setWelcomeLayoutStyle);
  const setWelcomeIconConfig = useSettingsStore((state) => state.setWelcomeIconConfig);
  const setWelcomeGradientConfig = useSettingsStore((state) => state.setWelcomeGradientConfig);
  const setWelcomeSimplifiedSuggestions = useSettingsStore(
    (state) => state.setWelcomeSimplifiedSuggestions
  );
  const setWelcomeUseCustomSimplifiedSuggestions = useSettingsStore(
    (state) => state.setWelcomeUseCustomSimplifiedSuggestions
  );
  const resetWelcomeSettings = useSettingsStore((state) => state.resetWelcomeSettings);

  // Get simplified suggestions text for current mode (joined by newlines for textarea)
  const simplifiedSuggestionsText = useMemo(
    () => (welcomeSettings.simplifiedSuggestions[selectedSimplifiedMode] || []).join('\n'),
    [welcomeSettings.simplifiedSuggestions, selectedSimplifiedMode]
  );

  const handleSimplifiedSuggestionsChange = useCallback(
    (text: string) => {
      const suggestions = text
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 4);
      setWelcomeSimplifiedSuggestions(selectedSimplifiedMode, suggestions);
    },
    [selectedSimplifiedMode, setWelcomeSimplifiedSuggestions]
  );

  // Get current mode's suggestions
  const currentModeSuggestions = useMemo(
    () => welcomeSettings.customSuggestions[selectedMode] || [],
    [welcomeSettings.customSuggestions, selectedMode]
  );

  // Get quick access links (custom or default)
  const quickAccessLinks = useMemo(
    () =>
      welcomeSettings.useCustomQuickAccess
        ? welcomeSettings.quickAccessLinks
        : DEFAULT_QUICK_ACCESS_LINKS,
    [welcomeSettings.useCustomQuickAccess, welcomeSettings.quickAccessLinks]
  );

  const handleAddSuggestion = () => {
    addWelcomeCustomSuggestion(selectedMode, {
      icon: 'Sparkles',
      title: t('newSuggestion'),
      description: t('newSuggestionDescription'),
      prompt: '',
      enabled: true,
    });
  };

  const handleAddQuickAccessLink = () => {
    addWelcomeQuickAccessLink({
      icon: 'Link2' as SuggestionIconType,
      title: t('newLink'),
      description: t('newLinkDescription'),
      href: '/',
      color: 'blue',
      enabled: true,
    });
  };

  const handleResetToDefaultLinks = () => {
    setWelcomeUseCustomQuickAccess(false);
    setWelcomeQuickAccessLinks([]);
  };

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <CardTitle>{t('title')}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetWelcomeSettings}
              className="text-muted-foreground"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('reset')}
            </Button>
          </div>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable Welcome Page */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('enabled')}</Label>
              <p className="text-sm text-muted-foreground">{t('enabledDescription')}</p>
            </div>
            <Switch checked={welcomeSettings.enabled} onCheckedChange={setWelcomeEnabled} />
          </div>

          {/* Custom Greeting */}
          <div className="space-y-2">
            <Label>{t('customGreeting')}</Label>
            <Input
              value={welcomeSettings.customGreeting}
              onChange={(e) => setWelcomeCustomGreeting(e.target.value)}
              placeholder={t('customGreetingPlaceholder')}
            />
            <p className="text-xs text-muted-foreground">{t('customGreetingHint')}</p>
          </div>

          {/* Custom Description */}
          <div className="space-y-2">
            <Label>{t('customDescription')}</Label>
            <Textarea
              value={welcomeSettings.customDescription}
              onChange={(e) => setWelcomeCustomDescription(e.target.value)}
              placeholder={t('customDescriptionPlaceholder')}
              rows={2}
            />
          </div>

          {/* Default Mode */}
          <div className="space-y-2">
            <Label>{t('defaultMode')}</Label>
            <Select
              value={welcomeSettings.defaultMode}
              onValueChange={(value) => setWelcomeDefaultMode(value as ChatMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODE_OPTIONS.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Max Suggestions */}
          <div className="space-y-2">
            <Label>{t('maxSuggestions')}</Label>
            <Select
              value={String(welcomeSettings.maxSuggestionsPerMode)}
              onValueChange={(value) => setWelcomeMaxSuggestions(Number(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 6, 8].map((num) => (
                  <SelectItem key={num} value={String(num)}>
                    {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Section Visibility */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            <CardTitle>{t('sectionVisibility')}</CardTitle>
          </div>
          <CardDescription>{t('sectionVisibilityDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {SECTION_OPTIONS.map((section) => (
            <div key={section.key} className="flex items-center justify-between">
              <Label className="font-normal">{t(section.labelKey)}</Label>
              <Switch
                checked={welcomeSettings.sectionsVisibility[section.key]}
                onCheckedChange={(checked) =>
                  setWelcomeSectionVisibility({ [section.key]: checked })
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Custom Suggestions */}
      <Collapsible open={suggestionsOpen} onOpenChange={setSuggestionsOpen}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  <CardTitle>{t('customSuggestions')}</CardTitle>
                </div>
                {suggestionsOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CollapsibleTrigger>
            <CardDescription>{t('customSuggestionsDescription')}</CardDescription>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {/* Hide Default Suggestions */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('hideDefaultSuggestions')}</Label>
                  <p className="text-xs text-muted-foreground">{t('hideDefaultSuggestionsHint')}</p>
                </div>
                <Switch
                  checked={welcomeSettings.hideDefaultSuggestions}
                  onCheckedChange={setWelcomeHideDefaultSuggestions}
                />
              </div>

              {/* Mode Selector */}
              <div className="space-y-2">
                <Label>{t('selectMode')}</Label>
                <div className="flex gap-2">
                  {MODE_OPTIONS.map((mode) => (
                    <Button
                      key={mode.value}
                      variant={selectedMode === mode.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedMode(mode.value)}
                    >
                      {mode.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Suggestions List */}
              <div className="space-y-2">
                {currentModeSuggestions.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <EyeOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t('noCustomSuggestions')}</p>
                  </div>
                ) : (
                  currentModeSuggestions.map((suggestion) => (
                    <SuggestionEditor
                      key={suggestion.id}
                      suggestion={suggestion}
                      onUpdate={(updates) =>
                        updateWelcomeCustomSuggestion(selectedMode, suggestion.id, updates)
                      }
                      onDelete={() => removeWelcomeCustomSuggestion(selectedMode, suggestion.id)}
                      t={t}
                    />
                  ))
                )}
              </div>

              {/* Add Suggestion Button */}
              <Button variant="outline" className="w-full" onClick={handleAddSuggestion}>
                <Plus className="h-4 w-4 mr-2" />
                {t('addSuggestion')}
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Personalization - User Name, Time-Based Greeting, Icon, Gradient, Layout */}
      <Collapsible open={personalizationOpen} onOpenChange={setPersonalizationOpen}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  <CardTitle>{t('userName')}</CardTitle>
                </div>
                {personalizationOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CollapsibleTrigger>
            <CardDescription>{t('userNameHint')}</CardDescription>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* User Name */}
              <div className="space-y-2">
                <Label>{t('userName')}</Label>
                <Input
                  value={welcomeSettings.userName}
                  onChange={(e) => setWelcomeUserName(e.target.value)}
                  placeholder={t('userNamePlaceholder')}
                />
              </div>

              <Separator />

              {/* Time-Based Greeting */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-base font-medium">{t('timeBasedGreeting')}</Label>
                </div>
                <p className="text-sm text-muted-foreground">{t('timeBasedGreetingDescription')}</p>
                <div className="flex items-center justify-between">
                  <Label>{t('enableTimeBasedGreeting')}</Label>
                  <Switch
                    checked={welcomeSettings.timeBasedGreeting.enabled}
                    onCheckedChange={setWelcomeTimeBasedGreetingEnabled}
                  />
                </div>
                {welcomeSettings.timeBasedGreeting.enabled && (
                  <div className="space-y-3 pl-2 border-l-2 border-muted">
                    <div className="space-y-1.5">
                      <Label className="text-sm">{t('morningGreeting')}</Label>
                      <Input
                        value={welcomeSettings.timeBasedGreeting.morning}
                        onChange={(e) =>
                          setWelcomeTimeBasedGreeting({ morning: e.target.value })
                        }
                        placeholder={t('morningGreetingPlaceholder')}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">{t('afternoonGreeting')}</Label>
                      <Input
                        value={welcomeSettings.timeBasedGreeting.afternoon}
                        onChange={(e) =>
                          setWelcomeTimeBasedGreeting({ afternoon: e.target.value })
                        }
                        placeholder={t('afternoonGreetingPlaceholder')}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">{t('eveningGreeting')}</Label>
                      <Input
                        value={welcomeSettings.timeBasedGreeting.evening}
                        onChange={(e) =>
                          setWelcomeTimeBasedGreeting({ evening: e.target.value })
                        }
                        placeholder={t('eveningGreetingPlaceholder')}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">{t('nightGreeting')}</Label>
                      <Input
                        value={welcomeSettings.timeBasedGreeting.night}
                        onChange={(e) =>
                          setWelcomeTimeBasedGreeting({ night: e.target.value })
                        }
                        placeholder={t('nightGreetingPlaceholder')}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{t('timeGreetingHint')}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Icon Configuration */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Smile className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-base font-medium">{t('iconConfig')}</Label>
                </div>
                <p className="text-sm text-muted-foreground">{t('iconConfigDescription')}</p>
                <Select
                  value={welcomeSettings.iconConfig.type}
                  onValueChange={(value) =>
                    setWelcomeIconConfig({ type: value as 'default' | 'emoji' | 'avatar' | 'text' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">{t('iconTypeDefault')}</SelectItem>
                    <SelectItem value="emoji">{t('iconTypeEmoji')}</SelectItem>
                    <SelectItem value="avatar">{t('iconTypeAvatar')}</SelectItem>
                    <SelectItem value="text">{t('iconTypeText')}</SelectItem>
                  </SelectContent>
                </Select>
                {welcomeSettings.iconConfig.type === 'emoji' && (
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t('iconEmoji')}</Label>
                    <Input
                      value={welcomeSettings.iconConfig.emoji}
                      onChange={(e) => setWelcomeIconConfig({ emoji: e.target.value })}
                      placeholder={t('iconEmojiPlaceholder')}
                      className="w-20 text-center text-2xl"
                    />
                  </div>
                )}
                {welcomeSettings.iconConfig.type === 'avatar' && (
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t('iconAvatarUrl')}</Label>
                    <Input
                      value={welcomeSettings.iconConfig.avatarUrl}
                      onChange={(e) => setWelcomeIconConfig({ avatarUrl: e.target.value })}
                      placeholder={t('iconAvatarUrlPlaceholder')}
                    />
                  </div>
                )}
                {welcomeSettings.iconConfig.type === 'text' && (
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t('iconText')}</Label>
                    <Input
                      value={welcomeSettings.iconConfig.text}
                      onChange={(e) => setWelcomeIconConfig({ text: e.target.value })}
                      placeholder={t('iconTextPlaceholder')}
                      className="w-20 text-center"
                    />
                  </div>
                )}
              </div>

              <Separator />

              {/* Gradient Configuration */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-base font-medium">{t('gradientConfig')}</Label>
                </div>
                <p className="text-sm text-muted-foreground">{t('gradientConfigDescription')}</p>
                <div className="flex items-center justify-between">
                  <Label>{t('enableCustomGradient')}</Label>
                  <Switch
                    checked={welcomeSettings.gradientConfig.enabled}
                    onCheckedChange={(checked) =>
                      setWelcomeGradientConfig({ enabled: checked })
                    }
                  />
                </div>
                {welcomeSettings.gradientConfig.enabled && (
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t('customGradient')}</Label>
                    <Input
                      value={welcomeSettings.gradientConfig.customGradient}
                      onChange={(e) =>
                        setWelcomeGradientConfig({ customGradient: e.target.value })
                      }
                      placeholder={t('customGradientPlaceholder')}
                    />
                    <p className="text-xs text-muted-foreground">{t('customGradientHint')}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Layout Style */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Layout className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-base font-medium">{t('layoutStyle')}</Label>
                </div>
                <p className="text-sm text-muted-foreground">{t('layoutStyleDescription')}</p>
                <Select
                  value={welcomeSettings.layoutStyle}
                  onValueChange={(value) => setWelcomeLayoutStyle(value as WelcomeLayoutStyle)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">{t('layoutDefault')}</SelectItem>
                    <SelectItem value="centered">{t('layoutCentered')}</SelectItem>
                    <SelectItem value="minimal">{t('layoutMinimal')}</SelectItem>
                    <SelectItem value="hero">{t('layoutHero')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Simplified Mode Suggestions */}
      <Collapsible open={simplifiedSuggestionsOpen} onOpenChange={setSimplifiedSuggestionsOpen}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  <CardTitle>{t('simplifiedSuggestions')}</CardTitle>
                </div>
                {simplifiedSuggestionsOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CollapsibleTrigger>
            <CardDescription>{t('simplifiedSuggestionsDescription')}</CardDescription>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {/* Enable Custom Simplified Suggestions */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('enableCustomSimplifiedSuggestions')}</Label>
                </div>
                <Switch
                  checked={welcomeSettings.useCustomSimplifiedSuggestions}
                  onCheckedChange={setWelcomeUseCustomSimplifiedSuggestions}
                />
              </div>

              {welcomeSettings.useCustomSimplifiedSuggestions && (
                <>
                  {/* Mode Selector */}
                  <div className="space-y-2">
                    <Label>{t('selectMode')}</Label>
                    <div className="flex gap-2">
                      {MODE_OPTIONS.map((mode) => (
                        <Button
                          key={mode.value}
                          variant={selectedSimplifiedMode === mode.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedSimplifiedMode(mode.value)}
                        >
                          {mode.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Suggestions Textarea */}
                  <div className="space-y-2">
                    <Textarea
                      value={simplifiedSuggestionsText}
                      onChange={(e) => handleSimplifiedSuggestionsChange(e.target.value)}
                      placeholder={t('simplifiedSuggestionsPlaceholder')}
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">{t('simplifiedSuggestionsHint')}</p>
                  </div>
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Quick Access Links */}
      <Collapsible open={quickAccessOpen} onOpenChange={setQuickAccessOpen}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  <CardTitle>{t('quickAccessLinks')}</CardTitle>
                </div>
                {quickAccessOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CollapsibleTrigger>
            <CardDescription>{t('quickAccessLinksDescription')}</CardDescription>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {/* Use Custom Links */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('useCustomQuickAccess')}</Label>
                  <p className="text-xs text-muted-foreground">{t('useCustomQuickAccessHint')}</p>
                </div>
                <Switch
                  checked={welcomeSettings.useCustomQuickAccess}
                  onCheckedChange={(checked) => {
                    setWelcomeUseCustomQuickAccess(checked);
                    if (checked && welcomeSettings.quickAccessLinks.length === 0) {
                      // Copy default links as starting point
                      setWelcomeQuickAccessLinks([...DEFAULT_QUICK_ACCESS_LINKS]);
                    }
                  }}
                />
              </div>

              {/* Links List */}
              {welcomeSettings.useCustomQuickAccess && (
                <>
                  <div className="space-y-2">
                    {quickAccessLinks.map((link) => (
                      <div
                        key={link.id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border bg-card/50',
                          !link.enabled && 'opacity-50'
                        )}
                      >
                        <div
                          className={cn(
                            'h-8 w-8 rounded-lg flex items-center justify-center text-white',
                            COLOR_OPTIONS.find((c) => c.value === link.color)?.class ||
                              'bg-blue-500'
                          )}
                        >
                          <Link2 className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{link.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{link.href}</p>
                        </div>
                        <Switch
                          checked={link.enabled}
                          onCheckedChange={(enabled) =>
                            updateWelcomeQuickAccessLink(link.id, { enabled })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeWelcomeQuickAccessLink(link.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Add Link & Reset Buttons */}
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={handleAddQuickAccessLink}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('addQuickAccessLink')}
                    </Button>
                    <Button variant="ghost" onClick={handleResetToDefaultLinks}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      {t('resetToDefault')}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}

export default WelcomeSettings;
