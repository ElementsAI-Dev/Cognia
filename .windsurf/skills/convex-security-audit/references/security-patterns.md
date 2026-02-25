# Advanced Security Patterns

Permission-based auth, rate limiting, sensitive operations, shared document access, and audit trails.

## Table of Contents

- [Permission-Based Authorization](#permission-based-authorization)
- [Rate Limiting](#rate-limiting)
- [Sensitive Operations with Confirmation Codes](#sensitive-operations-with-confirmation-codes)
- [Shared Document Access Control](#shared-document-access-control)
- [Audit Trail System](#audit-trail-system)

## Permission-Based Authorization

```typescript
// convex/lib/auth.ts (extend the RBAC helpers)
type Permission = "read:users" | "write:users" | "delete:users" | "admin:system";

const rolePermissions: Record<UserRole, Permission[]> = {
  user: ["read:users"],
  moderator: ["read:users", "write:users"],
  admin: ["read:users", "write:users", "delete:users"],
  superadmin: ["read:users", "write:users", "delete:users", "admin:system"],
};

export async function requirePermission(
  ctx: QueryCtx | MutationCtx,
  permission: Permission
): Promise<Doc<"users">> {
  const user = await getUser(ctx);
  if (!user) {
    throw new ConvexError({ code: "UNAUTHENTICATED", message: "Authentication required" });
  }
  const permissions = rolePermissions[user.role as UserRole] ?? [];
  if (!permissions.includes(permission)) {
    throw new ConvexError({ code: "FORBIDDEN", message: `Permission '${permission}' required` });
  }
  return user;
}
```

## Rate Limiting

```typescript
// convex/rateLimit.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

const RATE_LIMITS = {
  message: { requests: 10, windowMs: 60000 },  // 10 per minute
  upload: { requests: 5, windowMs: 300000 },   // 5 per 5 minutes
  api: { requests: 100, windowMs: 3600000 },   // 100 per hour
};

export const checkRateLimit = mutation({
  args: {
    userId: v.string(),
    action: v.union(v.literal("message"), v.literal("upload"), v.literal("api")),
  },
  returns: v.object({ allowed: v.boolean(), retryAfter: v.optional(v.number()) }),
  handler: async (ctx, args) => {
    const limit = RATE_LIMITS[args.action];
    const now = Date.now();
    const windowStart = now - limit.windowMs;

    const requests = await ctx.db
      .query("rateLimits")
      .withIndex("by_user_and_action", (q) =>
        q.eq("userId", args.userId).eq("action", args.action)
      )
      .filter((q) => q.gt(q.field("timestamp"), windowStart))
      .collect();

    if (requests.length >= limit.requests) {
      const retryAfter = requests[0].timestamp + limit.windowMs - now;
      return { allowed: false, retryAfter };
    }

    await ctx.db.insert("rateLimits", {
      userId: args.userId,
      action: args.action,
      timestamp: now,
    });

    return { allowed: true };
  },
});
```

Usage in a mutation:

```typescript
export const sendMessage = mutation({
  args: { content: v.string() },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Authentication required");

    const rateCheck = await checkRateLimit(ctx, {
      userId: identity.tokenIdentifier,
      action: "message",
    });

    if (!rateCheck.allowed) {
      throw new ConvexError({
        code: "RATE_LIMITED",
        message: `Too many requests. Try again in ${Math.ceil(rateCheck.retryAfter! / 1000)}s`,
      });
    }

    return await ctx.db.insert("messages", {
      content: args.content,
      authorId: identity.tokenIdentifier,
      createdAt: Date.now(),
    });
  },
});
```

## Sensitive Operations with Confirmation Codes

```typescript
// convex/admin.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";
import { internal } from "./_generated/api";

export const requestDeletionConfirmation = mutation({
  args: { userId: v.id("users") },
  returns: v.string(),
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "superadmin");
    const code = generateSecureCode();

    await ctx.db.insert("confirmations", {
      adminId: admin._id,
      code,
      action: "delete_user_data",
      targetUserId: args.userId,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    return code;
  },
});

export const deleteAllUserData = mutation({
  args: {
    userId: v.id("users"),
    confirmationCode: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "superadmin");

    const confirmation = await ctx.db
      .query("confirmations")
      .withIndex("by_admin_and_code", (q) =>
        q.eq("adminId", admin._id).eq("code", args.confirmationCode)
      )
      .filter((q) => q.gt(q.field("expiresAt"), Date.now()))
      .unique();

    if (!confirmation || confirmation.action !== "delete_user_data") {
      throw new ConvexError("Invalid or expired confirmation code");
    }

    await ctx.db.delete(confirmation._id);

    await ctx.scheduler.runAfter(0, internal.admin._performDeletion, {
      userId: args.userId,
      requestedBy: admin._id,
    });

    await ctx.db.insert("auditLogs", {
      action: "delete_user_data",
      targetUserId: args.userId,
      performedBy: admin._id,
      timestamp: Date.now(),
    });

    return null;
  },
});
```

## Shared Document Access Control

```typescript
export const getSharedDocument = query({
  args: { docId: v.id("documents") },
  returns: v.union(v.object({
    _id: v.id("documents"),
    content: v.string(),
    accessLevel: v.string(),
  }), v.null()),
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    const doc = await ctx.db.get(args.docId);
    if (!doc) return null;

    // Public documents
    if (doc.visibility === "public") {
      return { ...doc, accessLevel: "public" };
    }

    // Must be authenticated for non-public
    if (!user) return null;

    // Owner has full access
    if (doc.ownerId === user._id) {
      return { ...doc, accessLevel: "owner" };
    }

    // Check shared access list
    const access = await ctx.db
      .query("documentAccess")
      .withIndex("by_doc_and_user", (q) =>
        q.eq("documentId", args.docId).eq("userId", user._id)
      )
      .unique();

    if (!access) return null;
    return { ...doc, accessLevel: access.level };
  },
});
```

## Audit Trail System

```typescript
// convex/audit.ts
import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";

export const logEvent = internalMutation({
  args: {
    action: v.string(),
    userId: v.optional(v.string()),
    resourceType: v.string(),
    resourceId: v.string(),
    details: v.optional(v.any()),
  },
  returns: v.id("auditLogs"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("auditLogs", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

export const getAuditLogs = query({
  args: {
    resourceType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("auditLogs"),
    _creationTime: v.number(),
    action: v.string(),
    userId: v.optional(v.string()),
    resourceType: v.string(),
    resourceId: v.string(),
    details: v.optional(v.any()),
    timestamp: v.number(),
  })),
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    let q = ctx.db.query("auditLogs");
    if (args.resourceType) {
      q = q.withIndex("by_resource_type", (qi) =>
        qi.eq("resourceType", args.resourceType)
      );
    }

    return await q.order("desc").take(args.limit ?? 100);
  },
});
```
