import type {
  EditorCapabilityMatrix,
  EditorContextId,
  EditorRuntimeMode,
} from '@/types/editor/workbench';
import type { MonacoLspFeatureSupport } from '@/lib/monaco/lsp/monaco-lsp-adapter';

export interface ResolveEditorCapabilitiesInput {
  contextId: EditorContextId;
  languageId: string;
  runtimeMode: EditorRuntimeMode;
  lspConnected?: boolean;
  lspFeatures?: Partial<MonacoLspFeatureSupport>;
  fallbackReason?: string;
}

const EMPTY_LSP_FEATURES: MonacoLspFeatureSupport = {
  completion: false,
  hover: false,
  definition: false,
  references: false,
  rename: false,
  implementation: false,
  typeDefinition: false,
  signatureHelp: false,
  documentHighlight: false,
  documentSymbols: false,
  codeActions: false,
  formatting: false,
  workspaceSymbols: false,
  inlayHints: false,
  semanticTokens: false,
};

function mergeLspFeatures(features?: Partial<MonacoLspFeatureSupport>): MonacoLspFeatureSupport {
  return {
    ...EMPTY_LSP_FEATURES,
    ...features,
  };
}

export function resolveEditorCapabilityMatrix(
  input: ResolveEditorCapabilitiesInput
): EditorCapabilityMatrix {
  const mergedFeatures = mergeLspFeatures(input.lspFeatures);
  const lspConnected = Boolean(input.lspConnected);

  const lspBackedCapabilities = {
    completion: lspConnected && mergedFeatures.completion,
    hover: lspConnected && mergedFeatures.hover,
    definition: lspConnected && mergedFeatures.definition,
    references: lspConnected && mergedFeatures.references,
    rename: lspConnected && mergedFeatures.rename,
    implementation: lspConnected && mergedFeatures.implementation,
    typeDefinition: lspConnected && mergedFeatures.typeDefinition,
    signatureHelp: lspConnected && mergedFeatures.signatureHelp,
    documentHighlight: lspConnected && mergedFeatures.documentHighlight,
    documentSymbols: lspConnected && mergedFeatures.documentSymbols,
    workspaceSymbols: lspConnected && mergedFeatures.workspaceSymbols,
    codeActions: lspConnected && mergedFeatures.codeActions,
    formatting: lspConnected && mergedFeatures.formatting,
    inlayHints: lspConnected && mergedFeatures.inlayHints,
    semanticTokens: lspConnected && mergedFeatures.semanticTokens,
  };

  const monacoFallbackCapabilities = {
    completion: true,
    hover: true,
    definition: true,
    references: false,
    rename: false,
    implementation: false,
    typeDefinition: false,
    signatureHelp: false,
    documentHighlight: true,
    documentSymbols: true,
    workspaceSymbols: false,
    codeActions: true,
    formatting: true,
    inlayHints: false,
    semanticTokens: false,
  };

  const capabilities = {
    completion: lspBackedCapabilities.completion || monacoFallbackCapabilities.completion,
    hover: lspBackedCapabilities.hover || monacoFallbackCapabilities.hover,
    definition: lspBackedCapabilities.definition || monacoFallbackCapabilities.definition,
    references: lspBackedCapabilities.references || monacoFallbackCapabilities.references,
    rename: lspBackedCapabilities.rename || monacoFallbackCapabilities.rename,
    implementation:
      lspBackedCapabilities.implementation || monacoFallbackCapabilities.implementation,
    typeDefinition:
      lspBackedCapabilities.typeDefinition || monacoFallbackCapabilities.typeDefinition,
    signatureHelp: lspBackedCapabilities.signatureHelp || monacoFallbackCapabilities.signatureHelp,
    documentHighlight:
      lspBackedCapabilities.documentHighlight || monacoFallbackCapabilities.documentHighlight,
    documentSymbols:
      lspBackedCapabilities.documentSymbols || monacoFallbackCapabilities.documentSymbols,
    workspaceSymbols:
      lspBackedCapabilities.workspaceSymbols || monacoFallbackCapabilities.workspaceSymbols,
    codeActions: lspBackedCapabilities.codeActions || monacoFallbackCapabilities.codeActions,
    formatting: lspBackedCapabilities.formatting || monacoFallbackCapabilities.formatting,
    inlayHints: lspBackedCapabilities.inlayHints || monacoFallbackCapabilities.inlayHints,
    semanticTokens:
      lspBackedCapabilities.semanticTokens || monacoFallbackCapabilities.semanticTokens,
    diagnostics: true,
  };

  const highValueCapabilities: Array<keyof typeof capabilities> = [
    'completion',
    'hover',
    'definition',
    'references',
    'rename',
    'signatureHelp',
    'codeActions',
    'formatting',
    'diagnostics',
  ];
  const enabledCount = highValueCapabilities.reduce(
    (count, key) => (capabilities[key] ? count + 1 : count),
    0
  );

  const level = enabledCount >= 8 ? 'l1' : enabledCount >= 5 ? 'l2' : 'l3';
  const source = lspConnected ? 'mixed' : 'monaco';

  return {
    contextId: input.contextId,
    languageId: input.languageId,
    runtimeMode: input.runtimeMode,
    level,
    source,
    fallbackReason: lspConnected ? undefined : input.fallbackReason,
    capabilities,
  };
}
