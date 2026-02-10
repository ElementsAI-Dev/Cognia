'use client';

/**
 * ArtifactCreateButton - Button to create an artifact from code blocks
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Layers, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useArtifactStore, useSessionStore } from '@/stores';
import type { ArtifactType } from '@/types';
import {
  matchesTypePatterns,
  getLanguageDisplayName,
} from '@/lib/artifacts';
import {
  detectArtifactType as detectType,
  mapToArtifactLanguage,
} from '@/hooks/chat/use-artifact-detection';

interface ArtifactCreateButtonProps {
  content: string;
  language?: string;
  title?: string;
  messageId?: string;
  className?: string;
  variant?: 'icon' | 'button' | 'dropdown';
}

/**
 * Detect artifact type from language and content
 * Uses detectArtifactType from useArtifactDetection hook with
 * additional pattern matching from lib/artifacts
 */
function detectArtifactType(language?: string, content?: string): ArtifactType {
  // Use the hook's detection as base
  const baseType = detectType(language, content);

  // Enhance with centralized pattern matching for edge cases
  if (baseType === 'code' && content) {
    const lang = language?.toLowerCase();
    if ((lang === 'jsx' || lang === 'tsx') && matchesTypePatterns(content, 'react')) {
      return 'react';
    }
    if (lang === 'json' && matchesTypePatterns(content, 'chart')) {
      return 'chart';
    }
  }

  return baseType;
}

/**
 * Generate a title from content
 */
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

  // Use language display name as fallback
  return language ? `${getLanguageDisplayName(language)} Code` : 'Code Artifact';
}

export function ArtifactCreateButton({
  content,
  language,
  title,
  messageId,
  className,
  variant = 'icon',
}: ArtifactCreateButtonProps) {
  const t = useTranslations('artifactCreateButton');
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
            {created ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Layers className="h-4 w-4" />
            )}
            <span className="ml-1">{t('createArtifact')}</span>
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleCreate('code')}>{t('asCode')}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleCreate('react')}>{t('asReact')}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleCreate('html')}>{t('asHtml')}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleCreate('document')}>
            {t('asDocument')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleCreate('mermaid')}>
            {t('asMermaid')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleCreate('chart')}>{t('asChart')}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleCreate('math')}>{t('asMath')}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === 'button') {
    return (
      <Button size="sm" variant="ghost" className={className} onClick={() => handleCreate()}>
        {created ? <Check className="h-4 w-4 text-green-500" /> : <Layers className="h-4 w-4" />}
        <span className="ml-1">{t('createArtifact')}</span>
      </Button>
    );
  }

  // Icon variant (default)
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant="ghost" className={className} onClick={() => handleCreate()}>
            {created ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Layers className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('createArtifact')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ArtifactCreateButton;
