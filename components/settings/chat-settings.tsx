'use client';

/**
 * ChatSettings - Configure chat behavior and AI generation parameters
 * All settings are persisted to the settings store
 */

import { MessageSquare, Thermometer, Hash, History, Sparkles } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSettingsStore } from '@/stores';
import { PROVIDERS } from '@/types/provider';

export function ChatSettings() {
  // Chat behavior settings from store
  const defaultTemperature = useSettingsStore((state) => state.defaultTemperature);
  const setDefaultTemperature = useSettingsStore((state) => state.setDefaultTemperature);
  const defaultMaxTokens = useSettingsStore((state) => state.defaultMaxTokens);
  const setDefaultMaxTokens = useSettingsStore((state) => state.setDefaultMaxTokens);
  const contextLength = useSettingsStore((state) => state.contextLength);
  const setContextLength = useSettingsStore((state) => state.setContextLength);
  const autoTitleGeneration = useSettingsStore((state) => state.autoTitleGeneration);
  const setAutoTitleGeneration = useSettingsStore((state) => state.setAutoTitleGeneration);
  const showModelInChat = useSettingsStore((state) => state.showModelInChat);
  const setShowModelInChat = useSettingsStore((state) => state.setShowModelInChat);
  const enableMarkdownRendering = useSettingsStore((state) => state.enableMarkdownRendering);
  const setEnableMarkdownRendering = useSettingsStore((state) => state.setEnableMarkdownRendering);
  
  // Default provider
  const defaultProvider = useSettingsStore((state) => state.defaultProvider);
  const setDefaultProvider = useSettingsStore((state) => state.setDefaultProvider);
  const providerSettings = useSettingsStore((state) => state.providerSettings);

  // Get enabled providers
  const enabledProviders = Object.entries(PROVIDERS).filter(
    ([id]) => providerSettings[id]?.enabled && (providerSettings[id]?.apiKey || id === 'ollama')
  );

  return (
    <div className="space-y-6">
      {/* Default Provider */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Default Provider
          </CardTitle>
          <CardDescription>
            Select the default AI provider for new conversations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={defaultProvider} onValueChange={setDefaultProvider}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {enabledProviders.map(([id, provider]) => (
                <SelectItem key={id} value={id}>
                  {provider.name}
                </SelectItem>
              ))}
              {enabledProviders.length === 0 && (
                <SelectItem value="openai" disabled>
                  No providers configured
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {enabledProviders.length === 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Configure at least one provider in the Providers section first.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Generation Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5" />
            Generation Parameters
          </CardTitle>
          <CardDescription>
            Control AI response behavior and creativity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Temperature */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Temperature: {defaultTemperature.toFixed(1)}</Label>
              <span className="text-xs text-muted-foreground">
                {defaultTemperature <= 0.3 ? 'Precise' : defaultTemperature <= 0.7 ? 'Balanced' : 'Creative'}
              </span>
            </div>
            <Slider
              value={[defaultTemperature * 10]}
              onValueChange={([v]) => setDefaultTemperature(v / 10)}
              min={0}
              max={20}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              Lower values make responses more focused and deterministic. Higher values increase creativity and variety.
            </p>
          </div>

          {/* Max Tokens */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Max Response Length: {defaultMaxTokens.toLocaleString()} tokens</Label>
            </div>
            <Slider
              value={[defaultMaxTokens]}
              onValueChange={([v]) => setDefaultMaxTokens(v)}
              min={256}
              max={16384}
              step={256}
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of tokens in the AI response. Higher values allow longer responses but may increase cost.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Context & History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Context & History
          </CardTitle>
          <CardDescription>
            Configure how much conversation history to include
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Context Length */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Context Messages: {contextLength}</Label>
            </div>
            <Slider
              value={[contextLength]}
              onValueChange={([v]) => setContextLength(v)}
              min={2}
              max={50}
              step={2}
            />
            <p className="text-xs text-muted-foreground">
              Number of previous messages to include as context. More context improves continuity but uses more tokens.
            </p>
          </div>

          {/* Auto Title Generation */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-title">Auto-generate Titles</Label>
              <p className="text-sm text-muted-foreground">
                Automatically generate conversation titles from the first message
              </p>
            </div>
            <Switch
              id="auto-title"
              checked={autoTitleGeneration}
              onCheckedChange={setAutoTitleGeneration}
            />
          </div>
        </CardContent>
      </Card>

      {/* Display Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Display Options
          </CardTitle>
          <CardDescription>
            Customize how messages are displayed in chat
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-model">Show Model Name</Label>
              <p className="text-sm text-muted-foreground">
                Display which AI model generated each response
              </p>
            </div>
            <Switch
              id="show-model"
              checked={showModelInChat}
              onCheckedChange={setShowModelInChat}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="markdown-render">Markdown Rendering</Label>
              <p className="text-sm text-muted-foreground">
                Render markdown formatting in AI responses
              </p>
            </div>
            <Switch
              id="markdown-render"
              checked={enableMarkdownRendering}
              onCheckedChange={setEnableMarkdownRendering}
            />
          </div>
        </CardContent>
      </Card>

      {/* Token Usage Info */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Hash className="h-4 w-4" />
            About Tokens
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Tokens</strong> are pieces of text that AI models process. On average:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>1 token ≈ 4 characters in English</li>
            <li>1 token ≈ ¾ of a word</li>
            <li>100 tokens ≈ 75 words</li>
          </ul>
          <p className="mt-2">
            Your settings will use approximately <strong>{(contextLength * 500 + defaultMaxTokens).toLocaleString()}</strong> tokens per message (context + response).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default ChatSettings;
