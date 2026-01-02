'use client';

/**
 * ElementActionsPopover - Quick actions popover for selected elements
 * Appears near the selected element and provides common operations
 */

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Copy,
  Trash2,
  Sparkles,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useDesignerStore } from '@/stores/designer';
import { useSettingsStore } from '@/stores';
import {
  editElementWithAI,
  getDesignerAIConfig,
} from '@/lib/designer';

interface ElementActionsPopoverProps {
  className?: string;
  position?: { x: number; y: number };
  onClose?: () => void;
}

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  action: () => void;
  destructive?: boolean;
}

export function ElementActionsPopover({
  className,
  position,
  onClose,
}: ElementActionsPopoverProps) {
  const t = useTranslations('designer');
  const [aiPrompt, setAIPrompt] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [showAIInput, setShowAIInput] = useState(false);

  const selectedElementId = useDesignerStore((state) => state.selectedElementId);
  const elementMap = useDesignerStore((state) => state.elementMap);
  const code = useDesignerStore((state) => state.code);
  const setCode = useDesignerStore((state) => state.setCode);
  const parseCodeToElements = useDesignerStore((state) => state.parseCodeToElements);
  const deleteElement = useDesignerStore((state) => state.deleteElement);
  const duplicateElement = useDesignerStore((state) => state.duplicateElement);
  const updateElementStyle = useDesignerStore((state) => state.updateElementStyle);
  const syncCodeFromElements = useDesignerStore((state) => state.syncCodeFromElements);

  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const defaultProvider = useSettingsStore((state) => state.defaultProvider);

  const selectedElement = selectedElementId ? elementMap[selectedElementId] : null;

  const handleAIEdit = useCallback(async () => {
    if (!selectedElement || !aiPrompt.trim()) return;

    setIsAIProcessing(true);
    try {
      const config = getDesignerAIConfig(defaultProvider, providerSettings);
      const elementSelector = `${selectedElement.tagName}${selectedElement.className ? `.${selectedElement.className.split(' ')[0]}` : ''}`;
      
      const result = await editElementWithAI(code, elementSelector, aiPrompt, config);
      
      if (result.success && result.code) {
        setCode(result.code);
        parseCodeToElements(result.code);
        setAIPrompt('');
        setShowAIInput(false);
        onClose?.();
      }
    } catch (error) {
      console.error('AI edit failed:', error);
    } finally {
      setIsAIProcessing(false);
    }
  }, [selectedElement, aiPrompt, code, defaultProvider, providerSettings, setCode, parseCodeToElements, onClose]);

  const handleDelete = useCallback(() => {
    if (!selectedElementId) return;
    deleteElement(selectedElementId);
    syncCodeFromElements();
    onClose?.();
  }, [selectedElementId, deleteElement, syncCodeFromElements, onClose]);

  const handleDuplicate = useCallback(() => {
    if (!selectedElementId) return;
    duplicateElement(selectedElementId);
    syncCodeFromElements();
    onClose?.();
  }, [selectedElementId, duplicateElement, syncCodeFromElements, onClose]);

  const handleAlignLeft = useCallback(() => {
    if (!selectedElementId) return;
    updateElementStyle(selectedElementId, { textAlign: 'left' });
    syncCodeFromElements();
  }, [selectedElementId, updateElementStyle, syncCodeFromElements]);

  const handleAlignCenter = useCallback(() => {
    if (!selectedElementId) return;
    updateElementStyle(selectedElementId, { textAlign: 'center' });
    syncCodeFromElements();
  }, [selectedElementId, updateElementStyle, syncCodeFromElements]);

  const handleAlignRight = useCallback(() => {
    if (!selectedElementId) return;
    updateElementStyle(selectedElementId, { textAlign: 'right' });
    syncCodeFromElements();
  }, [selectedElementId, updateElementStyle, syncCodeFromElements]);

  const quickAIActions = [
    { label: 'Make bold', prompt: 'Make this element text bold' },
    { label: 'Add padding', prompt: 'Add comfortable padding to this element' },
    { label: 'Add shadow', prompt: 'Add a subtle shadow to this element' },
    { label: 'Round corners', prompt: 'Add rounded corners to this element' },
  ];

  if (!selectedElement) return null;

  const actions: QuickAction[] = [
    {
      id: 'duplicate',
      icon: <Copy className="h-4 w-4" />,
      label: t('duplicate') || 'Duplicate',
      action: handleDuplicate,
    },
    {
      id: 'delete',
      icon: <Trash2 className="h-4 w-4" />,
      label: t('delete') || 'Delete',
      action: handleDelete,
      destructive: true,
    },
  ];

  const alignActions: QuickAction[] = [
    {
      id: 'align-left',
      icon: <AlignLeft className="h-4 w-4" />,
      label: t('alignLeft') || 'Align Left',
      action: handleAlignLeft,
    },
    {
      id: 'align-center',
      icon: <AlignCenter className="h-4 w-4" />,
      label: t('alignCenter') || 'Center',
      action: handleAlignCenter,
    },
    {
      id: 'align-right',
      icon: <AlignRight className="h-4 w-4" />,
      label: t('alignRight') || 'Align Right',
      action: handleAlignRight,
    },
  ];

  return (
    <TooltipProvider>
      <div
        className={cn(
          'absolute z-50 bg-background border rounded-lg shadow-lg p-2',
          className
        )}
        style={position ? { left: position.x, top: position.y } : undefined}
      >
        <div className="flex items-center gap-2 px-2 py-1 mb-2">
          <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
            {selectedElement.tagName}
          </span>
          {selectedElement.className && (
            <span className="text-xs text-muted-foreground truncate max-w-[100px]">
              .{selectedElement.className.split(' ')[0]}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {actions.map((action) => (
            <Tooltip key={action.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-8 w-8',
                    action.destructive && 'text-destructive hover:text-destructive hover:bg-destructive/10'
                  )}
                  onClick={action.action}
                >
                  {action.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{action.label}</TooltipContent>
            </Tooltip>
          ))}

          <Separator orientation="vertical" className="h-6 mx-1" />

          {alignActions.map((action) => (
            <Tooltip key={action.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={action.action}
                >
                  {action.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{action.label}</TooltipContent>
            </Tooltip>
          ))}

          <Separator orientation="vertical" className="h-6 mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showAIInput ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowAIInput(!showAIInput)}
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('aiEdit') || 'AI Edit'}</TooltipContent>
          </Tooltip>
        </div>

        {showAIInput && (
          <div className="mt-2 pt-2 border-t">
            <div className="flex gap-2">
              <Input
                value={aiPrompt}
                onChange={(e) => setAIPrompt(e.target.value)}
                placeholder={t('aiEditPlaceholder') || 'Describe the change...'}
                className="h-8 text-xs flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleAIEdit()}
                disabled={isAIProcessing}
                autoFocus
              />
              <Button
                size="sm"
                className="h-8"
                onClick={handleAIEdit}
                disabled={!aiPrompt.trim() || isAIProcessing}
              >
                {isAIProcessing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-1 mt-2">
              {quickAIActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => setAIPrompt(action.prompt)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default ElementActionsPopover;
