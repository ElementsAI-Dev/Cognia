# Git Tools Plugin

Git version control operations for Cognia AI agents.

## Tools (10)

| Tool | Description | Approval |
|------|-------------|----------|
| `git_status` | Get repository status | No |
| `git_diff` | Show changes between commits | No |
| `git_log` | View commit history | No |
| `git_branch` | List, create, switch branches | No |
| `git_commit` | Create a new commit | Yes |
| `git_stash` | Stash or restore changes | No |
| `git_blame` | Show line-by-line authorship | No |
| `git_add` | Stage files for commit | Yes |
| `git_remote` | Manage remote repositories | No |
| `git_tag` | List, create, delete tags | No |

## Commands (3)

- **Git Status** — Show repository status
- **Recent Commits** — Show last 10 commits
- **Current Branch** — Show current branch name

## SDK Features Used

- `definePlugin` / `defineCommand` — Plugin and command definitions
- `context.storage` — Caches remote info and status
- `context.events` — Emits events on git operations (add/tag/status-updated)
- `context.shell` — Executes Git CLI commands
- `context.ui` — Shows notifications for commands
- `deactivate()` — Cleans up event listeners
- `onConfigChange` — Responds to config updates

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `maxLogEntries` | number | 50 | Max log entries to return |
| `maxDiffSize` | number | 102400 | Max diff size in bytes |

## Events

| Event | Description |
|-------|-------------|
| `git-tools:add` | Files staged |
| `git-tools:tag` | Tag created/deleted |
| `git-tools:refresh-status` | Trigger status refresh |
| `git-tools:status-updated` | Status cache updated |
