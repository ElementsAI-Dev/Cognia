import type { Artifact, ArtifactMetadata, ArtifactType } from '@/types';

function normalizeArtifactContent(content: string): string {
  return content.replace(/\r\n/g, '\n').trim();
}

function hashFingerprint(input: string): string {
  let hash = 2166136261;

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return `afp_${(hash >>> 0).toString(16)}`;
}

export function buildArtifactSourceFingerprint(params: {
  sessionId: string;
  messageId: string;
  type: ArtifactType;
  content: string;
  language?: string;
}): string {
  const normalizedContent = normalizeArtifactContent(params.content);
  return hashFingerprint(
    [
      params.sessionId,
      params.messageId,
      params.type,
      params.language || '',
      normalizedContent,
    ].join('::')
  );
}

export function buildArtifactSourceMetadata(params: {
  sessionId: string;
  messageId: string;
  type: ArtifactType;
  content: string;
  language?: string;
  sourceOrigin: 'manual' | 'auto' | 'tool';
  userInitiated: boolean;
  sourceRange?: { startIndex: number; endIndex: number };
  metadata?: ArtifactMetadata;
}): ArtifactMetadata {
  return {
    ...params.metadata,
    sourceOrigin: params.sourceOrigin,
    sourceFingerprint: buildArtifactSourceFingerprint({
      sessionId: params.sessionId,
      messageId: params.messageId,
      type: params.type,
      content: params.content,
      language: params.language,
    }),
    sourceRange: params.sourceRange,
    userInitiated: params.userInitiated,
  };
}

export function isDuplicateArtifactSource(params: {
  artifacts: Record<string, Artifact>;
  sessionId: string;
  messageId: string;
  type: ArtifactType;
  sourceFingerprint: string;
}): boolean {
  return Object.values(params.artifacts).some(
    (artifact) =>
      artifact.sessionId === params.sessionId &&
      artifact.messageId === params.messageId &&
      artifact.type === params.type &&
      artifact.metadata?.sourceFingerprint === params.sourceFingerprint
  );
}
