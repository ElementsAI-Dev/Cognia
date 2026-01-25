/**
 * useInputCompletionUnified - Unified hook for multiple completion providers
 *
 * Combines @mention, /slash commands, :emoji, and AI ghost text completion
 * into a single unified system with proper conflict resolution.
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useMention } from '@/hooks/ui/use-mention';
import type {
  CompletionProviderType,
  CompletionProviderConfig,
  UnifiedCompletionState,
  CompletionItem,
  SlashCommandCompletionItem,
  EmojiCompletionItem,
  MentionCompletionItem,
} from '@/types/chat/input-completion';
import type { MentionItem } from '@/types/mcp';
import { searchCommands } from '@/lib/chat/slash-command-registry';
import { searchEmojis } from '@/lib/chat/emoji-data';

/** Default provider configurations */
const DEFAULT_PROVIDERS: CompletionProviderConfig[] = [
  { type: 'mention', trigger: 'symbol', triggerChar: '@', priority: 100, enabled: true },
  { type: 'slash', trigger: 'symbol', triggerChar: '/', priority: 90, enabled: true },
  { type: 'emoji', trigger: 'symbol', triggerChar: ':', priority: 80, enabled: true },
  { type: 'ai-text', trigger: 'contextual', priority: 50, enabled: false, debounceMs: 400 },
];

/** Initial completion state */
const INITIAL_STATE: UnifiedCompletionState = {
  isOpen: false,
  activeProvider: null,
  trigger: null,
  query: '',
  triggerPosition: 0,
  items: [],
  selectedIndex: 0,
  ghostText: null,
};

export interface UseInputCompletionUnifiedOptions {
  /** Available completion providers */
  providers?: CompletionProviderConfig[];
  /** Callback when item is selected */
  onSelect?: (item: CompletionItem) => void;
  /** Callback when completion state changes */
  onStateChange?: (state: UnifiedCompletionState) => void;
  /** Callback when mentions change (for MCP integration) */
  onMentionsChange?: (mentions: import('@/types/mcp').SelectedMention[]) => void;
  /** Max suggestions to show */
  maxSuggestions?: number;
}

export interface UseInputCompletionUnifiedReturn {
  /** Current completion state */
  state: UnifiedCompletionState;

  /** Handle text input change */
  handleInputChange: (text: string, cursorPosition: number) => void;

  /** Handle keyboard events - returns true if event was handled */
  handleKeyDown: (e: KeyboardEvent) => boolean;

  /** Select current item */
  selectItem: (index?: number) => void;

  /** Close completion */
  closeCompletion: () => void;

  /** Manually trigger completion (Ctrl+Space) */
  triggerCompletion: (type?: CompletionProviderType) => void;

  /** Get ghost text (if any) */
  getGhostText: () => string | null;

  /** Accept ghost text */
  acceptGhostText: () => void;

  /** Dismiss ghost text */
  dismissGhostText: () => void;

  /** Get mention-related data for MentionPopover compatibility */
  mentionData: {
    mentionState: import('@/types/mcp').MentionState;
    groupedMentions: Map<string, MentionItem[]>;
    filteredMentions: MentionItem[];
    isMcpAvailable: boolean;
  };

  /** Current input text */
  currentText: string;

  /** Parse tool calls from text (for MCP compatibility) */
  parseToolCalls: (text: string) => import('@/types/mcp').ParsedToolCall[];
}

export function useInputCompletionUnified(
  options: UseInputCompletionUnifiedOptions = {}
): UseInputCompletionUnifiedReturn {
  const {
    providers = DEFAULT_PROVIDERS,
    onSelect,
    onStateChange,
    onMentionsChange,
    maxSuggestions = 10,
  } = options;

  // State
  const [state, setState] = useState<UnifiedCompletionState>(INITIAL_STATE);
  const [currentText, setCurrentText] = useState('');
  const cursorPositionRef = useRef(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Use existing mention hook for @mention functionality
  const {
    mentionState,
    groupedMentions,
    filteredMentions,
    handleTextChange: handleMentionChange,
    selectMention,
    closeMention,
    parseToolCalls,
    isMcpAvailable,
  } = useMention({ onMentionsChange });

  // Get enabled providers sorted by priority
  const enabledProviders = useMemo(
    () =>
      providers
        .filter((p) => p.enabled)
        .sort((a, b) => b.priority - a.priority),
    [providers]
  );

  // Notify state changes
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // Detect trigger and update state
  const detectTrigger = useCallback(
    (text: string, cursorPosition: number): { provider: CompletionProviderType; trigger: string; query: string; position: number } | null => {
      const textBeforeCursor = text.slice(0, cursorPosition);

      for (const provider of enabledProviders) {
        if (provider.trigger !== 'symbol' || !provider.triggerChar) continue;

        const triggerChar = provider.triggerChar;
        const lastTriggerIndex = textBeforeCursor.lastIndexOf(triggerChar);

        if (lastTriggerIndex === -1) continue;

        // Check if trigger is at start or after whitespace
        const charBefore = lastTriggerIndex > 0 ? text[lastTriggerIndex - 1] : ' ';
        if (charBefore !== ' ' && charBefore !== '\n' && lastTriggerIndex !== 0) continue;

        // Extract query
        const query = textBeforeCursor.slice(lastTriggerIndex + 1);

        // Check if query contains space (completion might be done)
        // For emoji, allow spaces in query for searching
        if (provider.type !== 'emoji' && query.includes(' ')) continue;
        if (provider.type === 'emoji' && query.includes(' ')) continue;

        return {
          provider: provider.type,
          trigger: triggerChar,
          query,
          position: lastTriggerIndex,
        };
      }

      return null;
    },
    [enabledProviders]
  );

  // Get completion items based on provider and query
  const getCompletionItems = useCallback(
    (provider: CompletionProviderType, query: string): CompletionItem[] => {
      switch (provider) {
        case 'mention':
          // Use filtered mentions from useMention hook
          return filteredMentions.slice(0, maxSuggestions).map((item): MentionCompletionItem => ({
            id: `mention-${item.serverId}-${item.label}`,
            type: 'mention',
            label: item.label,
            description: item.description,
            data: item,
          }));

        case 'slash':
          return searchCommands(query).slice(0, maxSuggestions).map((cmd): SlashCommandCompletionItem => ({
            id: `slash-${cmd.id}`,
            type: 'slash',
            label: cmd.command,
            description: cmd.description,
            command: cmd.command,
            category: cmd.category,
            params: cmd.params,
          }));

        case 'emoji':
          return searchEmojis(query, maxSuggestions).map((emoji): EmojiCompletionItem => ({
            id: `emoji-${emoji.name}`,
            type: 'emoji',
            label: emoji.name,
            description: emoji.emoji,
            emoji: emoji.emoji,
            category: emoji.category,
            keywords: emoji.keywords,
          }));

        default:
          return [];
      }
    },
    [filteredMentions, maxSuggestions]
  );

  // Close completion
  const closeCompletion = useCallback(() => {
    closeMention();
    setState(INITIAL_STATE);
  }, [closeMention]);

  // Select an item
  const selectItem = useCallback(
    (index?: number) => {
      const idx = index ?? state.selectedIndex;
      const item = state.items[idx];

      if (!item) return;

      // Handle selection based on item type
      if (item.type === 'mention' && 'data' in item) {
        const mentionItem = item as MentionCompletionItem;
        const result = selectMention(mentionItem.data);
        setCurrentText(result.newText);
      } else if (item.type === 'slash') {
        const slashItem = item as SlashCommandCompletionItem;
        // Replace the /command with the full command
        const beforeTrigger = currentText.slice(0, state.triggerPosition);
        const afterQuery = currentText.slice(state.triggerPosition + 1 + state.query.length);
        const newText = `${beforeTrigger}/${slashItem.command} ${afterQuery}`;
        setCurrentText(newText);
      } else if (item.type === 'emoji') {
        const emojiItem = item as EmojiCompletionItem;
        // Replace :query with the actual emoji
        const beforeTrigger = currentText.slice(0, state.triggerPosition);
        const afterQuery = currentText.slice(state.triggerPosition + 1 + state.query.length);
        const newText = `${beforeTrigger}${emojiItem.emoji}${afterQuery}`;
        setCurrentText(newText);
      }

      // Notify callback
      onSelect?.(item);

      // Close completion
      setState(INITIAL_STATE);
    },
    [state, currentText, selectMention, onSelect]
  );

  // Handle text input change
  const handleInputChange = useCallback(
    (text: string, cursorPosition: number) => {
      setCurrentText(text);
      cursorPositionRef.current = cursorPosition;

      // Clear any pending debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Handle @mention using existing hook
      handleMentionChange(text, cursorPosition);

      // Detect trigger
      const triggerResult = detectTrigger(text, cursorPosition);

      if (triggerResult) {
        const items = getCompletionItems(triggerResult.provider, triggerResult.query);

        setState({
          isOpen: items.length > 0,
          activeProvider: triggerResult.provider,
          trigger: triggerResult.trigger,
          query: triggerResult.query,
          triggerPosition: triggerResult.position,
          items,
          selectedIndex: 0,
          ghostText: null,
        });
      } else {
        // Close completion if no trigger detected
        if (state.isOpen) {
          setState(INITIAL_STATE);
        }
      }
    },
    [handleMentionChange, detectTrigger, getCompletionItems, state.isOpen]
  );

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: KeyboardEvent): boolean => {
      // Ghost text handling
      if (state.ghostText) {
        if (e.key === 'Tab') {
          e.preventDefault();
          // Accept ghost text - to be implemented with AI completion
          setState((prev) => ({ ...prev, ghostText: null }));
          return true;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setState((prev) => ({ ...prev, ghostText: null }));
          return true;
        }
      }

      // Completion popover handling
      if (!state.isOpen || state.items.length === 0) {
        return false;
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setState((prev) => ({
            ...prev,
            selectedIndex: prev.selectedIndex > 0 ? prev.selectedIndex - 1 : prev.items.length - 1,
          }));
          return true;

        case 'ArrowDown':
          e.preventDefault();
          setState((prev) => ({
            ...prev,
            selectedIndex: prev.selectedIndex < prev.items.length - 1 ? prev.selectedIndex + 1 : 0,
          }));
          return true;

        case 'Tab':
        case 'Enter':
          e.preventDefault();
          selectItem(state.selectedIndex);
          return true;

        case 'Escape':
          e.preventDefault();
          closeCompletion();
          return true;

        default:
          return false;
      }
    },
    [state, selectItem, closeCompletion]
  );

  // Manually trigger completion
  const triggerCompletion = useCallback(
    (type?: CompletionProviderType) => {
      const providerType = type || 'mention';
      const provider = enabledProviders.find((p) => p.type === providerType);

      if (!provider) return;

      const items = getCompletionItems(providerType, '');

      setState({
        isOpen: items.length > 0,
        activeProvider: providerType,
        trigger: provider.triggerChar || null,
        query: '',
        triggerPosition: cursorPositionRef.current,
        items,
        selectedIndex: 0,
        ghostText: null,
      });
    },
    [enabledProviders, getCompletionItems]
  );

  // Ghost text functions
  const getGhostText = useCallback(() => state.ghostText, [state.ghostText]);

  const acceptGhostText = useCallback(() => {
    if (state.ghostText) {
      const newText = currentText + state.ghostText;
      setCurrentText(newText);
      setState((prev) => ({ ...prev, ghostText: null }));
    }
  }, [state.ghostText, currentText]);

  const dismissGhostText = useCallback(() => {
    setState((prev) => ({ ...prev, ghostText: null }));
  }, []);

  return {
    state,
    handleInputChange,
    handleKeyDown,
    selectItem,
    closeCompletion,
    triggerCompletion,
    getGhostText,
    acceptGhostText,
    dismissGhostText,
    mentionData: {
      mentionState,
      groupedMentions,
      filteredMentions,
      isMcpAvailable,
    },
    currentText,
    parseToolCalls,
  };
}

export default useInputCompletionUnified;
