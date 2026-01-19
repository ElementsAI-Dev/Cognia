"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
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
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "lucide-react";
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
  const [localConfig, setLocalConfig] = useState(config);

  const handleSave = () => {
    onUpdateConfig(localConfig);
    onClose();
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
    <>
      <SheetHeader className="space-y-1 pb-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <SheetTitle className="text-lg">助手设置</SheetTitle>
            <p className="text-xs text-muted-foreground">配置 AI 助手的模型和行为</p>
          </div>
        </div>
      </SheetHeader>

      <ScrollArea className="h-[calc(100vh-200px)] mt-4 pr-4">
        <div className="space-y-5">
          {/* AI Model Section */}
          <div className={cn(
            "rounded-xl border border-border/50 bg-card/50 p-4 space-y-4",
            "hover:border-border/80 transition-colors"
          )}>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Bot className="h-4 w-4 text-primary" />
              <span>AI 模型</span>
            </div>
            
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">提供商</Label>
                <Select
                  value={localConfig.provider}
                  onValueChange={(v) => handleProviderChange(v as ProviderName)}
                >
                  <SelectTrigger className="h-9">
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

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">模型</Label>
                <Select
                  value={localConfig.model}
                  onValueChange={(v) =>
                    setLocalConfig((prev) => ({ ...prev, model: v }))
                  }
                >
                  <SelectTrigger className="h-9">
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
            </div>
          </div>

          {/* System Prompt Section */}
          <div className={cn(
            "rounded-xl border border-border/50 bg-card/50 p-4 space-y-3",
            "hover:border-border/80 transition-colors"
          )}>
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span>系统提示词</span>
            </div>
            <Textarea
              value={localConfig.systemPrompt}
              onChange={(e) =>
                setLocalConfig((prev) => ({
                  ...prev,
                  systemPrompt: e.target.value,
                }))
              }
              placeholder="设置 AI 的角色和行为..."
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          {/* Behavior Settings Section */}
          <div className={cn(
            "rounded-xl border border-border/50 bg-card/50 p-4 space-y-3",
            "hover:border-border/80 transition-colors"
          )}>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Settings2 className="h-4 w-4 text-primary" />
              <span>行为设置</span>
            </div>

            <div className="space-y-1">
              <SettingRow
                icon={<Pin className="h-3.5 w-3.5" />}
                label="窗口置顶"
                description="始终显示在其他窗口前面"
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
                label="自动聚焦"
                description="打开时自动聚焦输入框"
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
                label="显示时间"
                description="在消息旁显示时间戳"
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
                label="记住位置"
                description="下次打开时恢复窗口位置"
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
          <div className={cn(
            "rounded-xl border border-border/50 bg-card/50 p-4 space-y-2",
            "hover:border-border/80 transition-colors"
          )}>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Keyboard className="h-4 w-4 text-primary" />
              <span>快捷键</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <kbd className="px-2.5 py-1 bg-muted rounded-md text-xs font-mono border border-border/50">
                {localConfig.shortcut.replace("CommandOrControl", "Ctrl")}
              </kbd>
              <span>唤起/隐藏助手</span>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-border/50">
        <Button 
          variant="outline" 
          className="flex-1 h-9" 
          onClick={onResetConfig}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          重置
        </Button>
        <Button 
          className="flex-1 h-9" 
          onClick={handleSave}
        >
          <Save className="h-3.5 w-3.5 mr-1.5" />
          保存
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
