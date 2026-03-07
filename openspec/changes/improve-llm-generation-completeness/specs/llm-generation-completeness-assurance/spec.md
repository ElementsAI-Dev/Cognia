## ADDED Requirements

### Requirement: Generation capabilities SHALL have canonical runtime ownership
The system SHALL define a canonical registry for user-facing LLM generation capabilities, including capability identifier, runtime owner, invocation surface, and lifecycle status.

#### Scenario: Capability registry completeness
- **WHEN** a generation feature is exposed to users
- **THEN** the feature MUST have exactly one canonical entry in the generation capability registry with a valid runtime owner

#### Scenario: Orphaned generation path prevention
- **WHEN** a generation API route or exported generation entrypoint exists without a mapped product capability
- **THEN** completeness verification MUST fail and report the orphaned surface

### Requirement: Generation provider resolution SHALL be consistent across capabilities
All user-facing generation capabilities SHALL resolve models through shared provider resolution logic that supports the configured provider ecosystem, including OpenAI-compatible and local providers.

#### Scenario: Supported provider execution
- **WHEN** a user selects any supported provider with valid configuration for a generation capability
- **THEN** the capability MUST execute with that provider instead of silently falling back to an unrelated provider

#### Scenario: Local/keyless provider execution
- **WHEN** a generation capability is used with a supported local provider that does not require an external API credential
- **THEN** the capability MUST allow execution based on provider-specific configuration requirements

### Requirement: Legacy generation routes SHALL provide explicit compatibility status
Legacy generation API routes kept for transition SHALL expose explicit deprecation metadata and delegate behavior to shared generation services.

#### Scenario: Deprecated route invocation
- **WHEN** a request is sent to a deprecated legacy generation route
- **THEN** the response MUST include deprecation status metadata and a migration target for callers

#### Scenario: Compatibility delegation
- **WHEN** a deprecated route remains enabled during migration
- **THEN** it MUST delegate generation behavior to the canonical shared service path instead of duplicating independent logic

### Requirement: Generation completeness SHALL be enforced by automated verification
The system SHALL include automated tests that validate capability ownership mapping, provider-resolution consistency, and legacy route status behavior.

#### Scenario: CI completeness enforcement
- **WHEN** changes are validated in CI
- **THEN** any missing capability mapping, invalid runtime owner, or provider-coverage regression MUST fail verification
