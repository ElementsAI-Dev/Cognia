'use client';

/**
 * ToolSettings - Configure built-in tools for AI agents
 * Allows enabling/disabling file tools, document tools, search, etc.
 */

import {
  FileText,
  FolderOpen,
  Search,
  Calculator,
  Code,
  Database,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
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
      icon: <FolderOpen className="h-5 w-5" />,
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
      icon: <FileText className="h-5 w-5" />,
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
      icon: <Search className="h-5 w-5" />,
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
      icon: <Database className="h-5 w-5" />,
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
      icon: <Calculator className="h-5 w-5" />,
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
      icon: <Code className="h-5 w-5" />,
      enabled: enableCodeExecution,
      setEnabled: setEnableCodeExecution,
      requiresApproval: true,
      tools: [
        { name: 'execute_code', description: 'Run JavaScript code', requiresApproval: true },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Tool Permissions</AlertTitle>
        <AlertDescription>
          Tools marked with a warning badge require your approval before execution.
          This protects your system from unintended changes.
        </AlertDescription>
      </Alert>

      {/* Tool Categories */}
      {toolCategories.map((category) => (
        <Card key={category.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {category.icon}
                <CardTitle className="text-lg">{category.name}</CardTitle>
                {category.requiresApproval && (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
              </div>
              <Switch
                checked={category.enabled}
                onCheckedChange={category.setEnabled}
              />
            </div>
            <CardDescription>{category.description}</CardDescription>
          </CardHeader>
          {category.enabled && (
            <CardContent>
              <div className="grid gap-2">
                {category.tools.map((tool) => (
                  <div
                    key={tool.name}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="space-y-0.5">
                      <Label className="font-mono text-sm">{tool.name}</Label>
                      <p className="text-xs text-muted-foreground">
                        {tool.description}
                      </p>
                    </div>
                    {tool.requiresApproval && (
                      <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-3 w-3" />
                        Requires approval
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}

      {/* Desktop App Notice for File Tools */}
      {enableFileTools && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Desktop App Required</AlertTitle>
          <AlertDescription>
            File operations are only available in the Tauri desktop application.
            In the web version, file tools will return an error.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default ToolSettings;
