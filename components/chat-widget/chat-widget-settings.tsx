'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Kbd } from '@/components/ui/kbd';
import {
  Bot,
  MessageSquare,
  Settings2,
  Keyboard,
  RotateCcw,
  Save,
  Sparkles,
  Pin,
  Focus,
  Clock,
  MapPin,
} from 'lucide-react';
import type { ChatWidgetConfig } from '@/stores/chat';
import type { ProviderName } from '@/types';
import { CHAT_WIDGET_PROVIDERS, CHAT_WIDGET_MODELS } from '@/lib/chat-widget/constants';

interface ChatWidgetSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ChatWidgetConfig;
  onUpdateConfig: (config: Partial<ChatWidgetConfig>) => void;
  onResetConfig: () => void;
}


export function ChatWidgetSettings({
  open,
  onOpenChange,
  config,
  onUpdateConfig,
  onResetConfig,
}: ChatWidgetSettingsProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:max-w-[400px]">
        {open && (
          <ChatWidgetSettingsContent
            config={config}
            onUpdateConfig={onUpdateConfig}
            onResetConfig={onResetConfig}
            onClose={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

interface ChatWidgetSettingsContentProps {
  config: ChatWidgetConfig;
  onUpdateConfig: (config: Partial<ChatWidgetConfig>) => void;
  onResetConfig: () => void;
  onClose: () => void;
}

function ChatWidgetSettingsContent({
  config,
  onUpdateConfig,
  onResetConfig,
  onClose,
}: ChatWidgetSettingsContentProps) {
  const t = useTranslations('chatWidget.settings');
  const [localConfig, setLocalConfig] = useState(config);

  // Sync localConfig when external config changes (e.g. from Tauri events)
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleSave = () => {
    onUpdateConfig(localConfig);
    onClose();
  };

  const handleProviderChange = (provider: ProviderName) => {
    const models = CHAT_WIDGET_MODELS[provider];
    const defaultModel = models?.[0]?.value || '';
    setLocalConfig((prev) => ({
      ...prev,
      provider,
      model: defaultModel,
    }));
  };

  return (
    <>
      <SheetHeader className="space-y-1 pb-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <SheetTitle className="text-lg">{t('title')}</SheetTitle>
            <p className="text-xs text-muted-foreground">{t('description')}</p>
          </div>
        </div>
      </SheetHeader>

      <ScrollArea className="h-[calc(100vh-200px)] mt-4 pr-4">
        <div className="space-y-5">
          {/* AI Model Section */}
          <div
            className={cn(
              'rounded-xl border border-border/50 bg-card/50 p-4 space-y-4',
              'hover:border-border/80 transition-colors'
            )}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <Bot className="h-4 w-4 text-primary" />
              <span>{t('aiModel')}</span>
            </div>

            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t('provider')}</Label>
                <Select
                  value={localConfig.provider}
                  onValueChange={(v) => handleProviderChange(v as ProviderName)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t('selectProvider')} />
                  </SelectTrigger>
                  <SelectContent>
                    {CHAT_WIDGET_PROVIDERS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t('model')}</Label>
                <Select
                  value={localConfig.model}
                  onValueChange={(v) => setLocalConfig((prev) => ({ ...prev, model: v }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t('selectModel')} />
                  </SelectTrigger>
                  <SelectContent>
                    {CHAT_WIDGET_MODELS[localConfig.provider]?.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* System Prompt Section */}
          <div
            className={cn(
              'rounded-xl border border-border/50 bg-card/50 p-4 space-y-3',
              'hover:border-border/80 transition-colors'
            )}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span>{t('systemPrompt')}</span>
            </div>
            <Textarea
              value={localConfig.systemPrompt}
              onChange={(e) =>
                setLocalConfig((prev) => ({
                  ...prev,
                  systemPrompt: e.target.value,
                }))
              }
              placeholder={t('systemPromptPlaceholder')}
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          {/* Behavior Settings Section */}
          <div
            className={cn(
              'rounded-xl border border-border/50 bg-card/50 p-4 space-y-3',
              'hover:border-border/80 transition-colors'
            )}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <Settings2 className="h-4 w-4 text-primary" />
              <span>{t('behavior')}</span>
            </div>

            <div className="space-y-1">
              <SettingRow
                icon={<Pin className="h-3.5 w-3.5" />}
                label={t('alwaysOnTop')}
                description={t('alwaysOnTopDesc')}
              >
                <Switch
                  id="pinned"
                  checked={localConfig.pinned}
                  onCheckedChange={(checked) =>
                    setLocalConfig((prev) => ({ ...prev, pinned: checked }))
                  }
                />
              </SettingRow>

              <SettingRow
                icon={<Focus className="h-3.5 w-3.5" />}
                label={t('autoFocus')}
                description={t('autoFocusDesc')}
              >
                <Switch
                  id="autoFocus"
                  checked={localConfig.autoFocus}
                  onCheckedChange={(checked) =>
                    setLocalConfig((prev) => ({ ...prev, autoFocus: checked }))
                  }
                />
              </SettingRow>

              <SettingRow
                icon={<Clock className="h-3.5 w-3.5" />}
                label={t('showTimestamps')}
                description={t('showTimestampsDesc')}
              >
                <Switch
                  id="showTimestamps"
                  checked={localConfig.showTimestamps}
                  onCheckedChange={(checked) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      showTimestamps: checked,
                    }))
                  }
                />
              </SettingRow>

              <SettingRow
                icon={<MapPin className="h-3.5 w-3.5" />}
                label={t('rememberPosition')}
                description={t('rememberPositionDesc')}
              >
                <Switch
                  id="rememberPosition"
                  checked={localConfig.rememberPosition}
                  onCheckedChange={(checked) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      rememberPosition: checked,
                    }))
                  }
                />
              </SettingRow>
            </div>
          </div>

          {/* Shortcut Section */}
          <div
            className={cn(
              'rounded-xl border border-border/50 bg-card/50 p-4 space-y-2',
              'hover:border-border/80 transition-colors'
            )}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <Keyboard className="h-4 w-4 text-primary" />
              <span>{t('shortcuts')}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Kbd className="px-2 py-1">
                {localConfig.shortcut.replace('CommandOrControl', 'Ctrl')}
              </Kbd>
              <span>{t('toggleAssistant')}</span>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-border/50">
        <Button variant="outline" className="flex-1 h-9" onClick={onResetConfig}>
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          {t('reset')}
        </Button>
        <Button className="flex-1 h-9" onClick={handleSave}>
          <Save className="h-3.5 w-3.5 mr-1.5" />
          {t('save')}
        </Button>
      </div>
    </>
  );
}

interface SettingRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  children: React.ReactNode;
}

function SettingRow({ icon, label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between py-2 px-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2.5">
        <div className="text-muted-foreground">{icon}</div>
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
      {children}
    </div>
  );
}
