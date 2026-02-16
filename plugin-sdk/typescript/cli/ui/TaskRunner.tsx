/**
 * TaskRunner Component
 *
 * Execute and display a series of tasks with progress indicators.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { StatusSpinner } from './Spinner';
import { colors, symbols } from './theme';

export interface Task {
  /** Task ID */
  id: string;
  /** Task title */
  title: string;
  /** Task execution function */
  run: () => Promise<void>;
  /** Whether this task is optional (won't fail the run) */
  optional?: boolean;
}

export interface TaskResult {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'warning' | 'skipped';
  error?: string;
  duration?: number;
}

export interface TaskRunnerProps {
  /** Title for the task runner */
  title: string;
  /** List of tasks to execute */
  tasks: Task[];
  /** Called when all tasks complete */
  onComplete: (results: TaskResult[]) => void;
  /** Whether to stop on first error */
  stopOnError?: boolean;
}

export function TaskRunner({
  title,
  tasks,
  onComplete,
  stopOnError = true,
}: TaskRunnerProps): React.ReactElement {
  const { exit } = useApp();
  const [results, setResults] = useState<TaskResult[]>(() =>
    tasks.map((t) => ({ id: t.id, title: t.title, status: 'pending' as const }))
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (currentIndex >= tasks.length) {
      setIsComplete(true);
      onComplete(results);
      return;
    }

    const task = tasks[currentIndex];
    const startTime = Date.now();

    // Mark current task as running
    setResults((prev) =>
      prev.map((r, i) => (i === currentIndex ? { ...r, status: 'running' as const } : r))
    );

    task
      .run()
      .then(() => {
        const duration = Date.now() - startTime;
        setResults((prev) =>
          prev.map((r, i) =>
            i === currentIndex ? { ...r, status: 'success' as const, duration } : r
          )
        );
        setCurrentIndex((prev) => prev + 1);
      })
      .catch((error) => {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);

        setResults((prev) =>
          prev.map((r, i) =>
            i === currentIndex
              ? {
                  ...r,
                  status: task.optional ? ('warning' as const) : ('error' as const),
                  error: errorMessage,
                  duration,
                }
              : r
          )
        );

        if (stopOnError && !task.optional) {
          // Mark remaining tasks as skipped
          setResults((prev) =>
            prev.map((r, i) => (i > currentIndex ? { ...r, status: 'skipped' as const } : r))
          );
          setIsComplete(true);
          onComplete(
            results.map((r, i) =>
              i === currentIndex
                ? { ...r, status: 'error', error: errorMessage }
                : i > currentIndex
                  ? { ...r, status: 'skipped' }
                  : r
            )
          );
        } else {
          setCurrentIndex((prev) => prev + 1);
        }
      });
  }, [currentIndex, tasks, stopOnError]);

  const hasErrors = results.some((r) => r.status === 'error');
  const hasWarnings = results.some((r) => r.status === 'warning');
  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color={colors.primary}>
          {symbols.hammer} {title}
        </Text>
      </Box>

      <Box flexDirection="column" marginLeft={2}>
        {results.map((result) => (
          <Box key={result.id} flexDirection="column">
            <StatusSpinner
              status={
                result.status === 'running'
                  ? 'loading'
                  : result.status === 'success'
                    ? 'success'
                    : result.status === 'error'
                      ? 'error'
                      : result.status === 'warning'
                        ? 'warning'
                        : 'pending'
              }
              text={`${result.title}${result.duration ? ` (${result.duration}ms)` : ''}`}
            />
            {result.error && (
              <Box marginLeft={4}>
                <Text color={colors.error} dimColor>
                  {result.error}
                </Text>
              </Box>
            )}
          </Box>
        ))}
      </Box>

      {isComplete && (
        <Box marginTop={1}>
          {hasErrors ? (
            <Text color={colors.error} bold>
              {symbols.error} Failed ({totalDuration}ms)
            </Text>
          ) : hasWarnings ? (
            <Text color={colors.warning} bold>
              {symbols.warning} Completed with warnings ({totalDuration}ms)
            </Text>
          ) : (
            <Text color={colors.success} bold>
              {symbols.success} Completed successfully ({totalDuration}ms)
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
}

/**
 * Run tasks with ink UI
 */
export async function runTasksWithUI(
  title: string,
  tasks: Task[],
  options: { stopOnError?: boolean } = {}
): Promise<TaskResult[]> {
  // Dynamic import to avoid loading React in non-interactive mode
  const { render } = await import('ink');

  return new Promise((resolve) => {
    const { unmount } = render(
      React.createElement(TaskRunner, {
        title,
        tasks,
        onComplete: (results) => {
          setTimeout(() => {
            unmount();
            resolve(results);
          }, 100);
        },
        stopOnError: options.stopOnError,
      })
    );
  });
}

export default TaskRunner;
