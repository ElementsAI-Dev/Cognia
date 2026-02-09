---
description: Check and configure development environment — verify Node.js, pnpm, Rust, ports, and dependencies are ready.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Parse Arguments**: Determine scope:
   - No arguments: Full environment check
   - `--node` — Check Node.js/pnpm only
   - `--rust` — Check Rust/Tauri only
   - `--fix` — Auto-fix common issues
   - `--ports` — Check port availability
   - `--clean` — Clean build artifacts and caches

2. **Node.js Environment**:

   ```bash
   # Check Node.js version (requires 18+)
   node --version

   # Check pnpm version
   pnpm --version

   # Check if node_modules exists
   ls node_modules/.package-lock.json 2>$null

   # Install dependencies if needed
   pnpm install
   ```

   **Expected Versions**:

   | Tool | Minimum | Recommended |
   |------|---------|-------------|
   | Node.js | 18.0.0 | 20.x LTS |
   | pnpm | 8.0.0 | 9.x |

3. **Rust/Tauri Environment**:

   ```bash
   # Check Rust version (requires 1.77+)
   rustc --version

   # Check Cargo
   cargo --version

   # Check Tauri CLI
   pnpm tauri --version

   # Verify Rust project compiles
   cd src-tauri && cargo check
   ```

   **Expected Versions**:

   | Tool | Minimum | Recommended |
   |------|---------|-------------|
   | Rust | 1.77.0 | Latest stable |
   | Tauri CLI | 2.0.0 | Latest |

4. **Port Availability**:

   ```bash
   # Check if port 3000 is available (Next.js dev server)
   # Windows
   netstat -ano | findstr :3000

   # Kill process on port if needed
   pnpm kill-port
   ```

   **Default Ports**:

   | Port | Service |
   |------|---------|
   | 3000 | Next.js dev server |
   | 1420 | Tauri dev server |

5. **Environment Variables**:

   Check for `.env.local` file:

   ```bash
   # Check if .env.local exists
   ls .env.local 2>$null
   ```

   **Required variables** (may vary by feature):

   ```env
   # AI Provider Keys (at least one needed for AI features)
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   GOOGLE_GENERATIVE_AI_API_KEY=...

   # Optional
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

   **Important**: API keys are stored in localStorage at runtime, `.env.local` is only for development convenience.

6. **Build Artifacts Check**:

   ```bash
   # Check Next.js build cache
   ls .next 2>$null

   # Check Rust build artifacts
   ls src-tauri/target 2>$null

   # Check output directory
   ls out 2>$null
   ```

7. **Clean Build** (if `--clean`):

   ```bash
   # Remove Next.js cache
   rm -rf .next

   # Remove build output
   rm -rf out

   # Remove node_modules (full reinstall)
   rm -rf node_modules
   pnpm install

   # Clean Rust build (optional, can be large)
   cd src-tauri && cargo clean
   ```

8. **Configuration Files Check**:

   Verify essential config files exist:

   | File | Purpose |
   |------|---------|
   | `next.config.ts` | Next.js configuration |
   | `tsconfig.json` | TypeScript configuration |
   | `jest.config.ts` | Test configuration |
   | `eslint.config.mjs` | Lint configuration |
   | `postcss.config.mjs` | PostCSS/Tailwind |
   | `src-tauri/Cargo.toml` | Rust dependencies |
   | `src-tauri/tauri.conf.json` | Tauri configuration |

9. **Report Environment Status**:

   ```markdown
   ## Environment Status

   | Component | Status | Version | Notes |
   |-----------|--------|---------|-------|
   | Node.js | ✅ | 20.x | OK |
   | pnpm | ✅ | 9.x | OK |
   | Rust | ✅ | 1.8x | OK |
   | Tauri CLI | ✅ | 2.x | OK |
   | Dependencies | ✅ | - | Installed |
   | Port 3000 | ✅ | - | Available |
   | .env.local | ⚠️ | - | Missing API keys |

   ### Issues Found
   - [List any problems]

   ### Recommended Actions
   1. [Action items]
   ```

## Quick Commands

| Task | Command |
|------|---------|
| Install deps | `pnpm install` |
| Dev server | `pnpm dev` |
| Tauri dev | `pnpm tauri dev` |
| Kill port 3000 | `pnpm kill-port` |
| Type check | `pnpm tsc --noEmit` |
| Lint | `pnpm lint` |
| Test | `pnpm test` |
| Build | `pnpm build` |
| Rust check | `cd src-tauri && cargo check` |

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| `node_modules` missing | `pnpm install` |
| Port 3000 in use | `pnpm kill-port` |
| Rust not installed | Install via `rustup` |
| pnpm not found | `npm install -g pnpm` |
| TypeScript errors after pull | `pnpm install` then `pnpm tsc --noEmit` |
| Tauri build fails | Check `rustc --version` >= 1.77 |
| `.next` cache stale | `rm -rf .next && pnpm dev` |

## Notes

- Run this workflow after cloning the repo or pulling major changes
- Keep Rust and Node.js updated to avoid compatibility issues
- Never commit `.env.local` — it's in `.gitignore`
- For Windows, use PowerShell for best compatibility
- If Tauri dev fails, try `cd src-tauri && cargo build` first to see Rust errors
