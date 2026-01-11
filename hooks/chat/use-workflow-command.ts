'use client';

/**
 * useWorkflowCommand - Hook for handling workflow commands in chat input
 * Supports /workflow, /run, /wf commands to trigger workflows
 */

import { useState, useCallback } from 'react';
import { workflowRepository } from '@/lib/db/repositories';
import { useWorkflowEditorStore } from '@/stores/workflow';
import type { VisualWorkflow } from '@/types/workflow/workflow-editor';

export interface WorkflowCommandResult {
  isCommand: boolean;
  command?: string;
  workflowName?: string;
  input?: string;
  workflow?: VisualWorkflow;
}

export interface UseWorkflowCommandOptions {
  onWorkflowSelect?: (workflow: VisualWorkflow, input: Record<string, unknown>) => void;
  onShowPicker?: () => void;
}

export interface UseWorkflowCommandReturn {
  // State
  isProcessing: boolean;
  suggestions: VisualWorkflow[];
  showSuggestions: boolean;

  // Actions
  parseCommand: (input: string) => WorkflowCommandResult;
  handleCommand: (input: string) => Promise<boolean>;
  getSuggestions: (query: string) => Promise<VisualWorkflow[]>;
  selectSuggestion: (workflow: VisualWorkflow, inputText?: string) => void;
  clearSuggestions: () => void;

  // Utils
  isWorkflowCommand: (input: string) => boolean;
  extractWorkflowInput: (input: string) => { workflowName: string; inputText: string } | null;
}

// Command patterns
const WORKFLOW_COMMANDS = ['/workflow', '/run', '/wf'];
const COMMAND_PATTERN = /^\/(?:workflow|run|wf)(?:\s+(.*))?$/i;

export function useWorkflowCommand(
  options: UseWorkflowCommandOptions = {}
): UseWorkflowCommandReturn {
  const { onWorkflowSelect, onShowPicker } = options;

  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestions, setSuggestions] = useState<VisualWorkflow[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { loadWorkflow } = useWorkflowEditorStore();

  // Check if input is a workflow command
  const isWorkflowCommand = useCallback((input: string): boolean => {
    const trimmed = input.trim().toLowerCase();
    return WORKFLOW_COMMANDS.some(
      (cmd) => trimmed === cmd || trimmed.startsWith(cmd + ' ')
    );
  }, []);

  // Parse command to extract workflow name and input
  const parseCommand = useCallback((input: string): WorkflowCommandResult => {
    const trimmed = input.trim();
    const match = trimmed.match(COMMAND_PATTERN);

    if (!match) {
      return { isCommand: false };
    }

    const args = match[1]?.trim() || '';

    // If no args, just show picker
    if (!args) {
      return {
        isCommand: true,
        command: 'workflow',
      };
    }

    // Try to parse "workflowName: input" or "workflowName input"
    const colonIndex = args.indexOf(':');
    if (colonIndex > 0) {
      return {
        isCommand: true,
        command: 'workflow',
        workflowName: args.slice(0, colonIndex).trim(),
        input: args.slice(colonIndex + 1).trim(),
      };
    }

    // Check if first word matches a workflow name
    const firstSpaceIndex = args.indexOf(' ');
    if (firstSpaceIndex > 0) {
      return {
        isCommand: true,
        command: 'workflow',
        workflowName: args.slice(0, firstSpaceIndex).trim(),
        input: args.slice(firstSpaceIndex + 1).trim(),
      };
    }

    // Just workflow name
    return {
      isCommand: true,
      command: 'workflow',
      workflowName: args,
    };
  }, []);

  // Extract workflow name and input from text
  const extractWorkflowInput = useCallback(
    (input: string): { workflowName: string; inputText: string } | null => {
      const result = parseCommand(input);
      if (!result.isCommand || !result.workflowName) {
        return null;
      }
      return {
        workflowName: result.workflowName,
        inputText: result.input || '',
      };
    },
    [parseCommand]
  );

  // Get workflow suggestions based on query
  const getSuggestions = useCallback(
    async (query: string): Promise<VisualWorkflow[]> => {
      if (!query.trim()) {
        // Return recent workflows
        const workflows = await workflowRepository.getAll();
        return workflows.slice(0, 5);
      }

      // Search by name
      const lowerQuery = query.toLowerCase();
      const workflows = await workflowRepository.getAll();
      return workflows
        .filter(
          (w) =>
            w.name.toLowerCase().includes(lowerQuery) ||
            w.description?.toLowerCase().includes(lowerQuery)
        )
        .slice(0, 5);
    },
    []
  );

  // Handle workflow command
  const handleCommand = useCallback(
    async (input: string): Promise<boolean> => {
      const result = parseCommand(input);

      if (!result.isCommand) {
        return false;
      }

      setIsProcessing(true);

      try {
        // If no workflow name specified, show picker
        if (!result.workflowName) {
          onShowPicker?.();
          return true;
        }

        // Try to find the workflow
        const workflows = await workflowRepository.getAll();
        const workflow = workflows.find(
          (w) =>
            w.name.toLowerCase() === result.workflowName?.toLowerCase() ||
            w.id === result.workflowName
        );

        if (workflow) {
          // Execute the workflow
          loadWorkflow(workflow);

          const workflowInput: Record<string, unknown> = {};
          if (result.input) {
            workflowInput.message = result.input;
          }

          onWorkflowSelect?.(workflow, workflowInput);
          return true;
        }

        // Workflow not found, show suggestions
        const suggestions = await getSuggestions(result.workflowName);
        if (suggestions.length > 0) {
          setSuggestions(suggestions);
          setShowSuggestions(true);
        } else {
          // Show picker as fallback
          onShowPicker?.();
        }

        return true;
      } finally {
        setIsProcessing(false);
      }
    },
    [parseCommand, loadWorkflow, onWorkflowSelect, onShowPicker, getSuggestions]
  );

  // Select a workflow from suggestions
  const selectSuggestion = useCallback(
    (workflow: VisualWorkflow, inputText?: string) => {
      setSuggestions([]);
      setShowSuggestions(false);

      loadWorkflow(workflow);

      const workflowInput: Record<string, unknown> = {};
      if (inputText) {
        workflowInput.message = inputText;
      }

      onWorkflowSelect?.(workflow, workflowInput);
    },
    [loadWorkflow, onWorkflowSelect]
  );

  // Clear suggestions
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);

  return {
    isProcessing,
    suggestions,
    showSuggestions,
    parseCommand,
    handleCommand,
    getSuggestions,
    selectSuggestion,
    clearSuggestions,
    isWorkflowCommand,
    extractWorkflowInput,
  };
}

export default useWorkflowCommand;
