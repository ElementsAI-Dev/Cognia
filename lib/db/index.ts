/**
 * Database module - exports schema and repositories
 */

export { db, default } from './schema';
export type {
  DBSession,
  DBMessage,
  DBDocument,
  DBMCPServer,
  DBProject,
  DBKnowledgeFile,
  DBWorkflow,
  DBWorkflowExecution,
  DBSummary,
  DBAgentTrace,
  DBAsset,
  DBFolder,
  DBVideoProject,
} from './schema';

export {
  messageRepository,
  sessionRepository,
  documentRepository,
  mcpServerRepository,
  projectRepository,
  agentTraceRepository,
  videoProjectRepository,
  type CreateDocumentInput,
  type UpdateDocumentInput,
  type StoredMCPServer,
  type CreateMCPServerInput,
  type UpdateMCPServerInput,
  type CreateKnowledgeFileInput,
  type VideoProjectData,
} from './repositories';
