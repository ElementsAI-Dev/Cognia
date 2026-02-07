"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useSelectionStore, selectToolbarMode } from "@/stores/context";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  Network,
  Plus,
  Pencil,
  Trash2,
  Search,
  Replace,
} from "lucide-react";
import { useState } from "react";
import { SelectionAction, LANGUAGES, SEARCH_ENGINES } from "@/types";
import type { SearchEngine, CustomUserAction } from "@/types";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const THEMES = [
  { value: "auto", labelKey: "themeAuto", descKey: "themeAutoDesc" },
  { value: "dark", labelKey: "themeDark", descKey: "themeDarkDesc" },
  { value: "light", labelKey: "themeLight", descKey: "themeLightDesc" },
  { value: "glass", labelKey: "themeGlass", descKey: "themeGlassDesc" },
];

const POSITIONS = [
  { value: "cursor", labelKey: "positionCursor", descKey: "positionCursorDesc" },
  { value: "center", labelKey: "positionCenter", descKey: "positionCenterDesc" },
  { value: "top", labelKey: "positionTop", descKey: "positionTopDesc" },
  { value: "bottom", labelKey: "positionBottom", descKey: "positionBottomDesc" },
];

const PRESETS = [
  {
    nameKey: "presets.minimal",
    descKey: "presets.minimalDesc",
    config: {
      pinnedActions: ["copy", "translate"] as SelectionAction[],
      delayMs: 100,
      showShortcuts: false,
    },
  },
  {
    nameKey: "presets.writer",
    descKey: "presets.writerDesc",
    config: {
      pinnedActions: ["rewrite", "grammar", "summarize", "copy"] as SelectionAction[],
      delayMs: 300,
      showShortcuts: true,
    },
  },
  {
    nameKey: "presets.researcher",
    descKey: "presets.researcherDesc",
    config: {
      pinnedActions: ["explain", "define", "extract", "send-to-chat"] as SelectionAction[],
      delayMs: 200,
      showShortcuts: true,
    },
  },
  {
    nameKey: "presets.developer",
    descKey: "presets.developerDesc",
    config: {
      pinnedActions: ["code-explain", "code-optimize", "copy", "send-to-chat"] as SelectionAction[],
      delayMs: 150,
      showShortcuts: true,
    },
  },
];

const ACTION_INFO: Record<SelectionAction, { icon: typeof BookOpen; labelKey: string }> = {
  explain: { icon: BookOpen, labelKey: "actions.explain" },
  translate: { icon: Languages, labelKey: "actions.translate" },
  summarize: { icon: Sparkles, labelKey: "actions.summarize" },
  extract: { icon: FileText, labelKey: "actions.extract" },
  define: { icon: BookOpen, labelKey: "actions.define" },
  rewrite: { icon: Sparkles, labelKey: "actions.rewrite" },
  grammar: { icon: Sparkles, labelKey: "actions.grammar" },
  copy: { icon: Copy, labelKey: "actions.copy" },
  "send-to-chat": { icon: MessageSquare, labelKey: "actions.sendToChat" },
  search: { icon: Sparkles, labelKey: "actions.search" },
  "code-explain": { icon: Sparkles, labelKey: "actions.codeExplain" },
  "code-optimize": { icon: Sparkles, labelKey: "actions.optimize" },
  "tone-formal": { icon: Sparkles, labelKey: "actions.formal" },
  "tone-casual": { icon: Sparkles, labelKey: "actions.casual" },
  expand: { icon: Sparkles, labelKey: "actions.expand" },
  shorten: { icon: Sparkles, labelKey: "actions.shorten" },
  "knowledge-map": { icon: Network, labelKey: "actions.knowledgeMap" },
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
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-xl overflow-hidden">
      <CollapsibleTrigger
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
      </CollapsibleTrigger>
      
      <CollapsibleContent className="p-4 pt-0 space-y-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SelectionToolbarSettings() {
  const t = useTranslations("settingsPanel");
  const {
    config, isEnabled, updateConfig, setEnabled, resetConfig, toggleToolbarMode,
    addCustomAction, updateCustomAction, removeCustomAction,
    setSearchEngine, setEnableReplaceInPlace,
  } = useSelectionStore();
  const toolbarMode = useSelectionStore(selectToolbarMode);
  const [_activeSection, _setActiveSection] = useState<SettingsSection>("general");
  const [isCreateActionDialogOpen, setIsCreateActionDialogOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<CustomUserAction | null>(null);
  const [newAction, setNewAction] = useState({
    name: "",
    description: "",
    prompt: "",
    category: "ai" as const,
    shortcut: "",
  });

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
            <h3 className="font-semibold text-lg">{t("title")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("description")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn(
            "text-xs font-medium px-2 py-1 rounded-full",
            isEnabled ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
          )}>
            {isEnabled ? t("active") : t("disabled")}
          </span>
          <Switch checked={isEnabled} onCheckedChange={setEnabled} />
        </div>
      </div>

      {/* Quick Presets */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t("quickPresets")}
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.nameKey}
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
                <span className="text-sm font-medium">{t(preset.nameKey)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t(preset.descKey)}</p>
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
          title={t("general")}
          description={t("generalDesc")}
          icon={Settings2}
        >
          {/* Trigger Mode */}
          <div className="space-y-2">
            <Label className="text-sm">{t("triggerMode")}</Label>
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
                    <span>{t("automatic")}</span>
                  </div>
                </SelectItem>
                <SelectItem value="shortcut">
                  <div className="flex items-center gap-2">
                    <Keyboard className="w-4 h-4" />
                    <span>{t("shortcutOnly")}</span>
                  </div>
                </SelectItem>
                <SelectItem value="both">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <span>{t("both")}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Target Language */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Languages className="w-4 h-4" />
              {t("defaultTranslationLanguage")}
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
                {t("showDelay")}
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
              {t("showDelayDesc")}
            </p>
          </div>

          {/* Show Shortcuts */}
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label className="text-sm">{t("showKeyboardShortcuts")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("showKeyboardShortcutsDesc")}
              </p>
            </div>
            <Switch
              checked={config.showShortcuts}
              onCheckedChange={(checked) => updateConfig({ showShortcuts: checked })}
            />
          </div>

          {/* Compact Mode */}
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label className="text-sm">{t("compactMode")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("compactModeDesc")}
              </p>
            </div>
            <Switch
              checked={toolbarMode === 'compact'}
              onCheckedChange={() => toggleToolbarMode()}
            />
          </div>

          {/* Enable Streaming */}
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label className="text-sm">{t("streamingResponse")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("streamingResponseDesc")}
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
          title={t("appearance")}
          description={t("appearanceDesc")}
          icon={Palette}
          defaultOpen={false}
        >
          {/* Theme */}
          <div className="space-y-2">
            <Label className="text-sm">{t("theme")}</Label>
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
                  <span className="text-sm font-medium block">{t(theme.labelKey)}</span>
                  <span className="text-xs text-muted-foreground">{t(theme.descKey)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Position */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <MonitorSmartphone className="w-4 h-4" />
              {t("toolbarPosition")}
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
                    {t(pos.labelKey)}
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
                {t("autoHideDelay")}
              </Label>
              <span className="text-sm font-mono text-muted-foreground">
                {config.autoHideDelay === 0 ? t("never") : `${config.autoHideDelay / 1000}s`}
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
          title={t("pinnedActions")}
          description={t("pinnedActionsDesc")}
          icon={Pin}
          defaultOpen={false}
        >
          <p className="text-xs text-muted-foreground mb-3">
            {t("pinnedActionsHint")}
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
                  <span className="text-xs font-medium">{t(info.labelKey)}</span>
                </button>
              );
            })}
          </div>
        </SettingsSection>

        {/* Advanced */}
        <SettingsSection
          title={t("advanced")}
          description={t("advancedDesc")}
          icon={Settings2}
          defaultOpen={false}
        >
          {/* Text Length Limits */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">{t("minTextLength")}</Label>
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
              <Label className="text-sm">{t("maxTextLength")}</Label>
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
              {t("excludedApplications")}
            </Label>
            <Input
              placeholder={t("excludedApplicationsPlaceholder")}
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
              {t("excludedApplicationsDesc")}
            </p>
          </div>
        </SettingsSection>

        {/* Custom Actions */}
        <SettingsSection
          title={t("customActions") ?? "Custom Actions"}
          description={t("customActionsDesc") ?? "Create your own AI actions with custom prompts"}
          icon={Sparkles}
          defaultOpen={false}
        >
          <div className="space-y-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => setIsCreateActionDialogOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              {t("addCustomAction") ?? "Add Custom Action"}
            </Button>

            {config.customUserActions?.length > 0 ? (
              <div className="space-y-2">
                {config.customUserActions.map((action) => (
                  <div
                    key={action.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      action.enabled ? "border-primary/30 bg-primary/5" : "border-border"
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{action.name}</div>
                        {action.description && (
                          <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Switch
                        checked={action.enabled}
                        onCheckedChange={(enabled) => updateCustomAction(action.id, { enabled })}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditingAction(action)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeCustomAction(action.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                {t("noCustomActions") ?? "No custom actions yet. Create one to get started."}
              </p>
            )}
          </div>
        </SettingsSection>

        {/* Search & Replace */}
        <SettingsSection
          title={t("searchAndReplace") ?? "Search & Replace"}
          description={t("searchAndReplaceDesc") ?? "Configure search engine and text replacement"}
          icon={Search}
          defaultOpen={false}
        >
          {/* Search Engine */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Search className="w-4 h-4" />
              {t("searchEngine") ?? "Search Engine"}
            </Label>
            <Select
              value={config.searchEngine}
              onValueChange={(value: SearchEngine) => setSearchEngine(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEARCH_ENGINES.map((engine) => (
                  <SelectItem key={engine.engine} value={engine.engine}>
                    {engine.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Replace-in-place */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2 text-sm">
                <Replace className="w-4 h-4" />
                {t("replaceInPlace") ?? "Replace in Place"}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("replaceInPlaceDesc") ?? "Replace selected text with AI result (desktop only)"}
              </p>
            </div>
            <Switch
              checked={config.enableReplaceInPlace}
              onCheckedChange={setEnableReplaceInPlace}
            />
          </div>
        </SettingsSection>

        {/* Reset Button */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            {t("resetHint")}
          </p>
          <Button variant="outline" size="sm" onClick={resetConfig} className="gap-2">
            <RotateCcw className="w-3.5 h-3.5" />
            {t("resetToDefaults")}
          </Button>
        </div>
      </div>

      {/* Create Custom Action Dialog */}
      <Dialog open={isCreateActionDialogOpen} onOpenChange={setIsCreateActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createCustomAction") ?? "Create Custom Action"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm">{t("name") ?? "Name"}</Label>
              <Input
                value={newAction.name}
                onChange={(e) => setNewAction((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t("actionNamePlaceholder") ?? "e.g., Fix Typos"}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{t("descriptionOptional") ?? "Description (optional)"}</Label>
              <Input
                value={newAction.description}
                onChange={(e) => setNewAction((prev) => ({ ...prev, description: e.target.value }))}
                placeholder={t("actionDescPlaceholder") ?? "Brief description of the action"}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{t("promptTemplate") ?? "Prompt Template"}</Label>
              <Textarea
                value={newAction.prompt}
                onChange={(e) => setNewAction((prev) => ({ ...prev, prompt: e.target.value }))}
                placeholder={t("actionPromptPlaceholder") ?? "Use {{text}} as placeholder for selected text"}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                {"Use {{text}} as a placeholder for the selected text."}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{t("shortcutOptional") ?? "Shortcut (optional)"}</Label>
              <Input
                value={newAction.shortcut}
                onChange={(e) => setNewAction((prev) => ({ ...prev, shortcut: e.target.value }))}
                placeholder={t("shortcutPlaceholder") ?? "e.g., Shift+F"}
                maxLength={10}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateActionDialogOpen(false)}>
              {t("cancel") ?? "Cancel"}
            </Button>
            <Button
              onClick={() => {
                if (newAction.name && newAction.prompt) {
                  addCustomAction({
                    name: newAction.name,
                    description: newAction.description || undefined,
                    prompt: newAction.prompt,
                    category: newAction.category,
                    shortcut: newAction.shortcut || undefined,
                    enabled: true,
                  });
                  setNewAction({ name: "", description: "", prompt: "", category: "ai", shortcut: "" });
                  setIsCreateActionDialogOpen(false);
                }
              }}
              disabled={!newAction.name || !newAction.prompt}
            >
              {t("create") ?? "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Custom Action Dialog */}
      <Dialog open={editingAction !== null} onOpenChange={(open) => !open && setEditingAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editCustomAction") ?? "Edit Custom Action"}</DialogTitle>
          </DialogHeader>
          {editingAction && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm">{t("name") ?? "Name"}</Label>
                <Input
                  value={editingAction.name}
                  onChange={(e) => setEditingAction((prev) => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{t("descriptionOptional") ?? "Description"}</Label>
                <Input
                  value={editingAction.description || ""}
                  onChange={(e) => setEditingAction((prev) => prev ? { ...prev, description: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{t("promptTemplate") ?? "Prompt Template"}</Label>
                <Textarea
                  value={editingAction.prompt}
                  onChange={(e) => setEditingAction((prev) => prev ? { ...prev, prompt: e.target.value } : null)}
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{t("shortcutOptional") ?? "Shortcut"}</Label>
                <Input
                  value={editingAction.shortcut || ""}
                  onChange={(e) => setEditingAction((prev) => prev ? { ...prev, shortcut: e.target.value } : null)}
                  maxLength={10}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingAction(null)}>
              {t("cancel") ?? "Cancel"}
            </Button>
            <Button
              onClick={() => {
                if (editingAction) {
                  updateCustomAction(editingAction.id, {
                    name: editingAction.name,
                    description: editingAction.description,
                    prompt: editingAction.prompt,
                    shortcut: editingAction.shortcut,
                  });
                  setEditingAction(null);
                }
              }}
            >
              {t("saveChanges") ?? "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
