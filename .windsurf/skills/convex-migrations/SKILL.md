---
name: convex-migrations
description: Schema migration strategies for evolving Convex applications. Use when adding new fields to existing tables, backfilling data across documents, removing or renaming deprecated fields, changing field types, adding or modifying indexes, or building a reusable migration runner system. Covers zero-downtime migration patterns with optional-field-first approach and batched backfill mutations.
---

# Convex Migrations

Evolve your Convex database schema safely with optional-field-first patterns, batched backfills, and zero-downtime deployments.

## Documentation Sources

Fetch the latest before implementing:

- Primary: https://docs.convex.dev/database/schemas
- Database: https://docs.convex.dev/database
- Full context: https://docs.convex.dev/llms.txt

## Migration Philosophy

Convex has no explicit migration files. Schema changes deploy instantly. Existing data is **not** automatically transformed. The standard pattern:

1. Add new field as `v.optional(...)` in schema
2. Update code to handle both old and new data
3. Backfill existing documents in batches
4. Make field required after backfill completes

## Adding New Fields

```typescript
// Step 1: Add optional field to schema
export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()), // New - start optional
  }),
});
```

```typescript
// Step 2: Handle missing field in queries
export const getUser = query({
  args: { userId: v.id("users") },
  returns: v.union(v.object({
    _id: v.id("users"),
    name: v.string(),
    avatarUrl: v.union(v.string(), v.null()),
  }), v.null()),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    return { _id: user._id, name: user.name, avatarUrl: user.avatarUrl ?? null };
  },
});
```

```typescript
// Step 3: Backfill in batches
const BATCH_SIZE = 100;

export const backfillAvatarUrl = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: v.object({ processed: v.number(), hasMore: v.boolean() }),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("users")
      .paginate({ numItems: BATCH_SIZE, cursor: args.cursor ?? null });

    let processed = 0;
    for (const user of result.page) {
      if (user.avatarUrl === undefined) {
        await ctx.db.patch(user._id, { avatarUrl: defaultAvatar(user.name) });
        processed++;
      }
    }

    if (!result.isDone) {
      await ctx.scheduler.runAfter(0, internal.migrations.backfillAvatarUrl, {
        cursor: result.continueCursor,
      });
    }

    return { processed, hasMore: !result.isDone };
  },
});
```

```typescript
// Step 4: After backfill, make field required
users: defineTable({
  name: v.string(),
  email: v.string(),
  avatarUrl: v.string(), // Now required
}),
```

## Removing Fields

1. Stop using the field in all queries/mutations
2. Remove from schema (or make optional first)
3. Clean up existing data with `ctx.db.replace()`:

```typescript
export const removeDeprecatedField = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("posts")
      .paginate({ numItems: 100, cursor: args.cursor ?? null });

    for (const post of result.page) {
      const { legacyField, ...rest } = post as typeof post & { legacyField?: string };
      if (legacyField !== undefined) {
        await ctx.db.replace(post._id, rest);
      }
    }

    if (!result.isDone) {
      await ctx.scheduler.runAfter(0, internal.migrations.removeDeprecatedField, {
        cursor: result.continueCursor,
      });
    }
    return null;
  },
});
```

## Renaming Fields

1. Add new field as optional
2. Read new field with fallback to old: `user.displayName ?? user.userName`
3. Backfill to copy old → new
4. Remove old field after backfill

## Adding Indexes

Add index to schema **before** using `withIndex()` in queries. Deploy schema first, then update query code.

```typescript
posts: defineTable({ ... })
  .index("by_author", ["authorId"])
  .index("by_status_and_published", ["status", "publishedAt"]),
```

## Advanced Patterns

- **Changing field types** (string → number): See [references/advanced-patterns.md](references/advanced-patterns.md)
- **Reusable migration runner system**: See [references/migration-runner.md](references/migration-runner.md)
- **Complete schema examples**: See [references/advanced-patterns.md](references/advanced-patterns.md)

## Best Practices

- Never run `npx convex deploy` unless explicitly instructed
- Never run any git commands unless explicitly instructed
- Always start with optional fields when adding new data
- Backfill data in batches (100 docs per mutation) to avoid timeouts
- Track completed migrations to prevent re-runs
- Handle both old and new data during transition periods
- Remove deprecated fields only after all code stops using them
- Add indexes before running queries that use them

## Common Pitfalls

1. **Making new fields required immediately** — Breaks existing documents
2. **Not handling undefined values** — Causes runtime errors
3. **Large batch sizes** — Causes function timeouts
4. **Running migrations without tracking** — May run multiple times
5. **Removing fields before code update** — Breaks existing functionality
