import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

const JSON_HEADERS = { "Content-Type": "application/json" };

/**
 * Validate the Authorization header against CONVEX_SYNC_SECRET env var.
 * Expected format: "Convex <deploy-key>"
 * Returns null if valid, or a 401 Response if invalid.
 */
function validateAuth(request: Request): Response | null {
  const secret = process.env.CONVEX_SYNC_SECRET;
  if (!secret) {
    // If no secret is configured, allow access (dev mode)
    return null;
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing Authorization header" }),
      { status: 401, headers: JSON_HEADERS }
    );
  }

  const expectedToken = authHeader.startsWith("Convex ")
    ? authHeader.slice(7)
    : authHeader;

  if (expectedToken !== secret) {
    return new Response(
      JSON.stringify({ error: "Invalid deploy key" }),
      { status: 401, headers: JSON_HEADERS }
    );
  }

  return null;
}

http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
      { status: 200, headers: JSON_HEADERS }
    );
  }),
});

http.route({
  path: "/api/sync/metadata",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const authError = validateAuth(request);
    if (authError) return authError;

    const url = new URL(request.url);
    const deviceId = url.searchParams.get("deviceId") ?? undefined;
    const metadata = await ctx.runQuery(api.sync.getMetadata, { deviceId });
    return new Response(JSON.stringify(metadata), {
      status: 200,
      headers: JSON_HEADERS,
    });
  }),
});

http.route({
  path: "/api/sync/export",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const authError = validateAuth(request);
    if (authError) return authError;

    const data = await ctx.runQuery(api.sync.exportAll, {});
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: JSON_HEADERS,
    });
  }),
});

http.route({
  path: "/api/sync/import",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authError = validateAuth(request);
    if (authError) return authError;

    try {
      const body = await request.json();
      const result = await ctx.runMutation(api.sync.bulkImport, {
        deviceId: body.deviceId,
        deviceName: body.deviceName,
        version: body.version,
        checksum: body.checksum,
        tables: body.tables,
      });
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: JSON_HEADERS,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }
  }),
});

export default http;
