export type WebSandboxLanguage = 'javascript' | 'typescript';

export interface WebSandboxExecutionOutput {
  success: boolean;
  stdout: string;
  stderr: string;
  durationMs: number;
  language: WebSandboxLanguage;
}
