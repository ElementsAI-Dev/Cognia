/**
 * useMention - Hook for managing @ mention functionality in chat input
 * 
 * Detects @ triggers, manages popover state, and handles mention selection
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useMcpStore } from '@/stores/mcp-store';
import type {
  MentionItem,
  SelectedMention,
  MentionState,
  ParsedToolCall,
} from '@/types/mcp';
import {
  createToolMention,
  createResourceMention,
  createPromptMention,
  createServerMention,
  formatMentionDisplay,
  isServerConnected,
} from '@/types/mcp';

export interface UseMentionOptions {
  /** Callback when mentions change */
  onMentionsChange?: (mentions: SelectedMention[]) => void;
}

export interface UseMentionReturn {
  /** Current mention state */
  mentionState: MentionState;
  /** All available mention items */
  allMentions: MentionItem[];
  /** Filtered mentions based on current query */
  filteredMentions: MentionItem[];
  /** Grouped mentions by server */
  groupedMentions: Map<string, MentionItem[]>;
  /** Handle text change - detects @ trigger */
  handleTextChange: (text: string, cursorPosition: number) => void;
  /** Handle mention selection */
  selectMention: (item: MentionItem) => { newText: string; newCursorPosition: number };
  /** Close the mention popover */
  closeMention: () => void;
  /** Open mention popover manually */
  openMention: (position: number) => void;
  /** Get selected mentions from text */
  getSelectedMentions: () => SelectedMention[];
  /** Parse tool calls from message text */
  parseToolCalls: (text: string) => ParsedToolCall[];
  /** Check if MCP is available */
  isMcpAvailable: boolean;
  /** Current input text (for tracking) */
  currentText: string;
}

export function useMention(options: UseMentionOptions = {}): UseMentionReturn {
  const { onMentionsChange } = options;
  
  // MCP store
  const servers = useMcpStore((state) => state.servers);
  const isInitialized = useMcpStore((state) => state.isInitialized);
  const initialize = useMcpStore((state) => state.initialize);
  
  // Local state
  const [mentionState, setMentionState] = useState<MentionState>({
    isOpen: false,
    query: '',
    triggerPosition: 0,
    selectedMentions: [],
  });
  
  const [currentText, setCurrentText] = useState('');
  const previousMentionsRef = useRef<SelectedMention[]>([]);
  
  // Initialize MCP store if needed
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);
  
  // Build all available mention items from connected servers
  const allMentions = useMemo<MentionItem[]>(() => {
    const items: MentionItem[] = [];
    
    for (const server of servers) {
      if (!isServerConnected(server.status)) continue;
      
      // Add server mention
      if (server.tools.length > 0) {
        items.push(createServerMention(server.id, server.name, server.tools.length));
      }
      
      // Add tool mentions
      for (const tool of server.tools) {
        items.push(createToolMention(server.id, server.name, tool));
      }
      
      // Add resource mentions
      for (const resource of server.resources) {
        items.push(createResourceMention(server.id, server.name, resource));
      }
      
      // Add prompt mentions
      for (const prompt of server.prompts) {
        items.push(createPromptMention(server.id, server.name, prompt));
      }
    }
    
    return items;
  }, [servers]);
  
  // Filter mentions based on query
  const filteredMentions = useMemo<MentionItem[]>(() => {
    if (!mentionState.query) return allMentions;
    
    const query = mentionState.query.toLowerCase();
    return allMentions.filter((item) => {
      // Match by label
      if (item.label.toLowerCase().includes(query)) return true;
      // Match by server name
      if (item.serverName.toLowerCase().includes(query)) return true;
      // Match by description
      if (item.description?.toLowerCase().includes(query)) return true;
      // Match by server:tool format
      const fullId = `${item.serverId}:${item.label}`.toLowerCase();
      if (fullId.includes(query)) return true;
      return false;
    });
  }, [allMentions, mentionState.query]);
  
  // Group mentions by server
  const groupedMentions = useMemo<Map<string, MentionItem[]>>(() => {
    const groups = new Map<string, MentionItem[]>();
    
    for (const item of filteredMentions) {
      const key = item.serverName;
      const existing = groups.get(key) || [];
      existing.push(item);
      groups.set(key, existing);
    }
    
    return groups;
  }, [filteredMentions]);
  
  // Handle text change - detect @ trigger
  const handleTextChange = useCallback((text: string, cursorPosition: number) => {
    setCurrentText(text);
    
    // Find the @ symbol before cursor
    const textBeforeCursor = text.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex === -1) {
      // No @ found, close popover if open
      if (mentionState.isOpen) {
        setMentionState((prev) => ({ ...prev, isOpen: false, query: '' }));
      }
      return;
    }
    
    // Check if @ is at the start or after a space
    const charBefore = lastAtIndex > 0 ? text[lastAtIndex - 1] : ' ';
    if (charBefore !== ' ' && charBefore !== '\n' && lastAtIndex !== 0) {
      // @ is part of another word, don't trigger
      if (mentionState.isOpen) {
        setMentionState((prev) => ({ ...prev, isOpen: false, query: '' }));
      }
      return;
    }
    
    // Extract query (text after @)
    const query = textBeforeCursor.slice(lastAtIndex + 1);
    
    // Check if query contains space (mention completed)
    if (query.includes(' ')) {
      if (mentionState.isOpen) {
        setMentionState((prev) => ({ ...prev, isOpen: false, query: '' }));
      }
      return;
    }
    
    // Open or update mention popover
    setMentionState((prev) => ({
      ...prev,
      isOpen: true,
      query,
      triggerPosition: lastAtIndex,
    }));
  }, [mentionState.isOpen]);
  
  // Handle mention selection
  const selectMention = useCallback((item: MentionItem): { newText: string; newCursorPosition: number } => {
    const displayText = formatMentionDisplay(item);
    const beforeTrigger = currentText.slice(0, mentionState.triggerPosition);
    const afterQuery = currentText.slice(mentionState.triggerPosition + mentionState.query.length + 1);
    
    // Insert mention text
    const newText = `${beforeTrigger}${displayText} ${afterQuery}`;
    const newCursorPosition = beforeTrigger.length + displayText.length + 1;
    
    // Create selected mention
    const selectedMention: SelectedMention = {
      item,
      startIndex: mentionState.triggerPosition,
      endIndex: mentionState.triggerPosition + displayText.length,
      displayText,
    };
    
    // Update state
    setMentionState((prev) => ({
      ...prev,
      isOpen: false,
      query: '',
      selectedMentions: [...prev.selectedMentions, selectedMention],
    }));
    
    setCurrentText(newText);
    
    return { newText, newCursorPosition };
  }, [currentText, mentionState.triggerPosition, mentionState.query]);
  
  // Close mention popover
  const closeMention = useCallback(() => {
    setMentionState((prev) => ({ ...prev, isOpen: false, query: '' }));
  }, []);
  
  // Open mention popover manually
  const openMention = useCallback((position: number) => {
    setMentionState((prev) => ({
      ...prev,
      isOpen: true,
      query: '',
      triggerPosition: position,
    }));
  }, []);
  
  // Get selected mentions from current text
  const getSelectedMentions = useCallback((): SelectedMention[] => {
    const mentions: SelectedMention[] = [];
    
    // Find all @server:tool patterns in text
    const mentionRegex = /@([a-zA-Z0-9_-]+)(?::(resource|prompt):)?:?([a-zA-Z0-9_-]+)?/g;
    let match;
    
    while ((match = mentionRegex.exec(currentText)) !== null) {
      const [fullMatch, serverId, typeStr, name] = match;
      const startIndex = match.index;
      const endIndex = startIndex + fullMatch.length;
      
      // Find matching mention item
      let mentionItem: MentionItem | undefined;
      
      if (!name) {
        // Server mention
        mentionItem = allMentions.find(
          (m) => m.type === 'server' && m.serverId === serverId
        );
      } else if (typeStr === 'resource') {
        mentionItem = allMentions.find(
          (m) => m.type === 'resource' && m.serverId === serverId && m.label === name
        );
      } else if (typeStr === 'prompt') {
        mentionItem = allMentions.find(
          (m) => m.type === 'prompt' && m.serverId === serverId && m.label === name
        );
      } else {
        // Tool mention
        mentionItem = allMentions.find(
          (m) => m.type === 'tool' && m.serverId === serverId && m.label === name
        );
      }
      
      if (mentionItem) {
        mentions.push({
          item: mentionItem,
          startIndex,
          endIndex,
          displayText: fullMatch,
        });
      }
    }
    
    return mentions;
  }, [currentText, allMentions]);
  
  // Parse tool calls from message text
  const parseToolCalls = useCallback((text: string): ParsedToolCall[] => {
    const toolCalls: ParsedToolCall[] = [];
    
    // Find all tool mentions: @server:tool_name
    const toolRegex = /@([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+)/g;
    let match;
    
    while ((match = toolRegex.exec(text)) !== null) {
      const [fullMatch, serverId, toolName] = match;
      
      // Verify this is a valid tool
      const isValidTool = allMentions.some(
        (m) => m.type === 'tool' && m.serverId === serverId && m.label === toolName
      );
      
      if (isValidTool) {
        toolCalls.push({
          serverId,
          toolName,
          mentionText: fullMatch,
        });
      }
    }
    
    return toolCalls;
  }, [allMentions]);
  
  // Notify when mentions change
  useEffect(() => {
    const currentMentions = getSelectedMentions();
    const prevMentions = previousMentionsRef.current;
    
    // Check if mentions changed
    const mentionsChanged = 
      currentMentions.length !== prevMentions.length ||
      currentMentions.some((m, i) => m.displayText !== prevMentions[i]?.displayText);
    
    if (mentionsChanged && onMentionsChange) {
      onMentionsChange(currentMentions);
      previousMentionsRef.current = currentMentions;
    }
  }, [currentText, getSelectedMentions, onMentionsChange]);
  
  // Check if MCP is available (any connected servers with tools)
  const isMcpAvailable = useMemo(() => {
    return servers.some((s) => isServerConnected(s.status) && s.tools.length > 0);
  }, [servers]);
  
  return {
    mentionState,
    allMentions,
    filteredMentions,
    groupedMentions,
    handleTextChange,
    selectMention,
    closeMention,
    openMention,
    getSelectedMentions,
    parseToolCalls,
    isMcpAvailable,
    currentText,
  };
}

export default useMention;
