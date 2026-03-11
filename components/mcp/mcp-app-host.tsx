'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { useMcpStore } from '@/stores/mcp';
import type { ToolCallResult } from '@/types/mcp';
import { cn } from '@/lib/utils';

type JsonRecord = Record<string, unknown>;

interface McpAppResource {
  uri: string;
  html: string;
  mimeType?: string;
}

interface McpAppPolicy {
  connectDomains: string[];
  resourceDomains: string[];
  frameDomains: string[];
  redirectDomains: string[];
  widgetDomain?: string;
}

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: unknown;
}

interface MCPAppHostProps {
  serverId: string;
  toolName: string;
  result: ToolCallResult;
  toolInput?: JsonRecord;
  className?: string;
}

const MCP_APP_MIME_TYPE = 'text/html;profile=mcp-app';

export function isMcpAppsHostEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_MCP_APPS_HOST === 'true';
}

export function hasMcpAppResource(result: ToolCallResult): boolean {
  return extractMcpAppResource(result) !== null;
}

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as JsonRecord;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === 'string');
}

export function extractMcpAppResource(result: ToolCallResult): McpAppResource | null {
  for (const item of result.content) {
    if (item.type !== 'resource') continue;
    const resource = item.resource;
    if (!resource?.text) continue;

    const mime = resource.mimeType?.toLowerCase();
    const isMcpAppMime = mime === MCP_APP_MIME_TYPE;
    const isUiResourceHtml = mime === 'text/html' && resource.uri.startsWith('ui://');
    if (!isMcpAppMime && !isUiResourceHtml) continue;

    return {
      uri: resource.uri,
      html: resource.text,
      mimeType: resource.mimeType,
    };
  }
  return null;
}

export function normalizeOrigins(entries: string[]): string[] {
  const normalized = new Set<string>();
  for (const entry of entries) {
    if (entry.startsWith('https://*.') || entry.startsWith('http://*.')) {
      normalized.add(entry);
      continue;
    }
    try {
      const origin = new URL(entry).origin;
      normalized.add(origin);
    } catch {
      // Ignore malformed origins
    }
  }
  return Array.from(normalized);
}

export function extractPolicy(result: ToolCallResult): McpAppPolicy {
  const meta = asRecord(result._meta);
  const ui = asRecord(meta?.ui);
  const uiCsp = asRecord(ui?.csp);
  const openAiWidgetCsp = asRecord(meta?.['openai/widgetCSP']);

  const connectDomains = normalizeOrigins([
    ...readStringArray(uiCsp?.connectDomains),
    ...readStringArray(openAiWidgetCsp?.connect_domains),
  ]);
  const resourceDomains = normalizeOrigins([
    ...readStringArray(uiCsp?.resourceDomains),
    ...readStringArray(openAiWidgetCsp?.resource_domains),
  ]);
  const frameDomains = normalizeOrigins([
    ...readStringArray(uiCsp?.frameDomains),
    ...readStringArray(openAiWidgetCsp?.frame_domains),
  ]);
  const redirectDomains = normalizeOrigins(
    readStringArray(openAiWidgetCsp?.redirect_domains)
  );

  const widgetDomain =
    (typeof ui?.domain === 'string' && ui.domain) ||
    (typeof meta?.['openai/widgetDomain'] === 'string' && (meta['openai/widgetDomain'] as string)) ||
    undefined;

  return {
    connectDomains,
    resourceDomains,
    frameDomains,
    redirectDomains,
    widgetDomain,
  };
}

function cspList(origins: string[], fallback: string): string {
  return origins.length > 0 ? origins.join(' ') : fallback;
}

export function buildCsp(policy: McpAppPolicy): string {
  const staticOrigins = policy.resourceDomains;
  const connectOrigins = policy.connectDomains;
  const frameOrigins = policy.frameDomains;

  return [
    "default-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    `script-src 'unsafe-inline' ${cspList(staticOrigins, "'none'")}`,
    `style-src 'unsafe-inline' ${cspList(staticOrigins, "'none'")}`,
    `img-src data: blob: ${cspList(staticOrigins, "'none'")}`,
    `font-src data: ${cspList(staticOrigins, "'none'")}`,
    `media-src data: blob: ${cspList(staticOrigins, "'none'")}`,
    `connect-src ${cspList(connectOrigins, "'none'")}`,
    `frame-src ${cspList(frameOrigins, "'none'")}`,
  ].join('; ');
}

export function injectCsp(html: string, policy: McpAppPolicy): string {
  const csp = buildCsp(policy).replace(/"/g, '&quot;');
  const metaTag = `<meta http-equiv="Content-Security-Policy" content="${csp}">`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (headTag) => `${headTag}\n${metaTag}`);
  }
  return `<!doctype html><html><head>${metaTag}</head><body>${html}</body></html>`;
}

function matchAllowedOrigin(targetOrigin: string, allowlist: string[]): boolean {
  return allowlist.some((allowed) => {
    if (allowed.startsWith('https://*.') || allowed.startsWith('http://*.')) {
      const [scheme, suffix] = allowed.split('*.');
      try {
        const parsed = new URL(targetOrigin);
        return (
          `${parsed.protocol}//` === scheme &&
          parsed.hostname.endsWith(`.${suffix}`) &&
          parsed.hostname.length > suffix.length + 1
        );
      } catch {
        return false;
      }
    }
    return targetOrigin === allowed;
  });
}

export function isMessageOriginAllowed(origin: string, policy: McpAppPolicy): boolean {
  if (origin === 'null') return true; // sandboxed srcdoc iframe
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  const targetOrigin = parsed.origin;
  if (policy.widgetDomain) {
    try {
      if (new URL(policy.widgetDomain).origin === targetOrigin) return true;
    } catch {
      // Ignore malformed widgetDomain
    }
  }
  return matchAllowedOrigin(targetOrigin, [
    ...policy.frameDomains,
    ...policy.resourceDomains,
    ...policy.connectDomains,
  ]);
}

export function isExternalLinkAllowed(href: string, policy: McpAppPolicy): boolean {
  let parsed: URL;
  try {
    parsed = new URL(href);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return false;
  }
  const origin = parsed.origin;
  return matchAllowedOrigin(origin, [
    ...policy.redirectDomains,
    ...policy.resourceDomains,
    ...policy.connectDomains,
  ]);
}

export function MCPAppHost({
  serverId,
  toolName,
  result,
  toolInput = {},
  className,
}: MCPAppHostProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const fallbackSessionId = useId();

  const appResource = useMemo(() => extractMcpAppResource(result), [result]);
  const policy = useMemo(() => extractPolicy(result), [result]);
  const widgetSessionId = useMemo(() => {
    const meta = asRecord(result._meta);
    const hostSession = meta?.['openai/widgetSessionId'];
    if (typeof hostSession === 'string' && hostSession.length > 0) {
      return hostSession;
    }
    return `mcp-widget-${fallbackSessionId}`;
  }, [fallbackSessionId, result]);

  const sandboxedHtml = useMemo(() => {
    if (!appResource) return '';
    return injectCsp(appResource.html, policy);
  }, [appResource, policy]);

  useEffect(() => {
    if (!frameLoaded) return;
    const target = iframeRef.current?.contentWindow;
    if (!target) return;

    target.postMessage(
      {
        jsonrpc: '2.0',
        method: 'ui/initialize',
        params: {
          sessionId: widgetSessionId,
          serverId,
          toolName,
        },
      },
      '*'
    );
    target.postMessage(
      {
        jsonrpc: '2.0',
        method: 'ui/notifications/tool-input',
        params: {
          sessionId: widgetSessionId,
          ...toolInput,
        },
      },
      '*'
    );
    target.postMessage(
      {
        jsonrpc: '2.0',
        method: 'ui/notifications/tool-result',
        params: {
          sessionId: widgetSessionId,
          content: result.content,
          structuredContent: result.structuredContent,
          _meta: result._meta,
        },
      },
      '*'
    );
  }, [frameLoaded, result, serverId, toolInput, toolName, widgetSessionId]);

  useEffect(() => {
    if (!appResource) return;

    const postResponse = (
      id: string | number | null | undefined,
      payload: unknown,
      error?: { code: number; message: string }
    ) => {
      const target = iframeRef.current?.contentWindow;
      if (!target || id === undefined) return;
      target.postMessage(
        {
          jsonrpc: '2.0',
          id,
          ...(error ? { error } : { result: payload }),
        },
        '*'
      );
    };

    const handleMessage = async (event: MessageEvent) => {
      const target = iframeRef.current?.contentWindow;
      if (!target || event.source !== target) return;
      if (!isMessageOriginAllowed(event.origin, policy)) {
        setBridgeError(`Blocked bridge message from disallowed origin: ${event.origin}`);
        return;
      }

      const message = event.data as JsonRpcRequest | undefined;
      if (!message || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
        return;
      }

      const params = asRecord(message.params) || {};
      const sessionFromMessage = params.sessionId;
      if (
        typeof sessionFromMessage === 'string' &&
        sessionFromMessage.length > 0 &&
        sessionFromMessage !== widgetSessionId
      ) {
        setBridgeError('Blocked bridge message with mismatched widget session');
        postResponse(message.id, null, {
          code: -32001,
          message: 'Session mismatch',
        });
        return;
      }

      try {
        switch (message.method) {
          case 'tools/call': {
            const toolNameParam = params.name;
            if (typeof toolNameParam !== 'string' || toolNameParam.length === 0) {
              postResponse(message.id, null, {
                code: -32602,
                message: 'Invalid tools/call payload',
              });
              return;
            }
            const argsRecord = asRecord(params.arguments) || {};
            const originForBackend =
              policy.widgetDomain ||
              (typeof window !== 'undefined' ? window.location.origin : 'http://localhost');

            const toolResult = await useMcpStore
              .getState()
              .callToolFromUi(
                serverId,
                widgetSessionId,
                originForBackend,
                toolNameParam,
                argsRecord,
                message.id === null || message.id === undefined ? undefined : String(message.id)
              );
            postResponse(message.id, toolResult);
            return;
          }
          case 'ui/message': {
            window.dispatchEvent(
              new CustomEvent('mcp-app-ui-message', {
                detail: {
                  serverId,
                  toolName,
                  sessionId: widgetSessionId,
                  requestId:
                    message.id === null || message.id === undefined
                      ? undefined
                      : String(message.id),
                  payload: params,
                },
              })
            );
            postResponse(message.id, { ok: true });
            return;
          }
          case 'ui/update-model-context': {
            window.dispatchEvent(
              new CustomEvent('mcp-app-model-context-update', {
                detail: {
                  serverId,
                  toolName,
                  sessionId: widgetSessionId,
                  requestId:
                    message.id === null || message.id === undefined
                      ? undefined
                      : String(message.id),
                  payload: params,
                },
              })
            );
            postResponse(message.id, { ok: true });
            return;
          }
          case 'ui/open-external': {
            const href = params.href;
            if (typeof href !== 'string' || !isExternalLinkAllowed(href, policy)) {
              setBridgeError('Blocked external navigation request from MCP App widget');
              postResponse(message.id, null, {
                code: -32002,
                message: 'External link is not allowed by widget policy',
              });
              return;
            }
            window.open(href, '_blank', 'noopener,noreferrer');
            postResponse(message.id, { ok: true });
            return;
          }
          default: {
            postResponse(message.id, null, {
              code: -32601,
              message: `Method not found: ${message.method}`,
            });
            return;
          }
        }
      } catch (error) {
        const rawErrorMessage =
          error instanceof Error ? error.message : 'MCP App bridge request failed';
        const normalizedErrorMessage = rawErrorMessage.toLowerCase();
        const errorMessage = normalizedErrorMessage.includes('timeout')
          ? 'Widget tool call timed out. Falling back to standard tool output.'
          : normalizedErrorMessage.includes('limit')
            ? 'Widget tool call was rate limited. Falling back to standard tool output.'
            : normalizedErrorMessage.includes('not allowed') ||
                normalizedErrorMessage.includes('denied')
              ? 'Widget tool call denied by policy. Falling back to standard tool output.'
              : rawErrorMessage;
        setBridgeError(errorMessage);
        postResponse(message.id, null, {
          code: -32000,
          message: errorMessage,
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [appResource, policy, serverId, toolName, widgetSessionId]);

  if (!isMcpAppsHostEnabled() || !appResource) {
    return null;
  }

  return (
    <div className={cn('rounded-md border bg-background/70 overflow-hidden', className)}>
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40">
        <div className="text-xs font-medium">
          MCP App: @{serverId}:{toolName}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <ExternalLink className="h-3 w-3" />
          <span>{appResource.uri}</span>
        </div>
      </div>
      <iframe
        ref={iframeRef}
        title={`mcp-app-${serverId}-${toolName}`}
        srcDoc={sandboxedHtml}
        sandbox="allow-scripts allow-forms allow-popups allow-modals allow-downloads"
        referrerPolicy="no-referrer"
        className="w-full h-[420px] bg-background"
        onLoad={() => setFrameLoaded(true)}
      />
      {bridgeError && (
        <div className="flex items-start gap-2 p-3 border-t text-xs text-destructive bg-destructive/5">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{bridgeError}</span>
        </div>
      )}
    </div>
  );
}

export default MCPAppHost;
