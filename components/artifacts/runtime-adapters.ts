import type { ArtifactType } from '@/types';

export type ArtifactRuntimeTransport = 'iframe' | 'renderer' | 'jupyter';

export interface ArtifactRuntimeAdapter {
  type: ArtifactType;
  transport: ArtifactRuntimeTransport;
  rendererType?: 'code' | 'document' | 'mermaid' | 'chart' | 'math';
  sandbox?: string;
}

export const ARTIFACT_RUNTIME_ADAPTERS: Record<ArtifactType, ArtifactRuntimeAdapter> = {
  code: {
    type: 'code',
    transport: 'renderer',
    rendererType: 'code',
  },
  document: {
    type: 'document',
    transport: 'renderer',
    rendererType: 'document',
  },
  svg: {
    type: 'svg',
    transport: 'iframe',
    sandbox: 'allow-same-origin',
  },
  html: {
    type: 'html',
    transport: 'iframe',
    sandbox: 'allow-same-origin',
  },
  react: {
    type: 'react',
    transport: 'iframe',
    sandbox: 'allow-scripts',
  },
  mermaid: {
    type: 'mermaid',
    transport: 'renderer',
    rendererType: 'mermaid',
  },
  chart: {
    type: 'chart',
    transport: 'renderer',
    rendererType: 'chart',
  },
  math: {
    type: 'math',
    transport: 'renderer',
    rendererType: 'math',
  },
  jupyter: {
    type: 'jupyter',
    transport: 'jupyter',
  },
};

export function getArtifactRuntimeAdapter(type: ArtifactType): ArtifactRuntimeAdapter {
  return ARTIFACT_RUNTIME_ADAPTERS[type];
}
