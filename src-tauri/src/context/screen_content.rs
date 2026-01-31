//! Screen content analysis
//!
//! Provides functionality for analyzing screen content using OCR and image analysis.

use log::{debug, error, trace};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

/// Screen content analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenContent {
    /// Extracted text from screen
    pub text: String,
    /// Text blocks with positions
    pub text_blocks: Vec<TextBlock>,
    /// Detected UI elements
    pub ui_elements: Vec<UiElement>,
    /// Screen dimensions
    pub width: u32,
    pub height: u32,
    /// Timestamp of analysis
    pub timestamp: i64,
    /// Analysis confidence
    pub confidence: f64,
}

/// A block of text with position
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextBlock {
    /// The text content
    pub text: String,
    /// Bounding box
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    /// Confidence score
    pub confidence: f64,
    /// Detected language
    pub language: Option<String>,
}

/// Detected UI element
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UiElement {
    /// Element type
    pub element_type: UiElementType,
    /// Element text (if any)
    pub text: Option<String>,
    /// Bounding box
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    /// Whether the element is interactive
    pub is_interactive: bool,
}

/// UI element types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum UiElementType {
    Button,
    TextInput,
    Checkbox,
    RadioButton,
    Dropdown,
    Link,
    Menu,
    MenuItem,
    Tab,
    Window,
    Dialog,
    Tooltip,
    Icon,
    Image,
    Text,
    Unknown,
}

/// Screen content analyzer
pub struct ScreenContentAnalyzer {
    /// Last analysis result
    last_analysis: Arc<RwLock<Option<ScreenContent>>>,
}

/// Default cache duration in milliseconds
const DEFAULT_CACHE_DURATION_MS: i64 = 1000;

impl ScreenContentAnalyzer {
    pub fn new() -> Self {
        debug!("Creating new ScreenContentAnalyzer with {}ms cache duration", DEFAULT_CACHE_DURATION_MS);
        Self {
            last_analysis: Arc::new(RwLock::new(None)),
        }
    }

    /// Analyze screen content from screenshot
    pub fn analyze(
        &self,
        image_data: &[u8],
        width: u32,
        height: u32,
    ) -> Result<ScreenContent, String> {
        trace!(
            "analyze called for image: {}x{}, {} bytes",
            width,
            height,
            image_data.len()
        );

        // Check cache
        {
            let cached = self.last_analysis.read();
            if let Some(ref content) = *cached {
                let now = chrono::Utc::now().timestamp_millis();
                let age_ms = now - content.timestamp;
                if age_ms < DEFAULT_CACHE_DURATION_MS {
                    trace!("Returning cached analysis (age: {}ms)", age_ms);
                    return Ok(content.clone());
                }
                trace!(
                    "Cache expired (age: {}ms, max: {}ms)",
                    age_ms,
                    DEFAULT_CACHE_DURATION_MS
                );
            }
        }

        // Perform analysis
        debug!(
            "Performing screen content analysis for {}x{} image",
            width, height
        );
        let content = self.perform_analysis(image_data, width, height)?;

        // Update cache
        *self.last_analysis.write() = Some(content.clone());
        debug!(
            "Analysis complete: {} text blocks, {} UI elements, confidence: {:.2}",
            content.text_blocks.len(),
            content.ui_elements.len(),
            content.confidence
        );

        Ok(content)
    }

    fn perform_analysis(
        &self,
        _image_data: &[u8],
        width: u32,
        height: u32,
    ) -> Result<ScreenContent, String> {
        trace!(
            "perform_analysis: placeholder implementation for {}x{}",
            width,
            height
        );
        // This is a placeholder implementation
        // In production, this would use Windows OCR API or Tesseract

        Ok(ScreenContent {
            text: String::new(),
            text_blocks: Vec::new(),
            ui_elements: Vec::new(),
            width,
            height,
            timestamp: chrono::Utc::now().timestamp_millis(),
            confidence: 0.0,
        })
    }

    /// Analyze screen using Windows UI Automation
    #[cfg(target_os = "windows")]
    pub fn analyze_ui_automation(&self) -> Result<Vec<UiElement>, String> {
        use windows::Win32::System::Com::{
            CoCreateInstance, CoInitializeEx, CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED,
        };
        use windows::Win32::UI::Accessibility::{CUIAutomation, IUIAutomation};

        debug!("Starting UI Automation analysis");
        let mut elements = Vec::new();

        unsafe {
            // Initialize COM
            trace!("Initializing COM for UI Automation");
            let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);

            // Create UI Automation instance
            trace!("Creating UI Automation instance");
            let automation: IUIAutomation =
                match CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER) {
                    Ok(a) => a,
                    Err(e) => {
                        error!("Failed to create UI Automation: {}", e);
                        return Err(format!("Failed to create UI Automation: {}", e));
                    }
                };

            // Get root element (desktop)
            trace!("Getting root UI element");
            let _root = match automation.GetRootElement() {
                Ok(r) => r,
                Err(e) => {
                    error!("Failed to get root element: {}", e);
                    return Err(format!("Failed to get root element: {}", e));
                }
            };

            // Get focused element
            trace!("Getting focused UI element");
            if let Ok(focused) = automation.GetFocusedElement() {
                // Get element info
                if let Ok(name) = focused.CurrentName() {
                    let name_str = name.to_string();
                    if !name_str.is_empty() {
                        debug!("Found focused element: '{}'", name_str);
                        // Get bounding rectangle
                        if let Ok(rect) = focused.CurrentBoundingRectangle() {
                            trace!(
                                "Element bounds: x={}, y={}, w={}, h={}",
                                rect.left,
                                rect.top,
                                rect.right - rect.left,
                                rect.bottom - rect.top
                            );
                            elements.push(UiElement {
                                element_type: UiElementType::Unknown,
                                text: Some(name_str),
                                x: rect.left,
                                y: rect.top,
                                width: (rect.right - rect.left) as u32,
                                height: (rect.bottom - rect.top) as u32,
                                is_interactive: true,
                            });
                        }
                    }
                }
            } else {
                trace!("No focused element found");
            }
        }

        debug!(
            "UI Automation analysis complete: {} elements found",
            elements.len()
        );
        Ok(elements)
    }

    #[cfg(not(target_os = "windows"))]
    pub fn analyze_ui_automation(&self) -> Result<Vec<UiElement>, String> {
        debug!("analyze_ui_automation called on non-Windows platform");
        Ok(Vec::new())
    }

    /// Get text at specific screen coordinates
    pub fn get_text_at(&self, x: i32, y: i32) -> Option<String> {
        trace!("get_text_at: x={}, y={}", x, y);
        let analysis = self.last_analysis.read();
        if let Some(ref content) = *analysis {
            for block in &content.text_blocks {
                if x >= block.x
                    && x <= block.x + block.width as i32
                    && y >= block.y
                    && y <= block.y + block.height as i32
                {
                    debug!("Found text at ({}, {}): '{}'", x, y, block.text);
                    return Some(block.text.clone());
                }
            }
            trace!(
                "No text found at ({}, {}) in {} blocks",
                x,
                y,
                content.text_blocks.len()
            );
        } else {
            trace!("No cached analysis available");
        }
        None
    }

    /// Get UI element at specific screen coordinates
    pub fn get_element_at(&self, x: i32, y: i32) -> Option<UiElement> {
        trace!("get_element_at: x={}, y={}", x, y);
        let analysis = self.last_analysis.read();
        if let Some(ref content) = *analysis {
            for element in &content.ui_elements {
                if x >= element.x
                    && x <= element.x + element.width as i32
                    && y >= element.y
                    && y <= element.y + element.height as i32
                {
                    debug!(
                        "Found element at ({}, {}): {:?} - {:?}",
                        x, y, element.element_type, element.text
                    );
                    return Some(element.clone());
                }
            }
            trace!(
                "No element found at ({}, {}) in {} elements",
                x,
                y,
                content.ui_elements.len()
            );
        } else {
            trace!("No cached analysis available");
        }
        None
    }

    /// Clear analysis cache
    pub fn clear_cache(&self) {
        debug!("Clearing screen content analysis cache");
        *self.last_analysis.write() = None;
    }
}

impl Default for ScreenContentAnalyzer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_analyzer_new() {
        let analyzer = ScreenContentAnalyzer::new();
        assert!(analyzer.last_analysis.read().is_none());
    }

    #[test]
    fn test_analyzer_default() {
        let analyzer = ScreenContentAnalyzer::default();
        assert!(analyzer.last_analysis.read().is_none());
    }

    #[test]
    fn test_clear_cache() {
        let analyzer = ScreenContentAnalyzer::new();
        let _ = analyzer.analyze(&[], 100, 100);
        analyzer.clear_cache();
        assert!(analyzer.last_analysis.read().is_none());
    }

    #[test]
    fn test_analyze_returns_content() {
        let analyzer = ScreenContentAnalyzer::new();
        let result = analyzer.analyze(&[], 1920, 1080);
        assert!(result.is_ok());
        let content = result.unwrap();
        assert_eq!(content.width, 1920);
        assert_eq!(content.height, 1080);
    }

    #[test]
    fn test_analyze_caching() {
        let analyzer = ScreenContentAnalyzer::new();
        let result1 = analyzer.analyze(&[], 1920, 1080).unwrap();
        let timestamp1 = result1.timestamp;
        let result2 = analyzer.analyze(&[], 1920, 1080).unwrap();
        assert_eq!(timestamp1, result2.timestamp);
    }

    #[test]
    fn test_get_text_at_no_analysis() {
        let analyzer = ScreenContentAnalyzer::new();
        assert!(analyzer.get_text_at(100, 100).is_none());
    }

    #[test]
    fn test_get_element_at_no_analysis() {
        let analyzer = ScreenContentAnalyzer::new();
        assert!(analyzer.get_element_at(100, 100).is_none());
    }

    #[test]
    fn test_get_text_at_with_blocks() {
        let analyzer = ScreenContentAnalyzer::new();
        let content = ScreenContent {
            text: "Test".to_string(),
            text_blocks: vec![TextBlock {
                text: "Hello".to_string(),
                x: 50,
                y: 50,
                width: 100,
                height: 20,
                confidence: 0.95,
                language: Some("en".to_string()),
            }],
            ui_elements: vec![],
            width: 1920,
            height: 1080,
            timestamp: chrono::Utc::now().timestamp_millis(),
            confidence: 0.9,
        };
        *analyzer.last_analysis.write() = Some(content);
        assert_eq!(analyzer.get_text_at(75, 60), Some("Hello".to_string()));
        assert!(analyzer.get_text_at(200, 200).is_none());
    }

    #[test]
    fn test_get_element_at_with_elements() {
        let analyzer = ScreenContentAnalyzer::new();
        let content = ScreenContent {
            text: String::new(),
            text_blocks: vec![],
            ui_elements: vec![UiElement {
                element_type: UiElementType::Button,
                text: Some("Click".to_string()),
                x: 100,
                y: 100,
                width: 80,
                height: 30,
                is_interactive: true,
            }],
            width: 1920,
            height: 1080,
            timestamp: chrono::Utc::now().timestamp_millis(),
            confidence: 0.9,
        };
        *analyzer.last_analysis.write() = Some(content);
        let result = analyzer.get_element_at(120, 115);
        assert!(result.is_some());
        assert_eq!(result.unwrap().element_type, UiElementType::Button);
        assert!(analyzer.get_element_at(500, 500).is_none());
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn test_analyze_ui_automation_non_windows() {
        let analyzer = ScreenContentAnalyzer::new();
        let result = analyzer.analyze_ui_automation();
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }

    #[test]
    fn test_screen_content_serialization() {
        let content = ScreenContent {
            text: "Test".to_string(),
            text_blocks: vec![],
            ui_elements: vec![],
            width: 1920,
            height: 1080,
            timestamp: 0,
            confidence: 0.95,
        };
        let json = serde_json::to_string(&content);
        assert!(json.is_ok());
        let parsed: Result<ScreenContent, _> = serde_json::from_str(&json.unwrap());
        assert!(parsed.is_ok());
    }

    #[test]
    fn test_text_block_serialization() {
        let block = TextBlock {
            text: "Hello".to_string(),
            x: 100,
            y: 200,
            width: 150,
            height: 25,
            confidence: 0.98,
            language: Some("en".to_string()),
        };
        let json = serde_json::to_string(&block);
        assert!(json.is_ok());
        let parsed: TextBlock = serde_json::from_str(&json.unwrap()).unwrap();
        assert_eq!(parsed.text, "Hello");
    }

    #[test]
    fn test_ui_element_serialization() {
        let element = UiElement {
            element_type: UiElementType::Button,
            text: Some("Submit".to_string()),
            x: 300,
            y: 400,
            width: 100,
            height: 40,
            is_interactive: true,
        };
        let json = serde_json::to_string(&element);
        assert!(json.is_ok());
        let parsed: UiElement = serde_json::from_str(&json.unwrap()).unwrap();
        assert_eq!(parsed.element_type, UiElementType::Button);
    }

    #[test]
    fn test_ui_element_type_serialization() {
        let types = vec![
            UiElementType::Button,
            UiElementType::TextInput,
            UiElementType::Checkbox,
            UiElementType::RadioButton,
            UiElementType::Dropdown,
            UiElementType::Link,
            UiElementType::Menu,
            UiElementType::MenuItem,
            UiElementType::Tab,
            UiElementType::Window,
            UiElementType::Dialog,
            UiElementType::Tooltip,
            UiElementType::Icon,
            UiElementType::Image,
            UiElementType::Text,
            UiElementType::Unknown,
        ];
        for t in types {
            assert!(serde_json::to_string(&t).is_ok());
        }
    }

    #[test]
    fn test_ui_element_type_equality() {
        assert_eq!(UiElementType::Button, UiElementType::Button);
        assert_ne!(UiElementType::Button, UiElementType::TextInput);
    }

    #[test]
    fn test_screen_content_clone() {
        let content = ScreenContent {
            text: "Test".to_string(),
            text_blocks: vec![],
            ui_elements: vec![],
            width: 100,
            height: 100,
            timestamp: 12345,
            confidence: 0.9,
        };
        let cloned = content.clone();
        assert_eq!(cloned.text, "Test");
        assert_eq!(cloned.timestamp, 12345);
    }

    #[test]
    fn test_text_block_clone() {
        let block = TextBlock {
            text: "Test".to_string(),
            x: 10,
            y: 20,
            width: 30,
            height: 40,
            confidence: 0.5,
            language: Some("en".to_string()),
        };
        let cloned = block.clone();
        assert_eq!(cloned.x, 10);
    }

    #[test]
    fn test_ui_element_clone() {
        let element = UiElement {
            element_type: UiElementType::Button,
            text: Some("Clone".to_string()),
            x: 100,
            y: 200,
            width: 50,
            height: 25,
            is_interactive: true,
        };
        let cloned = element.clone();
        assert_eq!(cloned.element_type, UiElementType::Button);
    }

    #[test]
    fn test_boundary_conditions() {
        let analyzer = ScreenContentAnalyzer::new();
        let content = ScreenContent {
            text: String::new(),
            text_blocks: vec![],
            ui_elements: vec![UiElement {
                element_type: UiElementType::Button,
                text: Some("Edge".to_string()),
                x: 0,
                y: 0,
                width: 10,
                height: 10,
                is_interactive: true,
            }],
            width: 100,
            height: 100,
            timestamp: chrono::Utc::now().timestamp_millis(),
            confidence: 1.0,
        };
        *analyzer.last_analysis.write() = Some(content);
        assert!(analyzer.get_element_at(0, 0).is_some());
        assert!(analyzer.get_element_at(10, 10).is_some());
        assert!(analyzer.get_element_at(11, 11).is_none());
    }
}
