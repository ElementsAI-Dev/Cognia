import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const SYNC_TABLES = [
  "settings",
  "sessions",
  "messages",
  "artifacts",
  "projects",
  "documents",
  "knowledgeFiles",
  "workflows",
  "workflowExecutions",
  "summaries",
  "folders",
  "agentTraces",
  "checkpoints",
  "mcpServers",
  "videoProjects",
  "contextFiles",
  "assets",
] as const;

type SyncTable = (typeof SYNC_TABLES)[number];

export const DEFAULT_EXPORT_LIMIT = 250;
export const MAX_EXPORT_LIMIT = 1000;
export const MAX_IMPORT_RECORDS_PER_REQUEST = 500;

const syncTableLiterals = SYNC_TABLES.map((name) => v.literal(name)) as [
  ReturnType<typeof v.literal>,
  ...ReturnType<typeof v.literal>[],
];
const syncTableValidator = v.union(...syncTableLiterals);

const reconciliationValidator = v.object({
  mode: v.optional(v.union(v.literal("merge"), v.literal("authoritative"))),
  replaceTables: v.optional(v.array(syncTableValidator)),
  syncRunId: v.optional(v.string()),
  chunkIndex: v.optional(v.number()),
  chunkCount: v.optional(v.number()),
});

function clampLimit(limit: number | undefined): number {
  const value = Number.isFinite(limit) ? Number(limit) : DEFAULT_EXPORT_LIMIT;
  return Math.max(1, Math.min(MAX_EXPORT_LIMIT, value));
}

async function collectTableRowsPaginated(
  ctx: { db: { query: (table: SyncTable) => { paginate: (opts: { numItems: number; cursor: string | null }) => Promise<{ page: unknown[]; isDone: boolean; continueCursor: string }> } } },
  table: SyncTable,
  limit = DEFAULT_EXPORT_LIMIT
): Promise<unknown[]> {
  const rows: unknown[] = [];
  let cursor: string | null = null;
  const pageSize = clampLimit(limit);

  // Paginate to avoid one-shot unbounded collect() calls.
  while (true) {
    const page = await ctx.db.query(table).paginate({
      numItems: pageSize,
      cursor,
    });

    rows.push(...page.page);
    if (page.isDone) break;
    cursor = page.continueCursor;
  }

  return rows;
}

async function deleteTableRowsPaginated(
  ctx: { db: { query: (table: SyncTable) => { paginate: (opts: { numItems: number; cursor: string | null }) => Promise<{ page: Array<{ _id: string }>; isDone: boolean; continueCursor: string }> }; delete: (id: string) => Promise<void> } },
  table: SyncTable
): Promise<number> {
  let deleted = 0;
  let cursor: string | null = null;

  while (true) {
    const page = await ctx.db.query(table).paginate({
      numItems: 250,
      cursor,
    });

    for (const record of page.page) {
      await ctx.db.delete(record._id);
      deleted++;
    }

    if (page.isDone) break;
    cursor = page.continueCursor;
  }

  return deleted;
}

/**
 * Bulk import sync data from a local device.
 * Supports bounded chunks and optional authoritative reconciliation.
 */
export const bulkImport = mutation({
  args: {
    deviceId: v.string(),
    deviceName: v.string(),
    version: v.string(),
    checksum: v.string(),
    tables: v.object({
      settings: v.optional(v.array(v.object({ localId: v.string() }))),
      sessions: v.optional(v.array(v.object({ localId: v.string() }))),
      messages: v.optional(v.array(v.object({ localId: v.string() }))),
      artifacts: v.optional(v.array(v.object({ localId: v.string() }))),
      projects: v.optional(v.array(v.object({ localId: v.string() }))),
      documents: v.optional(v.array(v.object({ localId: v.string() }))),
      knowledgeFiles: v.optional(v.array(v.object({ localId: v.string() }))),
      workflows: v.optional(v.array(v.object({ localId: v.string() }))),
      workflowExecutions: v.optional(v.array(v.object({ localId: v.string() }))),
      summaries: v.optional(v.array(v.object({ localId: v.string() }))),
      folders: v.optional(v.array(v.object({ localId: v.string() }))),
      agentTraces: v.optional(v.array(v.object({ localId: v.string() }))),
      checkpoints: v.optional(v.array(v.object({ localId: v.string() }))),
      mcpServers: v.optional(v.array(v.object({ localId: v.string() }))),
      videoProjects: v.optional(v.array(v.object({ localId: v.string() }))),
      contextFiles: v.optional(v.array(v.object({ localId: v.string() }))),
      assets: v.optional(v.array(v.object({ localId: v.string() }))),
    }),
    reconciliation: v.optional(reconciliationValidator),
  },
  returns: v.object({
    imported: v.number(),
    errors: v.number(),
    deleted: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const tableNames = SYNC_TABLES.filter(
      (tableName) => (args.tables[tableName] ?? []).length > 0
    );

    const totalIncomingRecords = tableNames.reduce(
      (sum, tableName) => sum + (args.tables[tableName]?.length ?? 0),
      0
    );

    if (totalIncomingRecords > MAX_IMPORT_RECORDS_PER_REQUEST) {
      throw new Error(
        `Import request too large (${totalIncomingRecords}). Max per request is ${MAX_IMPORT_RECORDS_PER_REQUEST}.`
      );
    }

    let imported = 0;
    let errors = 0;
    let deleted = 0;

    const mode = args.reconciliation?.mode ?? "merge";
    const replaceSet = new Set(args.reconciliation?.replaceTables ?? []);

    if (mode === "authoritative" && replaceSet.size > 0) {
      for (const tableName of tableNames) {
        if (replaceSet.has(tableName)) {
          deleted += await deleteTableRowsPaginated(ctx as never, tableName);
        }
      }
    }

    for (const tableName of tableNames) {
      const records = args.tables[tableName] ?? [];

      for (const record of records) {
        try {
          if (!record.localId) continue;

          // Strip Convex system fields that cannot be written.
          const { _id, _creationTime, ...cleanRecord } = record;

          // Idempotent upsert by localId to make retries safe.
          const existing = await ctx.db
            .query(tableName)
            .withIndex("by_local_id", (q) => q.eq("localId", cleanRecord.localId))
            .first();

          if (existing) {
            await ctx.db.patch(existing._id, cleanRecord);
          } else {
            await ctx.db.insert(tableName, cleanRecord);
          }
          imported++;
        } catch {
          errors++;
        }
      }
    }

    const existingMeta = await ctx.db
      .query("syncMetadata")
      .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
      .first();

    const metaRecord = {
      deviceId: args.deviceId,
      deviceName: args.deviceName,
      syncedAt: new Date().toISOString(),
      version: args.version,
      checksum: args.checksum,
      tableCounts: JSON.stringify(
        Object.fromEntries(
          SYNC_TABLES.map((tableName) => [tableName, args.tables[tableName]?.length ?? 0])
        )
      ),
    };

    if (existingMeta) {
      await ctx.db.patch(existingMeta._id, metaRecord);
    } else {
      await ctx.db.insert("syncMetadata", metaRecord);
    }

    return { imported, errors, deleted };
  },
});

/**
 * Export a single table page for bounded data transfer.
 */
export const exportPage = query({
  args: {
    table: syncTableValidator,
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    table: syncTableValidator,
    items: v.array(v.any()),
    continueCursor: v.string(),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const page = await ctx.db.query(args.table).paginate({
      numItems: clampLimit(args.limit),
      cursor: args.cursor ?? null,
    });

    return {
      table: args.table,
      items: page.page,
      continueCursor: page.continueCursor,
      isDone: page.isDone,
    };
  },
});

/**
 * Legacy full export for backward compatibility.
 * Uses paginated collection internally to avoid unbounded single queries.
 */
export const exportAll = query({
  args: {},
  returns: v.object({
    settings: v.array(v.any()),
    sessions: v.array(v.any()),
    messages: v.array(v.any()),
    artifacts: v.array(v.any()),
    projects: v.array(v.any()),
    documents: v.array(v.any()),
    knowledgeFiles: v.array(v.any()),
    workflows: v.array(v.any()),
    workflowExecutions: v.array(v.any()),
    summaries: v.array(v.any()),
    folders: v.array(v.any()),
    agentTraces: v.array(v.any()),
    checkpoints: v.array(v.any()),
    mcpServers: v.array(v.any()),
    videoProjects: v.array(v.any()),
    contextFiles: v.array(v.any()),
    assets: v.array(v.any()),
  }),
  handler: async (ctx) => {
    const [
      settings,
      sessions,
      messages,
      artifacts,
      projects,
      documents,
      knowledgeFiles,
      workflows,
      workflowExecutions,
      summaries,
      folders,
      agentTraces,
      checkpoints,
      mcpServers,
      videoProjects,
      contextFiles,
      assets,
    ] = await Promise.all([
      collectTableRowsPaginated(ctx as never, "settings"),
      collectTableRowsPaginated(ctx as never, "sessions"),
      collectTableRowsPaginated(ctx as never, "messages"),
      collectTableRowsPaginated(ctx as never, "artifacts"),
      collectTableRowsPaginated(ctx as never, "projects"),
      collectTableRowsPaginated(ctx as never, "documents"),
      collectTableRowsPaginated(ctx as never, "knowledgeFiles"),
      collectTableRowsPaginated(ctx as never, "workflows"),
      collectTableRowsPaginated(ctx as never, "workflowExecutions"),
      collectTableRowsPaginated(ctx as never, "summaries"),
      collectTableRowsPaginated(ctx as never, "folders"),
      collectTableRowsPaginated(ctx as never, "agentTraces"),
      collectTableRowsPaginated(ctx as never, "checkpoints"),
      collectTableRowsPaginated(ctx as never, "mcpServers"),
      collectTableRowsPaginated(ctx as never, "videoProjects"),
      collectTableRowsPaginated(ctx as never, "contextFiles"),
      collectTableRowsPaginated(ctx as never, "assets"),
    ]);

    return {
      settings,
      sessions,
      messages,
      artifacts,
      projects,
      documents,
      knowledgeFiles,
      workflows,
      workflowExecutions,
      summaries,
      folders,
      agentTraces,
      checkpoints,
      mcpServers,
      videoProjects,
      contextFiles,
      assets,
    };
  },
});

/**
 * Get sync metadata for a specific device.
 */
export const getMetadata = query({
  args: { deviceId: v.optional(v.string()) },
  returns: v.union(
    v.object({
      deviceId: v.string(),
      deviceName: v.string(),
      syncedAt: v.string(),
      version: v.string(),
      checksum: v.string(),
      tableCounts: v.optional(v.string()),
      _id: v.any(),
      _creationTime: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    if (!args.deviceId) {
      const allMeta = await ctx.db.query("syncMetadata").collect();
      if (allMeta.length === 0) return null;
      return allMeta.sort((a, b) => b.syncedAt.localeCompare(a.syncedAt))[0];
    }

    return await ctx.db
      .query("syncMetadata")
      .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
      .first();
  },
});

/**
 * Clear all sync tables.
 */
export const clearAll = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    let deleted = 0;
    for (const tableName of SYNC_TABLES) {
      deleted += await deleteTableRowsPaginated(ctx as never, tableName);
    }
    return deleted;
  },
});
