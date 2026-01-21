/**
 * Screen Recording Error Handling
 *
 * Provides error parsing and user-friendly error messages for screen recording.
 */

export type RecordingErrorCode =
  | 'FFMPEG_NOT_FOUND'
  | 'FFMPEG_VERSION_TOO_OLD'
  | 'FFMPEG_START_FAILED'
  | 'FFMPEG_CRASHED'
  | 'FFMPEG_TIMEOUT'
  | 'MONITOR_NOT_FOUND'
  | 'WINDOW_NOT_FOUND'
  | 'INVALID_REGION'
  | 'ALREADY_RECORDING'
  | 'NOT_RECORDING'
  | 'NOT_PAUSED'
  | 'NO_SAVE_DIRECTORY'
  | 'CREATE_DIRECTORY_FAILED'
  | 'INSUFFICIENT_DISK_SPACE'
  | 'PERMISSION_DENIED'
  | 'FILE_WRITE_ERROR'
  | 'AUDIO_CAPTURE_FAILED'
  | 'SCREEN_CAPTURE_FAILED'
  | 'UNKNOWN';

export interface RecordingError {
  code: RecordingErrorCode;
  message: string;
  details?: string;
  suggestion?: string;
}

/**
 * Error message translations
 */
const ERROR_MESSAGES: Record<RecordingErrorCode, { en: string; zh: string }> = {
  FFMPEG_NOT_FOUND: {
    en: 'FFmpeg is not installed',
    zh: 'FFmpeg 未安装',
  },
  FFMPEG_VERSION_TOO_OLD: {
    en: 'FFmpeg version is too old',
    zh: 'FFmpeg 版本过旧',
  },
  FFMPEG_START_FAILED: {
    en: 'Failed to start recording',
    zh: '启动录制失败',
  },
  FFMPEG_CRASHED: {
    en: 'Recording process crashed',
    zh: '录制进程崩溃',
  },
  FFMPEG_TIMEOUT: {
    en: 'Recording operation timed out',
    zh: '录制操作超时',
  },
  MONITOR_NOT_FOUND: {
    en: 'Monitor not found',
    zh: '未找到显示器',
  },
  WINDOW_NOT_FOUND: {
    en: 'Window not found',
    zh: '未找到窗口',
  },
  INVALID_REGION: {
    en: 'Invalid recording region',
    zh: '无效的录制区域',
  },
  ALREADY_RECORDING: {
    en: 'Already recording',
    zh: '正在录制中',
  },
  NOT_RECORDING: {
    en: 'No active recording',
    zh: '没有正在进行的录制',
  },
  NOT_PAUSED: {
    en: 'Recording is not paused',
    zh: '录制未暂停',
  },
  NO_SAVE_DIRECTORY: {
    en: 'Save directory not configured',
    zh: '未配置保存目录',
  },
  CREATE_DIRECTORY_FAILED: {
    en: 'Failed to create save directory',
    zh: '创建保存目录失败',
  },
  INSUFFICIENT_DISK_SPACE: {
    en: 'Insufficient disk space',
    zh: '磁盘空间不足',
  },
  PERMISSION_DENIED: {
    en: 'Permission denied',
    zh: '权限被拒绝',
  },
  FILE_WRITE_ERROR: {
    en: 'Failed to write file',
    zh: '写入文件失败',
  },
  AUDIO_CAPTURE_FAILED: {
    en: 'Audio capture failed',
    zh: '音频捕获失败',
  },
  SCREEN_CAPTURE_FAILED: {
    en: 'Screen capture failed',
    zh: '屏幕捕获失败',
  },
  UNKNOWN: {
    en: 'An unknown error occurred',
    zh: '发生未知错误',
  },
};

/**
 * Suggestion translations
 */
const ERROR_SUGGESTIONS: Record<RecordingErrorCode, { en: string; zh: string }> = {
  FFMPEG_NOT_FOUND: {
    en: 'Please install FFmpeg from https://ffmpeg.org and add it to your PATH',
    zh: '请从 https://ffmpeg.org 下载安装 FFmpeg 并添加到系统 PATH',
  },
  FFMPEG_VERSION_TOO_OLD: {
    en: 'Please update FFmpeg to the latest version',
    zh: '请更新 FFmpeg 到最新版本',
  },
  FFMPEG_START_FAILED: {
    en: 'Check FFmpeg installation and permissions',
    zh: '请检查 FFmpeg 安装和权限',
  },
  FFMPEG_CRASHED: {
    en: 'Try recording again. If the problem persists, check FFmpeg installation',
    zh: '请重试录制。如问题持续，请检查 FFmpeg 安装',
  },
  FFMPEG_TIMEOUT: {
    en: 'Try a shorter recording or check system resources',
    zh: '请尝试更短的录制或检查系统资源',
  },
  MONITOR_NOT_FOUND: {
    en: 'Select a valid monitor from the available list',
    zh: '请从可用列表中选择有效的显示器',
  },
  WINDOW_NOT_FOUND: {
    en: 'Make sure the window is open and visible',
    zh: '请确保窗口已打开且可见',
  },
  INVALID_REGION: {
    en: 'Select a valid region with positive dimensions',
    zh: '请选择有效的录制区域',
  },
  ALREADY_RECORDING: {
    en: 'Stop the current recording first',
    zh: '请先停止当前录制',
  },
  NOT_RECORDING: {
    en: 'Start a recording first',
    zh: '请先开始录制',
  },
  NOT_PAUSED: {
    en: 'Pause the recording first',
    zh: '请先暂停录制',
  },
  NO_SAVE_DIRECTORY: {
    en: 'Configure a save directory in settings',
    zh: '请在设置中配置保存目录',
  },
  CREATE_DIRECTORY_FAILED: {
    en: 'Check write permissions for the save location',
    zh: '请检查保存位置的写入权限',
  },
  INSUFFICIENT_DISK_SPACE: {
    en: 'Free up disk space or choose a different location',
    zh: '请释放磁盘空间或选择其他保存位置',
  },
  PERMISSION_DENIED: {
    en: 'Run the application with appropriate permissions',
    zh: '请以适当权限运行应用程序',
  },
  FILE_WRITE_ERROR: {
    en: 'Check disk permissions and available space',
    zh: '请检查磁盘权限和可用空间',
  },
  AUDIO_CAPTURE_FAILED: {
    en: 'Check audio device settings and permissions',
    zh: '请检查音频设备设置和权限',
  },
  SCREEN_CAPTURE_FAILED: {
    en: 'Check screen capture permissions in system settings',
    zh: '请在系统设置中检查屏幕录制权限',
  },
  UNKNOWN: {
    en: 'Try again or contact support',
    zh: '请重试或联系支持',
  },
};

/**
 * Parse error from backend response
 */
export function parseRecordingError(error: unknown): RecordingError {
  // Try to parse JSON error from backend
  if (typeof error === 'string') {
    try {
      const parsed = JSON.parse(error);
      if (parsed.code && parsed.message) {
        return parsed as RecordingError;
      }
    } catch {
      // Not JSON, try to extract error code from message
      const code = extractErrorCode(error);
      return {
        code,
        message: error,
      };
    }
  }

  if (error instanceof Error) {
    const code = extractErrorCode(error.message);
    return {
      code,
      message: error.message,
    };
  }

  return {
    code: 'UNKNOWN',
    message: String(error),
  };
}

/**
 * Extract error code from error message
 */
function extractErrorCode(message: string): RecordingErrorCode {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('ffmpeg') && lowerMessage.includes('not found')) {
    return 'FFMPEG_NOT_FOUND';
  }
  if (lowerMessage.includes('already recording')) {
    return 'ALREADY_RECORDING';
  }
  if (lowerMessage.includes('not recording')) {
    return 'NOT_RECORDING';
  }
  if (lowerMessage.includes('not paused')) {
    return 'NOT_PAUSED';
  }
  if (lowerMessage.includes('no save directory') || lowerMessage.includes('no directory')) {
    return 'NO_SAVE_DIRECTORY';
  }
  if (lowerMessage.includes('monitor') && lowerMessage.includes('not found')) {
    return 'MONITOR_NOT_FOUND';
  }
  if (lowerMessage.includes('window') && lowerMessage.includes('not found')) {
    return 'WINDOW_NOT_FOUND';
  }
  if (lowerMessage.includes('disk space') || lowerMessage.includes('storage')) {
    return 'INSUFFICIENT_DISK_SPACE';
  }
  if (lowerMessage.includes('permission')) {
    return 'PERMISSION_DENIED';
  }
  if (lowerMessage.includes('timeout')) {
    return 'FFMPEG_TIMEOUT';
  }
  if (lowerMessage.includes('crash') || lowerMessage.includes('unexpected')) {
    return 'FFMPEG_CRASHED';
  }

  return 'UNKNOWN';
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(
  error: RecordingError,
  locale: 'en' | 'zh' = 'en'
): string {
  const messages = ERROR_MESSAGES[error.code] || ERROR_MESSAGES.UNKNOWN;
  return messages[locale];
}

/**
 * Get error suggestion
 */
export function getErrorSuggestion(
  error: RecordingError,
  locale: 'en' | 'zh' = 'en'
): string {
  // Use backend suggestion if available
  if (error.suggestion) {
    return error.suggestion;
  }

  const suggestions = ERROR_SUGGESTIONS[error.code] || ERROR_SUGGESTIONS.UNKNOWN;
  return suggestions[locale];
}

/**
 * Format error for display
 */
export function formatRecordingError(
  error: RecordingError,
  locale: 'en' | 'zh' = 'en'
): { title: string; description: string; suggestion: string } {
  return {
    title: getErrorMessage(error, locale),
    description: error.details || error.message,
    suggestion: getErrorSuggestion(error, locale),
  };
}

/**
 * Check if error is recoverable
 */
export function isRecoverableError(error: RecordingError): boolean {
  const nonRecoverable: RecordingErrorCode[] = [
    'FFMPEG_NOT_FOUND',
    'FFMPEG_VERSION_TOO_OLD',
    'NO_SAVE_DIRECTORY',
    'PERMISSION_DENIED',
  ];
  return !nonRecoverable.includes(error.code);
}

/**
 * Check if error requires FFmpeg installation
 */
export function requiresFFmpegInstall(error: RecordingError): boolean {
  return error.code === 'FFMPEG_NOT_FOUND' || error.code === 'FFMPEG_VERSION_TOO_OLD';
}
