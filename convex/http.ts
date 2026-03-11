import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

export type SyncHttpErrorCode =
  | "sync_auth_missing"
  | "sync_auth_invalid"
  | "sync_auth_not_configured"
  | "sync_origin_not_allowed"
  | "sync_bad_request";

export interface SyncHttpErrorPayload {
  code: SyncHttpErrorCode;
  error: string;
  message: string;
}

const ALLOWED_METHODS = "GET,POST,OPTIONS";
const ALLOWED_HEADERS = "Content-Type,Authorization";
const JSON_CONTENT_TYPE = "application/json";
const CORS_ALLOWLIST_ENV = "CONVEX_SYNC_ALLOWED_ORIGINS";
const SYNC_SECRET_ENV = "CONVEX_SYNC_SECRET";

function isProductionLikeRuntime(): boolean {
  const nodeEnv = (process.env.NODE_ENV ?? "").toLowerCase();
  if (nodeEnv === "production") return true;
  const convexEnv = (process.env.CONVEX_ENV ?? "").toLowerCase();
  return convexEnv === "production" || convexEnv === "prod";
}

export function parseAllowedOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function buildCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  const allowedOrigins = parseAllowedOrigins(process.env[CORS_ALLOWLIST_ENV]);

  const headers: Record<string, string> = {
    Vary: "Origin",
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Max-Age": "86400",
  };

  if (!origin) {
    return headers;
  }

  // If an allowlist is configured, enforce it. In local/dev fallback, reflect
  // origin to keep browser testing practical.
  if (allowedOrigins.length > 0) {
    if (allowedOrigins.includes(origin)) {
      headers["Access-Control-Allow-Origin"] = origin;
    }
    return headers;
  }

  if (!isProductionLikeRuntime()) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function jsonResponse(
  request: Request,
  status: number,
  payload: unknown
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": JSON_CONTENT_TYPE,
      ...buildCorsHeaders(request),
    },
  });
}

function errorResponse(
  request: Request,
  status: number,
  code: SyncHttpErrorCode,
  message: string
): Response {
  const payload: SyncHttpErrorPayload = {
    code,
    error: message,
    message,
  };
  return jsonResponse(request, status, payload);
}

function validateOrigin(request: Request): Response | null {
  const origin = request.headers.get("Origin");
  if (!origin) return null;

  const allowlist = parseAllowedOrigins(process.env[CORS_ALLOWLIST_ENV]);
  if (allowlist.length === 0) return null;
  if (allowlist.includes(origin)) return null;

  return errorResponse(
    request,
    403,
    "sync_origin_not_allowed",
    "Origin is not allowed"
  );
}

function validateAuth(request: Request): Response | null {
  const secret = process.env[SYNC_SECRET_ENV];
  if (!secret) {
    if (!isProductionLikeRuntime()) {
      // Dev fallback keeps local setup friction low.
      return null;
    }
    return errorResponse(
      request,
      500,
      "sync_auth_not_configured",
      "Sync authentication secret is not configured"
    );
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return errorResponse(
      request,
      401,
      "sync_auth_missing",
      "Missing Authorization header"
    );
  }

  const providedToken = authHeader.startsWith("Convex ")
    ? authHeader.slice(7)
    : authHeader;

  if (providedToken !== secret) {
    return errorResponse(request, 401, "sync_auth_invalid", "Invalid deploy key");
  }

  return null;
}

function handlePreflight(request: Request): Response {
  const originError = validateOrigin(request);
  if (originError) return originError;

  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(request),
  });
}

http.route({
  path: "/health",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => handlePreflight(request)),
});

http.route({
  path: "/api/sync/metadata",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => handlePreflight(request)),
});

http.route({
  path: "/api/sync/export",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => handlePreflight(request)),
});

http.route({
  path: "/api/sync/import",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => handlePreflight(request)),
});

http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    return jsonResponse(request, 200, {
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  }),
});

http.route({
  path: "/api/sync/metadata",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const originError = validateOrigin(request);
    if (originError) return originError;

    const authError = validateAuth(request);
    if (authError) return authError;

    const url = new URL(request.url);
    const deviceId = url.searchParams.get("deviceId") ?? undefined;
    const metadata = await ctx.runQuery(api.sync.getMetadata, { deviceId });
    return jsonResponse(request, 200, metadata);
  }),
});

http.route({
  path: "/api/sync/export",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const originError = validateOrigin(request);
    if (originError) return originError;

    const authError = validateAuth(request);
    if (authError) return authError;

    const url = new URL(request.url);
    const table = url.searchParams.get("table");
    const cursor = url.searchParams.get("cursor");
    const limitRaw = url.searchParams.get("limit");

    if (!table) {
      // Legacy compatibility path.
      const legacy = await ctx.runQuery(api.sync.exportAll, {});
      return jsonResponse(request, 200, legacy);
    }

    const limit = limitRaw ? Number(limitRaw) : 250;
    if (!Number.isFinite(limit) || limit <= 0 || limit > 1000) {
      return errorResponse(
        request,
        400,
        "sync_bad_request",
        "Invalid export limit"
      );
    }

    try {
      const page = await ctx.runQuery(api.sync.exportPage, {
        table,
        cursor: cursor ?? undefined,
        limit,
      });
      return jsonResponse(request, 200, page);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return errorResponse(request, 400, "sync_bad_request", message);
    }
  }),
});

http.route({
  path: "/api/sync/import",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const originError = validateOrigin(request);
    if (originError) return originError;

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
        reconciliation: body.reconciliation,
      });
      return jsonResponse(request, 200, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return errorResponse(request, 400, "sync_bad_request", message);
    }
  }),
});

export default http;

