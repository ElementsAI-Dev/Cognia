import type { FrameworkType } from '@/lib/designer/config/templates';

export type DesignerSandpackTemplate = 'react-ts' | 'vue' | 'vanilla' | 'static';

export interface DesignerSandboxFile {
  code: string;
  active?: boolean;
  hidden?: boolean;
  readOnly?: boolean;
}

export interface DesignerSandboxCustomSetup {
  dependencies?: Record<string, string>;
  entry?: string;
}

export interface DesignerSandboxConfig {
  template: DesignerSandpackTemplate;
  mainFile: string;
  files: Record<string, DesignerSandboxFile>;
  customSetup?: DesignerSandboxCustomSetup;
  externalResources?: string[];
}

export type SandboxRuntimeStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unsupported';

export type SandboxConsoleLevel = 'log' | 'info' | 'warn' | 'error';

export interface SandboxRuntimeStatusEvent {
  type: 'status';
  status: SandboxRuntimeStatus;
  detail?: string;
}

export interface SandboxRuntimeReadyEvent {
  type: 'ready';
}

export interface SandboxRuntimeCompileErrorEvent {
  type: 'compile-error';
  message: string;
}

export interface SandboxRuntimeErrorEvent {
  type: 'runtime-error';
  message: string;
  stack?: string;
}

export interface SandboxRuntimeConsoleEvent {
  type: 'console';
  level: SandboxConsoleLevel;
  message: string;
  timestamp: number;
}

export interface SandboxRuntimeElementSelectEvent {
  type: 'element-select';
  elementId: string | null;
}

export interface SandboxRuntimeElementHoverEvent {
  type: 'element-hover';
  elementId: string | null;
}

export interface SandboxRuntimeComponentDropEvent {
  type: 'component-dropped';
  code: string;
  targetElementId: string | null;
  position?: 'before' | 'after' | 'inside' | 'first-child' | 'last-child';
}

export interface SandboxRuntimeScrollPositionEvent {
  type: 'scroll-position';
  scrollX: number;
  scrollY: number;
}

export type SandboxRuntimeEvent =
  | SandboxRuntimeStatusEvent
  | SandboxRuntimeReadyEvent
  | SandboxRuntimeCompileErrorEvent
  | SandboxRuntimeErrorEvent
  | SandboxRuntimeConsoleEvent
  | SandboxRuntimeElementSelectEvent
  | SandboxRuntimeElementHoverEvent
  | SandboxRuntimeComponentDropEvent
  | SandboxRuntimeScrollPositionEvent;

export interface SandboxAdapterBuildContext {
  code?: string;
  isDarkMode?: boolean;
  enableBridge?: boolean;
}

export interface DesignerSandboxAdapter {
  framework: FrameworkType;
  template: DesignerSandpackTemplate;
  mainFile: string;
  defaultCode: string;
  buildConfig: (context: SandboxAdapterBuildContext) => DesignerSandboxConfig;
}
