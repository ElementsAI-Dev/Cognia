"use client";

import { cn } from "@/lib/utils";
import { useSelectionStore } from "@/stores/selection-store";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { 
  MousePointer2, 
  Languages, 
  Clock, 
  Ban, 
  Keyboard,
  Palette,
  Zap,
  Settings2,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Eye,
  Pin,
  Timer,
  MonitorSmartphone,
  BookOpen,
  MessageSquare,
  Copy,
  FileText,
} from "lucide-react";
import { useState } from "react";
import { SelectionAction } from "./types";

const LANGUAGES = [
  { value: "zh-CN", label: "Chinese (Simplified)", flag: "🇨🇳" },
  { value: "zh-TW", label: "Chinese (Traditional)", flag: "🇹🇼" },
  { value: "en", label: "English", flag: "🇺🇸" },
  { value: "ja", label: "Japanese", flag: "🇯🇵" },
  { value: "ko", label: "Korean", flag: "🇰🇷" },
  { value: "es", label: "Spanish", flag: "🇪🇸" },
  { value: "fr", label: "French", flag: "🇫🇷" },
  { value: "de", label: "German", flag: "🇩🇪" },
  { value: "ru", label: "Russian", flag: "🇷🇺" },
  { value: "ar", label: "Arabic", flag: "🇸🇦" },
  { value: "pt", label: "Portuguese", flag: "🇵🇹" },
  { value: "it", label: "Italian", flag: "🇮🇹" },
  { value: "vi", label: "Vietnamese", flag: "🇻🇳" },
  { value: "th", label: "Thai", flag: "🇹🇭" },
  { value: "id", label: "Indonesian", flag: "🇮🇩" },
];

const THEMES = [
  { value: "auto", label: "Auto (System)", description: "Follow system theme" },
  { value: "dark", label: "Dark", description: "Dark background" },
  { value: "light", label: "Light", description: "Light background" },
  { value: "glass", label: "Glass", description: "Transparent glass effect" },
];

const POSITIONS = [
  { value: "cursor", label: "Near Cursor", description: "Show near mouse" },
  { value: "center", label: "Center", description: "Center of screen" },
  { value: "top", label: "Top", description: "Top of screen" },
  { value: "bottom", label: "Bottom", description: "Bottom of screen" },
];

const PRESETS = [
  {
    name: "Minimal",
    description: "Quick copy and translate",
    config: {
      pinnedActions: ["copy", "translate"] as SelectionAction[],
      delayMs: 100,
      showShortcuts: false,
    },
  },
  {
    name: "Writer",
    description: "Focus on editing and rewriting",
    config: {
      pinnedActions: ["rewrite", "grammar", "summarize", "copy"] as SelectionAction[],
      delayMs: 300,
      showShortcuts: true,
    },
  },
  {
    name: "Researcher",
    description: "Explain, define, and extract",
    config: {
      pinnedActions: ["explain", "define", "extract", "send-to-chat"] as SelectionAction[],
      delayMs: 200,
      showShortcuts: true,
    },
  },
  {
    name: "Developer",
    description: "Code-focused actions",
    config: {
      pinnedActions: ["code-explain", "code-optimize", "copy", "send-to-chat"] as SelectionAction[],
      delayMs: 150,
      showShortcuts: true,
    },
  },
];

const ACTION_INFO: Record<SelectionAction, { icon: typeof BookOpen; label: string }> = {
  explain: { icon: BookOpen, label: "Explain" },
  translate: { icon: Languages, label: "Translate" },
  summarize: { icon: Sparkles, label: "Summarize" },
  extract: { icon: FileText, label: "Extract" },
  define: { icon: BookOpen, label: "Define" },
  rewrite: { icon: Sparkles, label: "Rewrite" },
  grammar: { icon: Sparkles, label: "Grammar" },
  copy: { icon: Copy, label: "Copy" },
  "send-to-chat": { icon: MessageSquare, label: "Send to Chat" },
  search: { icon: Sparkles, label: "Search" },
  "code-explain": { icon: Sparkles, label: "Explain Code" },
  "code-optimize": { icon: Sparkles, label: "Optimize" },
  "tone-formal": { icon: Sparkles, label: "Formal" },
  "tone-casual": { icon: Sparkles, label: "Casual" },
  expand: { icon: Sparkles, label: "Expand" },
  shorten: { icon: Sparkles, label: "Shorten" },
};

type SettingsSection = "general" | "appearance" | "shortcuts" | "advanced";

interface SectionProps {
  title: string;
  description?: string;
  icon: typeof Settings2;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function SettingsSection({ title, description, icon: Icon, children, defaultOpen = true }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between w-full p-4",
          "hover:bg-muted/50 transition-colors",
          "text-left"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h4 className="font-medium text-sm">{title}</h4>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        <ChevronRight className={cn(
          "w-4 h-4 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-90"
        )} />
      </button>
      
      {isOpen && (
        <div className="p-4 pt-0 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

export function SelectionToolbarSettings() {
  const { config, isEnabled, updateConfig, setEnabled, resetConfig } =
    useSelectionStore();
  const [_activeSection, _setActiveSection] = useState<SettingsSection>("general");

  const applyPreset = (preset: typeof PRESETS[0]) => {
    updateConfig(preset.config);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <MousePointer2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Selection Toolbar</h3>
            <p className="text-sm text-muted-foreground">
              AI-powered actions for selected text
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn(
            "text-xs font-medium px-2 py-1 rounded-full",
            isEnabled ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
          )}>
            {isEnabled ? "Active" : "Disabled"}
          </span>
          <Switch checked={isEnabled} onCheckedChange={setEnabled} />
        </div>
      </div>

      {/* Quick Presets */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Quick Presets
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              disabled={!isEnabled}
              className={cn(
                "p-3 rounded-xl border text-left",
                "hover:border-primary/50 hover:bg-primary/5",
                "transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "group"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">{preset.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">{preset.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Settings Sections */}
      <div
        className={cn(
          "space-y-3 transition-opacity",
          !isEnabled && "opacity-50 pointer-events-none"
        )}
      >
        {/* General Settings */}
        <SettingsSection
          title="General"
          description="Basic configuration"
          icon={Settings2}
        >
          {/* Trigger Mode */}
          <div className="space-y-2">
            <Label className="text-sm">Trigger Mode</Label>
            <Select
              value={config.triggerMode}
              onValueChange={(value: "auto" | "shortcut" | "both") =>
                updateConfig({ triggerMode: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span>Automatic</span>
                  </div>
                </SelectItem>
                <SelectItem value="shortcut">
                  <div className="flex items-center gap-2">
                    <Keyboard className="w-4 h-4" />
                    <span>Shortcut only (Ctrl+Shift+S)</span>
                  </div>
                </SelectItem>
                <SelectItem value="both">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <span>Both</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Target Language */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Languages className="w-4 h-4" />
              Default Translation Language
            </Label>
            <Select
              value={config.targetLanguage}
              onValueChange={(value) => updateConfig({ targetLanguage: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    <span className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Delay */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm">
                <Timer className="w-4 h-4" />
                Show Delay
              </Label>
              <span className="text-sm font-mono text-muted-foreground">
                {config.delayMs}ms
              </span>
            </div>
            <Slider
              value={[config.delayMs]}
              onValueChange={([value]) => updateConfig({ delayMs: value })}
              min={0}
              max={1000}
              step={50}
            />
            <p className="text-xs text-muted-foreground">
              Delay before showing the toolbar after text selection
            </p>
          </div>

          {/* Show Shortcuts */}
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label className="text-sm">Show Keyboard Shortcuts</Label>
              <p className="text-xs text-muted-foreground">
                Display shortcut hints in tooltips
              </p>
            </div>
            <Switch
              checked={config.showShortcuts}
              onCheckedChange={(checked) => updateConfig({ showShortcuts: checked })}
            />
          </div>

          {/* Enable Streaming */}
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label className="text-sm">Streaming Response</Label>
              <p className="text-xs text-muted-foreground">
                Show results as they are generated
              </p>
            </div>
            <Switch
              checked={config.enableStreaming}
              onCheckedChange={(checked) => updateConfig({ enableStreaming: checked })}
            />
          </div>
        </SettingsSection>

        {/* Appearance */}
        <SettingsSection
          title="Appearance"
          description="Visual customization"
          icon={Palette}
          defaultOpen={false}
        >
          {/* Theme */}
          <div className="space-y-2">
            <Label className="text-sm">Theme</Label>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => updateConfig({ theme: theme.value as "auto" | "light" | "dark" | "glass" })}
                  className={cn(
                    "p-3 rounded-lg border text-left",
                    "hover:border-primary/50 transition-colors",
                    config.theme === theme.value && "border-primary bg-primary/5"
                  )}
                >
                  <span className="text-sm font-medium block">{theme.label}</span>
                  <span className="text-xs text-muted-foreground">{theme.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Position */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <MonitorSmartphone className="w-4 h-4" />
              Toolbar Position
            </Label>
            <Select
              value={config.position}
              onValueChange={(value: "cursor" | "center" | "top" | "bottom") =>
                updateConfig({ position: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POSITIONS.map((pos) => (
                  <SelectItem key={pos.value} value={pos.value}>
                    {pos.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Auto-hide */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4" />
                Auto-hide Delay
              </Label>
              <span className="text-sm font-mono text-muted-foreground">
                {config.autoHideDelay === 0 ? "Never" : `${config.autoHideDelay / 1000}s`}
              </span>
            </div>
            <Slider
              value={[config.autoHideDelay]}
              onValueChange={([value]) => updateConfig({ autoHideDelay: value })}
              min={0}
              max={30000}
              step={1000}
            />
          </div>
        </SettingsSection>

        {/* Pinned Actions */}
        <SettingsSection
          title="Pinned Actions"
          description="Customize toolbar buttons"
          icon={Pin}
          defaultOpen={false}
        >
          <p className="text-xs text-muted-foreground mb-3">
            Select which actions appear in the main toolbar (max 6)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(ACTION_INFO) as SelectionAction[]).map((action) => {
              const info = ACTION_INFO[action];
              const isPinned = config.pinnedActions.includes(action);
              const Icon = info.icon;
              
              return (
                <button
                  key={action}
                  onClick={() => {
                    const newPinned = isPinned
                      ? config.pinnedActions.filter((a) => a !== action)
                      : config.pinnedActions.length < 6
                        ? [...config.pinnedActions, action]
                        : config.pinnedActions;
                    updateConfig({ pinnedActions: newPinned });
                  }}
                  disabled={!isPinned && config.pinnedActions.length >= 6}
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-lg border",
                    "text-left transition-all",
                    isPinned 
                      ? "border-primary bg-primary/10 text-primary" 
                      : "border-border hover:border-primary/50",
                    !isPinned && config.pinnedActions.length >= 6 && "opacity-50"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-medium">{info.label}</span>
                </button>
              );
            })}
          </div>
        </SettingsSection>

        {/* Advanced */}
        <SettingsSection
          title="Advanced"
          description="Text limits and exclusions"
          icon={Settings2}
          defaultOpen={false}
        >
          {/* Text Length Limits */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Min Text Length</Label>
              <Input
                type="number"
                value={config.minTextLength}
                onChange={(e) =>
                  updateConfig({ minTextLength: parseInt(e.target.value) || 1 })
                }
                min={1}
                max={100}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Max Text Length</Label>
              <Input
                type="number"
                value={config.maxTextLength}
                onChange={(e) =>
                  updateConfig({
                    maxTextLength: parseInt(e.target.value) || 5000,
                  })
                }
                min={100}
                max={50000}
              />
            </div>
          </div>

          {/* Excluded Apps */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Ban className="w-4 h-4" />
              Excluded Applications
            </Label>
            <Input
              placeholder="e.g., notepad.exe, code.exe (comma separated)"
              value={config.excludedApps.join(", ")}
              onChange={(e) =>
                updateConfig({
                  excludedApps: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Applications where the toolbar will not appear
            </p>
          </div>
        </SettingsSection>

        {/* Reset Button */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Reset all settings to default values
          </p>
          <Button variant="outline" size="sm" onClick={resetConfig} className="gap-2">
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Defaults
          </Button>
        </div>
      </div>
    </div>
  );
}
