'use client';

/**
 * ToolSettings - Configure built-in tools for AI agents
 * Allows enabling/disabling file tools, document tools, search, etc.
 */

import { useTranslations } from 'next-intl';
import {
  FileText,
  FolderOpen,
  Search,
  Calculator,
  Code,
  Database,
  Shield,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { SourceVerificationSettings } from './source-verification-settings';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useSettingsStore } from '@/stores';

interface ToolCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  requiresApproval?: boolean;
  tools: {
    name: string;
    description: string;
    requiresApproval: boolean;
  }[];
}

export function ToolSettings() {
  const t = useTranslations('toolSettings');

  // Tool settings from store
  const enableFileTools = useSettingsStore((state) => state.enableFileTools);
  const setEnableFileTools = useSettingsStore((state) => state.setEnableFileTools);
  const enableDocumentTools = useSettingsStore((state) => state.enableDocumentTools);
  const setEnableDocumentTools = useSettingsStore((state) => state.setEnableDocumentTools);
  const enableCodeExecution = useSettingsStore((state) => state.enableCodeExecution);
  const setEnableCodeExecution = useSettingsStore((state) => state.setEnableCodeExecution);
  const enableWebSearch = useSettingsStore((state) => state.enableWebSearch);
  const setEnableWebSearch = useSettingsStore((state) => state.setEnableWebSearch);
  const enableRAGSearch = useSettingsStore((state) => state.enableRAGSearch);
  const setEnableRAGSearch = useSettingsStore((state) => state.setEnableRAGSearch);
  const enableCalculator = useSettingsStore((state) => state.enableCalculator);
  const setEnableCalculator = useSettingsStore((state) => state.setEnableCalculator);

  const toolCategories: ToolCategory[] = [
    {
      id: 'file',
      name: 'File Operations',
      description: 'Read, write, copy, move, and search files on your local system',
      icon: <FolderOpen className="h-4 w-4" />,
      enabled: enableFileTools,
      setEnabled: setEnableFileTools,
      requiresApproval: true,
      tools: [
        { name: 'file_read', description: 'Read file contents', requiresApproval: false },
        { name: 'file_write', description: 'Write content to files', requiresApproval: true },
        { name: 'file_list', description: 'List directory contents', requiresApproval: false },
        { name: 'file_exists', description: 'Check if file exists', requiresApproval: false },
        { name: 'file_delete', description: 'Delete files', requiresApproval: true },
        { name: 'file_copy', description: 'Copy files', requiresApproval: true },
        { name: 'file_rename', description: 'Rename/move files', requiresApproval: true },
        { name: 'file_info', description: 'Get file metadata', requiresApproval: false },
        { name: 'file_search', description: 'Search for files', requiresApproval: false },
        { name: 'file_append', description: 'Append to files', requiresApproval: true },
        { name: 'directory_create', description: 'Create directories', requiresApproval: true },
      ],
    },
    {
      id: 'document',
      name: 'Document Processing',
      description: 'Analyze, summarize, and chunk documents for processing',
      icon: <FileText className="h-4 w-4" />,
      enabled: enableDocumentTools,
      setEnabled: setEnableDocumentTools,
      tools: [
        { name: 'document_summarize', description: 'Generate document summaries', requiresApproval: false },
        { name: 'document_chunk', description: 'Split documents into chunks', requiresApproval: false },
        { name: 'document_analyze', description: 'Analyze document structure', requiresApproval: false },
      ],
    },
    {
      id: 'search',
      name: 'Web Search',
      description: 'Search the internet for current information',
      icon: <Search className="h-4 w-4" />,
      enabled: enableWebSearch,
      setEnabled: setEnableWebSearch,
      tools: [
        { name: 'web_search', description: 'Search the web for information', requiresApproval: false },
      ],
    },
    {
      id: 'rag',
      name: 'Knowledge Base Search',
      description: 'Search your uploaded documents using semantic similarity',
      icon: <Database className="h-4 w-4" />,
      enabled: enableRAGSearch,
      setEnabled: setEnableRAGSearch,
      tools: [
        { name: 'rag_search', description: 'Search knowledge base with embeddings', requiresApproval: false },
      ],
    },
    {
      id: 'calculator',
      name: 'Calculator',
      description: 'Perform mathematical calculations and unit conversions',
      icon: <Calculator className="h-4 w-4" />,
      enabled: enableCalculator,
      setEnabled: setEnableCalculator,
      tools: [
        { name: 'calculator', description: 'Evaluate math expressions', requiresApproval: false },
      ],
    },
    {
      id: 'code',
      name: 'Code Execution',
      description: 'Execute JavaScript code in a sandboxed environment',
      icon: <Code className="h-4 w-4" />,
      enabled: enableCodeExecution,
      setEnabled: setEnableCodeExecution,
      requiresApproval: true,
      tools: [
        { name: 'execute_code', description: 'Run JavaScript code', requiresApproval: true },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {/* Info Alert */}
      <Alert className="py-2">
        <Shield className="h-3.5 w-3.5" />
        <AlertTitle className="text-sm">{t('permissions')}</AlertTitle>
        <AlertDescription className="text-xs">
          {t('permissionsDesc')}
        </AlertDescription>
      </Alert>

      {/* Tool Categories - Compact Grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {toolCategories.map((category) => (
          <Card key={category.id} className={!category.enabled ? 'opacity-60' : ''}>
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {category.icon}
                  <CardTitle className="text-sm">{category.name}</CardTitle>
                  {category.requiresApproval && (
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                  )}
                </div>
                <Switch
                  checked={category.enabled}
                  onCheckedChange={category.setEnabled}
                />
              </div>
              <CardDescription className="text-[10px] leading-tight">
                {category.description}
              </CardDescription>
            </CardHeader>
            {category.enabled && (
              <CardContent className="pt-0 px-4 pb-3">
                <div className="flex flex-wrap gap-1">
                  {category.tools.map((tool) => (
                    <span
                      key={tool.name}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono ${
                        tool.requiresApproval
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                      title={tool.description}
                    >
                      {tool.name}
                      {tool.requiresApproval && <AlertTriangle className="h-2.5 w-2.5" />}
                    </span>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Source Verification Settings - shown when web search is enabled */}
      {enableWebSearch && (
        <Collapsible defaultOpen={false} className="border rounded-lg">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">信源验证设置</span>
            </div>
            <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t">
            <div className="p-4">
              <SourceVerificationSettings compact />
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Desktop App Notice for File Tools */}
      {enableFileTools && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          <AlertTitle className="text-sm">{t('desktopRequired')}</AlertTitle>
          <AlertDescription className="text-xs">
            {t('desktopRequiredDesc')}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default ToolSettings;
