"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Bot, ChevronDown } from "lucide-react";
import type { ProviderName } from "@/types";

interface ChatWidgetModelSelectorProps {
  provider: ProviderName;
  model: string;
  onProviderChange: (provider: ProviderName) => void;
  onModelChange: (model: string) => void;
  className?: string;
}

const PROVIDERS: { value: ProviderName; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "groq", label: "Groq" },
  { value: "mistral", label: "Mistral" },
  { value: "ollama", label: "Ollama" },
];

const MODELS: Partial<Record<ProviderName, { value: string; label: string }[]>> = {
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  ],
  anthropic: [
    { value: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet" },
    { value: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku" },
  ],
  google: [
    { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  ],
  deepseek: [
    { value: "deepseek-chat", label: "DeepSeek Chat" },
    { value: "deepseek-reasoner", label: "DeepSeek R1" },
  ],
  groq: [
    { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
    { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B" },
  ],
  mistral: [
    { value: "mistral-large-latest", label: "Mistral Large" },
    { value: "mistral-small-latest", label: "Mistral Small" },
  ],
  ollama: [
    { value: "llama3.2", label: "Llama 3.2" },
    { value: "qwen2.5", label: "Qwen 2.5" },
  ],
};

function getShortModelName(model: string): string {
  const shortNames: Record<string, string> = {
    "gpt-4o": "4o",
    "gpt-4o-mini": "4o-mini",
    "gpt-4-turbo": "4-turbo",
    "claude-3-5-sonnet-latest": "Sonnet",
    "claude-3-5-haiku-latest": "Haiku",
    "gemini-2.0-flash-exp": "2.0 Flash",
    "gemini-1.5-pro": "1.5 Pro",
    "deepseek-chat": "Chat",
    "deepseek-reasoner": "R1",
    "llama-3.3-70b-versatile": "3.3-70B",
    "llama-3.1-8b-instant": "3.1-8B",
    "mistral-large-latest": "Large",
    "mistral-small-latest": "Small",
    "llama3.2": "3.2",
    "qwen2.5": "2.5",
  };
  return shortNames[model] || model.split("-").pop() || model;
}

function getProviderShortName(provider: ProviderName): string {
  const shortNames: Record<string, string> = {
    openai: "GPT",
    anthropic: "Claude",
    google: "Gemini",
    deepseek: "DS",
    groq: "Groq",
    mistral: "Mistral",
    ollama: "Ollama",
  };
  return shortNames[provider] || provider;
}

export function ChatWidgetModelSelector({
  provider,
  model,
  onProviderChange,
  onModelChange,
  className,
}: ChatWidgetModelSelectorProps) {
  const t = useTranslations("chatWidget.modelSelector");

  const currentModels = useMemo(() => {
    return MODELS[provider] || [];
  }, [provider]);

  const displayName = useMemo(() => {
    const providerShort = getProviderShortName(provider);
    const modelShort = getShortModelName(model);
    return `${providerShort} ${modelShort}`;
  }, [provider, model]);

  const handleProviderSelect = (newProvider: ProviderName) => {
    if (newProvider !== provider) {
      onProviderChange(newProvider);
      // Auto-select first model of new provider
      const models = MODELS[newProvider];
      if (models && models.length > 0) {
        onModelChange(models[0].value);
      }
    }
  };

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 px-2 text-[11px] font-medium gap-1",
                "bg-muted/50 hover:bg-muted",
                "text-muted-foreground hover:text-foreground",
                className
              )}
            >
              <Bot className="h-3 w-3" />
              <span className="max-w-[80px] truncate">{displayName}</span>
              <ChevronDown className="h-2.5 w-2.5 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={4}>
          <p>{t("changeModel")}</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {t("selectProvider")}
        </DropdownMenuLabel>
        {PROVIDERS.map((p) => (
          <DropdownMenuItem
            key={p.value}
            onClick={() => handleProviderSelect(p.value)}
            className={cn(
              "text-sm",
              provider === p.value && "bg-accent/50 font-medium"
            )}
          >
            {p.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {t("selectModel")}
        </DropdownMenuLabel>
        {currentModels.map((m) => (
          <DropdownMenuItem
            key={m.value}
            onClick={() => onModelChange(m.value)}
            className={cn(
              "text-sm",
              model === m.value && "bg-accent/50 font-medium"
            )}
          >
            {m.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
