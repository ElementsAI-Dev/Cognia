# Scheduler Module

AI-powered task automation system with cron scheduling, notifications, and persistence.

## Architecture

```
lib/scheduler/
├── index.ts              # Module exports & initialization
├── cron-parser.ts        # Cron expression parsing & validation
├── task-scheduler.ts     # Core scheduler service
├── scheduler-db.ts       # Dexie persistence layer
├── notification-integration.ts  # Notification dispatch
├── event-integration.ts  # Event-triggered task execution
├── script-executor.ts    # Script execution via sandbox
└── executors/
    ├── index.ts          # Built-in task executors
    └── plugin-executor.ts # Plugin task handler registry
```

## Core Components

### TaskScheduler (`task-scheduler.ts`)
- Manages task lifecycle (create, update, delete, pause, resume)
- Handles execution timing with timers
- Supports retry logic with configurable delays
- Integrates with notification system

### CronParser (`cron-parser.ts`)
- Parses standard 5-field cron expressions
- Validates expressions with detailed error messages
- Calculates next run times
- Provides human-readable descriptions

### SchedulerDatabase (`scheduler-db.ts`)
- Dexie-based IndexedDB persistence
- Stores tasks and execution history
- Supports filtering and statistics queries
- Automatic cleanup of old executions

### Notification Integration (`notification-integration.ts`)
- Desktop notifications via Tauri
- Toast notifications via Sonner
- Webhook notifications for external integrations

### Task Executors (`executors/index.ts`)
- `workflow` - Runs workflow definitions
- `agent` - Executes AI agent tasks
- `sync` - Triggers data synchronization
- `backup` - Performs backup operations
- `custom` - User-defined task handlers
- `plugin` - Plugin-registered task handlers
- `script` - Script execution via sandbox service

### Event Integration (`event-integration.ts`)
- Emits scheduler events on task completion/failure
- Supports event-triggered task chaining
- Events: session:*, sync:*, backup:*, workflow:*, agent:*, custom

### Script Executor (`script-executor.ts`)
- Executes scripts via Tauri sandbox with resource limits
- Validates scripts for dangerous patterns
- Provides language templates and supported languages list

## Usage

```typescript
// Initialize scheduler on app startup
import { initSchedulerSystem } from '@/lib/scheduler';
await initSchedulerSystem();

// Use the React hook
import { useScheduler } from '@/hooks/scheduler';
const { createTask, tasks, runTaskNow } = useScheduler();

// Create a scheduled task
await createTask({
  name: 'Daily Backup',
  type: 'backup',
  trigger: {
    type: 'cron',
    cronExpression: '0 2 * * *',  // 2 AM daily
    timezone: 'Asia/Shanghai',
  },
  notification: {
    onComplete: true,
    onError: true,
    channels: ['desktop', 'toast'],
  },
});
```

## Trigger Types

| Type | Description | Config |
|------|-------------|--------|
| `cron` | Cron expression | `cronExpression`, `timezone` |
| `interval` | Fixed interval | `intervalMs` |
| `once` | One-time execution | `runAt` (Date) |
| `event` | Event-triggered | `eventType` |

## Task Types

| Type | Executor | Use Case |
|------|----------|----------|
| `workflow` | WorkflowExecutor | Run saved workflows |
| `agent` | AgentExecutor | AI agent tasks |
| `sync` | SyncExecutor | Data synchronization |
| `backup` | BackupExecutor | Backup operations |
| `custom` | CustomExecutor | User-defined handlers |
| `plugin` | PluginExecutor | Plugin-registered handlers |
| `script` | ScriptExecutor | Script execution via sandbox |
| `ai-generation` | AIGenerationExecutor | AI content generation (summaries, translations) |
| `chat` | ChatExecutor | Send scheduled messages to chat sessions |
| `test` | TestExecutor | Health checks, API pings, provider checks |

## Configuration

### Execution Config
```typescript
{
  timeout: 300000,      // 5 minutes default
  maxRetries: 3,        // Retry on failure
  retryDelay: 5000,     // 5 seconds between retries
  allowConcurrent: false,
  runMissedOnStartup: false,
}
```

### Notification Config
```typescript
{
  onStart: false,
  onComplete: true,
  onError: true,
  channels: ['toast', 'desktop'],
}
```

## UI Components

### WorkflowScheduleDialog
Schedule workflows to run automatically with cron, interval, or one-time triggers.

```tsx
import { WorkflowScheduleDialog } from '@/components/scheduler';

<WorkflowScheduleDialog
  workflowId="my-workflow"
  workflowName="Daily Report"
  onScheduled={(taskId) => console.log('Scheduled:', taskId)}
/>
```

### BackupScheduleDialog
Set up automatic backups with configurable destinations and content.

```tsx
import { BackupScheduleDialog } from '@/components/scheduler';

<BackupScheduleDialog
  onScheduled={(taskId) => console.log('Backup scheduled:', taskId)}
/>
```

## Backup Configuration

```typescript
// Full backup to WebDAV
await createTask({
  name: 'Daily Backup',
  type: 'backup',
  trigger: { type: 'cron', cronExpression: '0 2 * * *' },
  payload: {
    backupType: 'full',
    destination: 'webdav',
    options: {
      includeSessions: true,
      includeSettings: true,
      includeArtifacts: true,
      includeIndexedDB: true,
    },
  },
});
```

## Related Files

- `types/scheduler/index.ts` - Type definitions
- `stores/scheduler/scheduler-store.ts` - Zustand store
- `hooks/scheduler/use-scheduler.ts` - React hook
- `components/scheduler/` - UI components
  - `task-list.tsx` - Task listing
  - `task-form.tsx` - Create/edit tasks
  - `task-details.tsx` - Task details view
  - `workflow-schedule-dialog.tsx` - Workflow scheduling
  - `backup-schedule-dialog.tsx` - Backup scheduling
- `app/(main)/scheduler/page.tsx` - Scheduler page

## Testing

```bash
pnpm test lib/scheduler/cron-parser.test.ts
pnpm test lib/scheduler/scheduler-db.test.ts
pnpm test stores/scheduler/scheduler-store.test.ts
```
