'use client';

/**
 * ArtifactCreateButton - Button to create an artifact from code blocks
 */

import { useState } from 'react';
import { Layers, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useArtifactStore, useSessionStore } from '@/stores';
import type { ArtifactType, ArtifactLanguage } from '@/types';

interface ArtifactCreateButtonProps {
  content: string;
  language?: string;
  title?: string;
  messageId?: string;
  className?: string;
  variant?: 'icon' | 'button' | 'dropdown';
}

// Map common language strings to artifact types
function detectArtifactType(language?: string, content?: string): ArtifactType {
  if (!language) return 'code';
  
  const lang = language.toLowerCase();
  
  // Check for specific types
  if (lang === 'mermaid') return 'mermaid';
  if (lang === 'latex' || lang === 'tex' || lang === 'math') return 'math';
  if (lang === 'markdown' || lang === 'md') return 'document';
  if (lang === 'html') return 'html';
  if (lang === 'svg') return 'svg';
  if (lang === 'jsx' || lang === 'tsx') {
    // Check if it looks like a React component
    if (content?.includes('export') || content?.includes('function') || content?.includes('const')) {
      return 'react';
    }
  }
  if (lang === 'json') {
    // Check if it looks like chart data
    try {
      const parsed = JSON.parse(content || '');
      if (Array.isArray(parsed) && parsed.length > 0 && 'name' in parsed[0] && 'value' in parsed[0]) {
        return 'chart';
      }
      if (parsed.type && parsed.data) {
        return 'chart';
      }
    } catch {
      // Not valid JSON, treat as code
    }
  }
  
  return 'code';
}

// Map language strings to ArtifactLanguage
function mapToArtifactLanguage(language?: string): ArtifactLanguage | undefined {
  if (!language) return undefined;
  
  const languageMap: Record<string, ArtifactLanguage> = {
    js: 'javascript',
    javascript: 'javascript',
    ts: 'typescript',
    typescript: 'typescript',
    py: 'python',
    python: 'python',
    html: 'html',
    css: 'css',
    json: 'json',
    md: 'markdown',
    markdown: 'markdown',
    jsx: 'jsx',
    tsx: 'tsx',
    sql: 'sql',
    bash: 'bash',
    sh: 'bash',
    shell: 'bash',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    svg: 'svg',
    mermaid: 'mermaid',
    latex: 'latex',
    tex: 'latex',
  };
  
  return languageMap[language.toLowerCase()];
}

// Generate a title from content
function generateTitle(content: string, language?: string): string {
  // Try to extract function/component name
  const functionMatch = content.match(/(?:function|const|class)\s+(\w+)/);
  if (functionMatch) {
    return functionMatch[1];
  }
  
  // Try to extract export name
  const exportMatch = content.match(/export\s+(?:default\s+)?(?:function|const|class)\s+(\w+)/);
  if (exportMatch) {
    return exportMatch[1];
  }
  
  // Use language as fallback
  if (language) {
    return `${language.charAt(0).toUpperCase() + language.slice(1)} Code`;
  }
  
  return 'Code Artifact';
}

export function ArtifactCreateButton({
  content,
  language,
  title,
  messageId,
  className,
  variant = 'icon',
}: ArtifactCreateButtonProps) {
  const [created, setCreated] = useState(false);
  const createArtifact = useArtifactStore((state) => state.createArtifact);
  const getActiveSession = useSessionStore((state) => state.getActiveSession);

  const handleCreate = (type?: ArtifactType) => {
    const session = getActiveSession();
    if (!session) return;

    const detectedType = type || detectArtifactType(language, content);
    const artifactTitle = title || generateTitle(content, language);
    const artifactLanguage = mapToArtifactLanguage(language);

    createArtifact({
      sessionId: session.id,
      messageId: messageId || '',
      type: detectedType,
      title: artifactTitle,
      content,
      language: artifactLanguage,
    });

    setCreated(true);
    setTimeout(() => setCreated(false), 2000);
  };

  if (variant === 'dropdown') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" className={className}>
            {created ? <Check className="h-4 w-4 text-green-500" /> : <Layers className="h-4 w-4" />}
            <span className="ml-1">Create Artifact</span>
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleCreate('code')}>
            As Code
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleCreate('react')}>
            As React Component
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleCreate('html')}>
            As HTML Page
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleCreate('document')}>
            As Document
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleCreate('mermaid')}>
            As Mermaid Diagram
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleCreate('chart')}>
            As Chart
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleCreate('math')}>
            As Math Expression
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === 'button') {
    return (
      <Button
        size="sm"
        variant="ghost"
        className={className}
        onClick={() => handleCreate()}
      >
        {created ? <Check className="h-4 w-4 text-green-500" /> : <Layers className="h-4 w-4" />}
        <span className="ml-1">Create Artifact</span>
      </Button>
    );
  }

  // Icon variant (default)
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className={className}
            onClick={() => handleCreate()}
          >
            {created ? <Check className="h-4 w-4 text-green-500" /> : <Layers className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Create Artifact</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ArtifactCreateButton;
