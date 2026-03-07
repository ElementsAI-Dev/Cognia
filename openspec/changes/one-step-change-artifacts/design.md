## Context

OpenSpec planning is currently fragmented across multiple manual commands, which makes proposal quality inconsistent and slows handoff to implementation. The target workflow creates a change and all apply-required planning artifacts in one run, while preserving schema-driven ordering and artifact dependencies.

## Goals / Non-Goals

**Goals:**
- Provide a single orchestration flow to create a change and generate planning artifacts until apply-ready.
- Enforce dependency-aware artifact generation by reading artifact status after each write.
- Produce artifact content from OpenSpec instruction payloads (template + instruction + dependencies) rather than hard-coded file structures.
- Surface clear completion output that tells users when `/opsx:apply` can start implementation.

**Non-Goals:**
- Replacing OpenSpec schema semantics or artifact definitions.
- Auto-implementing code tasks after artifact generation.
- Introducing new artifact types outside the active schema.

## Decisions

### Decision: Derive change name from user intent when explicit name is not provided
- Rationale: Keeps the flow fast and avoids forcing users to provide exact kebab-case upfront.
- Alternative considered: Reject requests without explicit kebab-case input.
- Why not chosen: Creates unnecessary friction for natural-language requests.

### Decision: Treat `openspec status --change <name> --json` as the source of truth for ordering
- Rationale: Status output directly reflects dependency readiness and `applyRequires`, avoiding drift from static assumptions.
- Alternative considered: Hard-code artifact order (`proposal -> design/specs -> tasks`).
- Why not chosen: Breaks if schema or dependency graph changes.

### Decision: Generate each artifact using `openspec instructions <artifact> --json`
- Rationale: Ensures artifact content follows schema-specific rules and templates.
- Alternative considered: Use local generic templates per artifact type.
- Why not chosen: Risks divergence from schema guidance and validation expectations.

### Decision: Stop when all `applyRequires` artifacts are done
- Rationale: Matches implementation readiness contract and avoids unnecessary work for optional artifacts.
- Alternative considered: Always generate every possible artifact.
- Why not chosen: Can add cost/time without improving apply readiness.

## Risks / Trade-offs

- [Risk] Incorrectly inferred change name from vague descriptions.
  - Mitigation: Ask for clarification only when intent is critically ambiguous; otherwise pick a clear, deterministic kebab-case name.
- [Risk] Artifact content misses essential context if dependency files are not read.
  - Mitigation: Read dependency artifact files before generating dependent artifacts.
- [Risk] Silent failure due to invalid spec formatting (especially scenario heading level).
  - Mitigation: Enforce `#### Scenario` format and include at least one scenario per requirement.
- [Trade-off] Strict dependency sequencing may increase runtime for larger schemas.
  - Mitigation: Keep status checks lightweight and only iterate while apply-required artifacts remain incomplete.

## Migration Plan

1. Integrate the one-step proposal flow into the existing `/opsx:propose` path.
2. Validate behavior on a fresh repository and one with existing changes/specs.
3. Confirm generated artifacts satisfy `openspec status --change <name>` apply readiness.
4. Document user-facing output and troubleshooting for ambiguous requests.

Rollback:
- Revert to manual multi-command OpenSpec artifact creation if orchestration fails.
- Since this is planning workflow logic, rollback does not require data migrations.

## Open Questions

- Should the flow create non-required artifacts after apply-ready is reached when they are optional but useful?
- Should deterministic naming rules be standardized (for example, maximum length and stop-word trimming)?
