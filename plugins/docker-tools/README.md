# Docker Tools Plugin

Docker container management for Cognia AI agents.

## Tools (9)

| Tool | Description | Approval |
|------|-------------|----------|
| `docker_ps` | List running containers | No |
| `docker_images` | List Docker images | No |
| `docker_logs` | View container logs | No |
| `docker_exec` | Execute command in container | Yes |
| `docker_run` | Run a new container from an image | Yes |
| `docker_stop` | Stop running containers | Yes |
| `docker_rm` | Remove containers | Yes |
| `docker_stats` | Show container resource usage | No |
| `docker_inspect` | Show detailed container/image info | No |

## Commands (3)

- **List Docker Containers** — Show all containers
- **Docker System Info** — Show Docker version, container/image counts
- **Docker Disk Usage** — Show disk usage by Docker

## SDK Features Used

- `definePlugin` / `defineCommand` — Plugin and command definitions
- `context.storage` — Caches container and image lists
- `context.events` — Emits events on container operations (run/stop/rm/exec)
- `context.shell` — Executes Docker CLI commands
- `context.ui` — Shows notifications for commands
- `deactivate()` — Cleans up event listeners
- `onConfigChange` — Responds to config updates

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `maxLogLines` | number | 100 | Max log lines to return |
| `defaultTimeout` | number | 60000 | Docker command timeout (ms) |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `docker-tools:run` | `{ image, name, containerId, success }` | Container started |
| `docker-tools:stop` | `{ containers, stopped, success }` | Container(s) stopped |
| `docker-tools:rm` | `{ containers, removed, success }` | Container(s) removed |
| `docker-tools:exec` | `{ container, command, success }` | Command executed |
| `docker-tools:refresh` | — | Trigger container list refresh |
| `docker-tools:containers-updated` | `Container[]` | Container list updated |
