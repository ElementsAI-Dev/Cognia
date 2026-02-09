# Scheduler

The Scheduler provides a task scheduling system with cron-based, interval, one-time, and event-driven triggers for automating recurring operations.

## Overview

| Feature | Description |
|---------|-------------|
| **Cron Tasks** | Schedule tasks using cron expressions |
| **Interval Tasks** | Run tasks at fixed intervals |
| **One-time Tasks** | Schedule a single future execution |
| **Event Tasks** | Trigger tasks based on application events |
| **Plugin Integration** | Plugins can register scheduled task handlers |
| **Execution History** | Full history with logs and status tracking |
| **Dashboard** | Overview of upcoming, recent, and paused tasks |
| **Notifications** | Configurable notification channels per task |

## Getting Started

1. Navigate to **Scheduler** from the sidebar
2. Click **New Task** to create a scheduled task
3. Configure the trigger type (cron, interval, one-time, event)
4. Set notification preferences
5. Monitor task status in the dashboard

## Task Types

### Cron

Standard cron expressions with a format helper:

- `0 9 * * 1-5` — Weekdays at 9:00 AM
- `*/15 * * * *` — Every 15 minutes
- `0 0 1 * *` — First day of each month

### Interval

Fixed-interval execution with configurable units (seconds, minutes, hours, days).

### One-time

Schedule a single execution at a specific date and time.

### Event-based

Trigger tasks when specific application events occur.

## Architecture

```text
app/(main)/scheduler/              → Scheduler page
  ├── page.tsx                     → Main dashboard with tabs
  └── components/                  → Page-specific components
components/scheduler/              → Reusable scheduler components
  ├── task-form.tsx                → Task creation/edit form
  ├── task-details.tsx             → Task detail view
  ├── task-list.tsx                → Task list with filters
  └── execution-log.tsx            → Execution history viewer
hooks/scheduler/                   → useScheduler hook
stores/scheduler/                  → Scheduler state persistence
lib/scheduler/                     → Scheduler engine
  ├── executors/                   → Task executor implementations
  ├── cron-parser.ts               → Cron expression utilities
  └── notification-integration.ts  → Notification channels
```

## Plugin Integration

Plugins can register task handlers via the Plugin SDK:

```typescript
context.scheduler.registerHandler('my-task', async (args, taskContext) => {
  taskContext.log('info', 'Running...');
  taskContext.reportProgress(50, 'Halfway done');
});
```

See [Scheduler Plugin Integration](scheduler-plugin-integration.md) for details.
