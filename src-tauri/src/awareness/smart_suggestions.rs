//! Smart suggestions engine
//!
//! Generates context-aware suggestions based on user activity and system state.

use super::{ActivityType, SystemState, UserActivity};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};

/// A suggestion for the user
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Suggestion {
    /// Suggestion type
    pub suggestion_type: SuggestionType,
    /// Suggestion title
    pub title: String,
    /// Suggestion description
    pub description: String,
    /// Action to perform
    pub action: String,
    /// Priority (1-10, higher is more important)
    pub priority: u8,
    /// Confidence score (0.0-1.0)
    pub confidence: f64,
    /// Context that triggered this suggestion
    pub context: String,
    /// Whether this suggestion is dismissible
    pub dismissible: bool,
}

/// Suggestion type classification
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SuggestionType {
    /// Quick action based on selection
    QuickAction,
    /// Productivity tip
    ProductivityTip,
    /// Context-aware help
    ContextHelp,
    /// Workflow automation
    Automation,
    /// Learning suggestion
    Learning,
    /// System optimization
    SystemOptimization,
    /// Break reminder
    BreakReminder,
    /// Follow-up action
    FollowUp,
}

/// Smart suggestions engine
pub struct SmartSuggestions {
    /// Suggestion rules
    rules: Vec<SuggestionRule>,
    /// Dismissed suggestions (by action) - uses RwLock for interior mutability
    dismissed: RwLock<std::collections::HashSet<String>>,
}

/// Type alias for suggestion condition function
#[allow(clippy::type_complexity)]
type SuggestionConditionFn =
    Box<dyn Fn(&SystemState, &[UserActivity]) -> Option<Suggestion> + Send + Sync>;

/// A rule for generating suggestions
struct SuggestionRule {
    #[allow(dead_code)]
    name: String,
    condition: SuggestionConditionFn,
}

impl SmartSuggestions {
    pub fn new() -> Self {
        log::debug!("Creating new SmartSuggestions engine");
        let mut engine = Self {
            rules: Vec::new(),
            dismissed: RwLock::new(std::collections::HashSet::new()),
        };
        engine.register_default_rules();
        log::debug!("Registered {} suggestion rules", engine.rules.len());
        engine
    }

    /// Register default suggestion rules
    fn register_default_rules(&mut self) {
        // Rule: Suggest break after extended activity
        self.rules.push(SuggestionRule {
            name: "break_reminder".to_string(),
            condition: Box::new(|_system, activities| {
                if activities.len() < 50 {
                    return None;
                }

                let now = chrono::Utc::now().timestamp_millis();
                let hour_ago = now - 3600000;
                let recent_count = activities.iter().filter(|a| a.timestamp > hour_ago).count();

                if recent_count > 30 {
                    Some(Suggestion {
                        suggestion_type: SuggestionType::BreakReminder,
                        title: "Time for a break?".to_string(),
                        description: "You've been very active. Consider taking a short break."
                            .to_string(),
                        action: "dismiss_break_reminder".to_string(),
                        priority: 3,
                        confidence: 0.7,
                        context: format!("{} activities in the last hour", recent_count),
                        dismissible: true,
                    })
                } else {
                    None
                }
            }),
        });

        // Rule: Suggest code explanation after repeated selections in code editor
        self.rules.push(SuggestionRule {
            name: "code_explanation".to_string(),
            condition: Box::new(|_system, activities| {
                let code_selections: Vec<_> = activities
                    .iter()
                    .take(10)
                    .filter(|a| {
                        a.activity_type == ActivityType::TextSelection
                            && a.application
                                .as_ref()
                                .map(|app| {
                                    let app_lower = app.to_lowercase();
                                    app_lower.contains("code")
                                        || app_lower.contains("studio")
                                        || app_lower.contains("vim")
                                        || app_lower.contains("cursor")
                                })
                                .unwrap_or(false)
                    })
                    .collect();

                if code_selections.len() >= 3 {
                    Some(Suggestion {
                        suggestion_type: SuggestionType::QuickAction,
                        title: "Explain this code?".to_string(),
                        description:
                            "You've selected code multiple times. Would you like an explanation?"
                                .to_string(),
                        action: "explain_code".to_string(),
                        priority: 7,
                        confidence: 0.8,
                        context: "Multiple code selections detected".to_string(),
                        dismissible: true,
                    })
                } else {
                    None
                }
            }),
        });

        // Rule: Suggest translation for foreign text
        self.rules.push(SuggestionRule {
            name: "translation_suggestion".to_string(),
            condition: Box::new(|_system, activities| {
                if let Some(activity) = activities.first() {
                    if activity.activity_type == ActivityType::TextSelection {
                        if let Some(preview) = activity.metadata.get("text_preview") {
                            // Check if text contains non-ASCII characters (potential foreign language)
                            let non_ascii_ratio = preview.chars().filter(|c| !c.is_ascii()).count()
                                as f64
                                / preview.len().max(1) as f64;

                            if non_ascii_ratio > 0.3 {
                                return Some(Suggestion {
                                    suggestion_type: SuggestionType::QuickAction,
                                    title: "Translate this text?".to_string(),
                                    description:
                                        "The selected text appears to be in a foreign language."
                                            .to_string(),
                                    action: "translate_text".to_string(),
                                    priority: 8,
                                    confidence: 0.75,
                                    context: "Foreign language detected".to_string(),
                                    dismissible: true,
                                });
                            }
                        }
                    }
                }
                None
            }),
        });

        // Rule: Suggest summarization for long text
        self.rules.push(SuggestionRule {
            name: "summarization_suggestion".to_string(),
            condition: Box::new(|_system, activities| {
                if let Some(activity) = activities.first() {
                    if activity.activity_type == ActivityType::TextSelection {
                        if let Some(length_str) = activity.metadata.get("text_length") {
                            if let Ok(length) = length_str.parse::<usize>() {
                                if length > 500 {
                                    return Some(Suggestion {
                                        suggestion_type: SuggestionType::QuickAction,
                                        title: "Summarize this text?".to_string(),
                                        description: format!(
                                            "You selected {} characters. Would you like a summary?",
                                            length
                                        ),
                                        action: "summarize_text".to_string(),
                                        priority: 6,
                                        confidence: 0.85,
                                        context: format!("{} characters selected", length),
                                        dismissible: true,
                                    });
                                }
                            }
                        }
                    }
                }
                None
            }),
        });

        // Rule: Low memory warning
        self.rules.push(SuggestionRule {
            name: "low_memory_warning".to_string(),
            condition: Box::new(|system, _activities| {
                if system.memory_percent > 85.0 {
                    Some(Suggestion {
                        suggestion_type: SuggestionType::SystemOptimization,
                        title: "High memory usage".to_string(),
                        description: format!(
                            "Memory usage is at {:.1}%. Consider closing some applications.",
                            system.memory_percent
                        ),
                        action: "show_memory_usage".to_string(),
                        priority: 5,
                        confidence: 0.95,
                        context: format!("{:.1}% memory used", system.memory_percent),
                        dismissible: true,
                    })
                } else {
                    None
                }
            }),
        });

        // Rule: Low battery warning
        self.rules.push(SuggestionRule {
            name: "low_battery_warning".to_string(),
            condition: Box::new(|system, _activities| {
                if let Some(battery) = &system.battery {
                    if battery.percent < 20.0 && !battery.is_charging {
                        return Some(Suggestion {
                            suggestion_type: SuggestionType::SystemOptimization,
                            title: "Low battery".to_string(),
                            description: format!(
                                "Battery at {:.0}%. Consider plugging in.",
                                battery.percent
                            ),
                            action: "dismiss_battery_warning".to_string(),
                            priority: 8,
                            confidence: 1.0,
                            context: format!("{:.0}% battery remaining", battery.percent),
                            dismissible: true,
                        });
                    }
                }
                None
            }),
        });

        // Rule: Repeated AI queries - suggest workflow
        self.rules.push(SuggestionRule {
            name: "workflow_suggestion".to_string(),
            condition: Box::new(|_system, activities| {
                let ai_queries: Vec<_> = activities
                    .iter()
                    .take(20)
                    .filter(|a| a.activity_type == ActivityType::AiQuery)
                    .collect();

                if ai_queries.len() >= 5 {
                    // Check if similar actions
                    let mut action_counts: std::collections::HashMap<String, usize> =
                        std::collections::HashMap::new();
                    for query in &ai_queries {
                        if let Some(action) = query.metadata.get("action") {
                            *action_counts.entry(action.clone()).or_insert(0) += 1;
                        }
                    }

                    if let Some((action, count)) = action_counts.iter().max_by_key(|(_, c)| *c) {
                        if *count >= 3 {
                            return Some(Suggestion {
                                suggestion_type: SuggestionType::Automation,
                                title: "Create a workflow?".to_string(),
                                description: format!(
                                    "You've used '{}' {} times. Create a quick action?",
                                    action, count
                                ),
                                action: "create_workflow".to_string(),
                                priority: 4,
                                confidence: 0.6,
                                context: format!("Repeated {} action", action),
                                dismissible: true,
                            });
                        }
                    }
                }
                None
            }),
        });

        // Rule: Context help for new application
        self.rules.push(SuggestionRule {
            name: "context_help".to_string(),
            condition: Box::new(|_system, activities| {
                if let Some(activity) = activities.first() {
                    if activity.activity_type == ActivityType::AppSwitch {
                        if let Some(app) = &activity.application {
                            // Check if this is a less frequently used app
                            let app_lower = app.to_lowercase();
                            let app_count = activities
                                .iter()
                                .filter(|a| {
                                    a.application
                                        .as_ref()
                                        .map(|a| a.to_lowercase() == app_lower)
                                        .unwrap_or(false)
                                })
                                .count();

                            if app_count <= 2 {
                                return Some(Suggestion {
                                    suggestion_type: SuggestionType::ContextHelp,
                                    title: format!("Tips for {}", app),
                                    description: "Would you like some tips for this application?"
                                        .to_string(),
                                    action: "show_app_tips".to_string(),
                                    priority: 2,
                                    confidence: 0.5,
                                    context: format!("New application: {}", app),
                                    dismissible: true,
                                });
                            }
                        }
                    }
                }
                None
            }),
        });
    }

    /// Get suggestions based on current state
    pub fn get_suggestions(
        &self,
        system: &SystemState,
        activities: &[UserActivity],
    ) -> Vec<Suggestion> {
        let mut suggestions = Vec::new();

        for rule in &self.rules {
            if let Some(suggestion) = (rule.condition)(system, activities) {
                // Skip dismissed suggestions
                if !self.dismissed.read().contains(&suggestion.action) {
                    suggestions.push(suggestion);
                }
            }
        }

        // Sort by priority (descending)
        suggestions.sort_by(|a, b| b.priority.cmp(&a.priority));

        // Limit to top 5 suggestions
        suggestions.truncate(5);

        if !suggestions.is_empty() {
            log::trace!("Generated {} suggestions", suggestions.len());
        }

        suggestions
    }

    /// Dismiss a suggestion
    pub fn dismiss(&self, action: &str) {
        log::debug!("Dismissing suggestion: {}", action);
        self.dismissed.write().insert(action.to_string());
    }

    /// Clear dismissed suggestions
    pub fn clear_dismissed(&self) {
        let mut dismissed = self.dismissed.write();
        let count = dismissed.len();
        dismissed.clear();
        log::info!("Cleared {} dismissed suggestions", count);
    }

    /// Check if a suggestion is dismissed
    pub fn is_dismissed(&self, action: &str) -> bool {
        self.dismissed.read().contains(action)
    }

    /// Get list of dismissed suggestion actions
    pub fn get_dismissed(&self) -> Vec<String> {
        self.dismissed.read().iter().cloned().collect()
    }
}

impl Default for SmartSuggestions {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_system_state() -> SystemState {
        SystemState {
            cpu_usage: 50.0,
            memory_used: 8_000_000_000,
            memory_total: 16_000_000_000,
            memory_percent: 50.0,
            disks: Vec::new(),
            network: super::super::system_monitor::NetworkState {
                is_connected: true,
                connection_type: "WiFi".to_string(),
                bytes_sent: 0,
                bytes_received: 0,
            },
            battery: None,
            uptime_seconds: 3600,
            process_count: 100,
            power_mode: super::super::system_monitor::PowerMode::Balanced,
            displays: Vec::new(),
        }
    }

    #[test]
    fn test_new_suggestions_engine() {
        let engine = SmartSuggestions::new();
        assert!(!engine.is_dismissed("test_action"));
    }

    #[test]
    fn test_get_suggestions_empty_activities() {
        let engine = SmartSuggestions::new();
        let system = create_test_system_state();
        let activities: Vec<UserActivity> = Vec::new();

        let suggestions = engine.get_suggestions(&system, &activities);
        // Should return suggestions based on system state only
        assert!(suggestions.len() <= 5);
    }

    #[test]
    fn test_low_memory_warning() {
        let engine = SmartSuggestions::new();
        let mut system = create_test_system_state();
        system.memory_percent = 90.0; // High memory usage

        let suggestions = engine.get_suggestions(&system, &[]);

        let has_memory_warning = suggestions.iter().any(|s| {
            s.suggestion_type == SuggestionType::SystemOptimization && s.title.contains("memory")
        });
        assert!(has_memory_warning);
    }

    #[test]
    fn test_low_battery_warning() {
        let engine = SmartSuggestions::new();
        let mut system = create_test_system_state();
        system.battery = Some(super::super::system_monitor::BatteryState {
            percent: 15.0,
            is_charging: false,
            time_remaining_minutes: Some(30),
        });

        let suggestions = engine.get_suggestions(&system, &[]);

        let has_battery_warning = suggestions.iter().any(|s| {
            s.suggestion_type == SuggestionType::SystemOptimization && s.title.contains("battery")
        });
        assert!(has_battery_warning);
    }

    #[test]
    fn test_dismiss_suggestion() {
        let engine = SmartSuggestions::new();

        engine.dismiss("test_action");
        assert!(engine.is_dismissed("test_action"));

        engine.clear_dismissed();
        assert!(!engine.is_dismissed("test_action"));
    }

    #[test]
    fn test_suggestions_sorted_by_priority() {
        let engine = SmartSuggestions::new();
        let mut system = create_test_system_state();
        system.memory_percent = 90.0;
        system.battery = Some(super::super::system_monitor::BatteryState {
            percent: 10.0,
            is_charging: false,
            time_remaining_minutes: Some(20),
        });

        let suggestions = engine.get_suggestions(&system, &[]);

        // Verify suggestions are sorted by priority (descending)
        for i in 1..suggestions.len() {
            assert!(suggestions[i - 1].priority >= suggestions[i].priority);
        }
    }

    #[test]
    fn test_suggestions_limited_to_five() {
        let engine = SmartSuggestions::new();
        let system = create_test_system_state();

        // Create many activities to trigger multiple suggestions
        let mut activities = Vec::new();
        for i in 0..100 {
            let mut activity =
                UserActivity::text_selection(&format!("text {}", i), Some("VSCode".to_string()));
            activity.timestamp = chrono::Utc::now().timestamp_millis() - (i as i64 * 1000);
            activities.push(activity);
        }

        let suggestions = engine.get_suggestions(&system, &activities);
        assert!(suggestions.len() <= 5);
    }

    #[test]
    fn test_suggestion_types() {
        // Test that all suggestion types can be serialized
        let types = vec![
            SuggestionType::QuickAction,
            SuggestionType::ProductivityTip,
            SuggestionType::ContextHelp,
            SuggestionType::Automation,
            SuggestionType::Learning,
            SuggestionType::SystemOptimization,
            SuggestionType::BreakReminder,
            SuggestionType::FollowUp,
        ];

        for t in types {
            let json = serde_json::to_string(&t);
            assert!(json.is_ok());
        }
    }

    #[test]
    fn test_suggestion_serialization() {
        let suggestion = Suggestion {
            suggestion_type: SuggestionType::QuickAction,
            title: "Test".to_string(),
            description: "Test description".to_string(),
            action: "test_action".to_string(),
            priority: 5,
            confidence: 0.8,
            context: "Test context".to_string(),
            dismissible: true,
        };

        let json = serde_json::to_string(&suggestion);
        assert!(json.is_ok());

        let parsed: Result<Suggestion, _> = serde_json::from_str(&json.unwrap());
        assert!(parsed.is_ok());
    }

    #[test]
    fn test_default_trait() {
        let engine = SmartSuggestions::default();
        let system = create_test_system_state();
        let suggestions = engine.get_suggestions(&system, &[]);
        assert!(suggestions.len() <= 5);
    }

    #[test]
    fn test_suggestion_clone() {
        let suggestion = Suggestion {
            suggestion_type: SuggestionType::BreakReminder,
            title: "Take a break".to_string(),
            description: "You've been working hard".to_string(),
            action: "break".to_string(),
            priority: 3,
            confidence: 0.7,
            context: "Long session".to_string(),
            dismissible: true,
        };

        let cloned = suggestion.clone();
        assert_eq!(cloned.title, suggestion.title);
        assert_eq!(cloned.priority, suggestion.priority);
        assert_eq!(cloned.confidence, suggestion.confidence);
    }

    #[test]
    fn test_suggestion_debug() {
        let suggestion = Suggestion {
            suggestion_type: SuggestionType::Learning,
            title: "Debug Test".to_string(),
            description: "Debug description".to_string(),
            action: "debug_action".to_string(),
            priority: 1,
            confidence: 0.5,
            context: "Debug context".to_string(),
            dismissible: false,
        };

        let debug_str = format!("{:?}", suggestion);
        assert!(debug_str.contains("Debug Test"));
        assert!(debug_str.contains("Learning"));
    }

    #[test]
    fn test_suggestion_type_equality() {
        assert_eq!(SuggestionType::QuickAction, SuggestionType::QuickAction);
        assert_ne!(SuggestionType::QuickAction, SuggestionType::BreakReminder);
        assert_ne!(SuggestionType::Automation, SuggestionType::Learning);
    }

    #[test]
    fn test_code_explanation_suggestion() {
        let engine = SmartSuggestions::new();
        let system = create_test_system_state();

        // Create activities that should trigger code explanation
        let mut activities = Vec::new();
        for _ in 0..5 {
            let mut activity =
                UserActivity::text_selection("code snippet", Some("VSCode".to_string()));
            activity.timestamp = chrono::Utc::now().timestamp_millis();
            activities.push(activity);
        }

        let suggestions = engine.get_suggestions(&system, &activities);

        let has_code_suggestion = suggestions
            .iter()
            .any(|s| s.action == "explain_code" || s.title.to_lowercase().contains("code"));
        assert!(has_code_suggestion);
    }

    #[test]
    fn test_translation_suggestion() {
        let engine = SmartSuggestions::new();
        let system = create_test_system_state();

        // Create activity with non-ASCII text (foreign language)
        let activity = UserActivity {
            activity_type: ActivityType::TextSelection,
            description: "Selected text".to_string(),
            application: None,
            target: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
            duration_ms: None,
            metadata: {
                let mut m = std::collections::HashMap::new();
                m.insert("text_preview".to_string(), "这是中文测试文本".to_string());
                m.insert("text_length".to_string(), "24".to_string());
                m
            },
        };

        let suggestions = engine.get_suggestions(&system, &[activity]);

        let has_translation = suggestions
            .iter()
            .any(|s| s.action == "translate_text" || s.title.to_lowercase().contains("translate"));
        assert!(has_translation);
    }

    #[test]
    fn test_summarization_suggestion() {
        let engine = SmartSuggestions::new();
        let system = create_test_system_state();

        // Create activity with long text
        let activity = UserActivity {
            activity_type: ActivityType::TextSelection,
            description: "Selected long text".to_string(),
            application: None,
            target: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
            duration_ms: None,
            metadata: {
                let mut m = std::collections::HashMap::new();
                m.insert("text_length".to_string(), "1000".to_string());
                m
            },
        };

        let suggestions = engine.get_suggestions(&system, &[activity]);

        let has_summarize = suggestions
            .iter()
            .any(|s| s.action == "summarize_text" || s.title.to_lowercase().contains("summarize"));
        assert!(has_summarize);
    }

    #[test]
    fn test_break_reminder_suggestion() {
        let engine = SmartSuggestions::new();
        let system = create_test_system_state();

        // Create many recent activities to trigger break reminder
        let now = chrono::Utc::now().timestamp_millis();
        let mut activities = Vec::new();
        for i in 0..60 {
            let mut activity = UserActivity::text_selection(&format!("text {}", i), None);
            activity.timestamp = now - (i as i64 * 60000); // 1 minute apart, all within last hour
            activities.push(activity);
        }

        let suggestions = engine.get_suggestions(&system, &activities);

        let has_break = suggestions
            .iter()
            .any(|s| s.suggestion_type == SuggestionType::BreakReminder);
        assert!(has_break);
    }

    #[test]
    fn test_workflow_suggestion() {
        let engine = SmartSuggestions::new();
        let system = create_test_system_state();

        // Create repeated AI queries with same action
        let mut activities = Vec::new();
        for i in 0..10 {
            let mut activity = UserActivity::ai_query(&format!("query {}", i), "explain");
            activity.timestamp = chrono::Utc::now().timestamp_millis() - (i as i64 * 1000);
            activities.push(activity);
        }

        let suggestions = engine.get_suggestions(&system, &activities);

        let has_workflow = suggestions.iter().any(|s| {
            s.suggestion_type == SuggestionType::Automation || s.action == "create_workflow"
        });
        assert!(has_workflow);
    }

    #[test]
    fn test_context_help_suggestion() {
        let engine = SmartSuggestions::new();
        let system = create_test_system_state();

        // Create app switch to a new app
        let activity =
            UserActivity::app_switch(Some("OldApp".to_string()), "NewUniqueApp".to_string());

        let suggestions = engine.get_suggestions(&system, &[activity]);

        let has_context_help = suggestions.iter().any(|s| {
            s.suggestion_type == SuggestionType::ContextHelp || s.action == "show_app_tips"
        });
        assert!(has_context_help);
    }

    #[test]
    fn test_dismissed_suggestions_not_returned() {
        let engine = SmartSuggestions::new();
        let mut system = create_test_system_state();
        system.memory_percent = 95.0; // High memory to trigger warning

        // First get suggestions
        let suggestions = engine.get_suggestions(&system, &[]);
        let memory_action = suggestions
            .iter()
            .find(|s| s.action == "show_memory_usage")
            .map(|s| s.action.clone());

        if let Some(action) = memory_action {
            // Dismiss the memory warning
            engine.dismiss(&action);

            // Get suggestions again
            let new_suggestions = engine.get_suggestions(&system, &[]);

            // Should not contain the dismissed suggestion
            let has_memory_warning = new_suggestions
                .iter()
                .any(|s| s.action == "show_memory_usage");
            assert!(!has_memory_warning);
        }
    }

    #[test]
    fn test_clear_dismissed_restores_suggestions() {
        let engine = SmartSuggestions::new();

        engine.dismiss("test_action");
        assert!(engine.is_dismissed("test_action"));

        engine.clear_dismissed();
        assert!(!engine.is_dismissed("test_action"));
    }

    #[test]
    fn test_battery_charging_no_warning() {
        let engine = SmartSuggestions::new();
        let mut system = create_test_system_state();
        system.battery = Some(super::super::system_monitor::BatteryState {
            percent: 15.0,
            is_charging: true, // Charging, so no warning needed
            time_remaining_minutes: None,
        });

        let suggestions = engine.get_suggestions(&system, &[]);

        let has_battery_warning = suggestions
            .iter()
            .any(|s| s.title.to_lowercase().contains("battery"));
        assert!(!has_battery_warning);
    }

    #[test]
    fn test_normal_memory_no_warning() {
        let engine = SmartSuggestions::new();
        let mut system = create_test_system_state();
        system.memory_percent = 50.0; // Normal memory usage

        let suggestions = engine.get_suggestions(&system, &[]);

        let has_memory_warning = suggestions
            .iter()
            .any(|s| s.title.to_lowercase().contains("memory"));
        assert!(!has_memory_warning);
    }

    #[test]
    fn test_suggestion_priority_range() {
        let engine = SmartSuggestions::new();
        let mut system = create_test_system_state();
        system.memory_percent = 95.0;
        system.battery = Some(super::super::system_monitor::BatteryState {
            percent: 5.0,
            is_charging: false,
            time_remaining_minutes: Some(10),
        });

        let suggestions = engine.get_suggestions(&system, &[]);

        for suggestion in &suggestions {
            assert!(suggestion.priority >= 1 && suggestion.priority <= 10);
            assert!(suggestion.confidence >= 0.0 && suggestion.confidence <= 1.0);
        }
    }

    #[test]
    fn test_suggestion_non_dismissible() {
        // Create a suggestion that is not dismissible
        let suggestion = Suggestion {
            suggestion_type: SuggestionType::SystemOptimization,
            title: "Critical".to_string(),
            description: "Critical issue".to_string(),
            action: "critical_action".to_string(),
            priority: 10,
            confidence: 1.0,
            context: "Critical".to_string(),
            dismissible: false,
        };

        assert!(!suggestion.dismissible);
    }

    #[test]
    fn test_multiple_dismissals() {
        let engine = SmartSuggestions::new();

        engine.dismiss("action1");
        engine.dismiss("action2");
        engine.dismiss("action3");

        assert!(engine.is_dismissed("action1"));
        assert!(engine.is_dismissed("action2"));
        assert!(engine.is_dismissed("action3"));
        assert!(!engine.is_dismissed("action4"));
    }

    #[test]
    fn test_no_duplicate_dismissals() {
        let engine = SmartSuggestions::new();

        engine.dismiss("same_action");
        engine.dismiss("same_action");
        engine.dismiss("same_action");

        // Should still be dismissed
        assert!(engine.is_dismissed("same_action"));

        // Clear should remove it once
        engine.clear_dismissed();
        assert!(!engine.is_dismissed("same_action"));
    }

    #[test]
    fn test_empty_activities_some_system_suggestions() {
        let engine = SmartSuggestions::new();
        let mut system = create_test_system_state();
        system.memory_percent = 90.0;

        let suggestions = engine.get_suggestions(&system, &[]);

        // Should have at least memory warning
        assert!(!suggestions.is_empty());
    }

    #[test]
    fn test_suggestions_max_five() {
        let engine = SmartSuggestions::new();
        let mut system = create_test_system_state();

        // Trigger multiple suggestions
        system.memory_percent = 95.0;
        system.battery = Some(super::super::system_monitor::BatteryState {
            percent: 5.0,
            is_charging: false,
            time_remaining_minutes: Some(5),
        });

        let now = chrono::Utc::now().timestamp_millis();
        let mut activities = Vec::new();

        // Add many activities to trigger multiple rules
        for i in 0..100 {
            let mut activity = UserActivity::text_selection("text", Some("VSCode".to_string()));
            activity.timestamp = now - (i as i64 * 30000); // 30 seconds apart
            activities.push(activity);
        }

        let suggestions = engine.get_suggestions(&system, &activities);

        // Should be limited to 5
        assert!(suggestions.len() <= 5);
    }

    #[test]
    fn test_suggestion_context_filled() {
        let engine = SmartSuggestions::new();
        let mut system = create_test_system_state();
        system.memory_percent = 92.0;

        let suggestions = engine.get_suggestions(&system, &[]);

        for suggestion in &suggestions {
            // Context should not be empty
            assert!(!suggestion.context.is_empty());
        }
    }

    #[test]
    fn test_short_text_no_summarize() {
        let engine = SmartSuggestions::new();
        let system = create_test_system_state();

        // Create activity with short text
        let activity = UserActivity {
            activity_type: ActivityType::TextSelection,
            description: "Short".to_string(),
            application: None,
            target: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
            duration_ms: None,
            metadata: {
                let mut m = std::collections::HashMap::new();
                m.insert("text_length".to_string(), "50".to_string());
                m
            },
        };

        let suggestions = engine.get_suggestions(&system, &[activity]);

        let has_summarize = suggestions.iter().any(|s| s.action == "summarize_text");
        assert!(!has_summarize);
    }

    #[test]
    fn test_ascii_text_no_translate() {
        let engine = SmartSuggestions::new();
        let system = create_test_system_state();

        // Create activity with ASCII text only
        let activity = UserActivity {
            activity_type: ActivityType::TextSelection,
            description: "Selected".to_string(),
            application: None,
            target: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
            duration_ms: None,
            metadata: {
                let mut m = std::collections::HashMap::new();
                m.insert(
                    "text_preview".to_string(),
                    "This is plain English text".to_string(),
                );
                m
            },
        };

        let suggestions = engine.get_suggestions(&system, &[activity]);

        let has_translate = suggestions.iter().any(|s| s.action == "translate_text");
        assert!(!has_translate);
    }

    #[test]
    fn test_few_code_selections_no_explain() {
        let engine = SmartSuggestions::new();
        let system = create_test_system_state();

        // Only 2 code selections (need 3+ to trigger)
        let activities: Vec<UserActivity> = (0..2)
            .map(|_| UserActivity::text_selection("code", Some("VSCode".to_string())))
            .collect();

        let suggestions = engine.get_suggestions(&system, &activities);

        let has_explain = suggestions.iter().any(|s| s.action == "explain_code");
        assert!(!has_explain);
    }
}
