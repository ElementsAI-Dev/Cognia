---
description: Manage version releases — bump version, generate changelog, create git tags, and prepare release notes.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Parse Arguments**: Determine release type:
   - `--major` — Breaking changes (1.0.0 → 2.0.0)
   - `--minor` — New features (0.1.0 → 0.2.0)
   - `--patch` — Bug fixes (0.1.0 → 0.1.1)
   - `--pre <tag>` — Pre-release (0.1.0 → 0.1.1-beta.1)
   - `--dry-run` — Preview changes without committing

2. **Pre-Release Checks**:

   ```bash
   # Ensure clean working directory
   git status --short

   # Ensure on main/release branch
   git branch --show-current

   # Run full test suite
   pnpm test

   # Type check
   pnpm tsc --noEmit

   # Lint check
   pnpm lint

   # Build check
   pnpm build
   ```

   **Stop if**:
   - Working directory is dirty (uncommitted changes)
   - Tests fail
   - Build fails
   - Not on expected branch

3. **Determine Version**:

   ```bash
   # Read current version
   node -e "console.log(require('./package.json').version)"
   ```

   **Semver Rules**:

   | Change Type | Version Bump | Example |
   |-------------|-------------|---------|
   | Breaking API change | Major | 1.2.3 → 2.0.0 |
   | New feature (backward compatible) | Minor | 1.2.3 → 1.3.0 |
   | Bug fix | Patch | 1.2.3 → 1.2.4 |
   | Pre-release | Pre | 1.2.3 → 1.2.4-beta.1 |

4. **Generate Changelog**:

   Scan commits since last tag:

   ```bash
   # Get commits since last tag
   git log $(git describe --tags --abbrev=0)..HEAD --oneline --no-merges
   ```

   **Changelog Format** (`CHANGELOG.md`):

   ```markdown
   ## [X.Y.Z] - YYYY-MM-DD

   ### Added
   - feat(scope): Description of new feature

   ### Fixed
   - fix(scope): Description of bug fix

   ### Changed
   - refactor(scope): Description of change

   ### Removed
   - chore(scope): Description of removal

   ### Performance
   - perf(scope): Description of optimization
   ```

   Group commits by conventional commit type:
   - `feat` → Added
   - `fix` → Fixed
   - `refactor`, `style` → Changed
   - `perf` → Performance
   - `chore` with removals → Removed

5. **Update Version**:

   **package.json**:

   ```bash
   # Update version in package.json
   npm version <major|minor|patch> --no-git-tag-version
   ```

   **Cargo.toml** (if Tauri):

   ```toml
   [package]
   version = "X.Y.Z"
   ```

   **tauri.conf.json**:

   ```json
   {
     "version": "X.Y.Z"
   }
   ```

6. **Commit and Tag**:

   ```bash
   # Stage changes
   git add package.json CHANGELOG.md

   # Also stage Cargo.toml and tauri.conf.json if updated
   git add src-tauri/Cargo.toml src-tauri/tauri.conf.json

   # Commit
   git commit -m "chore(release): v<version>"

   # Create annotated tag
   git tag -a v<version> -m "Release v<version>"
   ```

7. **Push Release**:

   ```bash
   # Push commit and tag
   git push origin main
   git push origin v<version>
   ```

8. **Generate Release Notes** (for GitHub):

   ```markdown
   # Release v<version>

   ## Highlights
   - [Key feature or fix summary]

   ## What's Changed

   ### New Features
   - Description (#PR)

   ### Bug Fixes
   - Description (#PR)

   ### Other Changes
   - Description (#PR)

   ## Full Changelog
   https://github.com/<owner>/<repo>/compare/v<prev>...v<version>
   ```

## Version Files to Update

| File | Field | Example |
|------|-------|---------|
| `package.json` | `version` | `"0.2.0"` |
| `src-tauri/Cargo.toml` | `version` | `"0.2.0"` |
| `src-tauri/tauri.conf.json` | `version` | `"0.2.0"` |
| `CHANGELOG.md` | New entry | `## [0.2.0]` |

## Release Checklist

- [ ] All tests pass
- [ ] Build succeeds
- [ ] Clean git state
- [ ] Version bumped in all files
- [ ] CHANGELOG.md updated
- [ ] Commit message follows convention
- [ ] Git tag created
- [ ] Pushed to remote

## Notes

- Keep versions in sync across package.json, Cargo.toml, and tauri.conf.json
- Use `--dry-run` to preview before actual release
- Pre-releases (beta, alpha, rc) don't need full changelog
- For hotfixes, branch from the tag: `git checkout -b hotfix/v1.0.1 v1.0.0`
- CI/CD may automatically build and publish on tag push
