'use client';

/**
 * ProviderCard - Enhanced provider card component matching design spec
 * Features: Collapsible layout, API key management, multi-key rotation, model selection
 */

import React, { useState, useCallback, type ReactNode } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  Star,
  Plus,
  Trash2,
  RefreshCw,
  RotateCcw,
  Key,
  Globe,
  Zap,
  ExternalLink,
  AlertCircle,
  GripVertical,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ProviderIcon } from '@/components/providers/ai/provider-icon';
import type {
  ApiKeyRotationStrategy,
  ApiKeyUsageStats,
  ModelConfig,
  ProviderConfig,
  UserProviderSettings,
} from '@/types/provider';
import { maskApiKey, isValidApiKeyFormat } from '@/lib/ai/infrastructure/api-key-rotation';
import { ModelListDialog } from './model-list-dialog';
import { ModelSettingsDialog } from './model-settings-dialog';

interface TestResult {
  success: boolean;
  message: string;
  latency?: number;
}

// Sortable API Key Item for drag-and-drop reordering
interface SortableApiKeyItemProps {
  id: string;
  keyValue: string;
  index: number;
  isActive: boolean;
  rotationEnabled: boolean;
  usageStats?: ApiKeyUsageStats;
  disabled: boolean;
  onRemove?: () => void;
  onResetStats?: () => void;
  t: (key: string) => string;
}

function SortableApiKeyItem({
  id,
  keyValue,
  isActive,
  rotationEnabled,
  usageStats,
  disabled,
  onRemove,
  onResetStats,
  t,
}: SortableApiKeyItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 text-xs bg-background rounded-md px-2 py-1.5 border',
        isDragging && 'shadow-lg ring-2 ring-primary/20'
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </button>

      {rotationEnabled && isActive && (
        <Badge variant="default" className="text-[10px] px-1 py-0 shrink-0">
          {t('active') || 'Active'}
        </Badge>
      )}
      <span className="flex-1 font-mono truncate">
        {maskApiKey(keyValue)}
      </span>
      {usageStats && (
        <span className="text-muted-foreground text-[10px] hidden sm:inline">
          {usageStats.usageCount}x
          {usageStats.errorCount > 0 && (
            <span className="text-destructive ml-0.5">
              ({usageStats.errorCount}err)
            </span>
          )}
        </span>
      )}
      {onResetStats && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={onResetStats}
          title="Reset stats"
          disabled={disabled}
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      )}
      {onRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={onRemove}
          disabled={disabled}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

interface ProviderCardProps {
  provider: ProviderConfig;
  settings: UserProviderSettings;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onToggleEnabled: (enabled: boolean) => void;
  onApiKeyChange: (key: string) => void;
  onBaseURLChange: (url: string) => void;
  onDefaultModelChange: (model: string) => void;
  onTestConnection: () => Promise<TestResult>;
  testResult?: TestResult | null;
  isTesting?: boolean;
  // Multi-key support
  apiKeys?: string[];
  onAddApiKey?: (key: string) => void;
  onRemoveApiKey?: (index: number) => void;
  apiKeyUsageStats?: Record<string, ApiKeyUsageStats>;
  currentKeyIndex?: number;
  onResetApiKeyStats?: (key: string) => void;
  rotationEnabled?: boolean;
  onToggleRotation?: (enabled: boolean) => void;
  rotationStrategy?: ApiKeyRotationStrategy;
  onRotationStrategyChange?: (strategy: ApiKeyRotationStrategy) => void;
  onReorderApiKeys?: (fromIndex: number, toIndex: number) => void;
  // Model settings
  onModelSettings?: (model: ModelConfig) => void;
  children?: ReactNode;
}

export const ProviderCard = React.memo(function ProviderCard({
  provider,
  settings,
  isExpanded,
  onToggleExpanded,
  onToggleEnabled,
  onApiKeyChange,
  onBaseURLChange,
  onDefaultModelChange,
  onTestConnection,
  testResult,
  isTesting = false,
  apiKeys = [],
  onAddApiKey,
  onRemoveApiKey,
  apiKeyUsageStats = {},
  currentKeyIndex,
  onResetApiKeyStats,
  rotationEnabled = false,
  onToggleRotation,
  rotationStrategy = 'round-robin',
  onRotationStrategyChange,
  onReorderApiKeys,
  children,
}: ProviderCardProps) {
  const t = useTranslations('providers');
  const [showApiKey, setShowApiKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');
  const [showNewKeyInput, setShowNewKeyInput] = useState(false);
  const [showModelListDialog, setShowModelListDialog] = useState(false);
  const [showModelSettingsDialog, setShowModelSettingsDialog] = useState(false);
  const [selectedModelForSettings, setSelectedModelForSettings] = useState<ModelConfig | null>(null);

  const modelsCount = provider.models?.length || 0;
  const defaultModel = settings.defaultModel || provider.defaultModel;

  // DnD sensors for API key reordering (must be at top level)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && onReorderApiKeys) {
      const oldIndex = apiKeys.findIndex((_, i) => `key-${i}` === active.id);
      const newIndex = apiKeys.findIndex((_, i) => `key-${i}` === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorderApiKeys(oldIndex, newIndex);
      }
    }
  }, [apiKeys, onReorderApiKeys]);

  const handleAddKey = useCallback(() => {
    if (newApiKey.trim() && onAddApiKey) {
      onAddApiKey(newApiKey.trim());
      setNewApiKey('');
      setShowNewKeyInput(false);
    }
  }, [newApiKey, onAddApiKey]);

  const handleTest = useCallback(async () => {
    await onTestConnection();
  }, [onTestConnection]);

  const hasAnyApiKey = !!settings.apiKey || apiKeys.length > 0;

  // Get status badge color based on test result
  const getStatusBadge = () => {
    if (isTesting) {
      return (
        <Badge variant="secondary" className="h-6 text-xs gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t('testing') || 'Testing'}
        </Badge>
      );
    }
    if (testResult?.success) {
      return (
        <Badge variant="default" className="h-6 text-xs gap-1 bg-green-600">
          <Check className="h-3 w-3" />
          {testResult.latency ? `${testResult.latency}ms` : t('connected') || 'Connected'}
        </Badge>
      );
    }
    if (testResult && !testResult.success) {
      return (
        <Badge variant="destructive" className="h-6 text-xs gap-1">
          <X className="h-3 w-3" />
          {t('failed') || 'Failed'}
        </Badge>
      );
    }
    return null;
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={() => onToggleExpanded()}>
      <Card className={cn(
        'transition-all duration-200',
        'hover:shadow-md hover:border-primary/30',
        isExpanded && 'ring-1 ring-primary/20 shadow-sm'
      )}>
        {/* Card Header */}
        <CollapsibleTrigger asChild>
          <CardHeader className="py-4 px-4 cursor-pointer hover:bg-muted/40 active:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Provider Icon */}
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <ProviderIcon
                    icon={`/icons/providers/${provider.id}.svg`}
                    size={24}
                  />
                </div>

                {/* Provider Info */}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{provider.name}</span>
                    <Badge variant="secondary" className="text-[10px] h-5">
                      {modelsCount} {t('models') || 'models'}
                    </Badge>
                    {getStatusBadge()}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {provider.description || t(`${provider.id}Description`) || 'AI provider'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Enable/Disable Switch */}
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={onToggleEnabled}
                  onClick={(e) => e.stopPropagation()}
                />
                {/* Expand/Collapse Indicator */}
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        {/* Expanded Content */}
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 space-y-4">
            {/* API Key & Base URL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* API Key */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5" />
                  {t('apiKey') || 'API Key'}
                </Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showApiKey ? 'text' : 'password'}
                      value={settings.apiKey || ''}
                      onChange={(e) => onApiKeyChange(e.target.value)}
                      placeholder={
                        (t('apiKeyPlaceholder', { provider: provider.name }) as string) ||
                        'Enter your API key'
                      }
                      className="pr-10"
                      disabled={!settings.enabled}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowApiKey(!showApiKey)}
                      disabled={!settings.enabled}
                    >
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTest}
                    disabled={!settings.enabled || isTesting || !hasAnyApiKey}
                    className="gap-1"
                  >
                    {isTesting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Zap className="h-3.5 w-3.5" />
                    )}
                    {t('test') || 'Test'}
                  </Button>
                </div>
                {testResult && !testResult.success && (
                  <p className="text-xs text-destructive">{testResult.message}</p>
                )}
                {/* API Key Format Validation */}
                {settings.apiKey && !isValidApiKeyFormat(settings.apiKey) && (
                  <p className="text-xs text-amber-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {t('invalidKeyFormat') || 'API key format may be invalid'}
                  </p>
                )}
                {/* Provider Links */}
                {(provider.dashboardUrl || provider.docsUrl) && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {provider.dashboardUrl && (
                      <a
                        href={provider.dashboardUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {t('getDashboard') || 'Get API Key'}
                      </a>
                    )}
                    {provider.docsUrl && (
                      <a
                        href={provider.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {t('viewDocs') || 'Documentation'}
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Base URL (Optional) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  {t('baseURL') || 'Base URL'}
                  <span className="text-muted-foreground font-normal">
                    ({t('optional') || 'optional'})
                  </span>
                </Label>
                <Input
                  value={settings.baseURL || ''}
                  onChange={(e) => onBaseURLChange(e.target.value)}
                  placeholder={t('baseURLPlaceholder') || 'https://api.example.com/v1'}
                  disabled={!settings.enabled}
                />
              </div>
            </div>

            <Separator />

            {/* Multi-Key Rotation & Models Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Multi-Key Rotation */}
              {onToggleRotation && (
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3 transition-colors hover:border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {t('apiKeyRotation') || 'API Key Rotation'}
                      </span>
                    </div>
                    <Switch
                      checked={rotationEnabled}
                      onCheckedChange={onToggleRotation}
                      disabled={!settings.enabled || apiKeys.length < 2}
                    />
                  </div>

                  {rotationEnabled && (
                    <div className="space-y-3">
                      {/* Strategy Selector */}
                      <Select
                        value={rotationStrategy}
                        onValueChange={(v) =>
                          onRotationStrategyChange?.(v as ApiKeyRotationStrategy)
                        }
                        disabled={!settings.enabled}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="round-robin">
                            {t('rotationStrategies.roundRobin') || 'Round Robin'}
                          </SelectItem>
                          <SelectItem value="random">
                            {t('rotationStrategies.random') || 'Random'}
                          </SelectItem>
                          <SelectItem value="least-used">
                            {t('rotationStrategies.leastUsed') || 'Least Used'}
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      {/* API Keys List with Drag-and-Drop */}
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={apiKeys.map((_, i) => `key-${i}`)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2">
                            {apiKeys.map((key, index) => (
                              <SortableApiKeyItem
                                key={`key-${index}`}
                                id={`key-${index}`}
                                keyValue={key}
                                index={index}
                                isActive={currentKeyIndex === index}
                                rotationEnabled={rotationEnabled}
                                usageStats={apiKeyUsageStats[key]}
                                disabled={!settings.enabled}
                                onRemove={onRemoveApiKey ? () => onRemoveApiKey(index) : undefined}
                                onResetStats={onResetApiKeyStats ? () => onResetApiKeyStats(key) : undefined}
                                t={t}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>

                      {/* Add New Key */}
                      {showNewKeyInput ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={newApiKey}
                            onChange={(e) => setNewApiKey(e.target.value)}
                            placeholder="sk-..."
                            className="h-8 text-xs"
                            disabled={!settings.enabled}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={handleAddKey}
                            disabled={!settings.enabled || !newApiKey.trim()}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={() => {
                              setShowNewKeyInput(false);
                              setNewApiKey('');
                            }}
                            disabled={!settings.enabled}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-7 text-xs gap-1"
                          onClick={() => setShowNewKeyInput(true)}
                          disabled={!settings.enabled}
                        >
                          <Plus className="h-3 w-3" />
                          {t('addKey') || 'Add Key'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Available Models */}
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3 transition-colors hover:border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {t('availableModels') || 'Available Models'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs gap-1"
                    onClick={() => setShowModelListDialog(true)}
                    disabled={!settings.enabled || modelsCount === 0}
                  >
                    {modelsCount} {t('total') || 'total'}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {provider.models?.slice(0, 6).map((model) => (
                    <TooltipProvider key={model.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className={cn(
                              'flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors',
                              model.id === defaultModel ||
                                model.name === defaultModel
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background hover:bg-muted'
                            )}
                            onClick={() => onDefaultModelChange(model.id)}
                            disabled={!settings.enabled}
                          >
                            {(model.id === defaultModel ||
                              model.name === defaultModel) && (
                              <Star className="h-3 w-3 fill-current" />
                            )}
                            <span className="truncate max-w-[100px]">
                              {model.name}
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            {model.name} • {Math.round(model.contextLength / 1000)}K context
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                  {modelsCount > 6 && (
                    <Badge variant="outline" className="text-[10px]">
                      +{modelsCount - 6} {t('more') || 'more'}
                    </Badge>
                  )}
                </div>

                {/* Default Model Selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {t('defaultModel') || 'Default Model'}
                  </Label>
                  <Select value={defaultModel} onValueChange={onDefaultModelChange}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={t('selectModel') || 'Select model'} />
                    </SelectTrigger>
                    <SelectContent>
                      {provider.models?.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center gap-2">
                            <span>{model.name}</span>
                            <span className="text-muted-foreground">
                              ({Math.round(model.contextLength / 1000)}K)
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>

      {/* Model List Dialog */}
      <ModelListDialog
        open={showModelListDialog}
        onOpenChange={setShowModelListDialog}
        models={provider.models || []}
        selectedModels={defaultModel ? [defaultModel] : []}
        onModelsChange={(models) => {
          if (models.length > 0) {
            onDefaultModelChange(models[0]);
          }
        }}
        onModelSettings={(model: ModelConfig) => {
          setSelectedModelForSettings(model);
          setShowModelSettingsDialog(true);
        }}
      />

      {/* Model Settings Dialog */}
      <ModelSettingsDialog
        open={showModelSettingsDialog}
        onOpenChange={setShowModelSettingsDialog}
        model={selectedModelForSettings}
        providerId={provider.id}
        onSave={(_modelId, _settings) => {
          setShowModelSettingsDialog(false);
        }}
      />
    </Collapsible>
  );
});

export default ProviderCard;
