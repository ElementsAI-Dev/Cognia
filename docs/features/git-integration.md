# Git Integration

Cognia's Git integration provides a desktop-first repository workspace for opening, initializing, cloning, inspecting, and recovering Git repositories across both the dedicated Git page and project-level Git panels.

## Overview

| Feature | Description |
|---------|-------------|
| **Tracked Repositories** | Reuse recently opened, initialized, cloned, or project-linked repositories without retyping paths |
| **Repository Onboarding** | Open an existing repo, initialize a directory, or clone a remote repository from the Git landing page |
| **Shared Project Git Workflow** | Enable Git for a project using the same tracked repository registry and validation flow |
| **Branch and Sync Actions** | Create from a start point, rename branches, fetch, push, pull, and manage remotes |
| **Recovery Guardrails** | Detect merge/revert/cherry-pick recovery states, show guidance, and surface abort actions |
| **Commit Composer** | Shared commit dialog showing staged vs. unstaged changes and explicit auto-stage behavior |

## Architecture

```text
app/(main)/git/page.tsx            → Main Git workspace and onboarding flows
components/git/                    → Shared Git UI panels and commit composer
components/projects/               → Project-level Git integration panel
hooks/native/use-git.ts            → Shared Git orchestration hook
stores/git/git-store.ts            → Persisted Git state, tracked repo registry, repo status
lib/native/git/**                  → Tauri/native Git service wrappers
src-tauri/src/commands/devtools/   → Desktop Git command implementations and status contracts
```

## Workflow

1. Open the **Git** page from the sidebar.
2. Choose one of the onboarding paths:
   - Open a repository by path
   - Initialize a selected directory as a repository
   - Clone a remote repository into a target directory
   - Reopen a tracked repository from the persisted registry
3. Use the shared Git panel to inspect changes, branches, history, stash, tags, remotes, stats, blame, and search.
4. Commit changes through the shared commit composer, which makes auto-stage behavior explicit.
5. If the repository enters merge/revert/cherry-pick recovery, use the recovery banner to abort or resolve before continuing.

## Repository Status Semantics

`GitRepoInfo` now carries status hints beyond the basic clean/dirty flag:

- `syncState`: `local-only`, `up-to-date`, `ahead`, `behind`, or `diverged`
- `hasConflicts`: whether unresolved conflicts are present
- `inProgressOperation`: `merge`, `revert`, or `cherry-pick` when recovery is required
- `canAbortOperation`: whether the current in-progress operation can be aborted
- `recommendedRecoveryAction`: user-facing guidance for the next safe action

These hints are consumed by the main Git page, sidebar Git panel, and project Git panel so all entry points present the same repository state.

## Verification Traceability

| Capability Scenario | Verification |
|---------------------|-------------|
| Tracked repositories are reusable | `stores/git/git-store.test.ts`, `hooks/native/use-git.test.ts`, `app/(main)/git/page.test.tsx` |
| Non-repository directory can be initialized | `app/(main)/git/page.test.tsx`, `components/projects/project-git-panel.test.tsx` |
| Remote repository can be cloned from onboarding | `app/(main)/git/page.test.tsx`, `e2e/features/git.spec.ts` |
| Project Git enablement uses the same repo registry | `stores/git/git-store.test.ts`, `components/projects/project-git-panel.test.tsx` |
| Advanced branch actions are available | `components/git/git-branch-manager.test.tsx`, `components/git/git-panel.test.tsx` |
| Sync readiness is explicit | `components/git/git-panel.test.tsx`, `components/projects/project-git-panel.test.tsx`, `e2e/features/git.spec.ts` |
| Remote changes stay consistent across surfaces | `stores/git/git-store.test.ts`, `components/git/git-panel.test.tsx` |
| Recovery state is visible and unsafe actions are gated | `components/git/git-panel.test.tsx`, `components/projects/project-git-panel.test.tsx` |
| Recovery actions refresh repository state | `stores/git/git-store.test.ts`, `hooks/native/use-git.test.ts` |
| Commit policy is explicit | `components/git/git-panel.test.tsx`, `components/projects/project-git-panel.test.tsx` |

## Notes

- Git functionality remains desktop-only because it depends on Tauri native commands.
- Tracked repositories persist in the Git store and are backward-compatible with legacy string-based saved data.
- Recovery controls intentionally prioritize safe abort/resolution over exposing every possible low-level Git continuation path in the first UI pass.
