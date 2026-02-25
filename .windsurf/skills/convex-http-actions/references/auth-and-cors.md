# Authentication and CORS for Convex HTTP Actions

Patterns for CORS configuration, API key authentication, Bearer token authentication, and HTTP API schemas.

## Table of Contents

- [CORS Configuration](#cors-configuration)
- [API Key Authentication](#api-key-authentication)
- [Bearer Token Authentication](#bearer-token-authentication)
- [Combined Error Handling](#combined-error-handling)
- [Schema for HTTP API](#schema-for-http-api)

## CORS Configuration

```typescript
// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

// Handle preflight requests
http.route({
  path: "/api/data",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }),
});

// Actual endpoint with CORS
http.route({
  path: "/api/data",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();

    return new Response(
      JSON.stringify({ success: true, data: body }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }),
});

export default http;
```

For restricting origins in production:

```typescript
const ALLOWED_ORIGINS = [
  "https://myapp.com",
  "https://staging.myapp.com",
];

function getCorsHeaders(request: Request) {
  const origin = request.headers.get("Origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}
```

## API Key Authentication

```typescript
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

http.route({
  path: "/api/protected",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const apiKey = request.headers.get("X-API-Key");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing API key" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const isValid = await ctx.runQuery(internal.auth.validateApiKey, {
      apiKey,
    });

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await ctx.runQuery(internal.data.getProtectedData, {});

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),
});
```

## Bearer Token Authentication

```typescript
http.route({
  path: "/api/user",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.slice(7);

    const user = await ctx.runQuery(internal.auth.validateToken, { token });

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(user),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),
});
```

## Combined Error Handling

Full example with content-type validation, body parsing, field validation:

```typescript
http.route({
  path: "/api/process",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const contentType = request.headers.get("Content-Type");
      if (!contentType?.includes("application/json")) {
        return errorResponse("Content-Type must be application/json", 415);
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return errorResponse("Invalid JSON body", 400);
      }

      if (!body.data) {
        return errorResponse("Missing required field: data", 400);
      }

      const result = await ctx.runMutation(internal.process.handle, {
        data: body.data,
      });

      return jsonResponse({ success: true, result }, 200);
    } catch (error) {
      console.error("Processing error:", error);
      return errorResponse("Internal server error", 500);
    }
  }),
});
```

## Schema for HTTP API

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  apiKeys: defineTable({
    key: v.string(),
    userId: v.id("users"),
    name: v.string(),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  })
    .index("by_key", ["key"])
    .index("by_user", ["userId"]),

  webhookEvents: defineTable({
    source: v.string(),
    eventType: v.string(),
    payload: v.any(),
    processedAt: v.number(),
    status: v.union(
      v.literal("success"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
  })
    .index("by_source", ["source"])
    .index("by_status", ["status"]),

  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
  }).index("by_clerk_id", ["clerkId"]),
});
```
