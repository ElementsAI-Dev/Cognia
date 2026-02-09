---
description: Manage project dependencies — install, remove, update, and audit packages for both Node.js and Rust.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Parse Arguments**: Determine action:
   - `add <package>` — Install new package
   - `remove <package>` — Remove package
   - `update [package]` — Update specific or all packages
   - `audit` — Security audit
   - `check` — Check outdated packages
   - `--dev` — Install as devDependency
   - `--rust` — Manage Cargo dependencies

2. **Add Package (Node.js)**:

   ```bash
   # Production dependency
   pnpm add <package>

   # Dev dependency
   pnpm add -D <package>

   # Specific version
   pnpm add <package>@<version>

   # Multiple packages
   pnpm add <pkg1> <pkg2> <pkg3>
   ```

   After installing:
   - Check for TypeScript types: `pnpm add -D @types/<package>` if needed
   - Verify no peer dependency warnings
   - Update imports in code if replacing a package

3. **Add Package (Rust)**:

   ```bash
   # Add to Cargo.toml
   cd src-tauri && cargo add <crate>

   # With features
   cd src-tauri && cargo add <crate> --features <feature1>,<feature2>

   # Specific version
   cd src-tauri && cargo add <crate>@<version>
   ```

4. **Remove Package (Node.js)**:

   ```bash
   pnpm remove <package>
   ```

   After removing:
   - Search for remaining imports: `grep -r "<package>" --include="*.ts" --include="*.tsx"`
   - Remove unused `@types/<package>` if applicable
   - Clean up any configuration files

5. **Remove Package (Rust)**:

   ```bash
   cd src-tauri && cargo remove <crate>
   ```

   After removing:
   - Check for `use <crate>` imports in Rust files
   - Run `cargo check` to verify

6. **Update Packages**:

   ```bash
   # Check outdated (Node.js)
   pnpm outdated

   # Update specific package
   pnpm update <package>

   # Update all (respecting semver)
   pnpm update

   # Update to latest (ignore semver)
   pnpm update <package> --latest

   # Check outdated (Rust)
   cd src-tauri && cargo outdated

   # Update Rust dependencies
   cd src-tauri && cargo update
   ```

7. **Security Audit**:

   ```bash
   # Node.js audit
   pnpm audit

   # Fix known vulnerabilities
   pnpm audit --fix

   # Rust audit (requires cargo-audit)
   cd src-tauri && cargo audit
   ```

8. **Post-Install Verification**:

   ```bash
   # Type check
   pnpm tsc --noEmit

   # Lint check
   pnpm lint

   # Run tests
   pnpm test

   # Rust check
   cd src-tauri && cargo check
   ```

## Common Packages Reference

### UI & Styling

| Package | Purpose |
|---------|---------|
| `@radix-ui/*` | Headless UI primitives |
| `class-variance-authority` | Variant styling |
| `tailwind-merge` | Tailwind class merging |
| `lucide-react` | Icons |
| `framer-motion` | Animations |
| `cmdk` | Command palette |

### AI & Data

| Package | Purpose |
|---------|---------|
| `@ai-sdk/*` | AI provider SDKs |
| `ai` | Vercel AI SDK core |
| `dexie` | IndexedDB wrapper |
| `zod` | Schema validation |

### Tauri

| Package | Purpose |
|---------|---------|
| `@tauri-apps/api` | Tauri JS API |
| `@tauri-apps/plugin-*` | Tauri plugins |

### Development

| Package | Purpose |
|---------|---------|
| `@testing-library/*` | Testing utilities |
| `jest` | Test runner |
| `playwright` | E2E testing |
| `eslint` | Linting |

## Dependency Guidelines

- **pnpm only** — Never use npm or yarn
- **Pin versions** for critical packages (AI SDKs, Tauri)
- **Use caret `^`** for UI libraries and utilities
- **Check bundle size** before adding new dependencies: `npx bundlephobia <package>`
- **Prefer established libraries** over obscure alternatives
- **Check license compatibility** for production dependencies
- **Avoid duplicate functionality** — check if existing deps cover the need

## Notes

- Always run `pnpm install` after pulling changes with new dependencies
- Update `pnpm-lock.yaml` — never delete it
- For Tauri plugins, also update `capabilities/default.json` if permissions needed
- Check `__mocks__/` directory — new packages may need mocks for tests
