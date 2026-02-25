import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Bulk import sync data from a local device.
 * Accepts the full backup payload and upserts all records.
 * Records are keyed by `localId` to enable idempotent upserts.
 */
export const bulkImport = mutation({
  args: {
    deviceId: v.string(),
    deviceName: v.string(),
    version: v.string(),
    checksum: v.string(),
    tables: v.object({
      sessions: v.optional(v.array(v.object({ localId: v.string() }))),
      messages: v.optional(v.array(v.object({ localId: v.string() }))),
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
  },
  returns: v.object({
    imported: v.number(),
    errors: v.number(),
  }),
  handler: async (ctx, args) => {
    let imported = 0;
    let errors = 0;

    const tableNames = Object.keys(args.tables) as Array<keyof typeof args.tables>;

    for (const tableName of tableNames) {
      const records = args.tables[tableName];
      if (!records || records.length === 0) continue;

      for (const record of records) {
        try {
          if (!record.localId) continue;

          // Strip Convex system fields that cannot be written
          const { _id, _creationTime, ...cleanRecord } = record;

          // Check if record already exists by localId
          const existing = await ctx.db
            .query(tableName)
            .withIndex("by_local_id", (q) => q.eq("localId", cleanRecord.localId))
            .first();

          if (existing) {
            // Update existing record
            await ctx.db.patch(existing._id, cleanRecord);
          } else {
            // Insert new record
            await ctx.db.insert(tableName, cleanRecord);
          }
          imported++;
        } catch {
          errors++;
        }
      }
    }

    // Update sync metadata
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
          tableNames.map((t) => [t, args.tables[t]?.length ?? 0])
        )
      ),
    };

    if (existingMeta) {
      await ctx.db.patch(existingMeta._id, metaRecord);
    } else {
      await ctx.db.insert("syncMetadata", metaRecord);
    }

    return { imported, errors };
  },
});

/**
 * Export all data for a full download sync.
 * Returns all records from all tables.
 */
export const exportAll = query({
  args: {},
  returns: v.object({
    sessions: v.array(v.any()),
    messages: v.array(v.any()),
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
      sessions,
      messages,
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
      ctx.db.query("sessions").collect(),
      ctx.db.query("messages").collect(),
      ctx.db.query("projects").collect(),
      ctx.db.query("documents").collect(),
      ctx.db.query("knowledgeFiles").collect(),
      ctx.db.query("workflows").collect(),
      ctx.db.query("workflowExecutions").collect(),
      ctx.db.query("summaries").collect(),
      ctx.db.query("folders").collect(),
      ctx.db.query("agentTraces").collect(),
      ctx.db.query("checkpoints").collect(),
      ctx.db.query("mcpServers").collect(),
      ctx.db.query("videoProjects").collect(),
      ctx.db.query("contextFiles").collect(),
      ctx.db.query("assets").collect(),
    ]);

    return {
      sessions,
      messages,
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
      // Return latest metadata across all devices
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
 * Clear all data from all tables (for full re-sync).
 */
export const clearAll = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    let deleted = 0;
    const tableNames = [
      "sessions", "messages", "projects", "documents", "knowledgeFiles",
      "workflows", "workflowExecutions", "summaries", "folders",
      "agentTraces", "checkpoints", "mcpServers", "videoProjects",
      "contextFiles", "assets",
    ] as const;

    for (const tableName of tableNames) {
      const records = await ctx.db.query(tableName).collect();
      for (const record of records) {
        await ctx.db.delete(record._id);
        deleted++;
      }
    }

    return deleted;
  },
});
