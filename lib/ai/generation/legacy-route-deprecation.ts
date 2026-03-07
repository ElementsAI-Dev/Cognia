import { NextResponse } from "next/server";
import { getGenerationCapabilityById } from "./capability-registry";

export type LegacyGenerationRoutePath =
  | "/api/generate-preset"
  | "/api/optimize-prompt"
  | "/api/enhance-builtin-prompt"
  | "/api/prompt-self-optimize";

export const LEGACY_GENERATION_ROUTE_CAPABILITY: Record<
  LegacyGenerationRoutePath,
  string
> = {
  "/api/generate-preset": "legacy-generate-preset-route",
  "/api/optimize-prompt": "legacy-optimize-prompt-route",
  "/api/enhance-builtin-prompt": "legacy-enhance-builtin-prompt-route",
  "/api/prompt-self-optimize": "legacy-prompt-self-optimize-route",
};

export const LEGACY_ROUTE_STATUS_HEADER = "x-cognia-generation-route-status";
export const LEGACY_ROUTE_CAPABILITY_HEADER = "x-cognia-generation-capability-id";
export const LEGACY_ROUTE_MIGRATION_HEADER = "x-cognia-migration-target";
export const LEGACY_ROUTE_SUNSET_HEADER = "x-cognia-legacy-route-sunset";

const DEFAULT_SUNSET = "planned";

export function applyLegacyGenerationRouteHeaders<T>(
  response: NextResponse<T>,
  routePath: LegacyGenerationRoutePath
): NextResponse<T> {
  const capabilityId = LEGACY_GENERATION_ROUTE_CAPABILITY[routePath];
  const capability = getGenerationCapabilityById(capabilityId);

  response.headers.set(LEGACY_ROUTE_STATUS_HEADER, capability?.status ?? "deprecated-compat");
  response.headers.set(LEGACY_ROUTE_CAPABILITY_HEADER, capabilityId);
  response.headers.set(
    LEGACY_ROUTE_MIGRATION_HEADER,
    capability?.migrationTarget ?? "See docs/ai/legacy-generation-routes.md"
  );
  response.headers.set(LEGACY_ROUTE_SUNSET_HEADER, DEFAULT_SUNSET);
  response.headers.set("deprecation", "true");

  return response;
}

