/**
 * Database module - exports schema and repositories
 */

export { db, default } from './schema';
export type { DBSession, DBMessage, DBDocument, DBMCPServer, DBProject, DBKnowledgeFile, DBAgentTrace } from './schema';

export {
  messageRepository,
  sessionRepository,
  documentRepository,
  mcpServerRepository,
  projectRepository,
  agentTraceRepository,
  type CreateDocumentInput,
  type UpdateDocumentInput,
  type StoredMCPServer,
  type CreateMCPServerInput,
  type UpdateMCPServerInput,
  type CreateKnowledgeFileInput,
} from './repositories';
