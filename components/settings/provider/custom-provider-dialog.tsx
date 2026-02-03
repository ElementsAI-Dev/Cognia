'use client';

/**
 * CustomProviderDialog - Add/Edit custom providers with multi-protocol support
 * Supports OpenAI, Anthropic, and Gemini API protocols
 */

import { useState, useEffect } from 'react';
import { Plus, X, AlertCircle, Check, Eye, EyeOff, Settings2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ApiProtocol } from '@/types/provider';
import type { CustomModelMetadata } from '@/stores/settings/settings-store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSettingsStore } from '@/stores';
import { testCustomProviderConnectionByProtocol } from '@/lib/ai/infrastructure/api-test';

interface CustomProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProviderId: string | null;
}

export function CustomProviderDialog({
  open,
  onOpenChange,
  editingProviderId,
}: CustomProviderDialogProps) {
  const t = useTranslations('providers');
  const tc = useTranslations('common');

  const customProviders = useSettingsStore((state) => state.customProviders);
  const addCustomProvider = useSettingsStore((state) => state.addCustomProvider);
  const updateCustomProvider = useSettingsStore((state) => state.updateCustomProvider);
  const removeCustomProvider = useSettingsStore((state) => state.removeCustomProvider);

  const [name, setName] = useState('');
  const [baseURL, setBaseURL] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [newModel, setNewModel] = useState('');
  const [defaultModel, setDefaultModel] = useState('');
  const [apiProtocol, setApiProtocol] = useState<ApiProtocol>('openai');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [modelMetadata, setModelMetadata] = useState<Record<string, CustomModelMetadata>>({});
  const [expandedModelSettings, setExpandedModelSettings] = useState<string | null>(null);

  // Load data when editing
  useEffect(() => {
    if (open) {
      if (editingProviderId && customProviders[editingProviderId]) {
        const provider = customProviders[editingProviderId];
        setName(provider.customName);
        setBaseURL(provider.baseURL || '');
        setApiKey(provider.apiKey || '');
        setApiProtocol(provider.apiProtocol || 'openai');
        setModels(provider.customModels || []);
        setDefaultModel(provider.defaultModel || '');
        setModelMetadata(provider.customModelMetadata || {});
      } else {
        // Reset for new provider
        setName('');
        setBaseURL('');
        setApiKey('');
        setApiProtocol('openai');
        setModels([]);
        setNewModel('');
        setDefaultModel('');
        setModelMetadata({});
        setExpandedModelSettings(null);
      }
      setTestResult(null);
      setShowDeleteConfirm(false);
      setShowKey(false);
    }
  }, [open, editingProviderId, customProviders]);

  const handleAddModel = () => {
    const trimmedModel = newModel.trim();
    if (trimmedModel && !models.includes(trimmedModel)) {
      const updatedModels = [...models, trimmedModel];
      setModels(updatedModels);
      if (!defaultModel) {
        setDefaultModel(trimmedModel);
      }
      // Initialize metadata for new model
      setModelMetadata((prev) => ({
        ...prev,
        [trimmedModel]: { id: trimmedModel },
      }));
      setNewModel('');
    }
  };

  const handleRemoveModel = (model: string) => {
    const updatedModels = models.filter((m) => m !== model);
    setModels(updatedModels);
    if (defaultModel === model) {
      setDefaultModel(updatedModels[0] || '');
    }
    // Remove metadata for deleted model
    setModelMetadata((prev) => {
      const { [model]: _, ...rest } = prev;
      return rest;
    });
    if (expandedModelSettings === model) {
      setExpandedModelSettings(null);
    }
  };

  const updateModelMetadata = (modelId: string, updates: Partial<CustomModelMetadata>) => {
    setModelMetadata((prev) => ({
      ...prev,
      [modelId]: { ...prev[modelId], id: modelId, ...updates },
    }));
  };

  const handleTestConnection = async () => {
    if (!baseURL || !apiKey) return;

    setTesting(true);
    setTestResult(null);

    try {
      const result = await testCustomProviderConnectionByProtocol(baseURL, apiKey, apiProtocol);
      setTestResult(result.success ? 'success' : 'error');
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (!name.trim() || !baseURL.trim() || models.length === 0) return;

    const providerData = {
      providerId: editingProviderId || '',
      customName: name.trim(),
      baseURL: baseURL.trim(),
      apiKey: apiKey.trim(),
      apiProtocol,
      customModels: models,
      customModelMetadata: modelMetadata,
      defaultModel: defaultModel || models[0],
      enabled: editingProviderId ? (customProviders[editingProviderId]?.enabled ?? true) : true,
    };

    if (editingProviderId) {
      updateCustomProvider(editingProviderId, providerData);
    } else {
      addCustomProvider(providerData);
    }

    onOpenChange(false);
  };

  const handleDelete = () => {
    if (editingProviderId) {
      removeCustomProvider(editingProviderId);
      onOpenChange(false);
    }
  };

  const isEditing = !!editingProviderId;
  const canSave = name.trim() && baseURL.trim() && models.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('editCustomProvider') : t('addCustomProvider')}
          </DialogTitle>
          <DialogDescription>
            {t('customProviderDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Provider Name */}
          <div className="space-y-2">
            <Label htmlFor="provider-name">{t('providerName')}</Label>
            <Input
              id="provider-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('providerNamePlaceholder')}
            />
          </div>

          {/* API Protocol */}
          <div className="space-y-2">
            <Label htmlFor="api-protocol">{t('apiProtocol')}</Label>
            <Select
              value={apiProtocol}
              onValueChange={(v) => {
                setApiProtocol(v as ApiProtocol);
                setTestResult(null);
              }}
            >
              <SelectTrigger id="api-protocol">
                <SelectValue placeholder={t('selectProtocol')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">
                  <div className="flex flex-col">
                    <span>OpenAI</span>
                    <span className="text-xs text-muted-foreground">{t('protocolOpenAIDesc')}</span>
                  </div>
                </SelectItem>
                <SelectItem value="anthropic">
                  <div className="flex flex-col">
                    <span>Anthropic</span>
                    <span className="text-xs text-muted-foreground">{t('protocolAnthropicDesc')}</span>
                  </div>
                </SelectItem>
                <SelectItem value="gemini">
                  <div className="flex flex-col">
                    <span>Gemini</span>
                    <span className="text-xs text-muted-foreground">{t('protocolGeminiDesc')}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t('apiProtocolHint')}
            </p>
          </div>

          {/* Base URL */}
          <div className="space-y-2">
            <Label htmlFor="base-url">{t('baseURL')}</Label>
            <Input
              id="base-url"
              value={baseURL}
              onChange={(e) => {
                setBaseURL(e.target.value);
                setTestResult(null);
              }}
              placeholder={
                apiProtocol === 'anthropic' 
                  ? 'https://api.anthropic.com/v1' 
                  : apiProtocol === 'gemini'
                  ? 'https://generativelanguage.googleapis.com/v1beta'
                  : 'https://api.example.com/v1'
              }
            />
            <p className="text-xs text-muted-foreground">
              {t('baseURLHint')}
            </p>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="api-key">{t('apiKey')}</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="api-key"
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder={t('apiKeyPlaceholder')}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={!baseURL || !apiKey || testing}
              >
                {testing ? tc('loading') : t('test')}
              </Button>
            </div>
            {testResult === 'success' && (
              <p className="flex items-center gap-1 text-sm text-green-600">
                <Check className="h-4 w-4" /> {t('connectionSuccess')}
              </p>
            )}
            {testResult === 'error' && (
              <p className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" /> {t('connectionFailed')}
              </p>
            )}
          </div>

          {/* Models */}
          <div className="space-y-2">
            <Label>{t('models')}</Label>
            <div className="flex gap-2">
              <Input
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                placeholder={t('modelPlaceholder')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddModel();
                  }
                }}
              />
              <Button variant="outline" size="icon" onClick={handleAddModel}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {models.length > 0 && (
              <div className="space-y-2 mt-2">
                {models.map((model) => (
                  <div key={model} className="border rounded-md p-2">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={model === defaultModel ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => setDefaultModel(model)}
                      >
                        {model}
                        {model === defaultModel && (
                          <span className="ml-1 text-xs">({t('default')})</span>
                        )}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setExpandedModelSettings(
                            expandedModelSettings === model ? null : model
                          )}
                          title={t('modelSettings') || 'Model Settings'}
                        >
                          <Settings2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:text-destructive"
                          onClick={() => handleRemoveModel(model)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Expandable Model Settings */}
                    {expandedModelSettings === model && (
                      <div className="mt-2 pt-2 border-t space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">{t('contextLength') || 'Context Length'}</Label>
                            <Input
                              type="number"
                              className="h-7 text-xs"
                              placeholder="128000"
                              value={modelMetadata[model]?.contextLength || ''}
                              onChange={(e) => updateModelMetadata(model, {
                                contextLength: e.target.value ? parseInt(e.target.value) : undefined,
                              })}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">{t('maxOutputTokens') || 'Max Output'}</Label>
                            <Input
                              type="number"
                              className="h-7 text-xs"
                              placeholder="4096"
                              value={modelMetadata[model]?.maxOutputTokens || ''}
                              onChange={(e) => updateModelMetadata(model, {
                                maxOutputTokens: e.target.value ? parseInt(e.target.value) : undefined,
                              })}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">{t('inputPricing') || 'Input $/1M'}</Label>
                            <Input
                              type="number"
                              step="0.01"
                              className="h-7 text-xs"
                              placeholder="0.00"
                              value={modelMetadata[model]?.pricing?.promptPer1M || ''}
                              onChange={(e) => updateModelMetadata(model, {
                                pricing: {
                                  ...modelMetadata[model]?.pricing,
                                  promptPer1M: e.target.value ? parseFloat(e.target.value) : undefined,
                                },
                              })}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">{t('outputPricing') || 'Output $/1M'}</Label>
                            <Input
                              type="number"
                              step="0.01"
                              className="h-7 text-xs"
                              placeholder="0.00"
                              value={modelMetadata[model]?.pricing?.completionPer1M || ''}
                              onChange={(e) => updateModelMetadata(model, {
                                pricing: {
                                  ...modelMetadata[model]?.pricing,
                                  completionPer1M: e.target.value ? parseFloat(e.target.value) : undefined,
                                },
                              })}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {t('modelsHint')}
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {isEditing && (
            <>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2 mr-auto">
                  <span className="text-sm text-destructive">
                    {t('confirmDeleteProvider')}
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                  >
                    {tc('confirm')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    {tc('cancel')}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  className="mr-auto text-destructive hover:text-destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  {tc('delete')}
                </Button>
              )}
            </>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {tc('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CustomProviderDialog;
