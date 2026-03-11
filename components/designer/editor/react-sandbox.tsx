'use client';

/**
 * ReactSandbox - Sandpack-based sandbox runtime for designer preview surfaces.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  SandpackCodeEditor,
  SandpackConsole,
  useSandpack,
} from '@codesandbox/sandpack-react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDesignerStore } from '@/stores/designer';
import { useSettingsStore } from '@/stores';
import {
  buildFrameworkSandboxConfig,
  normalizeBridgeMessage,
  normalizeSandpackStatus,
  type FrameworkType,
  type SandboxRuntimeEvent,
} from '@/lib/designer';
import {
  SandboxErrorBoundary,
  useErrorBoundaryReset,
  useConsoleErrorInterceptor,
} from './sandbox-error-boundary';
import { SandboxFileExplorer } from './sandbox-file-explorer';

export type { FrameworkType };

export interface ReactSandboxProps {
  className?: string;
  showEditor?: boolean;
  showPreview?: boolean;
  code?: string;
  onCodeChange?: (code: string) => void;
  showFileExplorer?: boolean;
  showConsole?: boolean;
  framework?: FrameworkType;
  onAIEdit?: () => void;
  enableRuntimeBridge?: boolean;
  forceRemountKey?: string | number;
  onRuntimeEvent?: (event: SandboxRuntimeEvent) => void;
  onPreviewIframeReady?: (iframe: HTMLIFrameElement | null) => void;
}

interface SandpackStateLike {
  status?: string;
  error?: string;
  files: Record<string, { code: string }>;
  activeFile?: string;
  listen?: (listener: (message: unknown) => void) => (() => void) | void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeSandpackMessage(message: unknown): SandboxRuntimeEvent | null {
  if (!isRecord(message)) {
    return null;
  }

  if (typeof message.type === 'string' && message.type.startsWith('preview-')) {
    return normalizeBridgeMessage(message);
  }

  if (
    message.type === 'console' &&
    typeof message.level === 'string' &&
    typeof message.data === 'string'
  ) {
    return {
      type: 'console',
      level:
        message.level === 'error' ||
        message.level === 'warn' ||
        message.level === 'info'
          ? message.level
          : 'log',
      message: message.data,
      timestamp: Date.now(),
    };
  }

  return null;
}

// Internal component to sync code with store
function SandboxSync({
  onCodeChange,
  mainFile,
}: {
  onCodeChange?: (code: string) => void;
  mainFile: string;
}) {
  const { sandpack } = useSandpack();
  const setCode = useDesignerStore((state) => state.setCode);
  const lastCodeRef = useRef<string | null>(null);

  const sandpackState = sandpack as unknown as SandpackStateLike;

  // Sync changes to store
  const handleChange = useCallback(() => {
    const files = sandpackState.files;
    const appFile = files[mainFile] || files['/App.tsx'] || files['/App.jsx'];
    if (appFile && appFile.code !== lastCodeRef.current) {
      lastCodeRef.current = appFile.code;
      setCode(appFile.code, false);
      onCodeChange?.(appFile.code);
    }
  }, [sandpackState.files, setCode, onCodeChange, mainFile]);

  useEffect(() => {
    handleChange();
  }, [handleChange]);

  return null;
}

function SandboxRuntimeEmitter({
  framework,
  onRuntimeEvent,
}: {
  framework: FrameworkType;
  onRuntimeEvent?: (event: SandboxRuntimeEvent) => void;
}) {
  const { sandpack } = useSandpack();
  const sandpackState = sandpack as unknown as SandpackStateLike;
  const lastStatusRef = useRef<string | null>(null);
  const lastErrorRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!onRuntimeEvent) return;

    const currentStatus = sandpackState.status;
    const statusToken = currentStatus ?? '__unknown__';
    if (statusToken !== lastStatusRef.current) {
      lastStatusRef.current = statusToken;
      onRuntimeEvent({
        type: 'status',
        status: normalizeSandpackStatus(currentStatus),
        detail: currentStatus,
      });
    }
  }, [sandpackState.status, onRuntimeEvent, framework]);

  useEffect(() => {
    if (!onRuntimeEvent) return;

    const currentError = sandpackState.error;
    if (currentError && currentError !== lastErrorRef.current) {
      lastErrorRef.current = currentError;
      onRuntimeEvent({ type: 'compile-error', message: currentError });
      onRuntimeEvent({ type: 'status', status: 'error', detail: 'compile-error' });
    }
  }, [sandpackState.error, onRuntimeEvent]);

  useEffect(() => {
    if (!onRuntimeEvent || typeof sandpackState.listen !== 'function') {
      return;
    }

    const unsubscribe = sandpackState.listen((message) => {
      const normalizedEvent = normalizeSandpackMessage(message);
      if (normalizedEvent) {
        onRuntimeEvent(normalizedEvent);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [sandpackState, onRuntimeEvent]);

  return null;
}

export function ReactSandbox({
  className,
  showEditor = true,
  showPreview = true,
  code: propCode,
  onCodeChange,
  showFileExplorer = false,
  showConsole = false,
  framework = 'react',
  onAIEdit,
  enableRuntimeBridge = false,
  forceRemountKey,
  onRuntimeEvent,
  onPreviewIframeReady,
}: ReactSandboxProps) {
  const storeCode = useDesignerStore((state) => state.code);
  const addPreviewError = useDesignerStore((state) => state.addPreviewError);
  const code = propCode ?? storeCode;
  const theme = useSettingsStore((state) => state.theme);
  const { resetKey, reset } = useErrorBoundaryReset();
  const { errors: interceptedErrors } = useConsoleErrorInterceptor();

  const runtimeConfig = useMemo(
    () =>
      buildFrameworkSandboxConfig({
        framework,
        code,
        isDarkMode: theme === 'dark',
        enableBridge: enableRuntimeBridge,
      }),
    [framework, code, theme, enableRuntimeBridge]
  );

  const handleRuntimeEvent = useCallback(
    (event: SandboxRuntimeEvent) => {
      if (event.type === 'compile-error' || event.type === 'runtime-error') {
        addPreviewError(event.message);
      }
      if (event.type === 'console' && event.level === 'error') {
        addPreviewError(event.message);
      }
      onRuntimeEvent?.(event);
    },
    [addPreviewError, onRuntimeEvent]
  );

  // Forward intercepted console errors to designer store
  const lastErrorCountRef = useRef(0);
  useEffect(() => {
    if (interceptedErrors.length > lastErrorCountRef.current) {
      const newErrors = interceptedErrors.slice(lastErrorCountRef.current);
      for (const err of newErrors) {
        addPreviewError(err);
        onRuntimeEvent?.({ type: 'runtime-error', message: err });
      }
    }
    lastErrorCountRef.current = interceptedErrors.length;
  }, [interceptedErrors, addPreviewError, onRuntimeEvent]);

  useEffect(() => {
    if (!runtimeConfig) {
      onRuntimeEvent?.({
        type: 'status',
        status: 'unsupported',
        detail: `Unsupported framework: ${framework}`,
      });
    }
  }, [runtimeConfig, framework, onRuntimeEvent]);

  if (!runtimeConfig) {
    return (
      <div className={cn('h-full min-h-0 flex items-center justify-center text-sm text-muted-foreground', className)}>
        Unsupported framework runtime: {framework}
      </div>
    );
  }

  const providerKey = `${resetKey}-${forceRemountKey ?? 'stable'}`;

  return (
    <div className={cn('h-full flex flex-col min-h-0 relative', className)}>
      <SandboxErrorBoundary key={providerKey} onReset={reset} className="h-full flex-1 min-h-0">
        <SandpackProvider
          template={runtimeConfig.template}
          theme={theme === 'dark' ? 'dark' : 'light'}
          files={runtimeConfig.files}
          customSetup={runtimeConfig.customSetup}
          options={{
            externalResources: runtimeConfig.externalResources,
            recompileMode: 'delayed',
            recompileDelay: 300,
          }}
        >
          <SandboxSync onCodeChange={onCodeChange} mainFile={runtimeConfig.mainFile} />
          <SandboxRuntimeEmitter framework={framework} onRuntimeEvent={handleRuntimeEvent} />
          <SandpackLayout className="h-full flex-1 min-h-0">
            <SandboxContent
              showEditor={showEditor}
              showPreview={showPreview}
              showFileExplorer={showFileExplorer}
              showConsole={showConsole}
              onPreviewIframeReady={onPreviewIframeReady}
            />
          </SandpackLayout>
        </SandpackProvider>
      </SandboxErrorBoundary>

      {/* Floating AI edit button */}
      {onAIEdit && (
        <Button
          variant="secondary"
          size="sm"
          className="absolute bottom-3 right-3 z-10 gap-1.5 shadow-md"
          onClick={onAIEdit}
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI Edit
        </Button>
      )}
    </div>
  );
}

interface SandboxContentProps {
  showEditor: boolean;
  showPreview: boolean;
  showFileExplorer: boolean;
  showConsole: boolean;
  onPreviewIframeReady?: (iframe: HTMLIFrameElement | null) => void;
}

function SandboxContent({
  showEditor,
  showPreview,
  showFileExplorer,
  showConsole,
  onPreviewIframeReady,
}: SandboxContentProps) {
  const { sandpack } = useSandpack();
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = useCallback(
    (path: string) => {
      sandpack.openFile(path);
    },
    [sandpack]
  );

  const handleFileCreate = useCallback(
    (path: string) => {
      sandpack.addFile(path, '', true);
      sandpack.openFile(path);
    },
    [sandpack]
  );

  const handleFileDelete = useCallback(
    (path: string) => {
      sandpack.deleteFile(path, true);
    },
    [sandpack]
  );

  useEffect(() => {
    if (!showPreview || !onPreviewIframeReady) {
      return;
    }

    const container = previewContainerRef.current;
    if (!container) {
      return;
    }

    const emitCurrentIframe = () => {
      const iframe = container.querySelector('iframe');
      onPreviewIframeReady(iframe instanceof HTMLIFrameElement ? iframe : null);
    };

    emitCurrentIframe();

    const observer = new MutationObserver(() => {
      emitCurrentIframe();
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      onPreviewIframeReady(null);
    };
  }, [showPreview, onPreviewIframeReady]);

  return (
    <div className="flex h-full w-full min-h-0">
      {showFileExplorer && (
        <div className="w-56 border-r bg-muted/10">
          <SandboxFileExplorer
            files={sandpack.files}
            activeFile={sandpack.activeFile}
            onFileSelect={handleFileSelect}
            onFileCreate={handleFileCreate}
            onFileDelete={handleFileDelete}
          />
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        {showEditor && (
          <div className="flex min-h-0 flex-1 flex-col">
            <SandpackCodeEditor
              showTabs={false}
              showLineNumbers
              showInlineErrors
              wrapContent
              style={{ height: '100%' }}
            />
          </div>
        )}
        {showPreview && (
          <div ref={previewContainerRef} className={cn('min-h-0 flex-1', showEditor ? 'border-l' : '')}>
            <SandpackPreview
              showNavigator={false}
              showRefreshButton
              className="h-full"
              style={{ height: '100%' }}
            />
          </div>
        )}
        {showConsole && (
          <SandpackConsole className={cn('border-l', showEditor || showPreview ? 'w-64' : 'flex-1')} />
        )}
      </div>
    </div>
  );
}

export default ReactSandbox;
