# Advanced Migration Patterns

Patterns for field type changes, renaming fields, and complete schema evolution examples.

## Table of Contents

- [Changing Field Types](#changing-field-types)
- [Renaming Fields (Full Example)](#renaming-fields-full-example)
- [Complete Evolved Schema Example](#complete-evolved-schema-example)

## Changing Field Types

Example: Convert `priority` from string ("low"/"medium"/"high") to number (1/2/3).

```typescript
// Step 1: Add new field with new type
export default defineSchema({
  tasks: defineTable({
    title: v.string(),
    priority: v.string(),                    // Old: "low", "medium", "high"
    priorityLevel: v.optional(v.number()),   // New: 1, 2, 3
  }),
});
```

```typescript
// Step 2: Backfill with type conversion
export const migratePriorityToNumber = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("tasks")
      .paginate({ numItems: 100, cursor: args.cursor ?? null });

    const priorityMap: Record<string, number> = {
      low: 1,
      medium: 2,
      high: 3,
    };

    for (const task of result.page) {
      if (task.priorityLevel === undefined) {
        await ctx.db.patch(task._id, {
          priorityLevel: priorityMap[task.priority] ?? 1,
        });
      }
    }

    if (!result.isDone) {
      await ctx.scheduler.runAfter(0, internal.migrations.migratePriorityToNumber, {
        cursor: result.continueCursor,
      });
    }
    return null;
  },
});
```

```typescript
// Step 3: Update code to read new field with fallback
export const getTask = query({
  args: { taskId: v.id("tasks") },
  returns: v.object({
    _id: v.id("tasks"),
    title: v.string(),
    priorityLevel: v.number(),
  }),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const priorityMap: Record<string, number> = { low: 1, medium: 2, high: 3 };

    return {
      _id: task._id,
      title: task.title,
      priorityLevel: task.priorityLevel ?? priorityMap[task.priority] ?? 1,
    };
  },
});
```

```typescript
// Step 4: After backfill, update schema (remove old field)
export default defineSchema({
  tasks: defineTable({
    title: v.string(),
    priorityLevel: v.number(),
  }),
});
```

## Renaming Fields (Full Example)

```typescript
// Step 1: Add new field as optional
export default defineSchema({
  users: defineTable({
    userName: v.string(),                    // Old field
    displayName: v.optional(v.string()),     // New field
  }),
});
```

```typescript
// Step 2: Update code to read from new field with fallback
export const getUser = query({
  args: { userId: v.id("users") },
  returns: v.object({
    _id: v.id("users"),
    displayName: v.string(),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    return {
      _id: user._id,
      displayName: user.displayName ?? user.userName,
    };
  },
});
```

```typescript
// Step 3: Backfill to copy data
export const backfillDisplayName = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("users")
      .paginate({ numItems: 100, cursor: args.cursor ?? null });

    for (const user of result.page) {
      if (user.displayName === undefined) {
        await ctx.db.patch(user._id, { displayName: user.userName });
      }
    }

    if (!result.isDone) {
      await ctx.scheduler.runAfter(0, internal.migrations.backfillDisplayName, {
        cursor: result.continueCursor,
      });
    }
    return null;
  },
});
```

```typescript
// Step 4: After backfill, update schema
export default defineSchema({
  users: defineTable({
    displayName: v.string(),   // userName removed
  }),
});
```

## Complete Evolved Schema Example

A schema showing multiple migration stages documented via comments:

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

  users: defineTable({
    name: v.string(),
    email: v.string(),
    // Added in migration v1
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    // Added in migration v2
    avatarUrl: v.optional(v.string()),
    // Added in migration v3
    settings: v.optional(v.object({
      theme: v.string(),
      notifications: v.boolean(),
    })),
  })
    .index("by_email", ["email"])
    .index("by_createdAt", ["createdAt"]),

  posts: defineTable({
    title: v.string(),
    content: v.string(),
    authorId: v.id("users"),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived")
    ),
    publishedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_author", ["authorId"])
    .index("by_status", ["status"])
    .index("by_author_and_status", ["authorId", "status"])
    .index("by_publishedAt", ["publishedAt"]),
});
```
