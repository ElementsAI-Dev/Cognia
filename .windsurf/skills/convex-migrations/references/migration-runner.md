# Reusable Migration Runner System

A complete, production-ready migration tracking system for Convex applications.

## Table of Contents

- [Migration Schema](#migration-schema)
- [Migration Helper Functions](#migration-helper-functions)
- [Example Migration Implementation](#example-migration-implementation)

## Migration Schema

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  migrations: defineTable({
    name: v.string(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    status: v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
    processed: v.number(),
  }).index("by_name", ["name"]),

  // ... your other tables
});
```

## Migration Helper Functions

```typescript
// convex/migrations.ts
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const hasMigrationRun = internalQuery({
  args: { name: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const migration = await ctx.db
      .query("migrations")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    return migration?.status === "completed";
  },
});

export const startMigration = internalMutation({
  args: { name: v.string() },
  returns: v.id("migrations"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("migrations")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      if (existing.status === "completed") {
        throw new Error(`Migration ${args.name} already completed`);
      }
      if (existing.status === "running") {
        throw new Error(`Migration ${args.name} already running`);
      }
      // Reset failed migration
      await ctx.db.patch(existing._id, {
        status: "running",
        startedAt: Date.now(),
        error: undefined,
        processed: 0,
      });
      return existing._id;
    }

    return await ctx.db.insert("migrations", {
      name: args.name,
      startedAt: Date.now(),
      status: "running",
      processed: 0,
    });
  },
});

export const updateMigrationProgress = internalMutation({
  args: {
    migrationId: v.id("migrations"),
    processed: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const migration = await ctx.db.get(args.migrationId);
    if (!migration) return null;

    await ctx.db.patch(args.migrationId, {
      processed: migration.processed + args.processed,
    });
    return null;
  },
});

export const completeMigration = internalMutation({
  args: { migrationId: v.id("migrations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.migrationId, {
      status: "completed",
      completedAt: Date.now(),
    });
    return null;
  },
});

export const failMigration = internalMutation({
  args: {
    migrationId: v.id("migrations"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.migrationId, {
      status: "failed",
      error: args.error,
    });
    return null;
  },
});
```

## Example Migration Implementation

```typescript
// convex/migrations/addUserTimestamps.ts
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

const MIGRATION_NAME = "add_user_timestamps_v1";
const BATCH_SIZE = 100;

export const run = internalMutation({
  args: {
    migrationId: v.optional(v.id("migrations")),
    cursor: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Initialize migration on first run
    let migrationId = args.migrationId;
    if (!migrationId) {
      const hasRun = await ctx.runQuery(internal.migrations.hasMigrationRun, {
        name: MIGRATION_NAME,
      });
      if (hasRun) {
        console.log(`Migration ${MIGRATION_NAME} already completed`);
        return null;
      }
      migrationId = await ctx.runMutation(internal.migrations.startMigration, {
        name: MIGRATION_NAME,
      });
    }

    try {
      const result = await ctx.db
        .query("users")
        .paginate({ numItems: BATCH_SIZE, cursor: args.cursor ?? null });

      let processed = 0;
      for (const user of result.page) {
        if (user.createdAt === undefined) {
          await ctx.db.patch(user._id, {
            createdAt: user._creationTime,
            updatedAt: user._creationTime,
          });
          processed++;
        }
      }

      await ctx.runMutation(internal.migrations.updateMigrationProgress, {
        migrationId,
        processed,
      });

      if (!result.isDone) {
        await ctx.scheduler.runAfter(0, internal.migrations.addUserTimestamps.run, {
          migrationId,
          cursor: result.continueCursor,
        });
      } else {
        await ctx.runMutation(internal.migrations.completeMigration, {
          migrationId,
        });
        console.log(`Migration ${MIGRATION_NAME} completed`);
      }
    } catch (error) {
      await ctx.runMutation(internal.migrations.failMigration, {
        migrationId,
        error: String(error),
      });
      throw error;
    }

    return null;
  },
});
```

Key pattern:
1. Check if migration already completed (idempotent)
2. Start migration record on first run
3. Process in batches with cursor-based pagination
4. Track progress incrementally
5. Self-schedule next batch via `ctx.scheduler.runAfter(0, ...)`
6. Mark complete or failed with error details
