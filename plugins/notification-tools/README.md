# Notification Tools Plugin

Notifications and reminders for Cognia AI agents. Reminders persist across sessions via storage.

## Tools (5)

| Tool | Description |
|------|-------------|
| `notify` | Send a notification to the user |
| `toast` | Show a lightweight toast notification |
| `remind` | Set a persistent reminder with delay or time |
| `list_reminders` | List all active reminders |
| `cancel_reminder` | Cancel a pending reminder by ID |

## Commands (2)

- **List Reminders** — Show all active reminders
- **Clear All Reminders** — Cancel and remove all reminders

## SDK Features Used

- `definePlugin` / `defineCommand` — Plugin and command definitions
- `context.storage` — Persists reminders across sessions (survives restart)
- `context.events` — Emits reminder-triggered and reminder-cancelled events
- `context.ui` — Shows notifications and reminders
- `deactivate()` — Cleans up timers and event listeners
- `onConfigChange` — Updates maxReminders limit
- `onDisable` — Saves reminders to storage before disabling

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `maxReminders` | number | 100 | Maximum active reminders |

## Events

| Event | Description |
|-------|-------------|
| `notification-tools:reminder-triggered` | Reminder fired |
| `notification-tools:reminder-cancelled` | Reminder cancelled |
| `notification-tools:clear-all` | Clear all reminders |
