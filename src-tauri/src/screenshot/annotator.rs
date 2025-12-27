//! Screenshot annotation tools
//!
//! Provides basic drawing and annotation capabilities for screenshots.

use serde::{Deserialize, Serialize};

/// Annotation types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Annotation {
    /// Rectangle highlight
    Rectangle {
        x: f64,
        y: f64,
        width: f64,
        height: f64,
        color: String,
        stroke_width: f64,
        filled: bool,
    },
    /// Circle/Ellipse
    Ellipse {
        cx: f64,
        cy: f64,
        rx: f64,
        ry: f64,
        color: String,
        stroke_width: f64,
        filled: bool,
    },
    /// Arrow
    Arrow {
        start_x: f64,
        start_y: f64,
        end_x: f64,
        end_y: f64,
        color: String,
        stroke_width: f64,
    },
    /// Freehand drawing
    Freehand {
        points: Vec<(f64, f64)>,
        color: String,
        stroke_width: f64,
    },
    /// Text annotation
    Text {
        x: f64,
        y: f64,
        text: String,
        font_size: f64,
        color: String,
        background: Option<String>,
    },
    /// Blur/Pixelate region (for privacy)
    Blur {
        x: f64,
        y: f64,
        width: f64,
        height: f64,
        intensity: f64,
    },
    /// Highlight (semi-transparent overlay)
    Highlight {
        x: f64,
        y: f64,
        width: f64,
        height: f64,
        color: String,
        opacity: f64,
    },
    /// Numbered marker
    Marker {
        x: f64,
        y: f64,
        number: u32,
        color: String,
        size: f64,
    },
}

/// Screenshot annotator
pub struct ScreenshotAnnotator {
    annotations: Vec<Annotation>,
    image_width: u32,
    image_height: u32,
}

impl ScreenshotAnnotator {
    /// Create a new annotator for an image
    pub fn new(width: u32, height: u32) -> Self {
        Self {
            annotations: Vec::new(),
            image_width: width,
            image_height: height,
        }
    }

    /// Add an annotation
    pub fn add_annotation(&mut self, annotation: Annotation) {
        self.annotations.push(annotation);
    }

    /// Remove the last annotation
    pub fn undo(&mut self) -> Option<Annotation> {
        self.annotations.pop()
    }

    /// Clear all annotations
    pub fn clear(&mut self) {
        self.annotations.clear();
    }

    /// Get all annotations
    pub fn get_annotations(&self) -> &[Annotation] {
        &self.annotations
    }

    /// Apply annotations to image data (RGBA pixels)
    /// This is a simplified implementation - full rendering would use a graphics library
    pub fn apply_to_image(&self, pixels: &mut [u8]) -> Result<(), String> {
        for annotation in &self.annotations {
            match annotation {
                Annotation::Rectangle { x, y, width, height, color, stroke_width, filled } => {
                    self.draw_rectangle(pixels, *x, *y, *width, *height, color, *stroke_width, *filled)?;
                }
                Annotation::Blur { x, y, width, height, intensity } => {
                    self.apply_blur(pixels, *x, *y, *width, *height, *intensity)?;
                }
                Annotation::Highlight { x, y, width, height, color, opacity } => {
                    self.apply_highlight(pixels, *x, *y, *width, *height, color, *opacity)?;
                }
                // Other annotation types would be implemented similarly
                _ => {
                    log::debug!("Annotation type not yet implemented for direct rendering");
                }
            }
        }
        Ok(())
    }

    /// Draw a rectangle on the image
    fn draw_rectangle(
        &self,
        pixels: &mut [u8],
        x: f64,
        y: f64,
        width: f64,
        height: f64,
        color: &str,
        stroke_width: f64,
        filled: bool,
    ) -> Result<(), String> {
        let (r, g, b, a) = parse_color(color)?;
        let x = x as i32;
        let y = y as i32;
        let w = width as i32;
        let h = height as i32;
        let stroke = stroke_width as i32;

        if filled {
            // Fill the entire rectangle
            for py in y.max(0)..(y + h).min(self.image_height as i32) {
                for px in x.max(0)..(x + w).min(self.image_width as i32) {
                    self.set_pixel(pixels, px as u32, py as u32, r, g, b, a);
                }
            }
        } else {
            // Draw only the border
            for s in 0..stroke {
                // Top edge
                for px in x.max(0)..(x + w).min(self.image_width as i32) {
                    let py = y + s;
                    if py >= 0 && py < self.image_height as i32 {
                        self.set_pixel(pixels, px as u32, py as u32, r, g, b, a);
                    }
                }
                // Bottom edge
                for px in x.max(0)..(x + w).min(self.image_width as i32) {
                    let py = y + h - 1 - s;
                    if py >= 0 && py < self.image_height as i32 {
                        self.set_pixel(pixels, px as u32, py as u32, r, g, b, a);
                    }
                }
                // Left edge
                for py in y.max(0)..(y + h).min(self.image_height as i32) {
                    let px = x + s;
                    if px >= 0 && px < self.image_width as i32 {
                        self.set_pixel(pixels, px as u32, py as u32, r, g, b, a);
                    }
                }
                // Right edge
                for py in y.max(0)..(y + h).min(self.image_height as i32) {
                    let px = x + w - 1 - s;
                    if px >= 0 && px < self.image_width as i32 {
                        self.set_pixel(pixels, px as u32, py as u32, r, g, b, a);
                    }
                }
            }
        }

        Ok(())
    }

    /// Apply blur effect to a region
    fn apply_blur(
        &self,
        pixels: &mut [u8],
        x: f64,
        y: f64,
        width: f64,
        height: f64,
        intensity: f64,
    ) -> Result<(), String> {
        let x = x as i32;
        let y = y as i32;
        let w = width as i32;
        let h = height as i32;
        let block_size = (intensity * 10.0).max(4.0) as i32;

        // Pixelate effect (simpler than true blur)
        for by in (y.max(0)..(y + h).min(self.image_height as i32)).step_by(block_size as usize) {
            for bx in (x.max(0)..(x + w).min(self.image_width as i32)).step_by(block_size as usize) {
                // Calculate average color in block
                let mut total_r: u32 = 0;
                let mut total_g: u32 = 0;
                let mut total_b: u32 = 0;
                let mut count: u32 = 0;

                for py in by..(by + block_size).min(self.image_height as i32) {
                    for px in bx..(bx + block_size).min(self.image_width as i32) {
                        let idx = ((py as u32 * self.image_width + px as u32) * 4) as usize;
                        if idx + 3 < pixels.len() {
                            total_r += pixels[idx] as u32;
                            total_g += pixels[idx + 1] as u32;
                            total_b += pixels[idx + 2] as u32;
                            count += 1;
                        }
                    }
                }

                if count > 0 {
                    let avg_r = (total_r / count) as u8;
                    let avg_g = (total_g / count) as u8;
                    let avg_b = (total_b / count) as u8;

                    // Apply average color to all pixels in block
                    for py in by..(by + block_size).min(self.image_height as i32) {
                        for px in bx..(bx + block_size).min(self.image_width as i32) {
                            self.set_pixel(pixels, px as u32, py as u32, avg_r, avg_g, avg_b, 255);
                        }
                    }
                }
            }
        }

        Ok(())
    }

    /// Apply highlight overlay
    fn apply_highlight(
        &self,
        pixels: &mut [u8],
        x: f64,
        y: f64,
        width: f64,
        height: f64,
        color: &str,
        opacity: f64,
    ) -> Result<(), String> {
        let (r, g, b, _) = parse_color(color)?;
        let alpha = (opacity * 255.0) as u8;
        let x = x as i32;
        let y = y as i32;
        let w = width as i32;
        let h = height as i32;

        for py in y.max(0)..(y + h).min(self.image_height as i32) {
            for px in x.max(0)..(x + w).min(self.image_width as i32) {
                self.blend_pixel(pixels, px as u32, py as u32, r, g, b, alpha);
            }
        }

        Ok(())
    }

    /// Set a pixel value
    fn set_pixel(&self, pixels: &mut [u8], x: u32, y: u32, r: u8, g: u8, b: u8, a: u8) {
        if x < self.image_width && y < self.image_height {
            let idx = ((y * self.image_width + x) * 4) as usize;
            if idx + 3 < pixels.len() {
                pixels[idx] = r;
                pixels[idx + 1] = g;
                pixels[idx + 2] = b;
                pixels[idx + 3] = a;
            }
        }
    }

    /// Blend a pixel with alpha
    fn blend_pixel(&self, pixels: &mut [u8], x: u32, y: u32, r: u8, g: u8, b: u8, a: u8) {
        if x < self.image_width && y < self.image_height {
            let idx = ((y * self.image_width + x) * 4) as usize;
            if idx + 3 < pixels.len() {
                let alpha = a as f64 / 255.0;
                let inv_alpha = 1.0 - alpha;
                pixels[idx] = (pixels[idx] as f64 * inv_alpha + r as f64 * alpha) as u8;
                pixels[idx + 1] = (pixels[idx + 1] as f64 * inv_alpha + g as f64 * alpha) as u8;
                pixels[idx + 2] = (pixels[idx + 2] as f64 * inv_alpha + b as f64 * alpha) as u8;
            }
        }
    }

    /// Export annotations as JSON
    pub fn export_annotations(&self) -> String {
        serde_json::to_string(&self.annotations).unwrap_or_default()
    }

    /// Import annotations from JSON
    pub fn import_annotations(&mut self, json: &str) -> Result<(), String> {
        let annotations: Vec<Annotation> = serde_json::from_str(json)
            .map_err(|e| format!("Failed to parse annotations: {}", e))?;
        self.annotations = annotations;
        Ok(())
    }
}

/// Parse a color string (hex or named) to RGBA
fn parse_color(color: &str) -> Result<(u8, u8, u8, u8), String> {
    let color = color.trim();
    
    // Handle hex colors
    if color.starts_with('#') {
        let hex = &color[1..];
        match hex.len() {
            6 => {
                let r = u8::from_str_radix(&hex[0..2], 16).map_err(|e| e.to_string())?;
                let g = u8::from_str_radix(&hex[2..4], 16).map_err(|e| e.to_string())?;
                let b = u8::from_str_radix(&hex[4..6], 16).map_err(|e| e.to_string())?;
                return Ok((r, g, b, 255));
            }
            8 => {
                let r = u8::from_str_radix(&hex[0..2], 16).map_err(|e| e.to_string())?;
                let g = u8::from_str_radix(&hex[2..4], 16).map_err(|e| e.to_string())?;
                let b = u8::from_str_radix(&hex[4..6], 16).map_err(|e| e.to_string())?;
                let a = u8::from_str_radix(&hex[6..8], 16).map_err(|e| e.to_string())?;
                return Ok((r, g, b, a));
            }
            3 => {
                let r = u8::from_str_radix(&hex[0..1].repeat(2), 16).map_err(|e| e.to_string())?;
                let g = u8::from_str_radix(&hex[1..2].repeat(2), 16).map_err(|e| e.to_string())?;
                let b = u8::from_str_radix(&hex[2..3].repeat(2), 16).map_err(|e| e.to_string())?;
                return Ok((r, g, b, 255));
            }
            _ => return Err(format!("Invalid hex color: {}", color)),
        }
    }

    // Handle named colors
    match color.to_lowercase().as_str() {
        "red" => Ok((255, 0, 0, 255)),
        "green" => Ok((0, 255, 0, 255)),
        "blue" => Ok((0, 0, 255, 255)),
        "yellow" => Ok((255, 255, 0, 255)),
        "orange" => Ok((255, 165, 0, 255)),
        "purple" => Ok((128, 0, 128, 255)),
        "pink" => Ok((255, 192, 203, 255)),
        "white" => Ok((255, 255, 255, 255)),
        "black" => Ok((0, 0, 0, 255)),
        "gray" | "grey" => Ok((128, 128, 128, 255)),
        "cyan" => Ok((0, 255, 255, 255)),
        "magenta" => Ok((255, 0, 255, 255)),
        _ => Err(format!("Unknown color: {}", color)),
    }
}

impl Default for ScreenshotAnnotator {
    fn default() -> Self {
        Self::new(0, 0)
    }
}
