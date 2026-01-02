"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { ChatWidgetConfig } from "@/stores/chat";
import type { ProviderName } from "@/types";

interface ChatWidgetSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ChatWidgetConfig;
  onUpdateConfig: (config: Partial<ChatWidgetConfig>) => void;
  onResetConfig: () => void;
}

const PROVIDERS: { value: ProviderName; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "groq", label: "Groq" },
  { value: "mistral", label: "Mistral" },
  { value: "ollama", label: "Ollama (Local)" },
];

const MODELS: Partial<Record<ProviderName, { value: string; label: string }[]>> = {
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  ],
  anthropic: [
    { value: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet" },
    { value: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku" },
    { value: "claude-3-opus-latest", label: "Claude 3 Opus" },
  ],
  google: [
    { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  ],
  deepseek: [
    { value: "deepseek-chat", label: "DeepSeek Chat" },
    { value: "deepseek-reasoner", label: "DeepSeek Reasoner" },
  ],
  groq: [
    { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
    { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B" },
    { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
  ],
  mistral: [
    { value: "mistral-large-latest", label: "Mistral Large" },
    { value: "mistral-small-latest", label: "Mistral Small" },
  ],
  ollama: [
    { value: "llama3.2", label: "Llama 3.2" },
    { value: "qwen2.5", label: "Qwen 2.5" },
    { value: "deepseek-r1", label: "DeepSeek R1" },
  ],
  openrouter: [],
};

export function ChatWidgetSettings({
  open,
  onOpenChange,
  config,
  onUpdateConfig,
  onResetConfig,
}: ChatWidgetSettingsProps) {
  const [localConfig, setLocalConfig] = useState(config);

  const handleSave = () => {
    onUpdateConfig(localConfig);
    onOpenChange(false);
  };

  const handleProviderChange = (provider: ProviderName) => {
    const models = MODELS[provider];
    const defaultModel = models?.[0]?.value || "";
    setLocalConfig((prev) => ({
      ...prev,
      provider,
      model: defaultModel,
    }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:max-w-[400px]">
        <SheetHeader>
          <SheetTitle>助手设置</SheetTitle>
          <SheetDescription>
            配置 AI 助手的模型和行为
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)] mt-4 pr-4">
          <div className="space-y-6">
            {/* Provider Selection */}
            <div className="space-y-2">
              <Label>AI 提供商</Label>
              <Select
                value={localConfig.provider}
                onValueChange={(v) => handleProviderChange(v as ProviderName)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择提供商" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <Label>模型</Label>
              <Select
                value={localConfig.model}
                onValueChange={(v) =>
                  setLocalConfig((prev) => ({ ...prev, model: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择模型" />
                </SelectTrigger>
                <SelectContent>
                  {MODELS[localConfig.provider]?.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* System Prompt */}
            <div className="space-y-2">
              <Label>系统提示词</Label>
              <Textarea
                value={localConfig.systemPrompt}
                onChange={(e) =>
                  setLocalConfig((prev) => ({
                    ...prev,
                    systemPrompt: e.target.value,
                  }))
                }
                placeholder="设置 AI 的角色和行为..."
                rows={4}
              />
            </div>

            <Separator />

            {/* Behavior Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">行为设置</h4>

              <div className="flex items-center justify-between">
                <Label htmlFor="pinned" className="text-sm">
                  窗口置顶
                </Label>
                <Switch
                  id="pinned"
                  checked={localConfig.pinned}
                  onCheckedChange={(checked) =>
                    setLocalConfig((prev) => ({ ...prev, pinned: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="autoFocus" className="text-sm">
                  自动聚焦输入框
                </Label>
                <Switch
                  id="autoFocus"
                  checked={localConfig.autoFocus}
                  onCheckedChange={(checked) =>
                    setLocalConfig((prev) => ({ ...prev, autoFocus: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="showTimestamps" className="text-sm">
                  显示时间戳
                </Label>
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
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="rememberPosition" className="text-sm">
                  记住窗口位置
                </Label>
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
              </div>
            </div>

            <Separator />

            {/* Shortcut Info */}
            <div className="space-y-2">
              <Label>快捷键</Label>
              <div className="text-sm text-muted-foreground">
                <kbd className="px-2 py-1 bg-muted rounded text-xs">
                  {localConfig.shortcut.replace("CommandOrControl", "Ctrl")}
                </kbd>
                <span className="ml-2">唤起/隐藏助手</span>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={onResetConfig}>
            重置
          </Button>
          <Button className="flex-1" onClick={handleSave}>
            保存
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
