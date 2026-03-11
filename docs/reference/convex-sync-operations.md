# Convex Sync Operations Reference

- Last verified: 2026-03-10
- Scope: runtime and operator contract for Cognia Convex sync endpoints.

## 1. URL Semantics

- Settings input accepts Convex deployment-style URL values (`*.convex.cloud`) and HTTP actions URL values (`*.convex.site`).
- Sync runtime resolves the canonical HTTP actions base URL before calling:
  - `/health`
  - `/api/sync/metadata`
  - `/api/sync/export`
  - `/api/sync/import`
- Recommended input: keep using the deployment URL shown in Convex dashboard. Runtime normalization handles the HTTP actions host conversion.

## 2. Authentication Contract

- Sync endpoints use `Authorization: Convex <deploy-key>`.
- `CONVEX_SYNC_SECRET` is the server-side expected key.
- In production-like runtime (`NODE_ENV=production` or `CONVEX_ENV=production|prod`), missing `CONVEX_SYNC_SECRET` fails closed and returns a configuration error.
- Common error codes:
  - `sync_auth_missing`
  - `sync_auth_invalid`
  - `sync_auth_not_configured`

## 3. CORS Contract

- `OPTIONS` preflight is supported for all sync routes.
- Configure allowlist with `CONVEX_SYNC_ALLOWED_ORIGINS` (comma-separated origins).
- If allowlist is set, non-matching origins are rejected with `sync_origin_not_allowed`.
- In local/dev mode without allowlist, origin reflection is allowed for easier testing.

## 4. Large Dataset Transfer

- Export uses paged contract: `GET /api/sync/export?table=<table>&limit=<n>&cursor=<cursor>`.
- Client iterates pages until `isDone=true`.
- Import is bounded per request and processed in chunks; client sends multiple `/api/sync/import` requests when needed.
- Legacy one-shot export remains as compatibility fallback.

## 5. Deletion Reconciliation

- Uploads can use authoritative reconciliation metadata:
  - `reconciliation.mode = "authoritative"`
  - `reconciliation.replaceTables = [<table>]` on first chunk per table
- Server clears replaced table scope before inserting chunked rows.
- Only included sync data types/tables are reconciled; excluded types are untouched.

## 6. Desktop (Tauri) Runtime Notes

- Tauri settings flow attempts native Convex config + connection check via `lib/native/convex.ts`.
- Web/provider-based path remains as fallback.
- Deploy key remains secure-storage only and is not persisted in cleartext Convex config files.

