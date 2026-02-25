---
name: convex-cron-jobs
description: Schedule recurring Convex functions for background tasks. Use when setting up periodic cleanup jobs, data syncing, health checks, report generation, billing cycles, or any recurring background work. Covers both interval-based (`crons.interval`) and cron expression (`crons.cron`) scheduling, internal function patterns, static arguments, and batch processing for large datasets.
---

# Convex Cron Jobs

Schedule recurring functions for cleanup, syncing, reports, and automated workflows.

## Documentation Sources

Fetch the latest before implementing:

- Primary: https://docs.convex.dev/scheduling/cron-jobs
- Scheduling: https://docs.convex.dev/scheduling
- Full context: https://docs.convex.dev/llms.txt

## Basic Setup

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Interval-based: run every hour
crons.interval(
  "cleanup expired sessions",
  { hours: 1 },
  internal.tasks.cleanupExpiredSessions,
  {}
);

// Cron expression: run every day at midnight UTC
crons.cron(
  "daily report",
  "0 0 * * *",
  internal.reports.generateDailyReport,
  {}
);

export default crons;
```

## Scheduling Methods

**`crons.interval(name, duration, function, args)`** — Fixed intervals

```typescript
crons.interval("health check", { seconds: 30 }, internal.monitoring.check, {});
crons.interval("sync data", { minutes: 5 }, internal.sync.fetch, {});
crons.interval("cleanup", { hours: 2 }, internal.files.cleanup, {});
```

**`crons.cron(name, expression, function, args)`** — Cron expressions (UTC)

```
┌───────────── minute (0-59)
│ ┌───────────── hour (0-23)
│ │ ┌───────────── day of month (1-31)
│ │ │ ┌───────────── month (1-12)
│ │ │ │ ┌───────────── day of week (0-6, Sunday=0)
│ │ │ │ │
* * * * *
```

Common patterns:

- `*/5 * * * *` — Every 5 minutes
- `0 * * * *` — Every hour
- `0 0 * * *` — Daily at midnight
- `0 9 * * 1` — Mondays at 9 AM
- `0 0 1 * *` — First of every month
- `0 9-17 * * 1-5` — Hourly 9AM–5PM weekdays

## Internal Functions for Crons

Always use `internalMutation` / `internalAction` for security:

```typescript
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const cleanupExpiredSessions = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const expired = await ctx.db
      .query("sessions")
      .withIndex("by_lastActive")
      .filter((q) => q.lt(q.field("lastActive"), oneHourAgo))
      .collect();

    for (const session of expired) {
      await ctx.db.delete(session._id);
    }
    return expired.length;
  },
});
```

## Static Arguments

```typescript
crons.interval(
  "cleanup temp files",
  { hours: 1 },
  internal.cleanup.cleanupByType,
  { fileType: "temp", maxAge: 3600000 }
);

crons.interval(
  "cleanup cache files",
  { hours: 24 },
  internal.cleanup.cleanupByType,
  { fileType: "cache", maxAge: 86400000 }
);
```

## Batching for Large Datasets

```typescript
const BATCH_SIZE = 100;

export const processBatch = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("items")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .paginate({ numItems: BATCH_SIZE, cursor: args.cursor ?? null });

    for (const item of result.page) {
      await ctx.db.patch(item._id, { status: "processed", processedAt: Date.now() });
    }

    if (!result.isDone) {
      await ctx.scheduler.runAfter(0, internal.tasks.processBatch, {
        cursor: result.continueCursor,
      });
    }
    return null;
  },
});
```

## Advanced Patterns

- **Monitoring and logging**, **external API calls**, **complete schema examples**: See [references/cron-patterns.md](references/cron-patterns.md)

## Best Practices

- Never run `npx convex deploy` unless explicitly instructed
- Never run any git commands unless explicitly instructed
- Only use `crons.interval` or `crons.cron` — avoid deprecated `crons.hourly`, `crons.daily`
- Always call internal functions from cron jobs
- Import `internal` from `_generated/api` even for same-file functions
- Use batching for large dataset operations
- All cron expressions use **UTC**
- Use meaningful job names for dashboard visibility

## Common Pitfalls

1. **Using public functions** — Cron jobs must call internal functions only
2. **Long-running mutations** — Break large operations into batches
3. **Missing error handling** — Unhandled errors fail the entire job
4. **Forgetting timezone** — All cron expressions use UTC
5. **Using deprecated helpers** — Avoid `crons.hourly`, `crons.daily`, etc.
