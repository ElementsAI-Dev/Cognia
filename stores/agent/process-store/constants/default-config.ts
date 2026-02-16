import type { ProcessManagerConfig } from '@/lib/native/process';

/** Default process manager configuration */
export const DEFAULT_PROCESS_CONFIG: ProcessManagerConfig = {
  enabled: false,
  allowedPrograms: [],
  deniedPrograms: ['rm', 'del', 'format', 'dd', 'mkfs', 'shutdown', 'reboot'],
  allowTerminateAny: false,
  onlyTerminateOwn: true,
  maxTrackedProcesses: 100,
  defaultTimeoutSecs: 30,
};
