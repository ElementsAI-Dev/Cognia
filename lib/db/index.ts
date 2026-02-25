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
  DBCheckpoint,
  DBAsset,
  DBFolder,
  DBVideoProject,
  DBContextFile,
} from './schema';

export {
  messageRepository,
  toUIMessage,
  toDBMessage,
  sessionRepository,
  documentRepository,
  mcpServerRepository,
  projectRepository,
  toDbProject,
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
