'use client';

/**
 * Skill Editor Component
 * 
 * Modern split-panel editor for SKILL.md files with syntax highlighting,
 * validation, resource management, and AI-assisted features
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import type { OnMount, Monaco } from '@monaco-editor/react';
import {
  Save,
  AlertCircle,
  CheckCircle2,
  Eye,
  Code2,
  Sparkles,
  RotateCcw,
  FileText,
  Coins,
  Download,
  Undo2,
  Redo2,
  Search,
  WrapText,
  Map,
  Maximize2,
  Minimize2,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code,
  Bold,
  Italic,
  Link,
  Table,
  FileCode,
  Wand2,
  Loader2,
  PanelRightClose,
  PanelRight,
  ChevronDown,
  Type,
  Folder,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { cn } from '@/lib/utils';
import { loggers } from '@/lib/logger';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { parseSkillMd } from '@/lib/skills/parser';
import { estimateSkillTokens } from '@/lib/skills/executor';
import { useSettingsStore, selectTheme } from '@/stores/settings';
import { downloadSkillAsMarkdown, downloadSkillAsPackage } from '@/lib/skills/packager';
import { SkillMarkdownPreview, SkillMarkdownStyles } from './skill-markdown-preview';
import { SkillResourceManager } from './skill-resource-manager';
import { SkillAIAssistant } from './skill-ai-assistant';
import { SkillEditorAIPopup } from './skill-editor-ai-popup';
import type { Skill, SkillResource } from '@/types/system/skill';
import { createEditorOptions } from '@/lib/monaco';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-muted/20">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  ),
});

interface SkillEditorProps {
  skill?: Skill;
  initialContent?: string;
  onSave: (rawContent: string, resources?: SkillResource[]) => void;
  onCancel?: () => void;
  readOnly?: boolean;
  onRequestAI?: (prompt: string) => Promise<string>;
  /** Hide the header when embedded in another component like skill-detail */
  hideHeader?: boolean;
}

export function SkillEditor({
  skill,
  initialContent = '',
  onSave,
  onCancel,
  readOnly = false,
  onRequestAI,
  hideHeader = false,
}: SkillEditorProps) {
  const t = useTranslations('skills');
  const [content, setContent] = useState(skill?.rawContent || initialContent);
  const [resources, setResources] = useState<SkillResource[]>(skill?.resources || []);
  const [wordWrap, setWordWrap] = useState<'on' | 'off'>('on');
  const [showMinimap, setShowMinimap] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // AI floating popup state
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number } | null>(null);
  const [showAIPopup, setShowAIPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedText, setOptimizedText] = useState('');
  const [optimizeMode, setOptimizeMode] = useState<'improve' | 'simplify' | 'expand' | 'fix' | 'translate' | 'summarize' | 'formal' | 'casual' | 'technical' | 'custom' | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  
  // Get theme from settings store
  const theme = useSettingsStore(selectTheme);
  const editorTheme = theme === 'dark' ? 'vs-dark' : theme === 'light' ? 'vs' : 'vs-dark';

  // Parse content using useMemo to avoid useEffect setState issues
  const parseResult = useMemo(() => parseSkillMd(content), [content]);
  
  // Derive validation state from parse result
  const validationErrors = parseResult.errors;
  const validationWarnings = parseResult.warnings;
  const contentIsValid = parseResult.success;

  // Derive parsed content directly from parseResult (no useState + useEffect needed)
  const parsedContent = useMemo(() => {
    if (parseResult.success && parseResult.metadata) {
      return {
        name: parseResult.metadata.name,
        description: parseResult.metadata.description,
        body: parseResult.content,
      };
    }
    return { name: undefined, description: undefined, body: undefined };
  }, [parseResult]);

  // Estimate token count
  const tokenEstimate = useMemo(() => {
    if (parsedContent.name && parsedContent.description && parsedContent.body) {
      const mockSkill: Partial<Skill> = {
        metadata: { name: parsedContent.name, description: parsedContent.description },
        content: parsedContent.body,
        resources,
      };
      return estimateSkillTokens(mockSkill as Skill);
    }
    return Math.ceil(content.length / 4);
  }, [content, parsedContent, resources]);

  // Track changes using useMemo
  const hasChanges = useMemo(() => {
    const original = skill?.rawContent || initialContent;
    const originalResources = skill?.resources || [];
    return content !== original || JSON.stringify(resources) !== JSON.stringify(originalResources);
  }, [content, skill, initialContent, resources]);

  const handleSave = useCallback(() => {
    if (!contentIsValid) return;
    onSave(content, resources);
  }, [content, resources, contentIsValid, onSave]);

  const handleReset = useCallback(() => {
    setContent(skill?.rawContent || initialContent);
    setResources(skill?.resources || []);
  }, [skill, initialContent]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    setContent(value || '');
  }, []);

  const handleEditorMount: OnMount = useCallback((editorInstance, monaco) => {
    editorRef.current = editorInstance;
    monacoRef.current = monaco;

    // Register markdown snippets
    monaco.languages.registerCompletionItemProvider('markdown', {
      provideCompletionItems: (model: Parameters<typeof monaco.languages.registerCompletionItemProvider>[1]['provideCompletionItems'] extends (m: infer M, ...args: unknown[]) => unknown ? M : never, position: Parameters<typeof monaco.languages.registerCompletionItemProvider>[1]['provideCompletionItems'] extends (m: unknown, p: infer P, ...args: unknown[]) => unknown ? P : never) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions = [
          {
            label: 'skill-template',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: `---\nname: \${1:skill-name}\ndescription: \${2:Skill description}\n---\n\n# \${1:skill-name}\n\n## When to Use\n\n\${3:Describe when to use this skill}\n\n## Instructions\n\n\${4:Step-by-step instructions}\n\n## Examples\n\n\${5:Provide examples}`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Insert a complete skill template',
            range,
          },
          {
            label: 'frontmatter',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: `---\nname: \${1:skill-name}\ndescription: \${2:description}\n---`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Insert YAML frontmatter',
            range,
          },
          {
            label: 'section',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: `## \${1:Section Title}\n\n\${2:Content}`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Insert a new section',
            range,
          },
          {
            label: 'codeblock',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '```${1:language}\n${2:code}\n```',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Insert a code block',
            range,
          },
          {
            label: 'table',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '| ${1:Header 1} | ${2:Header 2} |\n|------------|------------|\n| ${3:Cell 1} | ${4:Cell 2} |',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Insert a markdown table',
            range,
          },
          {
            label: 'checklist',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '- [ ] ${1:Task 1}\n- [ ] ${2:Task 2}\n- [ ] ${3:Task 3}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Insert a checklist',
            range,
          },
          {
            label: 'example',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '### Example: ${1:Title}\n\n**Input:**\n```\n${2:input}\n```\n\n**Output:**\n```\n${3:output}\n```',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Insert an example with input/output',
            range,
          },
        ];

        return { suggestions };
      },
    });

    // Listen for selection changes
    editorInstance.onDidChangeCursorSelection((e) => {
      const selection = e.selection;
      const model = editorInstance.getModel();
      if (!model) return;
      
      // Check if it's an actual selection (not just cursor movement)
      const isSelection = !selection.isEmpty();
      const text = isSelection ? model.getValueInRange(selection) : '';
      
      if (text && text.trim().length > 0) {
        setSelectedText(text);
        setSelectionRange({
          startLineNumber: selection.startLineNumber,
          startColumn: selection.startColumn,
          endLineNumber: selection.endLineNumber,
          endColumn: selection.endColumn,
        });
        
        // Use cursor position (where the user's cursor actually is) for popup placement
        // This works regardless of selection direction (left-to-right or right-to-left)
        const cursorPosition = editorInstance.getPosition();
        let coords = cursorPosition ? editorInstance.getScrolledVisiblePosition(cursorPosition) : null;
        
        // Fallback to selection end position
        if (!coords) {
          coords = editorInstance.getScrolledVisiblePosition({
            lineNumber: selection.endLineNumber,
            column: selection.endColumn,
          });
        }
        
        // Fallback to selection start position
        if (!coords) {
          coords = editorInstance.getScrolledVisiblePosition({
            lineNumber: selection.startLineNumber,
            column: selection.startColumn,
          });
        }
        
        if (coords && containerRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect();
          // Ensure popup stays within container bounds
          const popupWidth = 360;
          const popupHeight = 280;
          const top = Math.max(10, Math.min(coords.top + 24, containerRect.height - popupHeight - 10));
          const left = Math.max(10, Math.min(coords.left, containerRect.width - popupWidth - 10));
          
          setPopupPosition({ top, left });
          setShowAIPopup(true);
        } else if (containerRef.current) {
          // Fallback: show popup at a default position if coords not available
          const containerRect = containerRef.current.getBoundingClientRect();
          setPopupPosition({
            top: Math.min(100, containerRect.height - 300),
            left: Math.min(50, containerRect.width - 370),
          });
          setShowAIPopup(true);
        }
      } else {
        // Delay hiding to allow clicking popup buttons
        setTimeout(() => {
          if (!document.activeElement?.closest('.ai-popup')) {
            setShowAIPopup(false);
            setOptimizedText('');
            setOptimizeMode(null);
          }
        }, 150);
      }
    });

    // Listen for cursor position changes
    editorInstance.onDidChangeCursorPosition((e) => {
      setCursorPosition({
        line: e.position.lineNumber,
        column: e.position.column,
      });
    });

    // Focus the editor
    editorInstance.focus();
  }, []);

  // Register Ctrl+S shortcut via effect to avoid stale closure
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (contentIsValid && hasChanges && !readOnly) {
        onSave(content, resources);
      }
    }
  }, [contentIsValid, hasChanges, readOnly, onSave, content, resources]);

  // Attach keyboard shortcut
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleUndo = useCallback(() => {
    editorRef.current?.trigger('keyboard', 'undo', null);
  }, []);

  const handleRedo = useCallback(() => {
    editorRef.current?.trigger('keyboard', 'redo', null);
  }, []);

  const handleFind = useCallback(() => {
    const editor = editorRef.current;
    if (editor) {
      editor.focus();
      editor.getAction('actions.find')?.run();
    }
  }, []);


  const toggleWordWrap = useCallback(() => {
    setWordWrap(prev => prev === 'on' ? 'off' : 'on');
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // Insert text at cursor position
  const insertText = useCallback((text: string, placeholder?: string) => {
    const editor = editorRef.current;
    if (!editor) {
      loggers.ui.warn('Editor not available');
      return;
    }
    
    const model = editor.getModel();
    if (!model) {
      loggers.ui.warn('Model not available');
      return;
    }

    // Get current selection or cursor position
    const selection = editor.getSelection();
    if (!selection) {
      loggers.ui.warn('No selection available');
      return;
    }

    const selectedText = model.getValueInRange(selection);
    const hasSelection = selectedText.length > 0;
    
    // Replace $SELECTION with actual text or placeholder
    const replacementText = hasSelection ? selectedText : (placeholder || '');
    const formattedText = text.replace('$SELECTION', replacementText);
    
    // Use pushUndoStop for proper undo support
    editor.pushUndoStop();
    editor.executeEdits('markdown-insert', [{
      range: selection,
      text: formattedText,
      forceMoveMarkers: true,
    }]);
    editor.pushUndoStop();

    // Focus editor after edit
    editor.focus();
  }, []);

  const insertHeading = useCallback((level: number) => {
    const prefix = '#'.repeat(level) + ' ';
    insertText(prefix + '$SELECTION', 'heading');
  }, [insertText]);

  const insertBold = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const selection = editor.getSelection();
    if (selection) {
      const text = editor.getModel()?.getValueInRange(selection) || 'bold text';
      editor.executeEdits('bold', [{
        range: selection,
        text: `**${text}**`,
      }]);
    }
  }, []);

  const insertItalic = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const selection = editor.getSelection();
    if (selection) {
      const text = editor.getModel()?.getValueInRange(selection) || 'italic text';
      editor.executeEdits('italic', [{
        range: selection,
        text: `*${text}*`,
      }]);
    }
  }, []);

  const insertCode = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const selection = editor.getSelection();
    if (selection) {
      const text = editor.getModel()?.getValueInRange(selection) || 'code';
      editor.executeEdits('code', [{
        range: selection,
        text: `\`${text}\``,
      }]);
    }
  }, []);

  const insertCodeBlock = useCallback(() => {
    insertText('```\n$SELECTION\n```', 'code here');
  }, [insertText]);

  const insertLink = useCallback(() => {
    insertText('[$SELECTION](url)', 'link text');
  }, [insertText]);

  const insertList = useCallback(() => {
    insertText('- $SELECTION', 'item');
  }, [insertText]);

  const insertOrderedList = useCallback(() => {
    insertText('1. $SELECTION', 'item');
  }, [insertText]);

  const insertQuote = useCallback(() => {
    insertText('> $SELECTION', 'quote');
  }, [insertText]);

  const insertTable = useCallback(() => {
    insertText('| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |');
  }, [insertText]);

  const insertSkillTemplate = useCallback(() => {
    const template = `---
name: new-skill
description: Describe what this skill does
---

# Skill Name

## When to Use

Use this skill when you need to...

## Instructions

1. First, understand the context
2. Then, apply the following steps
3. Finally, verify the results

## Examples

### Example 1: Basic Usage

**Input:**
\`\`\`
Example input here
\`\`\`

**Output:**
\`\`\`
Expected output here
\`\`\`

## Notes

- Important consideration 1
- Important consideration 2
`;
    const editor = editorRef.current;
    if (editor) {
      editor.setValue(template);
      editor.focus();
    }
  }, []);

  const handleAddResource = useCallback((resource: Omit<SkillResource, 'size' | 'mimeType'>) => {
    const fullResource: SkillResource = {
      ...resource,
      size: resource.content?.length || 0,
      mimeType: 'text/plain',
    };
    setResources(prev => [...prev, fullResource]);
  }, []);

  const handleRemoveResource = useCallback((path: string) => {
    setResources(prev => prev.filter(r => r.path !== path));
  }, []);

  const handleApplyGenerated = useCallback((generatedContent: string) => {
    setContent(generatedContent);
    setRightPanelTab('preview');
  }, []);

  // AI optimization handlers
  const handleOptimizeText = useCallback(async (mode: 'improve' | 'simplify' | 'expand' | 'fix' | 'translate' | 'summarize' | 'formal' | 'casual' | 'technical' | 'custom', customInstruction?: string) => {
    if (!selectedText || !onRequestAI) return;
    
    setOptimizeMode(mode);
    setIsOptimizing(true);
    setOptimizedText('');
    
    const prompts: Record<string, string> = {
      improve: `Improve the following text to be clearer, more professional, and better structured. Keep the same meaning but enhance the quality:\n\n${selectedText}`,
      simplify: `Simplify the following text to be more concise and easier to understand. Remove unnecessary words while keeping the core message:\n\n${selectedText}`,
      expand: `Expand the following text with more details, examples, and explanations while maintaining the original meaning:\n\n${selectedText}`,
      fix: `Fix any grammar, spelling, punctuation, or formatting issues in the following text:\n\n${selectedText}`,
      translate: `Translate the following text to English (if not in English) or to Chinese (if in English). Maintain the same tone and meaning:\n\n${selectedText}`,
      summarize: `Summarize the following text into a concise summary that captures the key points and main ideas:\n\n${selectedText}`,
      formal: `Rewrite the following text in a formal, professional tone suitable for business or academic contexts:\n\n${selectedText}`,
      casual: `Rewrite the following text in a casual, friendly, conversational tone:\n\n${selectedText}`,
      technical: `Rewrite the following text in a technical, precise style with accurate terminology:\n\n${selectedText}`,
      custom: customInstruction ? `${customInstruction}\n\nText to process:\n${selectedText}` : selectedText,
    };
    
    try {
      const result = await onRequestAI(prompts[mode]);
      setOptimizedText(result);
    } catch (error) {
      loggers.ui.error('AI optimization failed:', error);
      setOptimizedText('');
    } finally {
      setIsOptimizing(false);
    }
  }, [selectedText, onRequestAI]);

  const handleApplyOptimization = useCallback(() => {
    if (!optimizedText || !selectionRange || !editorRef.current) return;
    
    editorRef.current.executeEdits('ai-optimize', [{
      range: selectionRange,
      text: optimizedText,
    }]);
    
    setShowAIPopup(false);
    setOptimizedText('');
    setOptimizeMode(null);
    editorRef.current.focus();
  }, [optimizedText, selectionRange]);

  const handleClosePopup = useCallback(() => {
    setShowAIPopup(false);
    setOptimizedText('');
    setOptimizeMode(null);
  }, []);

  const handleDownload = useCallback((format: 'md' | 'json') => {
    if (!parsedContent.name) return;
    
    const mockSkill: Skill = {
      id: skill?.id || 'temp',
      metadata: { 
        name: parsedContent.name, 
        description: parsedContent.description || '' 
      },
      content: parsedContent.body || '',
      rawContent: content,
      resources,
      status: 'enabled',
      source: 'custom',
      category: skill?.category || 'custom',
      tags: skill?.tags || [],
      createdAt: skill?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    if (format === 'md') {
      downloadSkillAsMarkdown(mockSkill);
    } else {
      downloadSkillAsPackage(mockSkill);
    }
  }, [content, parsedContent, resources, skill]);

  // State for right panel
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<'preview' | 'resources' | 'ai'>('preview');

  return (
    <div className={cn(
      "flex flex-col h-full",
      isFullscreen && "fixed inset-0 z-50 bg-background"
    )}>
      <SkillMarkdownStyles />
      
      {/* Modern Header */}
      {!hideHeader && (
      <header className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <Code2 className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-tight">
                {parsedContent.name || t('newSkillLabel')}
              </span>
              {parsedContent.description && (
                <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                  {parsedContent.description}
                </span>
              )}
            </div>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1" />
          
          {/* Status Badges */}
          <div className="flex items-center gap-1.5">
            {hasChanges && (
              <Badge variant="outline" className="h-6 text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 px-2">
                {t('unsaved')}
              </Badge>
            )}
            {contentIsValid ? (
              <Badge variant="outline" className="h-6 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 px-2">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {t('valid')}
              </Badge>
            ) : (
              <Badge variant="outline" className="h-6 text-xs bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 px-2">
                <AlertCircle className="h-3 w-3 mr-1" />
                {validationErrors.length}
              </Badge>
            )}
            <Badge variant="outline" className="h-6 text-xs px-2">
              <Coins className="h-3 w-3 mr-1" />
              ~{tokenEstimate}
            </Badge>
            {resources.length > 0 && (
              <Badge variant="outline" className="h-6 text-xs px-2">
                <Folder className="h-3 w-3 mr-1" />
                {resources.length}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Panel Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setShowRightPanel(!showRightPanel)}
              >
                {showRightPanel ? <PanelRightClose className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{showRightPanel ? t('hidePanel') : t('showPanel')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isFullscreen ? t('exitFullscreen') : t('fullscreen')}</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">{t('export')}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleDownload('md')}>
                <FileText className="h-4 w-4 mr-2" />
                {t('markdownFile')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload('json')}>
                <FileCode className="h-4 w-4 mr-2" />
                {t('packageFile')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {hasChanges && (
            <Button variant="ghost" size="sm" className="h-8" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">{t('reset')}</span>
            </Button>
          )}

          {onCancel && (
            <Button variant="ghost" size="sm" className="h-8" onClick={onCancel}>
              {t('cancel')}
            </Button>
          )}

          <Button 
            size="sm"
            className="h-8 gap-1.5"
            onClick={handleSave} 
            disabled={!contentIsValid || !hasChanges || readOnly}
          >
            <Save className="h-4 w-4" />
            {t('save')}
          </Button>
        </div>
      </header>
      )}

      {/* Validation Messages - Compact */}
      {(validationErrors.length > 0 || validationWarnings.length > 0) && (
        <div className="px-4 py-2 border-b bg-muted/30 flex items-center gap-2 overflow-x-auto">
          {validationErrors.map((err, i) => (
            <div key={`error-${i}`} className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-1 rounded-md whitespace-nowrap">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span><strong>{err.field}:</strong> {err.message}</span>
            </div>
          ))}
          {validationWarnings.map((warn, i) => (
            <div key={`warn-${i}`} className="flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-md whitespace-nowrap">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span><strong>{warn.field}:</strong> {warn.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main Content - Split Panel Layout */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - Editor */}
          <ResizablePanel defaultSize={showRightPanel ? 60 : 100} minSize={40}>
            <div className="flex flex-col h-full">
              {/* Compact Editor Toolbar */}
              <div className="flex items-center gap-0.5 px-3 py-2 border-b bg-muted/30">
                {/* History */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleUndo} disabled={readOnly}>
                      <Undo2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{t('undoShortcut')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRedo} disabled={readOnly}>
                      <Redo2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{t('redoShortcut')}</TooltipContent>
                </Tooltip>
                
                <Separator orientation="vertical" className="h-4 mx-1" />
                
                {/* Formatting Group */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={insertBold} disabled={readOnly}>
                      <Bold className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{t('boldShortcut')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={insertItalic} disabled={readOnly}>
                      <Italic className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{t('italicShortcut')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={insertCode} disabled={readOnly}>
                      <Code className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{t('code')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={insertLink} disabled={readOnly}>
                      <Link className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{t('link')}</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="h-4 mx-1" />

                {/* Structure Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 gap-1 px-2" disabled={readOnly}>
                      <Type className="h-3.5 w-3.5" />
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => insertHeading(1)}>
                      <Heading1 className="h-4 w-4 mr-2" /> {t('heading1')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => insertHeading(2)}>
                      <Heading2 className="h-4 w-4 mr-2" /> {t('heading2')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={insertList}>
                      <List className="h-4 w-4 mr-2" /> {t('bulletList')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={insertOrderedList}>
                      <ListOrdered className="h-4 w-4 mr-2" /> {t('numberedList')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={insertQuote}>
                      <Quote className="h-4 w-4 mr-2" /> {t('quote')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={insertCodeBlock}>
                      <FileCode className="h-4 w-4 mr-2" /> {t('codeBlock')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={insertTable}>
                      <Table className="h-4 w-4 mr-2" /> {t('table')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Template */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 gap-1 px-2" onClick={insertSkillTemplate} disabled={readOnly}>
                      <Wand2 className="h-3.5 w-3.5" />
                      <span className="text-xs">{t('template')}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{t('insertTemplate')}</TooltipContent>
                </Tooltip>

                <div className="flex-1" />

                {/* View Options */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleFind}>
                      <Search className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{t('findShortcut')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant={wordWrap === 'on' ? 'secondary' : 'ghost'} 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={toggleWordWrap}
                    >
                      <WrapText className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{t('wordWrap')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant={showMinimap ? 'secondary' : 'ghost'} 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={() => setShowMinimap(!showMinimap)}
                    >
                      <Map className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{t('minimap')}</TooltipContent>
                </Tooltip>
                
                {/* Cursor Position Indicator */}
                <div className="text-[10px] text-muted-foreground tabular-nums px-2 py-1 bg-muted/50 rounded">
                  {t('lineCol', { line: cursorPosition.line, col: cursorPosition.column })}
                </div>
              </div>

              {/* Monaco Editor */}
              <div ref={containerRef} className="flex-1 min-h-0 relative">
                <MonacoEditor
                  height="100%"
                  language="markdown"
                  theme={editorTheme}
                  value={content}
                  onChange={handleEditorChange}
                  onMount={handleEditorMount}
                  options={createEditorOptions('markdown', {
                    readOnly,
                    wordWrap,
                    minimap: { 
                      enabled: showMinimap, 
                      side: 'right',
                      size: 'fill',
                      showSlider: 'always',
                      renderCharacters: true,
                      scale: 1,
                    },
                    fontSize: 13,
                    stickyScroll: { enabled: true, maxLineCount: 3 },
                    showFoldingControls: 'always',
                    glyphMargin: true,
                    suggest: { showWords: true, showSnippets: true },
                    scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
                  })}
                />
                
                {/* AI Command Palette Popup */}
                {showAIPopup && onRequestAI && (
                  <SkillEditorAIPopup
                    position={popupPosition}
                    isOptimizing={isOptimizing}
                    optimizedText={optimizedText}
                    optimizeMode={optimizeMode}
                    onOptimize={handleOptimizeText}
                    onApply={handleApplyOptimization}
                    onRetry={() => { setOptimizedText(''); setOptimizeMode(null); }}
                    onClose={handleClosePopup}
                  />
                )}
              </div>
            </div>
          </ResizablePanel>

          {/* Resize Handle */}
          {showRightPanel && <ResizableHandle withHandle />}

          {/* Right Panel - Preview/Resources/AI */}
          {showRightPanel && (
            <ResizablePanel defaultSize={40} minSize={25} maxSize={60}>
              <div className="flex flex-col h-full border-l">
                {/* Panel Tabs */}
                <Tabs value={rightPanelTab} onValueChange={(v) => setRightPanelTab(v as typeof rightPanelTab)} className="flex flex-col h-full">
                  <div className="flex items-center px-3 py-2 border-b bg-muted/30">
                    <TabsList className="h-8 p-0.5 bg-muted/50">
                      <TabsTrigger value="preview" className="h-7 px-3 text-xs gap-1.5">
                        <Eye className="h-3.5 w-3.5" />
                        {t('previewTab')}
                      </TabsTrigger>
                      <TabsTrigger value="resources" className="h-7 px-3 text-xs gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        {t('resourcesTab')}
                        {resources.length > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px]">
                            {resources.length}
                          </span>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="ai" className="h-7 px-3 text-xs gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        AI
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="preview" className="flex-1 m-0 overflow-auto">
                    <ScrollArea className="h-full">
                      <div className="p-4">
                        <Card className="border-dashed">
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                              <Sparkles className="h-4 w-4 text-primary" />
                              {parsedContent.name || 'Skill Name'}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {parsedContent.description || t('skillDescriptionPreview')}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pt-0">
                            {parsedContent.body ? (
                              <SkillMarkdownPreview content={parsedContent.body} />
                            ) : (
                              <p className="text-muted-foreground text-sm">
                                {t('skillContentPreview')}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="resources" className="flex-1 m-0 overflow-auto">
                    <ScrollArea className="h-full">
                      <div className="p-4">
                        <SkillResourceManager
                          resources={resources}
                          onAddResource={handleAddResource}
                          onRemoveResource={handleRemoveResource}
                          readOnly={readOnly}
                        />
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="ai" className="flex-1 m-0 overflow-auto">
                    <ScrollArea className="h-full">
                      <div className="p-4">
                        <SkillAIAssistant
                          currentContent={content}
                          onApplyGenerated={handleApplyGenerated}
                          onRequestAI={onRequestAI}
                        />
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </div>
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

export default SkillEditor;
