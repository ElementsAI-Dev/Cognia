/**
 * Awareness Native API
 *
 * Provides TypeScript bindings for the Tauri awareness commands.
 */

import { invoke } from "@tauri-apps/api/core";

// ============== Types ==============

export interface SystemState {
  cpu_usage: number;
  memory_usage: number;
  memory_total: number;
  memory_available: number;
  disk_usage: number;
  disk_total: number;
  disk_available: number;
  battery_level?: number;
  is_charging?: boolean;
  power_mode: string;
  uptime_seconds: number;
  process_count: number;
  network_connected: boolean;
}

export type ActivityType =
  | "TextSelection"
  | "Screenshot"
  | "AppSwitch"
  | "FileOpen"
  | "FileSave"
  | "UrlVisit"
  | "Search"
  | "Copy"
  | "Paste"
  | "AiQuery"
  | "Translation"
  | "CodeAction"
  | "DocumentAction"
  | { Custom: string };

export interface UserActivity {
  id: string;
  activity_type: ActivityType;
  timestamp: number;
  app_name?: string;
  window_title?: string;
  content?: string;
  metadata: Record<string, string>;
}

export type SuggestionType =
  | "QuickAction"
  | "Shortcut"
  | "Reminder"
  | "Optimization"
  | "Learning"
  | "Contextual";

export interface Suggestion {
  id: string;
  suggestion_type: SuggestionType;
  title: string;
  description: string;
  action?: string;
  priority: number;
  expires_at?: number;
}

export interface AwarenessState {
  system: SystemState;
  recent_activities: UserActivity[];
  suggestions: Suggestion[];
  timestamp: number;
}

export interface FocusSession {
  app_name: string;
  process_name: string;
  window_title: string;
  start_time: number;
  end_time?: number;
  duration_ms: number;
  is_active: boolean;
}

export interface AppUsageStats {
  app_name: string;
  total_time_ms: number;
  session_count: number;
  avg_session_ms: number;
  last_used: number;
  common_titles: string[];
}

export interface DailyUsageSummary {
  date: string;
  total_active_ms: number;
  by_app: Record<string, number>;
  top_apps: [string, number][];
  switch_count: number;
}

export interface ActivityStats {
  total_activities: number;
  activities_last_hour: number;
  activities_last_day: number;
  most_common_type: string | null;
  most_used_application: string | null;
  activity_counts: Record<string, number>;
}

// ============== State Functions ==============

/**
 * Get current awareness state
 */
export async function getState(): Promise<AwarenessState> {
  return invoke("awareness_get_state");
}

/**
 * Get system state
 */
export async function getSystemState(): Promise<SystemState> {
  return invoke("awareness_get_system_state");
}

/**
 * Get suggestions
 */
export async function getSuggestions(): Promise<Suggestion[]> {
  return invoke("awareness_get_suggestions");
}

// ============== Activity Functions ==============

/**
 * Record an activity
 */
export async function recordActivity(
  activityType: string,
  appName?: string,
  windowTitle?: string,
  content?: string,
  metadata?: Record<string, string>
): Promise<void> {
  return invoke("awareness_record_activity", {
    activityType,
    appName,
    windowTitle,
    content,
    metadata,
  });
}

/**
 * Get recent activities
 */
export async function getRecentActivities(count?: number): Promise<UserActivity[]> {
  return invoke("awareness_get_recent_activities", { count });
}

/**
 * Clear activity history
 */
export async function clearHistory(): Promise<void> {
  return invoke("awareness_clear_history");
}

// ============== Monitoring Functions ==============

/**
 * Start background monitoring
 */
export async function startMonitoring(): Promise<void> {
  return invoke("awareness_start_monitoring");
}

/**
 * Stop background monitoring
 */
export async function stopMonitoring(): Promise<void> {
  return invoke("awareness_stop_monitoring");
}

// ============== Focus Tracking Functions ==============

/**
 * Start focus tracking
 */
export async function startFocusTracking(): Promise<void> {
  return invoke("awareness_start_focus_tracking");
}

/**
 * Stop focus tracking
 */
export async function stopFocusTracking(): Promise<void> {
  return invoke("awareness_stop_focus_tracking");
}

/**
 * Check if focus tracking is enabled
 */
export async function isFocusTracking(): Promise<boolean> {
  return invoke("awareness_is_focus_tracking");
}

/**
 * Record a focus change
 */
export async function recordFocusChange(
  appName: string,
  processName: string,
  windowTitle: string
): Promise<void> {
  return invoke("awareness_record_focus_change", {
    appName,
    processName,
    windowTitle,
  });
}

/**
 * Get current focus session
 */
export async function getCurrentFocus(): Promise<FocusSession | null> {
  return invoke("awareness_get_current_focus");
}

/**
 * Get recent focus sessions
 */
export async function getRecentFocusSessions(
  count?: number
): Promise<FocusSession[]> {
  return invoke("awareness_get_recent_focus_sessions", { count });
}

/**
 * Get app usage statistics
 */
export async function getAppUsageStats(
  appName: string
): Promise<AppUsageStats | null> {
  return invoke("awareness_get_app_usage_stats", { appName });
}

/**
 * Get all app usage statistics
 */
export async function getAllAppUsageStats(): Promise<AppUsageStats[]> {
  return invoke("awareness_get_all_app_usage_stats");
}

/**
 * Get today's usage summary
 */
export async function getTodayUsageSummary(): Promise<DailyUsageSummary> {
  return invoke("awareness_get_today_usage_summary");
}

/**
 * Get daily usage summary
 */
export async function getDailyUsageSummary(date: string): Promise<DailyUsageSummary> {
  return invoke("awareness_get_daily_usage_summary", { date });
}

/**
 * Clear focus history
 */
export async function clearFocusHistory(): Promise<void> {
  return invoke("awareness_clear_focus_history");
}

// ============== Activity Tracker Extended Functions ==============

/**
 * Get activities by type
 */
export async function getActivitiesByType(activityType: string): Promise<UserActivity[]> {
  return invoke("awareness_get_activities_by_type", { activityType });
}

/**
 * Get activities in time range
 */
export async function getActivitiesInRange(startMs: number, endMs: number): Promise<UserActivity[]> {
  return invoke("awareness_get_activities_in_range", { startMs, endMs });
}

/**
 * Get activities by application
 */
export async function getActivitiesByApplication(appName: string): Promise<UserActivity[]> {
  return invoke("awareness_get_activities_by_application", { appName });
}

/**
 * Get activity statistics
 */
export async function getActivityStats(): Promise<ActivityStats> {
  return invoke("awareness_get_activity_stats");
}

/**
 * Set activity tracking enabled/disabled
 */
export async function setActivityTrackingEnabled(enabled: boolean): Promise<void> {
  return invoke("awareness_set_activity_tracking_enabled", { enabled });
}

/**
 * Check if activity tracking is enabled
 */
export async function isActivityTrackingEnabled(): Promise<boolean> {
  return invoke("awareness_is_activity_tracking_enabled");
}

/**
 * Export activity history as JSON
 */
export async function exportActivityHistory(): Promise<string> {
  return invoke("awareness_export_activity_history");
}

/**
 * Import activity history from JSON
 */
export async function importActivityHistory(json: string): Promise<number> {
  return invoke("awareness_import_activity_history", { json });
}

// ============== Smart Suggestions Extended Functions ==============

/**
 * Dismiss a suggestion
 */
export async function dismissSuggestion(action: string): Promise<void> {
  return invoke("awareness_dismiss_suggestion", { action });
}

/**
 * Clear all dismissed suggestions
 */
export async function clearDismissedSuggestions(): Promise<void> {
  return invoke("awareness_clear_dismissed_suggestions");
}

/**
 * Check if a suggestion is dismissed
 */
export async function isSuggestionDismissed(action: string): Promise<boolean> {
  return invoke("awareness_is_suggestion_dismissed", { action });
}

/**
 * Get list of dismissed suggestions
 */
export async function getDismissedSuggestions(): Promise<string[]> {
  return invoke("awareness_get_dismissed_suggestions");
}

// ============== Focus Tracker Extended Functions ==============

/**
 * Get all focus sessions
 */
export async function getAllFocusSessions(): Promise<FocusSession[]> {
  return invoke("awareness_get_all_focus_sessions");
}

/**
 * Get focus session count
 */
export async function getFocusSessionCount(): Promise<number> {
  return invoke("awareness_get_focus_session_count");
}
