# Plugin Scheduler Integration

This document describes how plugins can define and manage scheduled tasks using the Cognia Plugin SDK.

## Overview

The Plugin SDK provides a comprehensive Scheduler API that allows plugins to:

- **Create scheduled tasks** with various triggers (cron, interval, one-time, event-based)
- **Manage task lifecycle** (pause, resume, delete, run immediately)
- **Register task handlers** that execute when tasks are triggered
- **Monitor executions** with detailed history and logs

## TypeScript SDK Usage

### Basic Example

```typescript
import { definePlugin } from '@cognia/plugin-sdk';
import type { PluginContext, PluginHooks, PluginTaskContext } from '@cognia/plugin-sdk';

export default definePlugin({
  activate(context: PluginContext): PluginHooks {
    // Register a task handler
    const unregister = context.scheduler.registerHandler(
      'daily-report',
      async (args, taskContext: PluginTaskContext) => {
        taskContext.log('info', 'Generating daily report...');
        taskContext.reportProgress(0, 'Starting');

        // Do some work...
        taskContext.reportProgress(50, 'Processing data');

        // Complete
        taskContext.reportProgress(100, 'Done');
        return {
          success: true,
          output: { reportId: '123' },
          metrics: { itemsProcessed: 100 },
        };
      }
    );

    // Create a scheduled task
    context.scheduler.createTask({
      name: 'Daily Report',
      description: 'Generate daily analytics report',
      handler: 'daily-report',
      trigger: { type: 'cron', expression: '0 9 * * *' }, // Daily at 9am
      retry: { maxAttempts: 3, delaySeconds: 60 },
      timeout: 300,
      tags: ['reports', 'daily'],
    });

    return {
      onUnload: () => {
        unregister(); // Clean up handler on plugin unload
      },
    };
  },
});
```

### Trigger Types

#### Cron Trigger

Schedule tasks using cron expressions:

```typescript
context.scheduler.createTask({
  name: 'Hourly Sync',
  handler: 'sync-data',
  trigger: {
    type: 'cron',
    expression: '0 * * * *', // Every hour
    timezone: 'America/New_York', // Optional timezone
  },
});
```

#### Interval Trigger

Run tasks at fixed intervals:

```typescript
context.scheduler.createTask({
  name: 'Health Check',
  handler: 'health-check',
  trigger: {
    type: 'interval',
    seconds: 300, // Every 5 minutes
  },
});
```

#### One-Time Trigger

Schedule a task to run once at a specific time:

```typescript
context.scheduler.createTask({
  name: 'New Year Cleanup',
  handler: 'cleanup',
  trigger: {
    type: 'once',
    runAt: '2024-12-31T23:59:59Z',
  },
});
```

#### Event Trigger

Run tasks when specific events occur:

```typescript
context.scheduler.createTask({
  name: 'On Session Create',
  handler: 'session-handler',
  trigger: {
    type: 'event',
    eventType: 'session:created',
    eventSource: 'core',
  },
});
```

### Task Management

```typescript
// List all tasks for this plugin
const tasks = await context.scheduler.listTasks({
  status: 'active',
  tags: ['reports'],
});

// Get a specific task
const task = await context.scheduler.getTask('task-id');

// Pause a task
await context.scheduler.pauseTask('task-id');

// Resume a task
await context.scheduler.resumeTask('task-id');

// Run a task immediately (manual trigger)
const executionId = await context.scheduler.runTaskNow('task-id');

// Delete a task
await context.scheduler.deleteTask('task-id');
```

### Execution History

```typescript
// Get recent executions for a task
const executions = await context.scheduler.getExecutions('task-id', 10);

// Get a specific execution
const execution = await context.scheduler.getExecution('execution-id');

// Get the latest execution
const latest = await context.scheduler.getLatestExecution('task-id');

// Cancel a running execution
await context.scheduler.cancelExecution('execution-id');
```

### Task Context

When a task handler is invoked, it receives a context object with:

| Property | Type | Description |
|----------|------|-------------|
| `taskId` | `string` | Unique task identifier |
| `executionId` | `string` | Current execution identifier |
| `pluginId` | `string` | Plugin that owns this task |
| `taskName` | `string` | Human-readable task name |
| `scheduledAt` | `Date` | When the task was scheduled |
| `startedAt` | `Date` | When execution started |
| `attemptNumber` | `number` | Current attempt (1-based) |
| `signal` | `AbortSignal` | Abort signal for cancellation |
| `reportProgress` | `function` | Report progress (0-100) |
| `log` | `function` | Log messages |

### Task Result

Handlers should return a result object:

```typescript
interface PluginTaskResult {
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
  metrics?: Record<string, unknown>;
}
```

## Python SDK Usage

### Using the @scheduled Decorator

```python
from cognia import Plugin, scheduled

class MyPlugin(Plugin):
    @scheduled(cron="0 9 * * *", description="Daily report generation")
    async def daily_report(self, context):
        self.logger.info("Generating daily report...")
        context.report_progress(50, "Processing data")
        return {"success": True, "output": {"report_id": "123"}}

    @scheduled(interval=3600, description="Hourly health check")
    async def health_check(self, context):
        status = await self.check_health()
        return {"success": status.ok, "output": status.details}

    @scheduled(once_at="2024-12-31T23:59:59Z", description="New year task")
    async def new_year_task(self, context):
        return {"success": True, "output": {"message": "Happy New Year!"}}
```

### Decorator Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `cron` | `str` | Cron expression for scheduling |
| `interval` | `int` | Interval in seconds |
| `once_at` | `str` | ISO 8601 datetime for one-time execution |
| `name` | `str` | Task name (defaults to function name) |
| `description` | `str` | Task description |
| `enabled` | `bool` | Whether enabled by default (default: True) |
| `retry_attempts` | `int` | Number of retry attempts (default: 0) |
| `retry_delay` | `int` | Delay between retries in seconds (default: 60) |
| `timeout` | `int` | Task timeout in seconds (default: 300) |
| `tags` | `list[str]` | Tags for organization |

## Manifest Declaration

Plugins can declare scheduled tasks in their manifest:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "capabilities": ["scheduler"],
  "scheduledTasks": [
    {
      "name": "Daily Report",
      "description": "Generate daily analytics report",
      "handler": "dailyReport",
      "trigger": { "type": "cron", "expression": "0 9 * * *" },
      "defaultEnabled": true,
      "retry": { "maxAttempts": 3, "delaySeconds": 60 },
      "timeout": 300,
      "tags": ["reports"]
    }
  ]
}
```

## Scheduler Hooks

Plugins can listen to scheduler events:

```typescript
export default definePlugin({
  activate(context: PluginContext): PluginHooks {
    return {
      // Basic hooks
      onScheduledTaskStart: (taskId, executionId) => {
        console.log(`Task ${taskId} started execution ${executionId}`);
      },
      onScheduledTaskComplete: (taskId, executionId, result) => {
        console.log(`Task ${taskId} completed:`, result);
      },
      onScheduledTaskError: (taskId, executionId, error) => {
        console.error(`Task ${taskId} failed:`, error);
      },

      // Extended hooks (PluginHooksAll)
      onScheduledTaskCreate: (task) => {
        console.log(`Task created:`, task.name);
      },
      onScheduledTaskPause: (taskId) => {
        console.log(`Task ${taskId} paused`);
      },
      onScheduledTaskResume: (taskId) => {
        console.log(`Task ${taskId} resumed`);
      },
    };
  },
});
```

## Best Practices

1. **Always handle cancellation**: Check `context.signal.aborted` in long-running operations
2. **Report progress**: Use `context.reportProgress()` for better observability
3. **Log appropriately**: Use `context.log()` for structured logging
4. **Clean up handlers**: Unregister handlers when the plugin is disabled
5. **Use meaningful names**: Task names should be descriptive and unique within your plugin
6. **Set appropriate timeouts**: Configure timeouts based on expected task duration
7. **Use retry sparingly**: Only enable retries for idempotent operations
