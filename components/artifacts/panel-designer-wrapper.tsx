'use client';

/**
 * ArtifactDesignerWrapper - Designer integration for ArtifactPanel
 * Extracted to reduce artifact-panel.tsx complexity
 */

import { useArtifactStore } from '@/stores';
import { V0Designer } from '@/components/designer';
import type { Artifact } from '@/types';

interface ArtifactDesignerWrapperProps {
  artifact: Artifact;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ArtifactDesignerWrapper({
  artifact,
  open,
  onOpenChange,
}: ArtifactDesignerWrapperProps) {
  const updateArtifact = useArtifactStore((state) => state.updateArtifact);

  const handleCodeChange = (newCode: string) => {
    updateArtifact(artifact.id, { content: newCode });
  };

  return (
    <V0Designer
      open={open}
      onOpenChange={onOpenChange}
      initialCode={artifact.content}
      onCodeChange={handleCodeChange}
    />
  );
}
