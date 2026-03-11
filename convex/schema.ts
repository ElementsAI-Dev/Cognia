import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ── 1. Sessions ──
  sessions: defineTable({
    localId: v.string(),
    title: v.string(),
    provider: v.string(),
    model: v.string(),
    mode: v.string(),
    customIcon: v.optional(v.string()),
    folderId: v.optional(v.string()),
    projectId: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    temperature: v.optional(v.number()),
    maxTokens: v.optional(v.number()),
    enableTools: v.optional(v.boolean()),
    enableResearch: v.optional(v.boolean()),
    metadata: v.optional(v.string()),
    messageCount: v.number(),
    lastMessagePreview: v.optional(v.string()),
    localCreatedAt: v.string(),
    localUpdatedAt: v.string(),
  })
    .index("by_local_id", ["localId"])
    .index("by_project", ["projectId"])
    .index("by_folder", ["folderId"])
    .index("by_updated", ["localUpdatedAt"]),

  // ── 1.5 Settings ──
  settings: defineTable({
    localId: v.string(),
    payload: v.string(),
    localUpdatedAt: v.string(),
  })
    .index("by_local_id", ["localId"])
    .index("by_updated", ["localUpdatedAt"]),

  // ── 2. Messages ──
  messages: defineTable({
    localId: v.string(),
    sessionId: v.string(),
    branchId: v.optional(v.string()),
    role: v.string(),
    content: v.string(),
    parts: v.optional(v.string()),
    model: v.optional(v.string()),
    provider: v.optional(v.string()),
    tokens: v.optional(v.string()),
    attachments: v.optional(v.string()),
    sources: v.optional(v.string()),
    error: v.optional(v.string()),
    isEdited: v.optional(v.boolean()),
    editHistory: v.optional(v.string()),
    originalContent: v.optional(v.string()),
    isBookmarked: v.optional(v.boolean()),
    bookmarkedAt: v.optional(v.string()),
    reaction: v.optional(v.string()),
    reactions: v.optional(v.string()),
    localCreatedAt: v.string(),
  })
    .index("by_local_id", ["localId"])
    .index("by_session", ["sessionId"])
    .index("by_session_and_branch", ["sessionId", "branchId"]),

  // ── 3. Documents ──
  documents: defineTable({
    localId: v.string(),
    name: v.string(),
    type: v.string(),
    content: v.string(),
    embeddableContent: v.optional(v.string()),
    metadata: v.optional(v.string()),
    projectId: v.optional(v.string()),
    collectionId: v.optional(v.string()),
    isIndexed: v.optional(v.boolean()),
    version: v.optional(v.number()),
    localCreatedAt: v.string(),
    localUpdatedAt: v.optional(v.string()),
  })
    .index("by_local_id", ["localId"])
    .index("by_project", ["projectId"])
    .index("by_type", ["type"]),

  // ── 4. MCP Servers ──
  mcpServers: defineTable({
    localId: v.string(),
    name: v.string(),
    url: v.string(),
    connected: v.boolean(),
    tools: v.optional(v.string()),
    localCreatedAt: v.string(),
    localUpdatedAt: v.string(),
  })
    .index("by_local_id", ["localId"])
    .index("by_name", ["name"]),

  // ── 5. Projects ──
  projects: defineTable({
    localId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    customInstructions: v.optional(v.string()),
    defaultProvider: v.optional(v.string()),
    defaultModel: v.optional(v.string()),
    defaultMode: v.optional(v.string()),
    tags: v.optional(v.string()),
    isArchived: v.optional(v.boolean()),
    archivedAt: v.optional(v.string()),
    sessionIds: v.optional(v.string()),
    metadata: v.optional(v.string()),
    sessionCount: v.number(),
    messageCount: v.number(),
    localCreatedAt: v.string(),
    localUpdatedAt: v.string(),
    lastAccessedAt: v.string(),
  })
    .index("by_local_id", ["localId"])
    .index("by_name", ["name"])
    .index("by_archived", ["isArchived"]),

  // ── 6. Knowledge Files ──
  knowledgeFiles: defineTable({
    localId: v.string(),
    projectId: v.string(),
    name: v.string(),
    type: v.string(),
    content: v.string(),
    size: v.number(),
    mimeType: v.optional(v.string()),
    originalSize: v.optional(v.number()),
    pageCount: v.optional(v.number()),
    localCreatedAt: v.string(),
    localUpdatedAt: v.string(),
  })
    .index("by_local_id", ["localId"])
    .index("by_project", ["projectId"]),

  // ── 7. Workflows ──
  workflows: defineTable({
    localId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    icon: v.optional(v.string()),
    tags: v.optional(v.string()),
    nodes: v.string(),
    edges: v.string(),
    settings: v.optional(v.string()),
    viewport: v.optional(v.string()),
    version: v.number(),
    isTemplate: v.optional(v.boolean()),
    localCreatedAt: v.string(),
    localUpdatedAt: v.string(),
  })
    .index("by_local_id", ["localId"])
    .index("by_category", ["category"]),

  // ── 8. Workflow Executions ──
  workflowExecutions: defineTable({
    localId: v.string(),
    workflowId: v.string(),
    status: v.string(),
    input: v.optional(v.string()),
    output: v.optional(v.string()),
    nodeStates: v.optional(v.string()),
    logs: v.optional(v.string()),
    error: v.optional(v.string()),
    startedAt: v.string(),
    completedAt: v.optional(v.string()),
  })
    .index("by_local_id", ["localId"])
    .index("by_workflow", ["workflowId"]),

  // ── 9. Summaries ──
  summaries: defineTable({
    localId: v.string(),
    sessionId: v.string(),
    type: v.string(),
    summary: v.string(),
    keyPoints: v.optional(v.string()),
    topics: v.optional(v.string()),
    diagram: v.optional(v.string()),
    diagramType: v.optional(v.string()),
    messageRange: v.optional(v.string()),
    messageCount: v.number(),
    sourceTokens: v.number(),
    summaryTokens: v.number(),
    compressionRatio: v.number(),
    language: v.optional(v.string()),
    format: v.string(),
    style: v.optional(v.string()),
    template: v.optional(v.string()),
    usedAI: v.boolean(),
    localCreatedAt: v.string(),
    localUpdatedAt: v.string(),
  })
    .index("by_local_id", ["localId"])
    .index("by_session", ["sessionId"]),

  // ── 10. Assets ──
  assets: defineTable({
    localId: v.string(),
    kind: v.string(),
    mimeType: v.string(),
    filename: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    localCreatedAt: v.string(),
    localUpdatedAt: v.optional(v.string()),
  })
    .index("by_local_id", ["localId"])
    .index("by_kind", ["kind"]),

  // ── 10.5 Artifacts ──
  artifacts: defineTable({
    localId: v.string(),
    payload: v.string(),
    localUpdatedAt: v.string(),
  })
    .index("by_local_id", ["localId"])
    .index("by_updated", ["localUpdatedAt"]),

  // ── 11. Folders ──
  folders: defineTable({
    localId: v.string(),
    name: v.string(),
    order: v.number(),
    isExpanded: v.optional(v.boolean()),
    localCreatedAt: v.string(),
    localUpdatedAt: v.string(),
  })
    .index("by_local_id", ["localId"])
    .index("by_order", ["order"]),

  // ── 12. Agent Traces ──
  agentTraces: defineTable({
    localId: v.string(),
    sessionId: v.optional(v.string()),
    timestamp: v.string(),
    vcsType: v.optional(v.string()),
    vcsRevision: v.optional(v.string()),
    record: v.string(),
    filePaths: v.optional(v.array(v.string())),
    localCreatedAt: v.string(),
  })
    .index("by_local_id", ["localId"])
    .index("by_session", ["sessionId"])
    .index("by_timestamp", ["timestamp"]),

  // ── 13. Checkpoints ──
  checkpoints: defineTable({
    localId: v.string(),
    sessionId: v.string(),
    traceId: v.string(),
    filePath: v.string(),
    originalContent: v.string(),
    modifiedContent: v.optional(v.string()),
    modelId: v.optional(v.string()),
    timestamp: v.string(),
    localCreatedAt: v.string(),
  })
    .index("by_local_id", ["localId"])
    .index("by_session", ["sessionId"])
    .index("by_trace", ["traceId"]),

  // ── 14. Video Projects ──
  videoProjects: defineTable({
    localId: v.string(),
    name: v.string(),
    resolution: v.string(),
    frameRate: v.number(),
    aspectRatio: v.string(),
    tracks: v.string(),
    duration: v.number(),
    thumbnailUrl: v.optional(v.string()),
    localCreatedAt: v.string(),
    localUpdatedAt: v.string(),
  })
    .index("by_local_id", ["localId"])
    .index("by_name", ["name"]),

  // ── 15. Context Files ──
  contextFiles: defineTable({
    localId: v.string(),
    path: v.string(),
    category: v.string(),
    source: v.string(),
    filename: v.optional(v.string()),
    content: v.string(),
    sizeBytes: v.number(),
    estimatedTokens: v.number(),
    tags: v.array(v.string()),
    ttlMs: v.optional(v.number()),
    localCreatedAt: v.string(),
    lastAccessedAt: v.string(),
  })
    .index("by_local_id", ["localId"])
    .index("by_category", ["category"])
    .index("by_source", ["source"]),

  // ── Sync Metadata ──
  syncMetadata: defineTable({
    deviceId: v.string(),
    deviceName: v.string(),
    syncedAt: v.string(),
    version: v.string(),
    checksum: v.string(),
    tableCounts: v.optional(v.string()),
  })
    .index("by_device", ["deviceId"]),
});
