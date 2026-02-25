---
name: convex-http-actions
description: Build HTTP endpoints in Convex for webhooks, external API integrations, and custom routes. Use when implementing webhook receivers (Stripe, Clerk, GitHub), creating REST-like API endpoints, handling CORS for browser clients, adding API key or Bearer token authentication to HTTP routes, processing file uploads/downloads via HTTP, or any task requiring custom HTTP request/response handling in Convex.
---

# Convex HTTP Actions

Define HTTP endpoints in Convex for webhooks, APIs, file serving, and external integrations.

## Documentation Sources

Fetch the latest before implementing:

- Primary: https://docs.convex.dev/functions/http-actions
- Actions: https://docs.convex.dev/functions/actions
- Auth: https://docs.convex.dev/auth
- Full context: https://docs.convex.dev/llms.txt

## Core Concepts

HTTP actions use `httpRouter` in `convex/http.ts`. They can call `ctx.runQuery`, `ctx.runMutation`, `ctx.runAction`, and `ctx.storage`. They cannot access `ctx.db` directly.

| Feature | How |
|---------|-----|
| Exact path | `path: "/api/data"` |
| Prefix match | `pathPrefix: "/api/users/"` |
| Methods | `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS` |
| Body parsing | `request.json()`, `request.text()`, `request.formData()`, `request.bytes()` |
| Query params | `new URL(request.url).searchParams` |
| Headers | `request.headers.get("X-Header")` |
| Storage | `ctx.storage.store(blob)`, `ctx.storage.getUrl(id)` |

## Basic Setup

```typescript
// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
```

## Request Handling

```typescript
// JSON body + query params + headers
http.route({
  path: "/api/data",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const authHeader = request.headers.get("Authorization");
    const url = new URL(request.url);
    const filter = url.searchParams.get("filter");
    return Response.json({ received: body, filter });
  }),
});
```

## Path Prefix (Dynamic Routes)

```typescript
http.route({
  pathPrefix: "/api/users/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const userId = url.pathname.replace("/api/users/", "");
    return Response.json({ userId });
  }),
});
```

## Calling Mutations and Queries

```typescript
import { internal } from "./_generated/api";

http.route({
  path: "/api/items",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const itemId = await ctx.runMutation(internal.items.create, {
      name: body.name,
    });
    const item = await ctx.runQuery(internal.items.get, { id: itemId });
    return new Response(JSON.stringify(item), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  }),
});
```

## Error Handling Helpers

```typescript
function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status: number) {
  return jsonResponse({ error: message }, status);
}
```

## File Downloads via HTTP

```typescript
http.route({
  pathPrefix: "/files/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const fileId = url.pathname.replace("/files/", "") as Id<"_storage">;
    const fileUrl = await ctx.storage.getUrl(fileId);
    if (!fileUrl) return new Response("Not found", { status: 404 });
    return Response.redirect(fileUrl, 302);
  }),
});
```

## Advanced Patterns

- **Webhook handling** (Stripe, GitHub, Clerk): See [references/webhook-patterns.md](references/webhook-patterns.md)
- **CORS configuration**: See [references/auth-and-cors.md](references/auth-and-cors.md)
- **API key & Bearer token auth**: See [references/auth-and-cors.md](references/auth-and-cors.md)
- **Schema for HTTP APIs**: See [references/auth-and-cors.md](references/auth-and-cors.md)

## Best Practices

- Never run `npx convex deploy` unless explicitly instructed
- Never run any git commands unless explicitly instructed
- Always validate and sanitize incoming request data
- Use internal functions for database operations from HTTP actions
- Implement proper error handling with appropriate status codes
- Add CORS headers for browser-accessible endpoints
- Verify webhook signatures before processing
- Use environment variables for secrets

## Common Pitfalls

1. **Missing CORS preflight handler** — Browsers send OPTIONS requests first
2. **Not validating webhook signatures** — Security vulnerability
3. **Exposing internal functions** — Use internal functions from HTTP actions
4. **Forgetting Content-Type headers** — Clients may not parse responses correctly
5. **Not handling request body errors** — Invalid JSON will throw
6. **Blocking on long operations** — Use scheduled functions for heavy processing
