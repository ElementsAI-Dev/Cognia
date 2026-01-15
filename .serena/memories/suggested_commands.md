# Suggested Commands for Cognia Development

## Essential Commands (Windows)

### Development

```bash
# Start Next.js dev server (localhost:3000)
pnpm dev

# Start Tauri dev mode (desktop app)
pnpm tauri dev

# Production build (generates out/ for Tauri)
pnpm build

# Serve production build
pnpm start
```

### Testing

```bash
# Run all Jest unit tests
pnpm test

# Jest watch mode
pnpm test:watch

# Jest with coverage report
pnpm test:coverage

# Run specific test file
pnpm test lib/ai/agent/agent-executor.test.ts

# Run tests matching pattern
pnpm test -- --testNamePattern="should execute agent"

# Run Playwright E2E tests
pnpm test:e2e

# Playwright UI mode
pnpm test:e2e:ui

# Playwright headed browser
pnpm test:e2e:headed
```

### Code Quality

```bash
# Run ESLint
pnpm lint

# Auto-fix ESLint issues
pnpm lint --fix

# Type check (strict mode)
pnpm exec tsc --noEmit
```

### Tauri Desktop

```bash
# Build desktop binaries
pnpm tauri build

# Check Tauri environment
pnpm tauri info
```

### Internationalization

```bash
# Process all i18n
pnpm i18n:all

# Extract translations
pnpm i18n:extract

# Generate translations
pnpm i18n:generate

# Update translations
pnpm i18n:update

# Merge translations
pnpm i18n:merge
```

## Windows Utility Commands

```powershell
# List directory
dir

# Change directory
cd path

# Find files
dir /s filename

# Grep equivalent (PowerShell)
Select-String -Pattern "pattern" -Path .\*.ts

# Kill process on port
pnpm kill-port
```

## Adding Dependencies

```bash
# Add runtime dependency
pnpm add package-name

# Add dev dependency
pnpm add -D package-name

# Add shadcn component
pnpm dlx shadcn@latest add component-name
```
