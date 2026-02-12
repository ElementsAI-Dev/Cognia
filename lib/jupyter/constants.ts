/**
 * Jupyter Constants
 *
 * Shared constants for Jupyter components and utilities.
 */

import type { KernelStatus } from '@/types/jupyter';

/** Status display configuration (colors and i18n label keys) */
export const KERNEL_STATUS_CONFIG: Record<
  KernelStatus,
  { color: string; labelKey: string }
> = {
  idle: { color: 'bg-green-500', labelKey: 'status.idle' },
  busy: { color: 'bg-yellow-500', labelKey: 'status.busy' },
  starting: { color: 'bg-blue-500', labelKey: 'status.starting' },
  dead: { color: 'bg-red-500', labelKey: 'status.dead' },
  restarting: { color: 'bg-orange-500', labelKey: 'status.restarting' },
  interrupting: { color: 'bg-orange-500', labelKey: 'status.interrupting' },
  stopping: { color: 'bg-orange-500', labelKey: 'status.stopping' },
  configuring: { color: 'bg-blue-500', labelKey: 'status.configuring' },
  installing: { color: 'bg-blue-500', labelKey: 'status.installing' },
  error: { color: 'bg-red-500', labelKey: 'status.error' },
};

/** Python type → CSS class mapping for variable inspector */
export const VARIABLE_TYPE_COLORS: Record<string, string> = {
  int: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  float: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
  str: 'bg-green-500/10 text-green-700 dark:text-green-400',
  bool: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  list: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  dict: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  tuple: 'bg-pink-500/10 text-pink-700 dark:text-pink-400',
  set: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
  ndarray: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
  DataFrame: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  Series: 'bg-teal-500/10 text-teal-700 dark:text-teal-400',
  Tensor: 'bg-red-500/10 text-red-700 dark:text-red-400',
};
