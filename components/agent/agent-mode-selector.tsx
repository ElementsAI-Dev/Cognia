'use client';

/**
 * AgentModeSelector - Select agent sub-modes in chat interface
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Bot,
  Layout,
  Code2,
  BarChart3,
  PenTool,
  Search,
  Settings,
  ChevronDown,
  Plus,
  Check,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { BUILT_IN_AGENT_MODES, type AgentModeConfig, type AgentModeType } from '@/types/agent-mode';

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  Bot,
  Layout,
  Code2,
  BarChart3,
  PenTool,
  Search,
  Settings,
};

// Render icon by name
function ModeIcon({ name, className }: { name: string; className?: string }) {
  const Icon = iconMap[name] || Bot;
  return <Icon className={className} />;
}

interface AgentModeSelectorProps {
  selectedModeId: string;
  onModeChange: (mode: AgentModeConfig) => void;
  onCustomModeCreate?: (mode: Partial<AgentModeConfig>) => void;
  disabled?: boolean;
  className?: string;
}

export function AgentModeSelector({
  selectedModeId,
  onModeChange,
  onCustomModeCreate,
  disabled,
  className,
}: AgentModeSelectorProps) {
  const t = useTranslations('agentMode');
  const tCommon = useTranslations('common');
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');

  const selectedMode = BUILT_IN_AGENT_MODES.find(m => m.id === selectedModeId) || BUILT_IN_AGENT_MODES[0];

  const handleCreateCustomMode = () => {
    if (!customName.trim()) return;

    const customMode: Partial<AgentModeConfig> = {
      id: `custom-${Date.now()}`,
      type: 'custom' as AgentModeType,
      name: customName,
      description: customDescription,
      icon: 'Settings',
      systemPrompt: customPrompt,
      outputFormat: 'text',
      previewEnabled: false,
    };

    onCustomModeCreate?.(customMode);
    setShowCustomDialog(false);
    setCustomName('');
    setCustomDescription('');
    setCustomPrompt('');
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className={cn('gap-2', className)}
          >
            <ModeIcon name={selectedMode.icon} className="h-4 w-4" />
            <span className="hidden sm:inline">{selectedMode.name}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-72">
          <div className="px-2 py-1.5">
            <p className="text-xs font-medium text-muted-foreground">{t('title')}</p>
          </div>
          <ScrollArea className="max-h-[300px]">
            {BUILT_IN_AGENT_MODES.map((mode) => {
              const isSelected = mode.id === selectedModeId;
              return (
                <DropdownMenuItem
                  key={mode.id}
                  onClick={() => onModeChange(mode)}
                  className="flex items-start gap-3 p-3"
                >
                  <div className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}>
                    <ModeIcon name={mode.icon} className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{mode.name}</span>
                      {isSelected && <Check className="h-3 w-3 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {mode.description}
                    </p>
                    {mode.previewEnabled && (
                      <Badge variant="secondary" className="mt-1 text-[10px]">
                        {t('livePreview')}
                      </Badge>
                    )}
                  </div>
                </DropdownMenuItem>
              );
            })}
          </ScrollArea>
          {onCustomModeCreate && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowCustomDialog(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {t('createCustomMode')}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Custom Mode Dialog */}
      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('createCustomMode')}</DialogTitle>
            <DialogDescription>
              {t('createCustomModeDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('name')}</Label>
              <Input
                id="name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={t('namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('description')}</Label>
              <Input
                id="description"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder={t('descriptionPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt">{t('systemPrompt')}</Label>
              <Textarea
                id="prompt"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={t('systemPromptPlaceholder')}
                className="min-h-[120px]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCustomDialog(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleCreateCustomMode} disabled={!customName.trim()}>
              {t('create')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AgentModeSelector;
