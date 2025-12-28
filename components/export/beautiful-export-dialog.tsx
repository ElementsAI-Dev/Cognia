'use client';

/**
 * BeautifulExportDialog - Unified export dialog with beautiful previews
 * Supports multiple formats: Beautiful HTML, PDF, Rich Markdown, Word, Excel, Animated HTML
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  Download,
  FileText,
  FileType,
  Code2,
  Play,
  FileSpreadsheet,
  Loader2,
  Check,
  Settings2,
  Eye,
  Sun,
  Moon,
  Monitor,
  BookOpen,
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  Table2,
  ExternalLink,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { messageRepository } from '@/lib/db';
import type { Session, UIMessage } from '@/types';
import { type SyntaxThemeName, getAvailableSyntaxThemes } from '@/lib/export/syntax-themes';
import { useCustomThemeStore } from '@/stores/custom-theme-store';
import { CustomThemeEditor } from './custom-theme-editor';

type ExportFormat = 'beautiful-html' | 'pdf' | 'markdown' | 'word' | 'excel' | 'csv' | 'animated-html' | 'json';
type ThemeOption = 'light' | 'dark' | 'system';

interface BeautifulExportDialogProps {
  session: Session;
  trigger?: React.ReactNode;
}

interface ExportOptions {
  theme: ThemeOption;
  syntaxTheme: SyntaxThemeName;
  showTimestamps: boolean;
  showTokens: boolean;
  showThinkingProcess: boolean;
  showToolCalls: boolean;
  includeCoverPage: boolean;
  includeTableOfContents: boolean;
  syntaxHighlighting: boolean;
  compactMode: boolean;
}

const DEFAULT_OPTIONS: ExportOptions = {
  theme: 'system',
  syntaxTheme: 'one-dark-pro',
  showTimestamps: true,
  showTokens: false,
  showThinkingProcess: true,
  showToolCalls: true,
  includeCoverPage: true,
  includeTableOfContents: true,
  syntaxHighlighting: true,
  compactMode: false,
};

const SYNTAX_THEMES = getAvailableSyntaxThemes();

const FORMAT_CONFIG: Record<ExportFormat, {
  icon: React.ElementType;
  label: string;
  description: string;
  extension: string;
  badge?: string;
}> = {
  'beautiful-html': {
    icon: Sparkles,
    label: 'Beautiful HTML',
    description: 'Modern, responsive HTML with syntax highlighting',
    extension: '.html',
    badge: 'Recommended',
  },
  'pdf': {
    icon: FileType,
    label: 'PDF Document',
    description: 'Professional PDF with cover page',
    extension: '.pdf',
  },
  'markdown': {
    icon: FileText,
    label: 'Rich Markdown',
    description: 'GitHub-flavored markdown with metadata',
    extension: '.md',
  },
  'word': {
    icon: BookOpen,
    label: 'Word Document',
    description: 'Microsoft Word format (.docx)',
    extension: '.docx',
  },
  'excel': {
    icon: FileSpreadsheet,
    label: 'Excel Spreadsheet',
    description: 'Tabular format with statistics',
    extension: '.xlsx',
  },
  'csv': {
    icon: Table2,
    label: 'CSV Spreadsheet',
    description: 'CSV format for Google Sheets import',
    extension: '.csv',
  },
  'animated-html': {
    icon: Play,
    label: 'Animated HTML',
    description: 'Interactive replay with typewriter effect',
    extension: '.html',
  },
  'json': {
    icon: Code2,
    label: 'JSON Data',
    description: 'Complete structured data export',
    extension: '.json',
  },
};

export function BeautifulExportDialog({ session, trigger }: BeautifulExportDialogProps) {
  const t = useTranslations('export');
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<ExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('beautiful-html');
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_OPTIONS);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const previewRef = useRef<HTMLIFrameElement>(null);
  
  // Custom theme editor state
  const [themeEditorOpen, setThemeEditorOpen] = useState(false);
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const { customThemes, deleteTheme } = useCustomThemeStore();

  // Load messages when dialog opens
  useEffect(() => {
    if (open && messages.length === 0) {
      setIsLoading(true);
      messageRepository
        .getBySessionId(session.id)
        .then(setMessages)
        .finally(() => setIsLoading(false));
    }
  }, [open, session.id, messages.length]);

  // Generate preview when format or options change
  useEffect(() => {
    if (!open || messages.length === 0) return;
    
    const generatePreview = async () => {
      if (selectedFormat === 'beautiful-html' || selectedFormat === 'pdf') {
        try {
          const { exportToBeautifulHTML } = await import('@/lib/export/beautiful-html');
          const html = exportToBeautifulHTML({
            session,
            messages: messages.slice(0, 3), // Preview first 3 messages
            exportedAt: new Date(),
            options: {
              theme: options.theme,
              syntaxTheme: options.syntaxTheme,
              customThemes: customThemes,
              showTimestamps: options.showTimestamps,
              showTokens: options.showTokens,
              showThinkingProcess: options.showThinkingProcess,
              showToolCalls: options.showToolCalls,
              includeCoverPage: false, // Disable cover for preview
              includeTableOfContents: false,
              syntaxHighlighting: options.syntaxHighlighting,
              compactMode: options.compactMode,
            },
          });
          setPreviewHtml(html);
        } catch (err) {
          console.error('Preview generation failed:', err);
        }
      }
    };

    const debounce = setTimeout(generatePreview, 300);
    return () => clearTimeout(debounce);
  }, [open, messages, selectedFormat, options, session, customThemes]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setExportSuccess(null);
      setExportError(null);
    }
  }, [open]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);
    setExportSuccess(null);

    try {
      const exportedAt = new Date();

      switch (selectedFormat) {
        case 'beautiful-html': {
          const { exportToBeautifulHTML, downloadFile, generateFilename } = await import('@/lib/export');
          const html = exportToBeautifulHTML({
            session,
            messages,
            exportedAt,
            options: {
              theme: options.theme,
              syntaxTheme: options.syntaxTheme,
              customThemes: customThemes,
              showTimestamps: options.showTimestamps,
              showTokens: options.showTokens,
              showThinkingProcess: options.showThinkingProcess,
              showToolCalls: options.showToolCalls,
              includeCoverPage: options.includeCoverPage,
              includeTableOfContents: options.includeTableOfContents,
              syntaxHighlighting: options.syntaxHighlighting,
              compactMode: options.compactMode,
            },
          });
          downloadFile(html, generateFilename(session.title, 'html'), 'text/html');
          break;
        }

        case 'pdf': {
          const { exportToBeautifulPDF } = await import('@/lib/export/beautiful-pdf');
          await exportToBeautifulPDF({
            session,
            messages,
            exportedAt,
            options: {
              theme: options.theme === 'system' ? 'light' : options.theme as 'light' | 'dark',
              showTimestamps: options.showTimestamps,
              showTokens: options.showTokens,
              showThinkingProcess: options.showThinkingProcess,
              showToolCalls: options.showToolCalls,
              includeCoverPage: options.includeCoverPage,
              includeTableOfContents: options.includeTableOfContents,
            },
          });
          break;
        }

        case 'markdown': {
          const { exportToRichMarkdown, downloadFile, generateFilename } = await import('@/lib/export');
          const markdown = exportToRichMarkdown({
            session,
            messages,
            exportedAt,
            includeMetadata: true,
            includeAttachments: true,
            includeTokens: options.showTokens,
          });
          downloadFile(markdown, generateFilename(session.title, 'md'), 'text/markdown');
          break;
        }

        case 'word': {
          const { exportChatToWord, downloadWord } = await import('@/lib/export/word-export');
          const result = await exportChatToWord(session, messages, undefined, {
            includeMetadata: true,
            includeTimestamps: options.showTimestamps,
            includeTokens: options.showTokens,
          });
          if (result.success && result.blob && result.filename) {
            downloadWord(result.blob, result.filename);
          } else {
            throw new Error(result.error || 'Word export failed');
          }
          break;
        }

        case 'excel': {
          const { exportChatToExcel, downloadExcel } = await import('@/lib/export/excel-export');
          const result = await exportChatToExcel(session, messages);
          if (result.success && result.blob && result.filename) {
            downloadExcel(result.blob, result.filename);
          } else {
            throw new Error(result.error || 'Excel export failed');
          }
          break;
        }

        case 'csv': {
          const { exportChatToCSV, downloadCSV } = await import('@/lib/export/google-sheets-export');
          const result = exportChatToCSV(session, messages);
          if (result.success && result.content && result.filename) {
            downloadCSV(result.content, result.filename);
          } else {
            throw new Error(result.error || 'CSV export failed');
          }
          break;
        }

        case 'animated-html': {
          const { exportToAnimatedHTML, downloadFile, generateFilename } = await import('@/lib/export');
          const html = exportToAnimatedHTML({
            session,
            messages,
            exportedAt,
            options: {
              theme: options.theme,
              showTimestamps: options.showTimestamps,
              showControls: true,
              autoPlay: false,
            },
          });
          downloadFile(html, generateFilename(session.title, 'html'), 'text/html');
          break;
        }

        case 'json': {
          const { exportToRichJSON, downloadFile, generateFilename } = await import('@/lib/export');
          const json = exportToRichJSON({ session, messages, exportedAt });
          downloadFile(json, generateFilename(session.title, 'json'), 'application/json');
          break;
        }
      }

      setExportSuccess(selectedFormat);
    } catch (error) {
      console.error('Export failed:', error);
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [selectedFormat, session, messages, options, customThemes]);

  const stats = {
    messages: messages.length,
    userMessages: messages.filter(m => m.role === 'user').length,
    assistantMessages: messages.filter(m => m.role === 'assistant').length,
    tokens: messages.reduce((sum, m) => sum + (m.tokens?.total || 0), 0),
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t('exportNow')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            {/* Left: Format & Options */}
            <div className="space-y-4">
              <Tabs defaultValue="format">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="format">
                    <Download className="h-4 w-4 mr-2" />
                    Format
                  </TabsTrigger>
                  <TabsTrigger value="options">
                    <Settings2 className="h-4 w-4 mr-2" />
                    Options
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="format" className="mt-4">
                  <ScrollArea className="h-[340px] pr-4">
                    <RadioGroup
                      value={selectedFormat}
                      onValueChange={(v) => setSelectedFormat(v as ExportFormat)}
                      className="space-y-2"
                    >
                      {(Object.entries(FORMAT_CONFIG) as [ExportFormat, typeof FORMAT_CONFIG[ExportFormat]][]).map(
                        ([format, config]) => {
                          const Icon = config.icon;
                          return (
                            <div
                              key={format}
                              className={cn(
                                'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                                selectedFormat === format
                                  ? 'border-primary bg-primary/5 shadow-sm'
                                  : 'border-border hover:border-primary/50 hover:bg-accent/50'
                              )}
                              onClick={() => setSelectedFormat(format)}
                            >
                              <RadioGroupItem value={format} id={format} className="mt-1" />
                              <Icon className={cn(
                                'h-5 w-5 mt-0.5',
                                selectedFormat === format ? 'text-primary' : 'text-muted-foreground'
                              )} />
                              <div className="flex-1 min-w-0">
                                <Label
                                  htmlFor={format}
                                  className="flex items-center gap-2 cursor-pointer font-medium"
                                >
                                  {config.label}
                                  {config.badge && (
                                    <Badge variant="secondary" className="text-xs font-normal">
                                      {config.badge}
                                    </Badge>
                                  )}
                                </Label>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                  {config.description}
                                </p>
                              </div>
                              <span className="text-xs text-muted-foreground font-mono">
                                {config.extension}
                              </span>
                            </div>
                          );
                        }
                      )}
                    </RadioGroup>

                    {/* Google Sheets shortcut */}
                    <div className="pt-3 mt-3 border-t">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={async () => {
                          try {
                            const { exportChatToCSV, downloadCSV } = await import('@/lib/export/google-sheets-export');
                            const result = exportChatToCSV(session, messages);
                            if (result.success && result.content && result.filename) {
                              downloadCSV(result.content, result.filename);
                              window.open('https://docs.google.com/spreadsheets/create', '_blank');
                            }
                          } catch (error) {
                            console.error('Failed to open Google Sheets:', error);
                          }
                        }}
                        disabled={messages.length === 0}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open in Google Sheets
                      </Button>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Downloads CSV and opens Google Sheets for import
                      </p>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="options" className="mt-4">
                  <ScrollArea className="h-[340px] pr-4">
                    <div className="space-y-6">
                      {/* Theme */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Theme</Label>
                        <div className="flex gap-2">
                          {[
                            { value: 'light' as const, icon: Sun, label: 'Light' },
                            { value: 'system' as const, icon: Monitor, label: 'Auto' },
                            { value: 'dark' as const, icon: Moon, label: 'Dark' },
                          ].map(({ value, icon: Icon, label }) => (
                            <Button
                              key={value}
                              variant={options.theme === value ? 'default' : 'outline'}
                              size="sm"
                              className="flex-1"
                              onClick={() => setOptions(prev => ({ ...prev, theme: value }))}
                            >
                              <Icon className="h-4 w-4 mr-2" />
                              {label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Display Options */}
                      <div className="space-y-4">
                        <Label className="text-sm font-medium">Display</Label>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="timestamps" className="text-sm">Show Timestamps</Label>
                              <p className="text-xs text-muted-foreground">Display message times</p>
                            </div>
                            <Switch
                              id="timestamps"
                              checked={options.showTimestamps}
                              onCheckedChange={(checked) =>
                                setOptions(prev => ({ ...prev, showTimestamps: checked }))
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="tokens" className="text-sm">Show Token Count</Label>
                              <p className="text-xs text-muted-foreground">Display token usage</p>
                            </div>
                            <Switch
                              id="tokens"
                              checked={options.showTokens}
                              onCheckedChange={(checked) =>
                                setOptions(prev => ({ ...prev, showTokens: checked }))
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="thinking" className="text-sm">Show Thinking Process</Label>
                              <p className="text-xs text-muted-foreground">Include reasoning steps</p>
                            </div>
                            <Switch
                              id="thinking"
                              checked={options.showThinkingProcess}
                              onCheckedChange={(checked) =>
                                setOptions(prev => ({ ...prev, showThinkingProcess: checked }))
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="tools" className="text-sm">Show Tool Calls</Label>
                              <p className="text-xs text-muted-foreground">Include tool invocations</p>
                            </div>
                            <Switch
                              id="tools"
                              checked={options.showToolCalls}
                              onCheckedChange={(checked) =>
                                setOptions(prev => ({ ...prev, showToolCalls: checked }))
                              }
                            />
                          </div>
                        </div>
                      </div>

                      {/* Document Options */}
                      {(selectedFormat === 'beautiful-html' || selectedFormat === 'pdf') && (
                        <div className="space-y-4">
                          <Label className="text-sm font-medium">Document</Label>
                          
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <Label htmlFor="cover" className="text-sm">Cover Page</Label>
                                <p className="text-xs text-muted-foreground">Include title page</p>
                              </div>
                              <Switch
                                id="cover"
                                checked={options.includeCoverPage}
                                onCheckedChange={(checked) =>
                                  setOptions(prev => ({ ...prev, includeCoverPage: checked }))
                                }
                              />
                            </div>

                            <div className="flex items-center justify-between">
                              <div>
                                <Label htmlFor="toc" className="text-sm">Table of Contents</Label>
                                <p className="text-xs text-muted-foreground">Add navigation</p>
                              </div>
                              <Switch
                                id="toc"
                                checked={options.includeTableOfContents}
                                onCheckedChange={(checked) =>
                                  setOptions(prev => ({ ...prev, includeTableOfContents: checked }))
                                }
                              />
                            </div>

                            {/* Syntax Theme Selector */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm">Code Theme</Label>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => {
                                    setEditingThemeId(null);
                                    setThemeEditorOpen(true);
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Custom
                                </Button>
                              </div>
                              
                              {/* Custom Themes */}
                              {customThemes.length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">Your Themes</p>
                                  <div className="grid grid-cols-2 gap-2">
                                    {customThemes.map((theme) => (
                                      <div
                                        key={theme.id}
                                        className={cn(
                                          'group relative px-3 py-2 text-xs rounded-md border text-left transition-all',
                                          options.syntaxTheme === theme.name
                                            ? 'border-primary bg-primary/10 font-medium'
                                            : 'border-border hover:border-primary/50'
                                        )}
                                      >
                                        <button
                                          type="button"
                                          className="w-full text-left"
                                          onClick={() => setOptions(prev => ({ ...prev, syntaxTheme: theme.name as SyntaxThemeName }))}
                                        >
                                          <span className={cn(
                                            'inline-block w-2 h-2 rounded-full mr-2',
                                            theme.isDark ? 'bg-slate-700' : 'bg-slate-200'
                                          )} />
                                          {theme.displayName}
                                        </button>
                                        <div className="absolute right-1 top-1 hidden group-hover:flex gap-0.5">
                                          <button
                                            type="button"
                                            className="p-1 hover:bg-accent rounded"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingThemeId(theme.id);
                                              setThemeEditorOpen(true);
                                            }}
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </button>
                                          <button
                                            type="button"
                                            className="p-1 hover:bg-destructive/10 hover:text-destructive rounded"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              deleteTheme(theme.id);
                                            }}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Built-in Themes */}
                              <p className="text-xs text-muted-foreground pt-1">Built-in Themes</p>
                              <div className="grid grid-cols-2 gap-2">
                                {SYNTAX_THEMES.slice(0, 6).map((theme) => (
                                  <button
                                    key={theme.name}
                                    type="button"
                                    className={cn(
                                      'px-3 py-2 text-xs rounded-md border text-left transition-all',
                                      options.syntaxTheme === theme.name
                                        ? 'border-primary bg-primary/10 font-medium'
                                        : 'border-border hover:border-primary/50'
                                    )}
                                    onClick={() => setOptions(prev => ({ ...prev, syntaxTheme: theme.name }))}
                                  >
                                    <span className={cn(
                                      'inline-block w-2 h-2 rounded-full mr-2',
                                      theme.isDark ? 'bg-slate-700' : 'bg-slate-200'
                                    )} />
                                    {theme.displayName}
                                  </button>
                                ))}
                              </div>
                              {SYNTAX_THEMES.length > 6 && (
                                <details className="text-xs">
                                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                    More themes ({SYNTAX_THEMES.length - 6})
                                  </summary>
                                  <div className="grid grid-cols-2 gap-2 mt-2">
                                    {SYNTAX_THEMES.slice(6).map((theme) => (
                                      <button
                                        key={theme.name}
                                        type="button"
                                        className={cn(
                                          'px-3 py-2 text-xs rounded-md border text-left transition-all',
                                          options.syntaxTheme === theme.name
                                            ? 'border-primary bg-primary/10 font-medium'
                                            : 'border-border hover:border-primary/50'
                                        )}
                                        onClick={() => setOptions(prev => ({ ...prev, syntaxTheme: theme.name }))}
                                      >
                                        <span className={cn(
                                          'inline-block w-2 h-2 rounded-full mr-2',
                                          theme.isDark ? 'bg-slate-700' : 'bg-slate-200'
                                        )} />
                                        {theme.displayName}
                                      </button>
                                    ))}
                                  </div>
                                </details>
                              )}
                            </div>

                            <div className="flex items-center justify-between">
                              <div>
                                <Label htmlFor="syntax" className="text-sm">Syntax Highlighting</Label>
                                <p className="text-xs text-muted-foreground">Colorize code blocks</p>
                              </div>
                              <Switch
                                id="syntax"
                                checked={options.syntaxHighlighting}
                                onCheckedChange={(checked) =>
                                  setOptions(prev => ({ ...prev, syntaxHighlighting: checked }))
                                }
                              />
                            </div>

                            <div className="flex items-center justify-between">
                              <div>
                                <Label htmlFor="compact" className="text-sm">Compact Mode</Label>
                                <p className="text-xs text-muted-foreground">Reduce spacing</p>
                              </div>
                              <Switch
                                id="compact"
                                checked={options.compactMode}
                                onCheckedChange={(checked) =>
                                  setOptions(prev => ({ ...prev, compactMode: checked }))
                                }
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>

              {/* Stats */}
              <div className="rounded-lg bg-muted/50 p-4">
                <h4 className="font-medium text-sm mb-3">Export Summary</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Messages</span>
                    <span className="font-medium">{stats.messages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tokens</span>
                    <span className="font-medium">{stats.tokens.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">User</span>
                    <span className="font-medium">{stats.userMessages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Assistant</span>
                    <span className="font-medium">{stats.assistantMessages}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Preview */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Eye className="h-4 w-4" />
                Preview
              </div>
              <div className="rounded-lg border bg-muted/30 overflow-hidden h-[420px]">
                {(selectedFormat === 'beautiful-html' || selectedFormat === 'pdf') && previewHtml ? (
                  <iframe
                    ref={previewRef}
                    srcDoc={previewHtml}
                    className="w-full h-full border-0"
                    title="Export Preview"
                    sandbox="allow-same-origin"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Download className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-sm">Preview not available for this format</p>
                    <p className="text-xs mt-1">Export to see the result</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {exportError && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive mt-4">
            {exportError}
          </div>
        )}

        {/* Success message */}
        {exportSuccess && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-600 dark:text-green-400 flex items-center gap-2 mt-4">
            <Check className="h-4 w-4" />
            Successfully exported as {FORMAT_CONFIG[exportSuccess].label}
          </div>
        )}

        {/* Export button */}
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || isLoading || messages.length === 0}
            className="min-w-[140px]"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {FORMAT_CONFIG[selectedFormat].extension}
              </>
            )}
          </Button>
        </div>
      </DialogContent>

      {/* Custom Theme Editor Dialog */}
      <CustomThemeEditor
        open={themeEditorOpen}
        onOpenChange={setThemeEditorOpen}
        editingThemeId={editingThemeId}
        onSave={(themeId) => {
          // Select the newly created/edited theme
          const theme = customThemes.find(t => t.id === themeId);
          if (theme) {
            setOptions(prev => ({ ...prev, syntaxTheme: theme.name as SyntaxThemeName }));
          }
        }}
      />
    </Dialog>
  );
}

export default BeautifulExportDialog;
