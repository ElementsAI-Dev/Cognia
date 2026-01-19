'use client';

import { useEffect, useState } from 'react';
import {
  Save,
  Copy,
  Wand2,
  Type,
  Eye,
  EyeOff,
  FileCode,
  Layers,
  Variable,
  RotateCcw,
  Sparkles,
  BookOpen,
  Info,
} from 'lucide-react';
import { Editor, EditorProps } from '@monaco-editor/react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from '@/components/chat/utils/markdown-renderer';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { optimizeRules } from '@/lib/ai/generation/rules-optimizer';
import { useSettingsStore } from '@/stores';
import type { ProviderName } from '@/types';

const RULE_TARGETS = [
  { id: 'cursor', label: 'Cursor', path: '.cursorrules', icon: <FileCode className="h-4 w-4" /> },
  {
    id: 'windsurf',
    label: 'Windsurf',
    path: '.windsurfrules',
    icon: <Layers className="h-4 w-4" />,
  },
  {
    id: 'copilot',
    label: 'Copilot',
    path: '.github/copilot-instructions.md',
    icon: <Sparkles className="h-4 w-4" />,
  },
];

const RULE_TEMPLATES: Record<string, Record<string, { label: string; content: string }>> = {
  general: {
    base: {
      label: 'Balanced Base',
      content: `# Working Agreements\n- Respond with concise, actionable steps.\n- Prefer references to files with line numbers.\n- Ask before running long tasks.\n\n# Tools\n- Prefer built-in project scripts.\n- Avoid destructive commands.\n`,
    },
    senior: {
      label: 'Senior Engineer',
      content: `# Principles\n- Write code that is easy to delete, not easy to extend.\n- Favor composition over inheritance.\n- Keep state as local as possible.\n- Use descriptive names, avoid abbreviations.\n\n# Workflow\n- Always run linters before submitting.\n- Verify changes with existing tests.\n`,
    },
  },
  frontend: {
    react: {
      label: 'React & Tailwind',
      content: `# Frontend Rules\n- Use functional components with hooks.\n- Tailwind v4 with cn() utility for dynamic classes.\n- Use @/ alias for imports.\n- Keep components focused and small.\n- Favor Server Components for data fetching where possible.\n`,
    },
    styling: {
      label: 'Design System',
      content: `# Styling Principles\n- Use CSS variables for colors and spacing.\n- Prefer flexbox/grid for layouts.\n- Ensure high accessibility (ARIA labels, keyboard nav).\n- Use consistent spacing scales.\n`,
    },
  },
  backend: {
    typescript: {
      label: 'Node & TS',
      content: `# Backend Rules\n- Strong typing for all API inputs/outputs.\n- Use Zod for validation.\n- Implement proper error handling middleware.\n- Logging for all critical paths.\n- Prefer async/await over raw promises.\n`,
    },
  },
  testing: {
    full: {
      label: 'TDD Approach',
      content: `# Testing Rules\n- Write failing test first when possible.\n- Aim for >80% coverage on business logic.\n- Mock external services consistently.\n- Use descriptive test names (Given/When/Then).\n`,
    },
  },
};

const EDITOR_VARIABLES = [
  { label: 'Project Name', value: '{{project_name}}', description: 'Name of the current project' },
  { label: 'Stack Info', value: '{{tech_stack}}', description: 'Detected technology stack' },
  { label: 'Author', value: '{{author}}', description: 'Current user name' },
  { label: 'Current Date', value: '{{date}}', description: 'Current system date' },
  { label: 'Style Guide', value: '{{style_guide}}', description: 'Project style conventions' },
];

interface RulesEditorProps {
  onSave?: (path: string, content: string) => Promise<void> | void;
  initialContent?: Record<string, string>;
  className?: string;
}

export function RulesEditor({ onSave, initialContent, className }: RulesEditorProps) {
  const t = useTranslations('rules');
  const tCommon = useTranslations('common');

  const [activeTab, setActiveTab] = useState(RULE_TARGETS[0].id);
  const [showPreview, setShowPreview] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [contents, setContents] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    RULE_TARGETS.forEach((target) => {
      defaults[target.id] = initialContent?.[target.id] ?? RULE_TEMPLATES.general.base.content;
    });
    return defaults;
  });

  const [originalContents, setOriginalContents] = useState<Record<string, string>>(contents);
  const [theme, setTheme] = useState<'vs-dark' | 'light'>('vs-dark');

  const settings = useSettingsStore();

  // Sync with initialContent
  useEffect(() => {
    if (initialContent) {
      const newContents = { ...contents };
      let hasChanges = false;
      for (const target of RULE_TARGETS) {
        if (
          initialContent[target.id] !== undefined &&
          initialContent[target.id] !== contents[target.id]
        ) {
          newContents[target.id] = initialContent[target.id];
          hasChanges = true;
        }
      }
      if (hasChanges) {
        setContents(newContents);
        setOriginalContents(newContents);
      }
    }
  }, [initialContent, contents]);

  const activeContent = contents[activeTab] || '';
  const isDirty = activeContent !== originalContents[activeTab];

  const handleApplyTemplate = (category: string, templateKey: string) => {
    const template = RULE_TEMPLATES[category][templateKey];
    if (template) {
      setContents((prev) => ({ ...prev, [activeTab]: template.content }));
      toast.success(`Applied template: ${template.label}`);
    }
  };

  const handleInsertVariable = (variable: string) => {
    setContents((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab] + (prev[activeTab].endsWith('\n') ? '' : '\n') + variable,
    }));
  };

  const handleSave = async () => {
    const target = RULE_TARGETS.find((t) => t.id === activeTab);
    if (!target) return;
    try {
      await onSave?.(target.path, activeContent);
      setOriginalContents((prev) => ({ ...prev, [activeTab]: activeContent }));
      toast.success(tCommon('success'));
    } catch (error) {
      console.error(error);
      toast.error(tCommon('error'));
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(activeContent);
    toast.success(tCommon('copied'));
  };

  const handleOptimize = async () => {
    const target = RULE_TARGETS.find((t) => t.id === activeTab);
    if (!target) return;

    setIsOptimizing(true);
    try {
      const config = {
        provider: settings.defaultProvider as ProviderName,
        model: settings.chatModel,
        apiKey: settings.apiKeys[settings.defaultProvider] || '',
        baseUrl: settings.baseUrls[settings.defaultProvider],
      };

      const result = await optimizeRules(
        {
          content: activeContent,
          target: target.path,
          context: 'Tech stack: Next.js, Tailwind CSS, TypeScript, Tauri',
        },
        config
      );

      setContents((prev) => ({ ...prev, [activeTab]: result.optimizedContent }));

      if (result.changes.length > 0) {
        toast.success(`Optimized! ${result.changes.length} changes suggested.`);
      } else {
        toast.success('Rules are already highly optimized.');
      }
    } catch (error) {
      console.error(error);
      toast.error('AI Optimization failed. Please check your API settings.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const charCount = activeContent.length;
  const wordCount = activeContent.split(/\s+/).filter(Boolean).length;
  const tokenEstimate = Math.ceil(charCount / 4); // Rough estimate

  return (
    <Card className={cn('flex flex-col h-[700px] overflow-hidden', className)}>
      <CardHeader className="py-3 px-4 flex-row items-center justify-between border-b space-y-0 shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {t('title')}
              {isDirty && (
                <Badge
                  variant="outline"
                  className="text-[10px] h-4 border-yellow-500 text-yellow-500 font-normal"
                >
                  {t('unsavedChanges')}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs">{t('description')}</CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <TooltipProvider>
            {/* Show/Hide Preview */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon-xs"
                  onClick={() => setShowPreview(!showPreview)}
                  className={cn(showPreview && 'bg-accent')}
                >
                  {showPreview ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('preview')}</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* AI Optimization */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 h-8 text-xs bg-primary/10 hover:bg-primary/20 hover:text-primary transition-all duration-300 border-primary/20"
                  onClick={handleOptimize}
                  disabled={isOptimizing || !activeContent}
                >
                  {isOptimizing ? (
                    <RotateCcw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="h-3.5 w-3.5" />
                  )}
                  {isOptimizing ? t('optimizing') : t('optimize')}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('optimize')}</TooltipContent>
            </Tooltip>

            {/* Template Dropdown */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                      <BookOpen className="h-3.5 w-3.5" />
                      {t('templates')}
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>{t('templates')}</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-56">
                {Object.entries(RULE_TEMPLATES).map(([catId, templates]) => (
                  <DropdownMenuGroup key={catId}>
                    <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-1">
                      {t(`categories.${catId}`) || catId}
                    </DropdownMenuLabel>
                    {Object.entries(templates).map(([key, template]) => (
                      <DropdownMenuItem
                        key={key}
                        onClick={() => handleApplyTemplate(catId, key)}
                        className="text-xs cursor-pointer"
                      >
                        {template.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Variables Dropdown */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                      <Variable className="h-3.5 w-3.5" />
                      {t('variables')}
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>{t('variables')}</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="text-xs">{t('insert')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {EDITOR_VARIABLES.map((v) => (
                  <DropdownMenuItem
                    key={v.value}
                    onClick={() => handleInsertVariable(v.value)}
                    className="flex flex-col items-start gap-1 p-2 cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full font-mono text-[11px] text-primary">
                      <span>{v.value}</span>
                      <Badge variant="outline" className="text-[9px] h-4 py-0 font-normal">
                        {v.label}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{v.description}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Action Buttons */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleCopy}
            >
              <Copy className="h-3.5 w-3.5" />
              {t('copy')}
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleSave}
              disabled={!isDirty}
            >
              <Save className="h-3.5 w-3.5" />
              {t('save')}
            </Button>
          </TooltipProvider>
        </div>
      </CardHeader>

      <div className="px-4 py-0 border-b bg-muted/30 shrink-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-10 bg-transparent gap-2">
            {RULE_TARGETS.map((target) => (
              <TabsTrigger
                key={target.id}
                value={target.id}
                className="data-[state=active]:bg-background data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-4"
              >
                <div className="flex items-center gap-2">
                  {target.icon}
                  <span className="text-xs font-medium">{target.label}</span>
                  <span className="text-[10px] text-muted-foreground opacity-60">
                    ({target.path})
                  </span>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <CardContent className="p-0 flex-1 min-h-0 bg-background relative">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={showPreview ? 60 : 100} minSize={30}>
            <div className="h-full relative group">
              <MonacoEditor
                height="100%"
                language="markdown"
                theme={theme}
                value={activeContent}
                onChange={(val) => setContents((prev) => ({ ...prev, [activeTab]: val || '' }))}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  fontFamily: 'var(--font-mono)',
                  lineNumbers: 'on',
                  padding: { top: 16 },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  automaticLayout: true,
                  scrollbar: {
                    vertical: 'hidden',
                    horizontal: 'hidden',
                  },
                  lineDecorationsWidth: 0,
                  lineNumbersMinChars: 3,
                }}
              />
              <div className="absolute bottom-4 right-6 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <Button
                  size="icon-xs"
                  variant="ghost"
                  className="bg-background/80 backdrop-blur pointer-events-auto shadow-sm"
                  onClick={() => setTheme(theme === 'vs-dark' ? 'light' : 'vs-dark')}
                >
                  <Type className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </ResizablePanel>

          {showPreview && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={40} minSize={20}>
                <div className="h-full border-l bg-muted/5">
                  <ScrollArea className="h-full">
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                        <Eye className="h-3 w-3" />
                        {t('preview')}
                      </div>
                      <MarkdownRenderer
                        content={activeContent || '# No content'}
                        className="max-w-none"
                      />
                    </div>
                  </ScrollArea>
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>

        {isOptimizing && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
              <div className="relative">
                <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-primary animate-pulse" />
              </div>
              <div className="text-sm font-medium animate-pulse">{t('optimizing')}</div>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="py-2 px-4 border-t bg-muted/10 shrink-0 h-10 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Info className="h-3 w-3" />
            {RULE_TARGETS.find((t) => t.id === activeTab)?.path}
          </span>
          <Separator orientation="vertical" className="h-3" />
          <span className="flex items-center gap-1">
            <strong>{charCount}</strong> {t('chars')}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground/60">
            <strong>{wordCount}</strong> Words
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            {t('tokens')}: <span className="text-primary font-bold">{tokenEstimate}</span>
          </span>
          <Separator orientation="vertical" className="h-3" />
          <div className="flex items-center gap-1">
            <div
              className={cn('h-2 w-2 rounded-full', isDirty ? 'bg-yellow-500' : 'bg-green-500')}
            />
            {isDirty ? t('unsavedChanges') : 'Synced'}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

// Wrapper to handle Monaco Editor import issues in some environments
function MonacoEditor(props: EditorProps) {
  return <Editor {...props} />;
}
