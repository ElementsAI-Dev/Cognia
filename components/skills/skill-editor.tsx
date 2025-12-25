'use client';

/**
 * Skill Editor Component
 * 
 * Rich editor for SKILL.md files with syntax highlighting, validation,
 * resource management, and AI-assisted features
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Save,
  X,
  AlertCircle,
  CheckCircle2,
  Eye,
  Code2,
  Sparkles,
  RotateCcw,
  FileText,
  Coins,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { parseSkillMd } from '@/lib/skills/parser';
import { estimateSkillTokens } from '@/lib/skills/executor';
import { downloadSkillAsMarkdown, downloadSkillAsPackage } from '@/lib/skills/packager';
import { SkillMarkdownPreview, SkillMarkdownStyles } from './skill-markdown-preview';
import { SkillResourceManager } from './skill-resource-manager';
import { SkillAIAssistant } from './skill-ai-assistant';
import type { Skill, SkillResource } from '@/types/skill';

interface SkillEditorProps {
  skill?: Skill;
  initialContent?: string;
  onSave: (rawContent: string, resources?: SkillResource[]) => void;
  onCancel?: () => void;
  readOnly?: boolean;
  onRequestAI?: (prompt: string) => Promise<string>;
}

export function SkillEditor({
  skill,
  initialContent = '',
  onSave,
  onCancel,
  readOnly = false,
  onRequestAI,
}: SkillEditorProps) {
  const [content, setContent] = useState(skill?.rawContent || initialContent);
  const [resources, setResources] = useState<SkillResource[]>(skill?.resources || []);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'resources' | 'ai'>('edit');

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

  const handleContentChange = useCallback((value: string) => {
    setContent(value);
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
    setActiveTab('edit');
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

  return (
    <div className="flex flex-col h-full">
      <SkillMarkdownStyles />
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Code2 className="h-5 w-5" />
          <span className="font-medium">
            {parsedContent.name || 'New Skill'}
          </span>
          {hasChanges && (
            <Badge variant="outline" className="text-xs">
              Unsaved
            </Badge>
          )}
          {contentIsValid ? (
            <Badge variant="secondary" className="text-xs text-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Valid
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              {validationErrors.length} Error{validationErrors.length !== 1 ? 's' : ''}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            <Coins className="h-3 w-3 mr-1" />
            ~{tokenEstimate} tokens
          </Badge>
          {resources.length > 0 && (
            <Badge variant="outline" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              {resources.length} resource{resources.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {parsedContent.name && (
            <>
              <Button variant="ghost" size="sm" onClick={() => handleDownload('md')}>
                <Download className="h-4 w-4 mr-1" />
                .md
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDownload('json')}>
                <Download className="h-4 w-4 mr-1" />
                .json
              </Button>
            </>
          )}
          {hasChanges && (
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          )}
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
          <Button 
            size="sm" 
            onClick={handleSave} 
            disabled={!contentIsValid || !hasChanges || readOnly}
          >
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
        </div>
      </div>

      {/* Validation Messages */}
      {(validationErrors.length > 0 || validationWarnings.length > 0) && (
        <div className="p-2 border-b space-y-1">
          {validationErrors.map((err, i) => (
            <Alert key={`error-${i}`} variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>{err.field}:</strong> {err.message}
              </AlertDescription>
            </Alert>
          ))}
          {validationWarnings.map((warn, i) => (
            <Alert key={`warn-${i}`} className="py-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>{warn.field}:</strong> {warn.message}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Editor Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-2">
          <TabsTrigger value="edit">
            <Code2 className="h-4 w-4 mr-1" />
            Edit
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="resources">
            <FileText className="h-4 w-4 mr-1" />
            Resources
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Sparkles className="h-4 w-4 mr-1" />
            AI Assist
          </TabsTrigger>
        </TabsList>

        {/* Edit Tab */}
        <TabsContent value="edit" className="flex-1 p-4 pt-2">
          <Textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="h-full min-h-[400px] font-mono text-sm resize-none"
            placeholder={`---
name: my-skill-name
description: What this skill does and when to use it
---

# My Skill

## When to Use

Use this skill when...

## Instructions

1. First step
2. Second step

## Examples

...`}
            readOnly={readOnly}
          />
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="flex-1 p-4 pt-2 overflow-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                {parsedContent.name || 'Skill Name'}
              </CardTitle>
              <CardDescription>
                {parsedContent.description || 'Skill description will appear here'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {parsedContent.body ? (
                <SkillMarkdownPreview content={parsedContent.body} />
              ) : (
                <p className="text-muted-foreground text-sm">
                  Skill content will appear here after parsing...
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="flex-1 p-4 pt-2 overflow-auto">
          <SkillResourceManager
            resources={resources}
            onAddResource={handleAddResource}
            onRemoveResource={handleRemoveResource}
            readOnly={readOnly}
          />
        </TabsContent>

        {/* AI Assist Tab */}
        <TabsContent value="ai" className="flex-1 p-4 pt-2 overflow-auto">
          <SkillAIAssistant
            currentContent={content}
            onApplyGenerated={handleApplyGenerated}
            onRequestAI={onRequestAI}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SkillEditor;
