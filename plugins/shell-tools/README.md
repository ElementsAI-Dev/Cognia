# Shell Tools Plugin

Secure shell command execution and process management for Cognia AI agents.

## Tools (5)

| Tool | Description | Approval |
|------|-------------|----------|
| `shell_exec` | Execute a shell command | Yes |
| `shell_script` | Execute a script file | Yes |
| `env_get` | Get an environment variable | No |
| `env_list` | List environment variables | No |
| `shell_which` | Find command location in PATH | No |

## Commands (3)

- **Detect Shell** — Show the current shell environment
- **System Info** — Show platform, architecture, Node version, shell, CWD
- **Clear Execution History** — Clear stored command history

## SDK Features Used

- `definePlugin` / `defineCommand` — Plugin and command definitions
- `context.storage` — Stores execution history (last 50 commands)
- `context.events` — Listens for exec-complete events to record history
- `context.shell` — Executes commands with security controls
- `context.ui` — Shows notifications for commands
- `deactivate()` — Cleans up event listeners
- `onConfigChange` — Updates security settings dynamically

## Security Controls

- **Blocked commands** — Configurable list of disallowed commands
- **Allowed directories** — Restrict CWD to specific paths
- **Hidden env vars** — Mask sensitive environment variables
- **Output truncation** — Limit output size to prevent memory issues
- **Timeout** — Configurable execution timeout

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `defaultShell` | string | auto | Shell to use |
| `timeout` | number | 30000 | Command timeout (ms) |
| `maxOutputSize` | number | 1048576 | Max output bytes |
| `blockedCommands` | string[] | [] | Blocked command patterns |
| `allowedDirectories` | string[] | [] | Allowed CWD directories |
| `hiddenEnvVars` | string[] | [] | Hidden env var names |

## Events

| Event | Description |
|-------|-------------|
| `shell-tools:exec-complete` | Command execution recorded |
