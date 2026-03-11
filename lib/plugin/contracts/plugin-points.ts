/**
 * Canonical plugin point contract registry.
 *
 * This module is the single source of truth for:
 * - UI extension point IDs
 * - Hook IDs
 * - Activation event patterns
 *
 * Runtime validators, SDK parity checks, docs, and audit scripts should consume
 * these definitions to avoid contract drift.
 */

export type PluginPointKind = 'ui-slot' | 'hook' | 'activation';
export type PluginPointStability = 'stable' | 'experimental' | 'deprecated';
export type PluginPointStatus = 'implemented' | 'virtual' | 'deprecated';
export type PluginPointGovernanceMode = 'warn' | 'block';

export interface PluginPointContract {
  id: string;
  kind: PluginPointKind;
  stability: PluginPointStability;
  status: PluginPointStatus;
  owner: string;
  binding: string;
  introducedIn: string;
  deprecatedIn?: string;
  replacementId?: string;
  permission?: string;
  aliases?: readonly string[];
}

export interface PluginPointDiagnostic {
  code:
    | 'plugin.point.unknown'
    | 'plugin.point.deprecated'
    | 'plugin.point.alias'
    | 'plugin.point.virtual'
    | 'plugin.point.permission_denied';
  severity: 'warning' | 'error';
  message: string;
  pointKind: PluginPointKind;
  pointId: string;
  canonicalId?: string;
  hint?: string;
}

export interface PluginPointValidationOutcome {
  allowed: boolean;
  canonicalId?: string;
  contract?: PluginPointContract;
  diagnostics: PluginPointDiagnostic[];
}

interface PluginPointValidationOptions {
  governanceMode?: PluginPointGovernanceMode;
  hasPermission?: (permission: string) => boolean;
}

export const CANONICAL_EXTENSION_POINTS = [
  'sidebar.left.top',
  'sidebar.left.bottom',
  'sidebar.right.top',
  'sidebar.right.bottom',
  'toolbar.left',
  'toolbar.center',
  'toolbar.right',
  'statusbar.left',
  'statusbar.center',
  'statusbar.right',
  'chat.header',
  'chat.footer',
  'chat.input.above',
  'chat.input.below',
  'chat.input.actions',
  'chat.message.before',
  'chat.message.after',
  'chat.message.actions',
  'chat.message.footer',
  'artifact.toolbar',
  'artifact.actions',
  'canvas.toolbar',
  'canvas.sidebar',
  'panel.header',
  'panel.footer',
  'settings.general',
  'settings.appearance',
  'settings.ai',
  'settings.plugins',
  'command-palette',
] as const;

export type CanonicalExtensionPoint = (typeof CANONICAL_EXTENSION_POINTS)[number];

const IMPLEMENTED_EXTENSION_POINTS = new Set<CanonicalExtensionPoint>([
  'sidebar.left.bottom',
  'chat.header',
  'chat.footer',
  'chat.input.above',
  'chat.input.below',
]);

const EXTENSION_POINT_ALIASES: Record<string, CanonicalExtensionPoint> = {
  'sidebar:top': 'sidebar.left.top',
  'sidebar:bottom': 'sidebar.left.bottom',
  'toolbar:actions': 'toolbar.right',
  'chat:input': 'chat.input.actions',
  'message:actions': 'chat.message.actions',
  'settings:panel': 'settings.plugins',
  'header:right': 'chat.header',
  'footer:left': 'chat.footer',
  'context:menu': 'chat.message.actions',
};

export const CANONICAL_HOOK_POINTS = [
  'onLoad',
  'onEnable',
  'onDisable',
  'onUnload',
  'onConfigChange',
  'onA2UISurfaceCreate',
  'onA2UISurfaceDestroy',
  'onA2UIAction',
  'onA2UIDataChange',
  'onAgentStart',
  'onAgentStep',
  'onAgentToolCall',
  'onAgentComplete',
  'onAgentError',
  'onMessageSend',
  'onMessageReceive',
  'onMessageRender',
  'onMessageDelete',
  'onMessageEdit',
  'onSessionCreate',
  'onSessionSwitch',
  'onSessionDelete',
  'onSessionRename',
  'onSessionClear',
  'onCommand',
  'onChatRegenerate',
  'onModelSwitch',
  'onChatModeSwitch',
  'onSystemPromptChange',
  'onAgentPlanCreate',
  'onAgentPlanStepComplete',
  'onScheduledTaskStart',
  'onScheduledTaskComplete',
  'onScheduledTaskError',
  'onProjectCreate',
  'onProjectUpdate',
  'onProjectDelete',
  'onProjectSwitch',
  'onKnowledgeFileAdd',
  'onKnowledgeFileRemove',
  'onSessionLinked',
  'onSessionUnlinked',
  'onCanvasCreate',
  'onCanvasUpdate',
  'onCanvasDelete',
  'onCanvasSwitch',
  'onCanvasContentChange',
  'onCanvasVersionSave',
  'onCanvasVersionRestore',
  'onCanvasSelection',
  'onArtifactCreate',
  'onArtifactUpdate',
  'onArtifactDelete',
  'onArtifactOpen',
  'onArtifactClose',
  'onArtifactExecute',
  'onArtifactExport',
  'onExportStart',
  'onExportComplete',
  'onExportTransform',
  'onProjectExportStart',
  'onProjectExportComplete',
  'onThemeModeChange',
  'onColorPresetChange',
  'onCustomThemeActivate',
  'onChatRequest',
  'onStreamStart',
  'onStreamChunk',
  'onStreamEnd',
  'onChatError',
  'onTokenUsage',
  'onUserPromptSubmit',
  'onPreToolUse',
  'onPostToolUse',
  'onPreCompact',
  'onPostChatReceive',
  'onDocumentsIndexed',
  'onVectorSearch',
  'onRAGContextRetrieved',
  'onWorkflowStart',
  'onWorkflowStepComplete',
  'onWorkflowComplete',
  'onWorkflowError',
  'onSidebarToggle',
  'onPanelOpen',
  'onPanelClose',
  'onShortcut',
  'onContextMenuShow',
  'onScheduledTaskCreate',
  'onScheduledTaskUpdate',
  'onScheduledTaskDelete',
  'onScheduledTaskPause',
  'onScheduledTaskResume',
  'onScheduledTaskBeforeRun',
  'onExternalAgentConnect',
  'onExternalAgentDisconnect',
  'onExternalAgentExecutionStart',
  'onExternalAgentExecutionComplete',
  'onExternalAgentPermissionRequest',
  'onExternalAgentToolCall',
  'onExternalAgentError',
  'onCodeExecutionStart',
  'onCodeExecutionComplete',
  'onCodeExecutionError',
  'onMCPServerConnect',
  'onMCPServerDisconnect',
  'onMCPToolCall',
  'onMCPToolResult',
] as const;

export type CanonicalHookPoint = (typeof CANONICAL_HOOK_POINTS)[number];

export const CANONICAL_ACTIVATION_PATTERNS = [
  'startup',
  'onStartup',
  'onCommand:*',
  'onTool:*',
  'onAgentTool:*',
  'onChat:*',
  'onAgent:start',
  'onA2UI:surface',
  'onLanguage:*',
  'onFile:*',
] as const;

export type CanonicalActivationPattern = (typeof CANONICAL_ACTIVATION_PATTERNS)[number];
export type ActivationEventDeclaration =
  | 'startup'
  | 'onStartup'
  | 'onCommand:*'
  | `onCommand:${string}`
  | 'onTool:*'
  | `onTool:${string}`
  | 'onAgentTool:*'
  | `onAgentTool:${string}`
  | 'onChat:*'
  | `onChat:${string}`
  | 'onAgent:start'
  | 'onA2UI:surface'
  | `onLanguage:${string}`
  | `onFile:${string}`;

const extensionPointContracts: Record<CanonicalExtensionPoint, PluginPointContract> =
  Object.fromEntries(
    CANONICAL_EXTENSION_POINTS.map((id) => {
      const status: PluginPointStatus = IMPLEMENTED_EXTENSION_POINTS.has(id) ? 'implemented' : 'virtual';
      return [
        id,
        {
          id,
          kind: 'ui-slot',
          stability: 'stable',
          status,
          owner: 'plugin-platform',
          binding: status === 'implemented' ? 'components/* via PluginExtensionPoint' : 'virtual (declared-only)',
          introducedIn: '0.1.0',
          permission: 'extension:ui',
        } as PluginPointContract,
      ];
    })
  ) as Record<CanonicalExtensionPoint, PluginPointContract>;

const hookPointContracts: Record<CanonicalHookPoint, PluginPointContract> =
  Object.fromEntries(
    CANONICAL_HOOK_POINTS.map((id) => [
      id,
      {
        id,
        kind: 'hook',
        stability: 'stable',
        status: 'implemented',
        owner: 'plugin-platform',
        binding: 'lib/plugin/messaging/hooks-system.ts',
        introducedIn: '0.1.0',
      } as PluginPointContract,
    ])
  ) as Record<CanonicalHookPoint, PluginPointContract>;

const activationPatternContracts: Record<CanonicalActivationPattern, PluginPointContract> = {
  startup: {
    id: 'startup',
    kind: 'activation',
    stability: 'stable',
    status: 'implemented',
    owner: 'plugin-platform',
    binding: 'lib/plugin/core/manager.ts:handleActivationEvent',
    introducedIn: '0.1.0',
  },
  onStartup: {
    id: 'onStartup',
    kind: 'activation',
    stability: 'deprecated',
    status: 'deprecated',
    owner: 'plugin-platform',
    binding: 'legacy alias',
    introducedIn: '0.1.0',
    deprecatedIn: '0.1.0',
    replacementId: 'startup',
    aliases: ['startup'],
  },
  'onCommand:*': {
    id: 'onCommand:*',
    kind: 'activation',
    stability: 'stable',
    status: 'implemented',
    owner: 'plugin-platform',
    binding: 'lib/plugin/core/manager.ts:handleActivationEvent',
    introducedIn: '0.1.0',
  },
  'onTool:*': {
    id: 'onTool:*',
    kind: 'activation',
    stability: 'stable',
    status: 'implemented',
    owner: 'plugin-platform',
    binding: 'lib/plugin/core/manager.ts:handleActivationEvent',
    introducedIn: '0.1.0',
  },
  'onAgentTool:*': {
    id: 'onAgentTool:*',
    kind: 'activation',
    stability: 'deprecated',
    status: 'deprecated',
    owner: 'plugin-platform',
    binding: 'legacy alias',
    introducedIn: '0.1.0',
    deprecatedIn: '0.1.0',
    replacementId: 'onTool:*',
  },
  'onChat:*': {
    id: 'onChat:*',
    kind: 'activation',
    stability: 'experimental',
    status: 'virtual',
    owner: 'plugin-platform',
    binding: 'virtual (not dispatched)',
    introducedIn: '0.1.0',
  },
  'onAgent:start': {
    id: 'onAgent:start',
    kind: 'activation',
    stability: 'experimental',
    status: 'virtual',
    owner: 'plugin-platform',
    binding: 'virtual (not dispatched)',
    introducedIn: '0.1.0',
  },
  'onA2UI:surface': {
    id: 'onA2UI:surface',
    kind: 'activation',
    stability: 'experimental',
    status: 'virtual',
    owner: 'plugin-platform',
    binding: 'virtual (not dispatched)',
    introducedIn: '0.1.0',
  },
  'onLanguage:*': {
    id: 'onLanguage:*',
    kind: 'activation',
    stability: 'experimental',
    status: 'virtual',
    owner: 'plugin-platform',
    binding: 'virtual (not dispatched)',
    introducedIn: '0.1.0',
  },
  'onFile:*': {
    id: 'onFile:*',
    kind: 'activation',
    stability: 'experimental',
    status: 'virtual',
    owner: 'plugin-platform',
    binding: 'virtual (not dispatched)',
    introducedIn: '0.1.0',
  },
};

export const PLUGIN_POINT_CONTRACTS: readonly PluginPointContract[] = [
  ...Object.values(extensionPointContracts),
  ...Object.values(hookPointContracts),
  ...Object.values(activationPatternContracts),
];

const extensionPointSet = new Set<string>(CANONICAL_EXTENSION_POINTS);
const hookPointSet = new Set<string>(CANONICAL_HOOK_POINTS);

export function getExtensionPointContract(point: CanonicalExtensionPoint): PluginPointContract {
  return extensionPointContracts[point];
}

export function getHookPointContract(hookName: CanonicalHookPoint): PluginPointContract {
  return hookPointContracts[hookName];
}

export function getActivationPatternContract(
  pattern: CanonicalActivationPattern
): PluginPointContract {
  return activationPatternContracts[pattern];
}

function toSeverity(mode: PluginPointGovernanceMode): 'warning' | 'error' {
  return mode === 'block' ? 'error' : 'warning';
}

export function resolveActivationPattern(event: string): CanonicalActivationPattern | undefined {
  if (event === 'startup' || event === 'onStartup' || event === 'onAgent:start' || event === 'onA2UI:surface') {
    return event;
  }

  if (event.startsWith('onCommand:') && event.length > 'onCommand:'.length) {
    return 'onCommand:*';
  }

  if (event.startsWith('onTool:') && event.length > 'onTool:'.length) {
    return 'onTool:*';
  }

  if (event.startsWith('onAgentTool:') && event.length > 'onAgentTool:'.length) {
    return 'onAgentTool:*';
  }

  if (event.startsWith('onChat:') && event.length > 'onChat:'.length) {
    return 'onChat:*';
  }

  if (event.startsWith('onLanguage:') && event.length > 'onLanguage:'.length) {
    return 'onLanguage:*';
  }

  if (event.startsWith('onFile:') && event.length > 'onFile:'.length) {
    return 'onFile:*';
  }

  return undefined;
}

export function validateExtensionPoint(
  point: string,
  options: PluginPointValidationOptions = {}
): PluginPointValidationOutcome {
  const mode = options.governanceMode || 'warn';
  const diagnostics: PluginPointDiagnostic[] = [];
  const canonical = extensionPointSet.has(point)
    ? (point as CanonicalExtensionPoint)
    : EXTENSION_POINT_ALIASES[point];

  if (!canonical) {
    diagnostics.push({
      code: 'plugin.point.unknown',
      severity: toSeverity(mode),
      message: `Unknown extension point "${point}".`,
      hint: 'Use a canonical extension point ID from the plugin point registry.',
      pointKind: 'ui-slot',
      pointId: point,
    });
    return {
      allowed: mode !== 'block',
      diagnostics,
    };
  }

  const contract = getExtensionPointContract(canonical);

  if (canonical !== point) {
    diagnostics.push({
      code: 'plugin.point.alias',
      severity: 'warning',
      message: `Extension point alias "${point}" is deprecated. Use "${canonical}".`,
      hint: `Replace "${point}" with "${canonical}".`,
      pointKind: 'ui-slot',
      pointId: point,
      canonicalId: canonical,
    });
  }

  if (contract.status === 'virtual') {
    diagnostics.push({
      code: 'plugin.point.virtual',
      severity: 'warning',
      message: `Extension point "${canonical}" is declared virtual and may not render on current host surfaces.`,
      pointKind: 'ui-slot',
      pointId: point,
      canonicalId: canonical,
    });
  }

  if (contract.permission && options.hasPermission && !options.hasPermission(contract.permission)) {
    const severity = toSeverity(mode);
    diagnostics.push({
      code: 'plugin.point.permission_denied',
      severity,
      message: `Missing required permission "${contract.permission}" for extension point "${canonical}".`,
      hint: `Request permission "${contract.permission}" before registering this extension point.`,
      pointKind: 'ui-slot',
      pointId: point,
      canonicalId: canonical,
    });

    if (severity === 'error') {
      return {
        allowed: false,
        canonicalId: canonical,
        contract,
        diagnostics,
      };
    }
  }

  return {
    allowed: true,
    canonicalId: canonical,
    contract,
    diagnostics,
  };
}

export function validateHookPoint(
  hookName: string,
  options: Pick<PluginPointValidationOptions, 'governanceMode'> = {}
): PluginPointValidationOutcome {
  const mode = options.governanceMode || 'warn';
  const diagnostics: PluginPointDiagnostic[] = [];

  if (!hookPointSet.has(hookName)) {
    diagnostics.push({
      code: 'plugin.point.unknown',
      severity: toSeverity(mode),
      message: `Unknown hook declaration "${hookName}".`,
      hint: 'Use a canonical hook name from the plugin point registry.',
      pointKind: 'hook',
      pointId: hookName,
    });

    return {
      allowed: mode !== 'block',
      diagnostics,
    };
  }

  const canonical = hookName as CanonicalHookPoint;

  return {
    allowed: true,
    canonicalId: canonical,
    contract: getHookPointContract(canonical),
    diagnostics,
  };
}

export function validateActivationEvent(
  event: string,
  options: Pick<PluginPointValidationOptions, 'governanceMode'> = {}
): PluginPointValidationOutcome {
  const mode = options.governanceMode || 'warn';
  const diagnostics: PluginPointDiagnostic[] = [];
  const pattern = resolveActivationPattern(event);

  if (!pattern) {
    diagnostics.push({
      code: 'plugin.point.unknown',
      severity: toSeverity(mode),
      message: `Unknown activation event "${event}".`,
      hint: 'Use a canonical activation event supported by the plugin point registry.',
      pointKind: 'activation',
      pointId: event,
    });

    return {
      allowed: mode !== 'block',
      diagnostics,
    };
  }

  const contract = getActivationPatternContract(pattern);

  if (pattern === 'onStartup' || pattern === 'onAgentTool:*') {
    diagnostics.push({
      code: 'plugin.point.deprecated',
      severity: 'warning',
      message: `Activation event "${event}" is deprecated.`,
      hint: contract.replacementId ? `Use "${contract.replacementId}".` : undefined,
      pointKind: 'activation',
      pointId: event,
      canonicalId: contract.replacementId,
    });
  }

  if (contract.status === 'virtual') {
    const severity = toSeverity(mode);
    diagnostics.push({
      code: 'plugin.point.virtual',
      severity,
      message: `Activation event "${event}" is declared but not implemented by runtime dispatch.`,
      hint: 'Use startup/onCommand/onTool activation events for runtime dispatch support.',
      pointKind: 'activation',
      pointId: event,
      canonicalId: pattern,
    });

    if (severity === 'error') {
      return {
        allowed: false,
        canonicalId: pattern,
        contract,
        diagnostics,
      };
    }
  }

  return {
    allowed: true,
    canonicalId: pattern,
    contract,
    diagnostics,
  };
}

export function getExtensionPointAliases(): Readonly<Record<string, CanonicalExtensionPoint>> {
  return EXTENSION_POINT_ALIASES;
}
