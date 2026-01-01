"use client";

import { useTranslations } from 'next-intl';
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Languages,
  FileText,
  Copy,
  MessageSquare,
  MoreHorizontal,
  Sparkles,
  PenLine,
  CheckCircle,
  BookMarked,
  Search,
  Code2,
  Wand2,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  Coffee,
  ChevronRight,
  X,
  GripVertical,
  Maximize2,
  Type,
  AlignLeft,
  AlignJustify,
  Plus,
  Layers,
  Link2,
  Trash2,
  File,
  Globe,
  ClipboardList,
  StickyNote,
} from "lucide-react";
import { useEffect, useCallback, useState, useRef } from "react";
import { ToolbarButton } from "./toolbar-button";
import { ResultPanel } from "./result-panel";
import { SelectionAction, ActionDefinition, ActionCategory, SelectionMode } from "./types";
import { useSelectionToolbar } from "@/hooks/use-selection-toolbar";
import { useSelectionStore } from "@/stores/selection-store";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// All available actions with metadata (using labelKey and descKey for i18n)
const ALL_ACTIONS: Array<Omit<ActionDefinition, 'label' | 'description'> & { labelKey: string; descKey: string }> = [
  // AI Actions
  { action: "explain", icon: BookOpen, labelKey: "actionExplain", shortcut: "E", category: "ai", descKey: "actionExplainDesc" },
  { action: "translate", icon: Languages, labelKey: "actionTranslate", shortcut: "T", category: "ai", descKey: "actionTranslateDesc" },
  { action: "summarize", icon: Sparkles, labelKey: "actionSummarize", shortcut: "S", category: "ai", descKey: "actionSummarizeDesc" },
  { action: "define", icon: BookMarked, labelKey: "actionDefine", shortcut: "D", category: "ai", descKey: "actionDefineDesc" },
  { action: "search", icon: Search, labelKey: "actionSearch", shortcut: "F", category: "ai", descKey: "actionSearchDesc" },
  
  // Edit Actions
  { action: "rewrite", icon: PenLine, labelKey: "actionRewrite", shortcut: "R", category: "edit", descKey: "actionRewriteDesc" },
  { action: "grammar", icon: CheckCircle, labelKey: "actionGrammar", shortcut: "G", category: "edit", descKey: "actionGrammarDesc" },
  { action: "expand", icon: ArrowUpRight, labelKey: "actionExpand", category: "edit", descKey: "actionExpandDesc" },
  { action: "shorten", icon: ArrowDownRight, labelKey: "actionShorten", category: "edit", descKey: "actionShortenDesc" },
  { action: "tone-formal", icon: Briefcase, labelKey: "actionFormal", category: "edit", descKey: "actionFormalDesc" },
  { action: "tone-casual", icon: Coffee, labelKey: "actionCasual", category: "edit", descKey: "actionCasualDesc" },
  
  // Code Actions
  { action: "code-explain", icon: Code2, labelKey: "actionCodeExplain", shortcut: "X", category: "code", descKey: "actionCodeExplainDesc" },
  { action: "code-optimize", icon: Wand2, labelKey: "actionOptimize", shortcut: "O", category: "code", descKey: "actionOptimizeDesc" },
  
  // Utility Actions
  { action: "extract", icon: FileText, labelKey: "actionKeyPoints", shortcut: "K", category: "utility", descKey: "actionKeyPointsDesc" },
  { action: "copy", icon: Copy, labelKey: "actionCopy", shortcut: "C", category: "utility", descKey: "actionCopyDesc" },
  { action: "send-to-chat", icon: MessageSquare, labelKey: "actionSendToChat", shortcut: "↵", category: "utility", descKey: "actionSendToChatDesc" },
];

// Selection mode options
const SELECTION_MODES: { mode: SelectionMode; icon: typeof Type; label: string }[] = [
  { mode: "word", icon: Type, label: "Word" },
  { mode: "sentence", icon: AlignLeft, label: "Sentence" },
  { mode: "paragraph", icon: AlignJustify, label: "Paragraph" },
  { mode: "auto", icon: Wand2, label: "Smart" },
];

// Default pinned actions
const DEFAULT_PINNED: SelectionAction[] = ["explain", "translate", "summarize", "copy", "send-to-chat"];

// Category labels and colors
const CATEGORY_INFO: Record<ActionCategory, { label: string; color: string }> = {
  ai: { label: "AI", color: "text-cyan-400" },
  edit: { label: "Edit", color: "text-emerald-400" },
  code: { label: "Code", color: "text-violet-400" },
  utility: { label: "Utility", color: "text-amber-400" },
};

export function SelectionToolbar() {
  const {
    state,
    executeAction,
    copyResult,
    clearResult,
    hideToolbar,
  } = useSelectionToolbar();

  const t = useTranslations('selectionToolbar');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ActionCategory | null>(null);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("auto");
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showReferences, setShowReferences] = useState(false);
  const [showExpandedView, setShowExpandedView] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Multi-selection and references from store
  const {
    selections,
    isMultiSelectMode,
    references,
    toggleMultiSelectMode,
    addSelection,
    removeSelection,
    clearSelections,
    addReference,
    removeReference,
    clearReferences,
    getCombinedText,
  } = useSelectionStore();

  // Get pinned actions
  const pinnedActions = ALL_ACTIONS.filter((a) => DEFAULT_PINNED.includes(a.action));
  
  // Get actions by category for the more menu
  const getActionsByCategory = (category: ActionCategory) =>
    ALL_ACTIONS.filter((a) => a.category === category && !DEFAULT_PINNED.includes(a.action));

  const handleAction = useCallback(
    async (action: SelectionAction) => {
      setShowMoreMenu(false);
      
      // Get text to process (combined if multi-select mode)
      const textToProcess = isMultiSelectMode && selections.length > 0 
        ? getCombinedText() 
        : state.selectedText;
      
      if (action === "copy") {
        await navigator.clipboard.writeText(textToProcess);
        hideToolbar();
        return;
      }

      if (action === "send-to-chat") {
        if (typeof window !== "undefined" && window.__TAURI__) {
          const { emit } = await import("@tauri-apps/api/event");
          // Include references in the payload
          await emit("selection-send-to-chat", { 
            text: textToProcess,
            references: references.length > 0 ? references : undefined,
          });
        }
        hideToolbar();
        return;
      }

      if (action === "search") {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(textToProcess)}`;
        window.open(searchUrl, "_blank");
        hideToolbar();
        return;
      }

      await executeAction(action);
    },
    [state.selectedText, executeAction, hideToolbar, isMultiSelectMode, selections.length, getCombinedText, references]
  );

  // Handle click outside - use mouseup to not interfere with text selection
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".selection-toolbar")) {
        // Don't hide if user might be making a new selection
        const windowSelection = window.getSelection();
        if (!windowSelection || windowSelection.isCollapsed || windowSelection.toString().trim() === '') {
          hideToolbar();
        }
      }
    };

    // Use mouseup instead of mousedown to not interfere with selection start
    document.addEventListener("mouseup", handleClickOutside);
    return () => document.removeEventListener("mouseup", handleClickOutside);
  }, [hideToolbar]);

  // Handle selection mode change
  const handleModeChange = async (mode: SelectionMode) => {
    setSelectionMode(mode);
    setShowModeSelector(false);
    
    if (typeof window !== "undefined" && window.__TAURI__) {
      const { invoke } = await import("@tauri-apps/api/core");
      try {
        await invoke("selection_smart_expand", {
          text: state.selectedText,
          cursorPos: 0,
          mode,
        });
      } catch (e) {
        console.error("Failed to expand selection:", e);
      }
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!state.isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Escape to close menus or toolbar
      if (e.key === "Escape") {
        e.preventDefault();
        if (showMoreMenu) {
          setShowMoreMenu(false);
        } else if (showModeSelector) {
          setShowModeSelector(false);
        } else if (showReferences) {
          setShowReferences(false);
        } else {
          hideToolbar();
        }
        return;
      }

      // Don't process other shortcuts when loading
      if (state.isLoading) return;

      // Enter key for send-to-chat
      if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleAction("send-to-chat");
        return;
      }

      // Find action by shortcut (case-insensitive, single key)
      // Skip if Ctrl/Cmd is pressed to allow native copy (Ctrl+C)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      const key = e.key.toUpperCase();
      const action = ALL_ACTIONS.find((a) => a.shortcut === key);
      
      if (action) {
        e.preventDefault();
        handleAction(action.action);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [state.isVisible, state.isLoading, handleAction, hideToolbar, showMoreMenu, showModeSelector, showReferences]);

  return (
    <TooltipProvider>
      <div className="selection-toolbar relative" ref={toolbarRef}>
        {/* Main Toolbar */}
        <div
          className={cn(
            "flex items-center gap-0.5 px-1.5 py-1",
            "bg-linear-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95",
            "backdrop-blur-xl",
            "rounded-2xl",
            "shadow-2xl shadow-black/60",
            "border border-white/8",
            "animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300"
          )}
        >
          {/* Drag Handle */}
          <div className="flex items-center justify-center w-6 h-8 cursor-move opacity-40 hover:opacity-70 transition-opacity">
            <GripVertical className="w-3 h-3 text-white" />
          </div>

          {/* Selection Mode Selector */}
          <Popover open={showModeSelector} onOpenChange={setShowModeSelector}>
            <PopoverTrigger asChild>
              <div>
                <ToolbarButton
                  icon={SELECTION_MODES.find((m) => m.mode === selectionMode)?.icon || Wand2}
                  label="Selection Mode"
                  description="Change how text is selected"
                  size="sm"
                  onClick={() => setShowModeSelector(!showModeSelector)}
                  isActive={showModeSelector}
                />
              </div>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="start"
              className="w-auto p-1 bg-gray-900/95 backdrop-blur-xl border-white/10"
            >
              {SELECTION_MODES.map(({ mode, icon: Icon, label }) => (
                <Button
                  key={mode}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleModeChange(mode)}
                  className={cn(
                    "w-full justify-start gap-2 text-sm text-white/80 hover:text-white hover:bg-white/10",
                    selectionMode === mode && "bg-white/15 text-cyan-400"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </Button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Divider */}
          <Separator orientation="vertical" className="h-6 bg-white/6 mx-0.5" />

          {/* Primary Actions */}
          {pinnedActions.map(({ action, icon, labelKey, shortcut, descKey }) => (
            <ToolbarButton
              key={action}
              icon={icon}
              label={t(labelKey)}
              shortcut={shortcut}
              description={t(descKey)}
              isActive={state.activeAction === action}
              isLoading={state.isLoading && state.activeAction === action}
              onClick={() => handleAction(action)}
              disabled={state.isLoading}
              variant={action === "send-to-chat" ? "primary" : "default"}
            />
          ))}

          {/* Divider */}
          <Separator orientation="vertical" className="h-6 bg-white/6 mx-0.5" />

          {/* Multi-Select Toggle */}
          <ToolbarButton
            icon={Layers}
            label="Multi-Select"
            description={isMultiSelectMode ? "Exit multi-select mode" : "Select multiple texts"}
            shortcut="M"
            isActive={isMultiSelectMode}
            badge={selections.length > 0 ? selections.length : undefined}
            onClick={() => {
              if (isMultiSelectMode && state.selectedText) {
                // Add current selection when exiting
                addSelection(state.selectedText, state.position);
              }
              toggleMultiSelectMode();
            }}
            variant={isMultiSelectMode ? "primary" : "default"}
          />

          {/* Add Reference */}
          <ToolbarButton
            icon={Link2}
            label="Add Reference"
            description="Add context from files, URLs, or notes"
            badge={references.length > 0 ? references.length : undefined}
            onClick={() => setShowReferences(!showReferences)}
            isActive={showReferences}
          />

          {/* Divider */}
          <Separator orientation="vertical" className="h-6 bg-white/6 mx-0.5" />

          {/* More Options */}
          <ToolbarButton
            icon={MoreHorizontal}
            label="More Actions"
            description="View all available actions"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            isActive={showMoreMenu}
          />

          {/* Expand/Fullscreen */}
          <ToolbarButton
            icon={Maximize2}
            label="Expand"
            description="Open in expanded view"
            size="sm"
            onClick={() => setShowExpandedView(true)}
          />

          {/* Close */}
          <ToolbarButton
            icon={X}
            label="Close"
            shortcut="Esc"
            size="sm"
            variant="danger"
            onClick={hideToolbar}
          />
        </div>

        {/* Multi-Selection Panel */}
        {isMultiSelectMode && selections.length > 0 && (
          <div
            className={cn(
              "absolute top-full left-0 mt-2 w-80",
              "bg-gray-900/95 backdrop-blur-xl",
              "rounded-xl border border-white/8",
              "shadow-2xl shadow-black/50",
              "animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200",
              "overflow-hidden"
            )}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/6">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white/80">Selections</span>
                <Badge variant="secondary" className="h-5 text-[10px]">
                  {selections.length}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelections}
                className="h-6 px-2 text-xs text-white/50 hover:text-red-400"
              >
                Clear all
              </Button>
            </div>
            <ScrollArea className="max-h-40">
              <div className="p-2 space-y-1">
                {selections.map((sel) => (
                  <div
                    key={sel.id}
                    className="flex items-start gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 group"
                  >
                    <span className="flex-1 text-xs text-white/70 line-clamp-2">
                      {sel.text.slice(0, 100)}{sel.text.length > 100 ? "..." : ""}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSelection(sel.id)}
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-white/40 hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="p-2 border-t border-white/6">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (state.selectedText) {
                    addSelection(state.selectedText, state.position);
                  }
                }}
                className="w-full gap-2 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
              >
                <Plus className="w-3 h-3" />
                Add current selection
              </Button>
            </div>
          </div>
        )}

        {/* References Panel */}
        {showReferences && (
          <div
            className={cn(
              "absolute top-full right-0 mt-2 w-80",
              "bg-gray-900/95 backdrop-blur-xl",
              "rounded-xl border border-white/8",
              "shadow-2xl shadow-black/50",
              "animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200",
              "overflow-hidden"
            )}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/6">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white/80">References</span>
                <Badge variant="secondary" className="h-5 text-[10px]">
                  {references.length}
                </Badge>
              </div>
              {references.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearReferences}
                  className="h-6 px-2 text-xs text-white/50 hover:text-red-400"
                >
                  Clear all
                </Button>
              )}
            </div>
            
            {/* Add Reference Options */}
            <div className="p-2 space-y-1 border-b border-white/6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.readText().then((text) => {
                    if (text) {
                      addReference({
                        type: "clipboard",
                        title: "From Clipboard",
                        content: text,
                        preview: text.slice(0, 100),
                        metadata: { timestamp: Date.now() },
                      });
                    }
                  });
                }}
                className="w-full justify-start gap-2 text-white/70 hover:bg-white/10 text-xs"
              >
                <ClipboardList className="w-4 h-4" />
                <span>From Clipboard</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const url = prompt("Enter URL:");
                  if (url) {
                    addReference({
                      type: "url",
                      title: url,
                      content: "",
                      preview: url,
                      metadata: { url, timestamp: Date.now() },
                    });
                  }
                }}
                className="w-full justify-start gap-2 text-white/70 hover:bg-white/10 text-xs"
              >
                <Globe className="w-4 h-4" />
                <span>From URL</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const note = prompt("Enter note:");
                  if (note) {
                    addReference({
                      type: "note",
                      title: "Note",
                      content: note,
                      preview: note.slice(0, 100),
                      metadata: { timestamp: Date.now() },
                    });
                  }
                }}
                className="w-full justify-start gap-2 text-white/70 hover:bg-white/10 text-xs"
              >
                <StickyNote className="w-4 h-4" />
                <span>Add Note</span>
              </Button>
            </div>

            {/* Reference List */}
            {references.length > 0 && (
              <ScrollArea className="max-h-40">
                <div className="p-2 space-y-1">
                  {references.map((ref) => (
                    <div
                      key={ref.id}
                      className="flex items-start gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 group"
                    >
                      <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center shrink-0">
                        {ref.type === "file" && <File className="w-3 h-3 text-blue-400" />}
                        {ref.type === "url" && <Globe className="w-3 h-3 text-green-400" />}
                        {ref.type === "clipboard" && <ClipboardList className="w-3 h-3 text-amber-400" />}
                        {ref.type === "note" && <StickyNote className="w-3 h-3 text-purple-400" />}
                        {ref.type === "selection" && <Layers className="w-3 h-3 text-cyan-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white/80 truncate">{ref.title}</p>
                        {ref.preview && (
                          <p className="text-[10px] text-white/50 line-clamp-1">{ref.preview}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeReference(ref.id)}
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-white/40 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {/* More Menu */}
        {showMoreMenu && (
          <div
            className={cn(
              "absolute top-full left-0 right-0 mt-2",
              "bg-gray-900/95 backdrop-blur-xl",
              "rounded-2xl border border-white/8",
              "shadow-2xl shadow-black/50",
              "animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200",
              "overflow-hidden"
            )}
          >
            {/* Category Tabs */}
            <Tabs value={activeCategory || "all"} className="w-full">
              <TabsList className="w-full justify-start gap-1 p-2 h-auto bg-transparent border-b border-white/6 rounded-none">
                <TabsTrigger
                  value="all"
                  onClick={() => setActiveCategory(null)}
                  className="px-3 py-1.5 text-xs data-[state=active]:bg-white/10"
                >
                  All
                </TabsTrigger>
                {(Object.keys(CATEGORY_INFO) as ActionCategory[]).map((category) => (
                  <TabsTrigger
                    key={category}
                    value={category}
                    onClick={() => setActiveCategory(category)}
                    className={cn(
                      "px-3 py-1.5 text-xs",
                      "data-[state=active]:bg-white/10",
                      activeCategory === category && CATEGORY_INFO[category].color
                    )}
                  >
                    {CATEGORY_INFO[category].label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Actions Grid */}
            <ScrollArea className="max-h-[280px]">
              <div className="p-2">
                {activeCategory ? (
                  // Show single category
                  <div className="grid grid-cols-2 gap-1">
                    {getActionsByCategory(activeCategory).map(({ action, icon: Icon, labelKey, shortcut, descKey }) => (
                      <Button
                        key={action}
                        variant="ghost"
                        onClick={() => handleAction(action)}
                        disabled={state.isLoading}
                        className={cn(
                          "h-auto flex items-center gap-3 p-3 justify-start",
                          "text-left text-white/80 hover:text-white hover:bg-white/10",
                          "group"
                        )}
                      >
                        <div className={cn(
                          "flex items-center justify-center w-9 h-9 rounded-lg",
                          "bg-white/5 group-hover:bg-white/10",
                          CATEGORY_INFO[activeCategory].color
                        )}>
                          <Icon className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{t(labelKey)}</span>
                            {shortcut && (
                              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] h-5">
                                {shortcut}
                              </Badge>
                            )}
                          </div>
                          {descKey && (
                            <p className="text-xs text-white/40 truncate font-normal">{t(descKey)}</p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
                      </Button>
                    ))}
                  </div>
                ) : (
                  // Show all categories
                  <div className="space-y-3">
                    {(Object.keys(CATEGORY_INFO) as ActionCategory[]).map((category) => {
                      const categoryActions = getActionsByCategory(category);
                      if (categoryActions.length === 0) return null;
                      
                      return (
                        <div key={category}>
                          <div className={cn("text-xs font-medium px-2 mb-1", CATEGORY_INFO[category].color)}>
                            {CATEGORY_INFO[category].label}
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            {categoryActions.map(({ action, icon: Icon, labelKey, shortcut }) => (
                              <Button
                                key={action}
                                variant="ghost"
                                onClick={() => handleAction(action)}
                                disabled={state.isLoading}
                                className="h-auto flex flex-col items-center gap-1.5 p-2.5 text-white/70 hover:text-white hover:bg-white/10"
                              >
                                <Icon className="w-5 h-5" />
                                <span className="text-[11px] font-medium">{t(labelKey)}</span>
                                {shortcut && (
                                  <kbd className="text-[9px] text-white/40">{shortcut}</kbd>
                                )}
                              </Button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Result Panel */}
        <ResultPanel
          result={state.result}
          error={state.error}
          isLoading={state.isLoading}
          onClose={clearResult}
          onCopy={copyResult}
        />

        {/* Selected Text Preview (when long) */}
        {state.selectedText && state.selectedText.length > 100 && !state.result && !state.isLoading && (
          <div
            className={cn(
              "absolute top-full left-0 right-0 mt-2",
              "px-3 py-2 rounded-xl",
              "bg-gray-900/80 backdrop-blur-sm",
              "border border-white/5",
              "animate-in fade-in duration-200"
            )}
          >
            <p className="text-xs text-white/50 line-clamp-2">
              {state.selectedText}
            </p>
            <span className="text-[10px] text-white/30 mt-1 block">
              {state.selectedText.length} characters selected
            </span>
          </div>
        )}

        {/* Expanded View Dialog */}
        <Dialog open={showExpandedView} onOpenChange={setShowExpandedView}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                {t('expandedViewTitle')}
              </DialogTitle>
              <DialogDescription>
                {t('expandedViewDescription')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-hidden flex flex-col gap-4">
              {/* Selected Text */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {t('selectedText')}
                </label>
                <ScrollArea className="h-32 rounded-lg border bg-muted/30 p-3">
                  <p className="text-sm whitespace-pre-wrap">
                    {isMultiSelectMode && selections.length > 0 
                      ? getCombinedText() 
                      : state.selectedText}
                  </p>
                </ScrollArea>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {(isMultiSelectMode && selections.length > 0 
                      ? getCombinedText() 
                      : state.selectedText
                    )?.length || 0} {t('characters')}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => {
                      const text = isMultiSelectMode && selections.length > 0 
                        ? getCombinedText() 
                        : state.selectedText;
                      if (text) navigator.clipboard.writeText(text);
                    }}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    {t('actionCopy')}
                  </Button>
                </div>
              </div>

              {/* Actions Grid */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">
                  {t('availableActions')}
                </label>
                <Tabs defaultValue="ai" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    {Object.entries(CATEGORY_INFO).map(([key, info]) => (
                      <TabsTrigger key={key} value={key} className={info.color}>
                        {info.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <ScrollArea className="h-48 mt-3">
                    <div className="grid grid-cols-2 gap-2 p-1">
                      {ALL_ACTIONS.map((action) => {
                        const Icon = action.icon;
                        return (
                          <Button
                            key={action.action}
                            variant="outline"
                            className="justify-start gap-2 h-auto py-2"
                            onClick={() => {
                              setShowExpandedView(false);
                              handleAction(action.action);
                            }}
                            disabled={state.isLoading}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <div className="text-left">
                              <div className="text-sm font-medium">
                                {t(action.labelKey)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {t(action.descKey)}
                              </div>
                            </div>
                            {action.shortcut && (
                              <kbd className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded">
                                {action.shortcut}
                              </kbd>
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </Tabs>
              </div>

              {/* Result Preview */}
              {state.result && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('result')}
                  </label>
                  <ScrollArea className="h-32 rounded-lg border bg-muted/30 p-3">
                    <p className="text-sm whitespace-pre-wrap">{state.result}</p>
                  </ScrollArea>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyResult}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      {t('actionCopy')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearResult}
                    >
                      {t('clear')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
