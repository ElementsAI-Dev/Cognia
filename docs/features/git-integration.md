# Git Integration

Git integration provides repository management, commit history browsing, and version control operations within Cognia.

## Overview

| Feature | Description |
|---------|-------------|
| **Repository Browser** | Browse local git repositories |
| **Commit History** | View commit log with diff |
| **Branch Management** | Create, switch, and merge branches |
| **File Status** | Track staged, unstaged, and untracked files |
| **Diff Viewer** | View file changes with syntax highlighting |

## Architecture

```text
app/(main)/git/                     → Git pages
  ├── page.tsx                      → Repository browser
  ├── [repo]/                       → Repository detail
  └── commits/                      → Commit history
components/git/                     → 27 git UI components
stores/git/                         → Git state persistence
```

## Usage

1. Navigate to **Git** from the sidebar
2. Select a repository from the list
3. Browse commit history, branches, and file status
4. View diffs for individual commits or files
