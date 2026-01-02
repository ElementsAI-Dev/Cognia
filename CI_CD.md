# CI/CD Pipeline Documentation

This document provides comprehensive information about the CI/CD pipeline configured for this React + Next.js + Tauri project.

## Overview

The CI/CD pipeline is implemented using GitHub Actions with a **modular workflow architecture**. Each workflow focuses on a specific concern for better maintainability and faster feedback.

### Workflow Files

| Workflow | File | Purpose | Trigger |
|----------|------|---------|---------|
| **CI** | `ci.yml` | Core checks (lint, test, build) | All pushes & PRs |
| **Lint** | `lint.yml` | Extended code quality & security | All pushes & PRs |
| **Unit Tests** | `test.yml` | Jest tests with coverage | All pushes & PRs |
| **E2E Tests** | `e2e.yml` | Playwright browser tests | All pushes & PRs |
| **Build** | `build.yml` | Next.js build & deploy options | All pushes & PRs |
| **Tauri** | `tauri.yml` | Desktop app builds | Main branch & manual |
| **Release** | `release.yml` | GitHub releases | Tags (`v*`) & manual |

## Workflow Triggers

Different workflows have different triggers:

- **CI, Lint, Test, E2E, Build**: Push to `main`/`develop`, PRs to `main`/`develop`
- **Tauri**: Push to `main`, PRs to `main`, manual dispatch
- **Release**: Tags starting with `v` (e.g., `v1.0.0`), manual dispatch

## Workflow Details

### CI Workflow (`ci.yml`)

**Runs on:** All pushes and pull requests  
**Duration:** ~5-10 minutes

The main CI workflow runs three parallel jobs:

1. **Lint & Type Check** - ESLint and TypeScript validation
2. **Unit Tests** - Jest tests with coverage reporting
3. **Build** - Next.js production build verification

A final `ci-complete` job aggregates results for branch protection rules.

### Lint Workflow (`lint.yml`)

**Runs on:** All pushes and pull requests  
**Duration:** ~3-5 minutes

Extended code quality checks:

- ESLint code linting
- TypeScript type checking (`tsc --noEmit`)
- Security audit of dependencies (`pnpm audit`)
- Check for outdated dependencies

### Unit Tests Workflow (`test.yml`)

**Runs on:** All pushes and pull requests  
**Duration:** ~5-10 minutes

Comprehensive test execution:

- Runs all Jest tests with coverage
- Generates coverage reports (HTML, LCOV, Cobertura, JUnit)
- Uploads coverage artifacts
- Publishes test results as PR comments

**Coverage Thresholds (from jest.config.ts):**

- Branches: 50%
- Functions: 40%
- Lines: 55%
- Statements: 55%

### E2E Tests Workflow (`e2e.yml`)

**Runs on:** All pushes and pull requests  
**Duration:** ~10-20 minutes

Playwright browser testing:

- Installs Chromium browser
- Builds application
- Runs E2E test suite
- Uploads Playwright report artifacts
- **Sharded execution** on main branch (4 parallel shards)

**Playwright Projects:**

- `unit-like` - Store and core tests
- `features` - Feature-specific tests
- `integration` - Integration tests (depends on unit-like)

### Build Workflow (`build.yml`)

**Runs on:** All pushes and pull requests  
**Duration:** ~5-10 minutes

Next.js build and optional deployments:

- Production build verification
- Bundle size analysis
- Build artifact upload

**Optional Deployments (disabled by default):**

- Vercel Preview deployments (PRs)
- Vercel Production deployments (main branch)

To enable, uncomment the deployment jobs and configure secrets:

- `VERCEL_TOKEN` - Vercel deployment token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID

### Tauri Workflow (`tauri.yml`)

**Runs on:** Push to `main`, PRs to `main`, manual dispatch  
**Duration:** ~15-30 minutes per platform

Features:

- **Smart change detection** - Only builds when Tauri-related files change
- **Configuration validation** - Validates `tauri.conf.json` before building
- **Multi-platform matrix** - Builds for Linux, Windows, macOS (x64 & ARM64)
- **Build summary** - Aggregates results in workflow summary

Builds cross-platform desktop applications for:

- **Linux** (x86_64): AppImage and .deb packages
- **Windows** (x64): MSI and NSIS installers
- **macOS** (x64 and ARM64): DMG and .app bundles

**Platform-Specific Requirements:**

#### Linux (Ubuntu)

System dependencies are installed automatically:

- libgtk-3-dev, libwebkit2gtk-4.1-dev
- libappindicator3-dev, librsvg2-dev
- patchelf, libssl-dev

#### Windows

**Optional Code Signing:**

- `WINDOWS_CERTIFICATE` - Base64-encoded PFX certificate
- `WINDOWS_CERTIFICATE_PASSWORD` - Certificate password

#### macOS

**Optional Code Signing and Notarization:**

- `APPLE_CERTIFICATE` - Base64-encoded .p12 certificate
- `APPLE_CERTIFICATE_PASSWORD` - Certificate password
- `APPLE_SIGNING_IDENTITY` - Developer ID Application identity
- `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`

### Release Workflow (`release.yml`)

**Runs on:** Tags starting with `v`, manual dispatch  
**Duration:** ~30-45 minutes

Features:

- **Quality gate** - Runs lint, type check, and tests before building
- **Multi-platform builds** - Builds all platforms with release optimizations
- **Automatic changelog** - Generates changelog from commits
- **Draft releases** - Creates draft for review before publishing

**How to Create a Release:**

```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0
```

**Manual Release:**

You can also trigger releases manually via GitHub Actions UI with custom tag names.

The release will be created as a **draft** with:

- Auto-generated changelog from commits
- All platform-specific installers attached
- Pre-release flag for tags containing `-` (e.g., `v1.0.0-beta.1`)

## Caching Strategy

The pipeline uses multiple caching strategies to improve performance:

1. **pnpm Store Cache** - Caches downloaded packages
2. **Next.js Build Cache** - Caches Next.js build outputs
3. **Rust Cache** - Caches Rust dependencies and build artifacts

**Expected Speed Improvements:**

- First run: ~15-25 minutes (full build)
- Cached runs: ~5-10 minutes (incremental build)

## Concurrency Control

The pipeline uses concurrency groups to automatically cancel outdated workflow runs when new commits are pushed to the same branch or PR.

**Configuration:**

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

## Artifacts

All jobs upload artifacts that are retained for 7-30 days:

| Artifact | Retention | Description |
|----------|-----------|-------------|
| `test-results` | 30 days | JUnit XML test results |
| `coverage-report` | 30 days | HTML coverage reports |
| `nextjs-build` | 7 days | Built Next.js application |
| `tauri-*` | 30 days | Platform-specific installers |

## Required GitHub Secrets

### For Preview/Production Deployments (Optional)

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

### For Codecov Integration (Optional)

- `CODECOV_TOKEN`

### For Windows Code Signing (Optional)

- `WINDOWS_CERTIFICATE`
- `WINDOWS_CERTIFICATE_PASSWORD`

### For macOS Code Signing (Optional)

- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_ID`
- `APPLE_PASSWORD`
- `APPLE_TEAM_ID`

## Troubleshooting

### Tests Failing in CI but Passing Locally

1. Check Node.js version matches (20.x)
2. Ensure `pnpm-lock.yaml` is committed
3. Check for environment-specific issues
4. Review test logs in GitHub Actions

### Tauri Build Failing

1. **Linux:** Check system dependencies are installed
2. **Windows:** Verify Rust toolchain is properly set up
3. **macOS:** Check Xcode Command Line Tools are available
4. Review Tauri configuration in `src-tauri/tauri.conf.json`

### Code Signing Issues

1. Verify secrets are properly set in GitHub
2. Check certificate validity and expiration
3. Ensure signing identity matches certificate
4. Review Tauri documentation for platform-specific requirements

### Deployment Failures

1. Verify all required secrets are set
2. Check Vercel project configuration
3. Review deployment logs in GitHub Actions
4. Ensure build artifacts are generated correctly

## Best Practices

1. **Always test locally** before pushing
2. **Use feature branches** for development
3. **Create pull requests** for code review
4. **Tag releases** with semantic versioning (v1.0.0)
5. **Review draft releases** before publishing
6. **Monitor CI/CD costs** and optimize as needed
7. **Keep dependencies updated** regularly
8. **Review security audit** results

## Monitoring and Notifications

### GitHub Actions Dashboard

View workflow runs at: `https://github.com/YOUR_ORG/YOUR_REPO/actions`

### Email Notifications

Configure in: `Settings > Notifications > Actions`

### Slack Integration (Optional)

Add Slack notifications using the `slack-send` action.

## Cost Optimization

### GitHub Actions Minutes

- **Free tier:** 2,000 minutes/month for private repos
- **Paid plans:** Additional minutes available

### Optimization Tips

1. Use caching effectively (already implemented)
2. Cancel outdated runs (already implemented)
3. Run expensive jobs only when needed
4. Consider self-hosted runners for heavy workloads

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Tauri Documentation](https://tauri.app/v1/guides/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [Code Signing Guide](https://tauri.app/v1/guides/distribution/sign-macos)
