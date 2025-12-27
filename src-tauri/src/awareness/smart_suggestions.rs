//! Smart suggestions engine
//!
//! Generates context-aware suggestions based on user activity and system state.

#![allow(dead_code)]

use super::{SystemState, UserActivity, ActivityType};
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
    /// Dismissed suggestions (by action)
    dismissed: std::collections::HashSet<String>,
}

/// A rule for generating suggestions
struct SuggestionRule {
    name: String,
    condition: Box<dyn Fn(&SystemState, &[UserActivity]) -> Option<Suggestion> + Send + Sync>,
}

impl SmartSuggestions {
    pub fn new() -> Self {
        let mut engine = Self {
            rules: Vec::new(),
            dismissed: std::collections::HashSet::new(),
        };
        engine.register_default_rules();
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
                        description: "You've been very active. Consider taking a short break.".to_string(),
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
                        description: "You've selected code multiple times. Would you like an explanation?".to_string(),
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
                            let non_ascii_ratio = preview.chars().filter(|c| !c.is_ascii()).count() as f64
                                / preview.len().max(1) as f64;

                            if non_ascii_ratio > 0.3 {
                                return Some(Suggestion {
                                    suggestion_type: SuggestionType::QuickAction,
                                    title: "Translate this text?".to_string(),
                                    description: "The selected text appears to be in a foreign language.".to_string(),
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
                                        description: format!("You selected {} characters. Would you like a summary?", length),
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
                        description: format!("Memory usage is at {:.1}%. Consider closing some applications.", system.memory_percent),
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
                            description: format!("Battery at {:.0}%. Consider plugging in.", battery.percent),
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
                    let mut action_counts: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
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
                                description: format!("You've used '{}' {} times. Create a quick action?", action, count),
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
                                    description: "Would you like some tips for this application?".to_string(),
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
    pub fn get_suggestions(&self, system: &SystemState, activities: &[UserActivity]) -> Vec<Suggestion> {
        let mut suggestions = Vec::new();

        for rule in &self.rules {
            if let Some(suggestion) = (rule.condition)(system, activities) {
                // Skip dismissed suggestions
                if !self.dismissed.contains(&suggestion.action) {
                    suggestions.push(suggestion);
                }
            }
        }

        // Sort by priority (descending)
        suggestions.sort_by(|a, b| b.priority.cmp(&a.priority));

        // Limit to top 5 suggestions
        suggestions.truncate(5);

        suggestions
    }

    /// Dismiss a suggestion
    pub fn dismiss(&mut self, action: &str) {
        self.dismissed.insert(action.to_string());
    }

    /// Clear dismissed suggestions
    pub fn clear_dismissed(&mut self) {
        self.dismissed.clear();
    }

    /// Check if a suggestion is dismissed
    pub fn is_dismissed(&self, action: &str) -> bool {
        self.dismissed.contains(action)
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
            s.suggestion_type == SuggestionType::SystemOptimization
                && s.title.contains("memory")
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
            s.suggestion_type == SuggestionType::SystemOptimization
                && s.title.contains("battery")
        });
        assert!(has_battery_warning);
    }

    #[test]
    fn test_dismiss_suggestion() {
        let mut engine = SmartSuggestions::new();
        
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
            let mut activity = UserActivity::text_selection(&format!("text {}", i), Some("VSCode".to_string()));
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
}
