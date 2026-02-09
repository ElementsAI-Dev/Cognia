---
description: Git operations — branch management, merging, rebasing, stashing, cherry-picking, and history inspection.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Parse Arguments**: Determine operation:
   - `branch <name>` — Create and switch branch
   - `merge <branch>` — Merge branch into current
   - `rebase <branch>` — Rebase current onto branch
   - `stash [pop|list|drop]` — Stash management
   - `cherry-pick <commit>` — Apply specific commit
   - `log [--count N]` — View history
   - `diff [--staged]` — View changes
   - `reset [--soft|--hard] <ref>` — Reset changes
   - `status` — View current status
   - `blame <file>` — View file history
   - `bisect` — Binary search for bug introduction
   - `clean` — Remove untracked files

2. **Branch Operations**:

   ```bash
   # Create and switch to new branch
   git checkout -b <branch-name>

   # Create branch from specific commit
   git checkout -b <branch-name> <commit-hash>

   # List all branches
   git branch -a

   # Delete local branch
   git branch -d <branch-name>

   # Delete remote branch
   git push origin --delete <branch-name>

   # Rename current branch
   git branch -m <new-name>
   ```

   **Branch Naming Convention**:

   | Prefix | Use Case | Example |
   |--------|----------|---------|
   | `feature/` | New feature | `feature/chat-export` |
   | `fix/` | Bug fix | `fix/hydration-error` |
   | `hotfix/` | Urgent fix | `hotfix/v1.0.1` |
   | `refactor/` | Code refactoring | `refactor/store-cleanup` |
   | `chore/` | Maintenance | `chore/update-deps` |
   | `docs/` | Documentation | `docs/api-reference` |

3. **Merge Operations**:

   ```bash
   # Merge branch (with merge commit)
   git merge <branch-name>

   # Merge with no fast-forward (always create merge commit)
   git merge --no-ff <branch-name>

   # Abort merge on conflict
   git merge --abort

   # Squash merge (combine all commits into one)
   git merge --squash <branch-name>
   git commit -m "feat(scope): description"
   ```

4. **Rebase Operations**:

   ```bash
   # Rebase onto target branch
   git rebase <target-branch>

   # Interactive rebase (squash, reword, reorder)
   git rebase -i HEAD~<N>

   # Continue after resolving conflicts
   git rebase --continue

   # Abort rebase
   git rebase --abort
   ```

   **Interactive Rebase Commands**:

   | Command | Action |
   |---------|--------|
   | `pick` | Keep commit as-is |
   | `reword` | Change commit message |
   | `squash` | Combine with previous commit |
   | `fixup` | Combine, discard message |
   | `drop` | Remove commit |

5. **Stash Operations**:

   ```bash
   # Stash current changes
   git stash push -m "description of changes"

   # Stash including untracked files
   git stash push -u -m "with untracked"

   # List stashes
   git stash list

   # Apply most recent stash
   git stash pop

   # Apply specific stash
   git stash apply stash@{N}

   # Drop specific stash
   git stash drop stash@{N}

   # Clear all stashes
   git stash clear
   ```

6. **Cherry-Pick**:

   ```bash
   # Apply specific commit
   git cherry-pick <commit-hash>

   # Cherry-pick without committing
   git cherry-pick --no-commit <commit-hash>

   # Cherry-pick range
   git cherry-pick <start-hash>..<end-hash>

   # Abort on conflict
   git cherry-pick --abort
   ```

7. **History & Inspection**:

   ```bash
   # Compact log
   git log --oneline -20

   # Log with graph
   git log --oneline --graph --all -20

   # Log specific file
   git log --oneline -10 -- <file>

   # Show specific commit
   git show <commit-hash>

   # Blame (who changed what)
   git blame <file>

   # Diff working tree
   git diff

   # Diff staged changes
   git diff --staged

   # Diff between branches
   git diff <branch1>..<branch2>

   # Find commits with specific text
   git log --all -S "<search-text>" --oneline
   ```

8. **Reset Operations**:

   ```bash
   # Soft reset (keep changes staged)
   git reset --soft HEAD~1

   # Mixed reset (keep changes unstaged, default)
   git reset HEAD~1

   # Hard reset (discard all changes) ⚠️ DESTRUCTIVE
   git reset --hard HEAD~1

   # Reset specific file
   git checkout -- <file>

   # Unstage file
   git reset HEAD <file>
   ```

9. **Conflict Resolution**:

   When conflicts arise:
   - Read conflict markers: `<<<<<<<`, `=======`, `>>>>>>>`
   - Understand both sides of the conflict
   - Resolve by keeping the correct version
   - Stage resolved files: `git add <file>`
   - Continue: `git merge --continue` or `git rebase --continue`

10. **Bisect (Find Bug Introduction)**:

    ```bash
    # Start bisect
    git bisect start

    # Mark current as bad
    git bisect bad

    # Mark known good commit
    git bisect good <commit-hash>

    # After testing each commit, mark as good or bad
    git bisect good  # or
    git bisect bad

    # End bisect
    git bisect reset
    ```

## Safety Rules

- **Never force push to `main`**
- **Always check `git status`** before destructive operations
- **Create a backup branch** before complex rebases
- **Use `--dry-run`** when available to preview actions
- **Stash or commit** before switching branches with changes

## Notes

- This project uses **conventional commits** via commitlint + Husky
- Branch protection may prevent direct pushes to `main`
- Always pull latest changes before starting work: `git pull --rebase`
- Use `git reflog` to recover from mistakes (within 30 days)
