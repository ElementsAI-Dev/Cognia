import type { DBSummary } from '@/lib/db/schema';
import type { DiagramType, StoredSummary, SummaryFormat, SummaryStyle, SummaryTemplate } from './types';

export function dbToStoredSummary(dbSummary: DBSummary): StoredSummary {
  return {
    id: dbSummary.id,
    sessionId: dbSummary.sessionId,
    type: dbSummary.type as StoredSummary['type'],
    summary: dbSummary.summary,
    keyPoints: dbSummary.keyPoints ? JSON.parse(dbSummary.keyPoints) : [],
    topics: dbSummary.topics ? JSON.parse(dbSummary.topics) : [],
    diagram: dbSummary.diagram,
    diagramType: dbSummary.diagramType as DiagramType | undefined,
    messageRange: dbSummary.messageRange
      ? JSON.parse(dbSummary.messageRange)
      : { startIndex: 0, endIndex: 0 },
    messageCount: dbSummary.messageCount,
    sourceTokens: dbSummary.sourceTokens,
    summaryTokens: dbSummary.summaryTokens,
    compressionRatio: dbSummary.compressionRatio,
    language: dbSummary.language,
    format: dbSummary.format as SummaryFormat,
    style: dbSummary.style as SummaryStyle | undefined,
    template: dbSummary.template as SummaryTemplate | undefined,
    usedAI: dbSummary.usedAI,
    createdAt: dbSummary.createdAt,
    updatedAt: dbSummary.updatedAt,
  };
}

export function storedToDbSummary(summary: StoredSummary): DBSummary {
  return {
    id: summary.id,
    sessionId: summary.sessionId,
    type: summary.type,
    summary: summary.summary,
    keyPoints: JSON.stringify(summary.keyPoints),
    topics: JSON.stringify(summary.topics),
    diagram: summary.diagram,
    diagramType: summary.diagramType,
    messageRange: JSON.stringify(summary.messageRange),
    messageCount: summary.messageCount,
    sourceTokens: summary.sourceTokens,
    summaryTokens: summary.summaryTokens,
    compressionRatio: summary.compressionRatio,
    language: summary.language,
    format: summary.format,
    style: summary.style,
    template: summary.template,
    usedAI: summary.usedAI,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  };
}
