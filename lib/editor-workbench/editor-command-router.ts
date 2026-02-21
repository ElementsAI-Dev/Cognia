import type { EditorCommandContribution } from '@/types/editor/workbench';
import {
  getActiveEditorCommands,
  getActiveEditorContext,
  runActiveEditorCommand,
} from './editor-context-registry';

export interface ActiveEditorCommandGroup {
  contextLabel: string;
  commands: EditorCommandContribution[];
}

export function getActiveEditorCommandGroup(): ActiveEditorCommandGroup | null {
  const activeContext = getActiveEditorContext();
  if (!activeContext) {
    return null;
  }
  return {
    contextLabel: activeContext.label,
    commands: getActiveEditorCommands(),
  };
}

export async function routeEditorCommand(commandId: string): Promise<boolean> {
  return runActiveEditorCommand(commandId);
}
