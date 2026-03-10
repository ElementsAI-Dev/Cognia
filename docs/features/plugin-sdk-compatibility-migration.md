# Plugin SDK Compatibility Migration

This guide covers migration for plugins impacted by stricter SDK-to-host compatibility checks.

## What Changed

- Host runtime now evaluates manifest compatibility before plugin activation.
- Validation diagnostics are structured (field, code, message, hint) for actionable remediation.
- Python/hybrid plugins require `pythonMain` in manifest validation and packaging checks.
- SDK docs command smoke checks and readiness gates now run in CI.

## Required Manifest Updates

Add explicit engines metadata:

```json
{
  "engines": {
    "cognia": ">=0.1.0"
  }
}
```

For Python/hybrid plugins:

```json
{
  "pythonMain": "main.py",
  "engines": {
    "cognia": ">=0.1.0",
    "python": ">=3.10.0"
  }
}
```

## Compatibility Modes

- `warn`: logs compatibility errors but allows plugin load.
- `block`: rejects incompatible plugins during install/load.

Use `warn` for initial migration and switch to `block` after all plugins satisfy compatibility checks.

## Validation Workflow

```bash
# TypeScript
cognia-plugin validate --strict

# Python
cognia manifest --validate
```

## Troubleshooting

- `compat.cognia_engine_missing`: add `engines.cognia` to `plugin.json`.
- `compat.cognia_engine_mismatch`: upgrade host or widen plugin version range.
- `compat.python_runtime_unavailable`: enable Python runtime in host.
- `compat.python_engine_mismatch`: use a compatible Python version or update `engines.python`.

