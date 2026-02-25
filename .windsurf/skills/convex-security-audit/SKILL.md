---
name: convex-security-audit
description: Deep security review for Convex applications. Use when performing a thorough security audit, implementing role-based access control (RBAC), adding permission-based authorization, setting up rate limiting, protecting sensitive operations with confirmation codes, building audit trail systems, reviewing data access boundaries, or isolating action-layer secrets. More comprehensive than convex-security-check — use this for full implementation, use security-check for quick checklists.
---

# Convex Security Audit

Comprehensive security patterns: RBAC, data access boundaries, action isolation, rate limiting, and audit trails.

## Documentation Sources

Fetch the latest before implementing:

- Primary: https://docs.convex.dev/auth/functions-auth
- Production: https://docs.convex.dev/production
- Full context: https://docs.convex.dev/llms.txt

## Security Audit Areas

1. **Authorization Logic** — Who can do what
2. **Data Access Boundaries** — What data users can see
3. **Action Isolation** — Protecting external API calls
4. **Rate Limiting** — Preventing abuse
5. **Sensitive Operations** — Protecting critical functions

## RBAC Auth Helpers (Core Pattern)

```typescript
// convex/lib/auth.ts
import { QueryCtx, MutationCtx } from "./_generated/server";
import { ConvexError } from "convex/values";
import { Doc } from "./_generated/dataModel";

type UserRole = "user" | "moderator" | "admin" | "superadmin";

const roleHierarchy: Record<UserRole, number> = {
  user: 0, moderator: 1, admin: 2, superadmin: 3,
};

export async function getUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique();
}

export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  minRole: UserRole
): Promise<Doc<"users">> {
  const user = await getUser(ctx);
  if (!user) {
    throw new ConvexError({ code: "UNAUTHENTICATED", message: "Authentication required" });
  }
  if ((roleHierarchy[user.role as UserRole] ?? 0) < roleHierarchy[minRole]) {
    throw new ConvexError({ code: "FORBIDDEN", message: `Role '${minRole}' or higher required` });
  }
  return user;
}
```

## Ownership Check Pattern

```typescript
export const getSensitiveItem = query({
  args: { itemId: v.id("sensitiveItems") },
  returns: v.union(v.object({ _id: v.id("sensitiveItems"), secret: v.string() }), v.null()),
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    if (!user) return null;
    const item = await ctx.db.get(args.itemId);
    // Don't reveal if item exists — return null for both missing and unauthorized
    if (!item || item.ownerId !== user._id) return null;
    return item;
  },
});
```

## Action Isolation

```typescript
// SECURITY: Never expose API keys in responses
export const callExternalAPI = action({
  args: { query: v.string() },
  returns: v.object({ result: v.string() }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Authentication required");

    const apiKey = process.env.EXTERNAL_API_KEY;
    if (!apiKey) throw new Error("API key not configured");

    // Log usage for audit trail
    await ctx.runMutation(internal.audit.logAPICall, {
      userId: identity.tokenIdentifier,
      endpoint: "external-api",
      timestamp: Date.now(),
    });

    const response = await fetch("https://api.example.com/query", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: args.query }),
    });

    if (!response.ok) throw new ConvexError("External service unavailable");
    return { result: sanitizeResponse(await response.json()) };
  },
});
```

## Advanced Patterns

- **Permission-based auth**, **rate limiting**, **sensitive operations with confirmation codes**, **audit trail system**, **shared document access**: See [references/security-patterns.md](references/security-patterns.md)

## Best Practices

- Never run `npx convex deploy` unless explicitly instructed
- Never run any git commands unless explicitly instructed
- Implement defense in depth (multiple security layers)
- Log all sensitive operations for audit trails
- Use confirmation codes for destructive actions
- Rate limit all user-facing endpoints
- Never expose internal API keys or error details to clients
- Return null (not 403) for unauthorized resource access to avoid leaking existence

## Common Pitfalls

1. **Single point of failure** — Implement multiple auth checks
2. **Missing audit logs** — Log all sensitive operations
3. **Trusting client data** — Always validate server-side
4. **Exposing error details** — Sanitize error messages
5. **No rate limiting** — Always implement rate limits
