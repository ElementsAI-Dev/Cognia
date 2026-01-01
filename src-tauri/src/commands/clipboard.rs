//! Clipboard commands for reading images and text

use base64::{engine::general_purpose::STANDARD, Engine};
use serde::{Deserialize, Serialize};

/// Clipboard content result
#[derive(Debug, Serialize, Deserialize)]
pub struct ClipboardContent {
    pub content_type: String,
    pub data: Option<String>,
    pub mime_type: Option<String>,
}

/// Read image from clipboard (returns base64 encoded data)
#[tauri::command]
pub async fn read_clipboard_image() -> Result<ClipboardContent, String> {
    // Use arboard for cross-platform clipboard access
    let mut clipboard = arboard::Clipboard::new().map_err(|e| e.to_string())?;

    match clipboard.get_image() {
        Ok(image) => {
            // Convert RGBA image to PNG bytes
            let width = image.width as u32;
            let height = image.height as u32;

            let mut png_data = Vec::new();
            {
                let mut encoder = png::Encoder::new(&mut png_data, width, height);
                encoder.set_color(png::ColorType::Rgba);
                encoder.set_depth(png::BitDepth::Eight);

                let mut writer = encoder.write_header().map_err(|e| e.to_string())?;
                writer
                    .write_image_data(&image.bytes)
                    .map_err(|e| e.to_string())?;
            }

            let base64_data = STANDARD.encode(&png_data);

            Ok(ClipboardContent {
                content_type: "image".to_string(),
                data: Some(base64_data),
                mime_type: Some("image/png".to_string()),
            })
        }
        Err(_) => {
            // No image in clipboard, try text
            match clipboard.get_text() {
                Ok(text) => Ok(ClipboardContent {
                    content_type: "text".to_string(),
                    data: Some(text),
                    mime_type: Some("text/plain".to_string()),
                }),
                Err(_) => Ok(ClipboardContent {
                    content_type: "empty".to_string(),
                    data: None,
                    mime_type: None,
                }),
            }
        }
    }
}

/// Read text from clipboard
#[tauri::command]
pub async fn read_clipboard_text() -> Result<Option<String>, String> {
    let mut clipboard = arboard::Clipboard::new().map_err(|e| e.to_string())?;
    match clipboard.get_text() {
        Ok(text) => Ok(Some(text)),
        Err(_) => Ok(None),
    }
}

/// Write text to clipboard
#[tauri::command]
pub async fn write_clipboard_text(text: String) -> Result<(), String> {
    let mut clipboard = arboard::Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.set_text(text).map_err(|e| e.to_string())
}

/// Check if clipboard has image
#[tauri::command]
pub async fn clipboard_has_image() -> Result<bool, String> {
    let mut clipboard = arboard::Clipboard::new().map_err(|e| e.to_string())?;
    Ok(clipboard.get_image().is_ok())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clipboard_content_struct_text() {
        let content = ClipboardContent {
            content_type: "text".to_string(),
            data: Some("Hello, world!".to_string()),
            mime_type: Some("text/plain".to_string()),
        };
        
        assert_eq!(content.content_type, "text");
        assert_eq!(content.data, Some("Hello, world!".to_string()));
        assert_eq!(content.mime_type, Some("text/plain".to_string()));
    }

    #[test]
    fn test_clipboard_content_struct_image() {
        let content = ClipboardContent {
            content_type: "image".to_string(),
            data: Some("base64_encoded_data".to_string()),
            mime_type: Some("image/png".to_string()),
        };
        
        assert_eq!(content.content_type, "image");
        assert_eq!(content.data, Some("base64_encoded_data".to_string()));
        assert_eq!(content.mime_type, Some("image/png".to_string()));
    }

    #[test]
    fn test_clipboard_content_struct_empty() {
        let content = ClipboardContent {
            content_type: "empty".to_string(),
            data: None,
            mime_type: None,
        };
        
        assert_eq!(content.content_type, "empty");
        assert!(content.data.is_none());
        assert!(content.mime_type.is_none());
    }

    #[test]
    fn test_clipboard_content_serialization() {
        let content = ClipboardContent {
            content_type: "text".to_string(),
            data: Some("test data".to_string()),
            mime_type: Some("text/plain".to_string()),
        };
        
        let serialized = serde_json::to_string(&content).unwrap();
        let deserialized: ClipboardContent = serde_json::from_str(&serialized).unwrap();
        
        assert_eq!(content.content_type, deserialized.content_type);
        assert_eq!(content.data, deserialized.data);
        assert_eq!(content.mime_type, deserialized.mime_type);
    }

    #[test]
    fn test_clipboard_content_deserialization() {
        let json = r#"{"content_type":"text","data":"hello","mime_type":"text/plain"}"#;
        let content: ClipboardContent = serde_json::from_str(json).unwrap();
        
        assert_eq!(content.content_type, "text");
        assert_eq!(content.data, Some("hello".to_string()));
        assert_eq!(content.mime_type, Some("text/plain".to_string()));
    }

    #[test]
    fn test_clipboard_content_deserialization_with_nulls() {
        let json = r#"{"content_type":"empty","data":null,"mime_type":null}"#;
        let content: ClipboardContent = serde_json::from_str(json).unwrap();
        
        assert_eq!(content.content_type, "empty");
        assert!(content.data.is_none());
        assert!(content.mime_type.is_none());
    }
}
