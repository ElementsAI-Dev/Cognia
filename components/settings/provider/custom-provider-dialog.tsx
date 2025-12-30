'use client';

/**
 * CustomProviderDialog - Add/Edit custom OpenAI-compatible providers
 */

import { useState, useEffect } from 'react';
import { Plus, X, AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSettingsStore } from '@/stores';

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
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load data when editing
  useEffect(() => {
    if (open) {
      if (editingProviderId && customProviders[editingProviderId]) {
        const provider = customProviders[editingProviderId];
        setName(provider.customName);
        setBaseURL(provider.baseURL || '');
        setApiKey(provider.apiKey || '');
        setModels(provider.customModels || []);
        setDefaultModel(provider.defaultModel || '');
      } else {
        // Reset for new provider
        setName('');
        setBaseURL('');
        setApiKey('');
        setModels([]);
        setNewModel('');
        setDefaultModel('');
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
      setNewModel('');
    }
  };

  const handleRemoveModel = (model: string) => {
    const updatedModels = models.filter((m) => m !== model);
    setModels(updatedModels);
    if (defaultModel === model) {
      setDefaultModel(updatedModels[0] || '');
    }
  };

  const handleTestConnection = async () => {
    if (!baseURL || !apiKey) return;

    setTesting(true);
    setTestResult(null);

    try {
      // Try to fetch models from the provider
      const response = await fetch(`${baseURL}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        setTestResult('success');
      } else {
        setTestResult('error');
      }
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
      customModels: models,
      defaultModel: defaultModel || models[0],
      enabled: true,
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

          {/* Base URL */}
          <div className="space-y-2">
            <Label htmlFor="base-url">{t('baseURL')}</Label>
            <Input
              id="base-url"
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
              placeholder="https://api.example.com/v1"
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
                  onChange={(e) => setApiKey(e.target.value)}
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
              <div className="flex flex-wrap gap-2 mt-2">
                {models.map((model) => (
                  <Badge
                    key={model}
                    variant={model === defaultModel ? 'default' : 'secondary'}
                    className="cursor-pointer"
                    onClick={() => setDefaultModel(model)}
                  >
                    {model}
                    {model === defaultModel && (
                      <span className="ml-1 text-xs">({t('default')})</span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveModel(model);
                      }}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
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
