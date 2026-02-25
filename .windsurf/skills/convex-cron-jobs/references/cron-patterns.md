# Advanced Cron Job Patterns

Monitoring, logging, external API integration, and complete configuration examples.

## Table of Contents

- [Monitoring and Logging](#monitoring-and-logging)
- [External API Calls in Crons](#external-api-calls-in-crons)
- [Parameterized Cleanup Function](#parameterized-cleanup-function)
- [Complete Cron Configuration](#complete-cron-configuration)
- [Schema for Cron Job Logging](#schema-for-cron-job-logging)

## Monitoring and Logging

```typescript
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const cleanupWithLogging = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const startTime = Date.now();
    let processedCount = 0;
    let errorCount = 0;

    try {
      const expiredItems = await ctx.db
        .query("items")
        .withIndex("by_expiresAt")
        .filter((q) => q.lt(q.field("expiresAt"), Date.now()))
        .collect();

      for (const item of expiredItems) {
        try {
          await ctx.db.delete(item._id);
          processedCount++;
        } catch (error) {
          errorCount++;
          console.error(`Failed to delete item ${item._id}:`, error);
        }
      }

      await ctx.db.insert("cronLogs", {
        jobName: "cleanup",
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime,
        processedCount,
        errorCount,
        status: errorCount === 0 ? "success" : "partial",
      });
    } catch (error) {
      await ctx.db.insert("cronLogs", {
        jobName: "cleanup",
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime,
        processedCount,
        errorCount,
        status: "failed",
        error: String(error),
      });
      throw error;
    }

    return null;
  },
});
```

## External API Calls in Crons

Use `internalAction` with `"use node"` for external API calls:

```typescript
// convex/sync.ts
"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const syncExternalData = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const response = await fetch("https://api.example.com/data", {
      headers: {
        Authorization: `Bearer ${process.env.API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    await ctx.runMutation(internal.sync.storeExternalData, {
      data,
      syncedAt: Date.now(),
    });

    return null;
  },
});
```

Then register in crons:

```typescript
crons.interval(
  "sync external data",
  { minutes: 15 },
  internal.sync.syncExternalData,
  {}
);
```

## Parameterized Cleanup Function

```typescript
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const cleanupByType = internalMutation({
  args: {
    fileType: v.string(),
    maxAge: v.number(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.maxAge;

    const oldFiles = await ctx.db
      .query("files")
      .withIndex("by_type_and_created", (q) =>
        q.eq("type", args.fileType).lt("createdAt", cutoff)
      )
      .collect();

    for (const file of oldFiles) {
      await ctx.storage.delete(file.storageId);
      await ctx.db.delete(file._id);
    }

    return oldFiles.length;
  },
});
```

## Complete Cron Configuration

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Cleanup jobs
crons.interval("cleanup expired sessions", { hours: 1 }, internal.cleanup.expiredSessions, {});
crons.interval("cleanup old logs", { hours: 24 }, internal.cleanup.oldLogs, { maxAgeDays: 30 });

// Sync jobs
crons.interval("sync user data", { minutes: 15 }, internal.sync.userData, {});

// Report jobs
crons.cron("daily analytics", "0 1 * * *", internal.reports.dailyAnalytics, {});
crons.cron("weekly summary", "0 9 * * 1", internal.reports.weeklySummary, {});

// Health checks
crons.interval("service health check", { minutes: 5 }, internal.monitoring.healthCheck, {});

export default crons;
```

## Schema for Cron Job Logging

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  cronLogs: defineTable({
    jobName: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    duration: v.number(),
    processedCount: v.number(),
    errorCount: v.number(),
    status: v.union(
      v.literal("success"),
      v.literal("partial"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
  })
    .index("by_job", ["jobName"])
    .index("by_status", ["status"])
    .index("by_startTime", ["startTime"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    lastActive: v.number(),
    expiresAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_lastActive", ["lastActive"])
    .index("by_expiresAt", ["expiresAt"]),

  tasks: defineTable({
    type: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    data: v.any(),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_type_and_status", ["type", "status"]),
});
```
