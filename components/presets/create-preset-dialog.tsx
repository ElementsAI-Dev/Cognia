'use client';

/**
 * CreatePresetDialog - dialog for creating or editing presets
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { usePresetStore, useSettingsStore } from '@/stores';
import { PRESET_COLORS, PRESET_ICONS, type Preset } from '@/types/preset';
import { PROVIDERS, type ProviderName } from '@/types/provider';

interface CreatePresetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editPreset?: Preset | null;
  onSuccess?: (preset: Preset) => void;
}

export function CreatePresetDialog({
  open,
  onOpenChange,
  editPreset,
  onSuccess,
}: CreatePresetDialogProps) {
  const createPreset = usePresetStore((state) => state.createPreset);
  const updatePreset = usePresetStore((state) => state.updatePreset);
  const providerSettings = useSettingsStore((state) => state.providerSettings);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('💬');
  const [color, setColor] = useState('#6366f1');
  const [provider, setProvider] = useState<ProviderName | 'auto'>('auto');
  const [model, setModel] = useState('gpt-4o');
  const [mode, setMode] = useState<'chat' | 'agent' | 'research'>('chat');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState<number | undefined>(undefined);

  // Populate form when editing
  useEffect(() => {
    // Use microtask to avoid synchronous setState in effect
    queueMicrotask(() => {
      if (editPreset) {
        setName(editPreset.name);
        setDescription(editPreset.description || '');
        setIcon(editPreset.icon || '💬');
        setColor(editPreset.color || '#6366f1');
        setProvider(editPreset.provider);
        setModel(editPreset.model);
        setMode(editPreset.mode);
        setSystemPrompt(editPreset.systemPrompt || '');
        setTemperature(editPreset.temperature ?? 0.7);
        setMaxTokens(editPreset.maxTokens);
      } else {
        // Reset form for new preset
        setName('');
        setDescription('');
        setIcon('💬');
        setColor('#6366f1');
        setProvider('auto');
        setModel('gpt-4o');
        setMode('chat');
        setSystemPrompt('');
        setTemperature(0.7);
        setMaxTokens(undefined);
      }
    });
  }, [editPreset, open]);

  // Get available models for selected provider
  const availableModels =
    provider === 'auto'
      ? Object.values(PROVIDERS).flatMap((p) => p.models)
      : PROVIDERS[provider as ProviderName]?.models || [];

  // Get enabled providers
  const enabledProviders = Object.entries(providerSettings)
    .filter(([, settings]) => settings.enabled)
    .map(([name]) => name as ProviderName);

  const handleSubmit = () => {
    if (!name.trim()) return;

    if (editPreset) {
      updatePreset(editPreset.id, {
        name,
        description: description || undefined,
        icon,
        color,
        provider,
        model,
        mode,
        systemPrompt: systemPrompt || undefined,
        temperature,
        maxTokens,
      });
      onSuccess?.({ ...editPreset, name, description, icon, color, provider, model, mode, systemPrompt, temperature, maxTokens } as Preset);
    } else {
      const newPreset = createPreset({
        name,
        description: description || undefined,
        icon,
        color,
        provider,
        model,
        mode,
        systemPrompt: systemPrompt || undefined,
        temperature,
        maxTokens,
      });
      onSuccess?.(newPreset);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {editPreset ? 'Edit Preset' : 'Create New Preset'}
          </DialogTitle>
          <DialogDescription>
            {editPreset
              ? 'Update your preset configuration.'
              : 'Create a custom preset with your preferred settings.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="model">Model</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Custom Preset"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this preset is for..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icon</Label>
                <div className="flex flex-wrap gap-1 p-2 border rounded-md max-h-24 overflow-y-auto">
                  {PRESET_ICONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setIcon(emoji)}
                      className={`p-1.5 rounded hover:bg-accent transition-colors ${
                        icon === emoji ? 'bg-accent ring-2 ring-primary' : ''
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-1 p-2 border rounded-md max-h-24 overflow-y-auto">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        color === c ? 'ring-2 ring-primary ring-offset-2 scale-110' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="model" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as 'chat' | 'agent' | 'research')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chat">Chat</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="research">Research</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={provider} onValueChange={(v) => setProvider(v as ProviderName | 'auto')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (Smart selection)</SelectItem>
                  {enabledProviders.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PROVIDERS[p]?.name || p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Temperature: {temperature.toFixed(1)}</Label>
              <Slider
                value={[temperature]}
                onValueChange={([v]) => setTemperature(v)}
                min={0}
                max={2}
                step={0.1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Lower = more focused, Higher = more creative
              </p>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="systemPrompt">System Prompt</Label>
              <Textarea
                id="systemPrompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Instructions for the AI..."
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Define how the AI should behave when using this preset.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxTokens">Max Tokens (optional)</Label>
              <Input
                id="maxTokens"
                type="number"
                value={maxTokens || ''}
                onChange={(e) =>
                  setMaxTokens(e.target.value ? parseInt(e.target.value) : undefined)
                }
                placeholder="Leave empty for model default"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Preview */}
        <div className="mt-4 p-3 border rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground mb-2">Preview</p>
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg text-lg"
              style={{ backgroundColor: `${color}20` }}
            >
              {icon}
            </span>
            <div>
              <p className="font-medium text-sm">{name || 'Preset Name'}</p>
              <p className="text-xs text-muted-foreground">
                {provider === 'auto' ? 'Auto' : provider} • {mode} • T:{temperature.toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            {editPreset ? 'Save Changes' : 'Create Preset'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreatePresetDialog;
