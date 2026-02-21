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
                Annotation::Rectangle {
                    x,
                    y,
                    width,
                    height,
                    color,
                    stroke_width,
                    filled,
                } => {
                    self.draw_rectangle(
                        pixels,
                        *x,
                        *y,
                        *width,
                        *height,
                        color,
                        *stroke_width,
                        *filled,
                    )?;
                }
                Annotation::Blur {
                    x,
                    y,
                    width,
                    height,
                    intensity,
                } => {
                    self.apply_blur(pixels, *x, *y, *width, *height, *intensity)?;
                }
                Annotation::Highlight {
                    x,
                    y,
                    width,
                    height,
                    color,
                    opacity,
                } => {
                    self.apply_highlight(pixels, *x, *y, *width, *height, color, *opacity)?;
                }
                Annotation::Ellipse {
                    cx,
                    cy,
                    rx,
                    ry,
                    color,
                    stroke_width,
                    filled,
                } => {
                    self.draw_ellipse(pixels, *cx, *cy, *rx, *ry, color, *stroke_width, *filled)?;
                }
                Annotation::Arrow {
                    start_x,
                    start_y,
                    end_x,
                    end_y,
                    color,
                    stroke_width,
                } => {
                    self.draw_arrow(
                        pixels,
                        *start_x,
                        *start_y,
                        *end_x,
                        *end_y,
                        color,
                        *stroke_width,
                    )?;
                }
                Annotation::Freehand {
                    points,
                    color,
                    stroke_width,
                } => {
                    self.draw_freehand(pixels, points, color, *stroke_width)?;
                }
                Annotation::Text {
                    x,
                    y,
                    text,
                    font_size,
                    color,
                    background,
                } => {
                    self.draw_text(
                        pixels,
                        *x,
                        *y,
                        text,
                        *font_size,
                        color,
                        background.as_deref(),
                    )?;
                }
                Annotation::Marker {
                    x,
                    y,
                    number,
                    color,
                    size,
                } => {
                    self.draw_marker(pixels, *x, *y, *number, color, *size)?;
                }
            }
        }
        Ok(())
    }

    /// Draw a rectangle on the image
    #[allow(clippy::too_many_arguments)]
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
            for bx in (x.max(0)..(x + w).min(self.image_width as i32)).step_by(block_size as usize)
            {
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
    #[allow(clippy::too_many_arguments)]
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

    /// Draw an ellipse on the image using midpoint ellipse algorithm
    #[allow(clippy::too_many_arguments)]
    fn draw_ellipse(
        &self,
        pixels: &mut [u8],
        cx: f64,
        cy: f64,
        rx: f64,
        ry: f64,
        color: &str,
        stroke_width: f64,
        filled: bool,
    ) -> Result<(), String> {
        let (r, g, b, a) = parse_color(color)?;
        let cx_i = cx as i32;
        let cy_i = cy as i32;
        let rx_i = rx as i32;
        let ry_i = ry as i32;

        if filled {
            // Filled ellipse: scan each row within the bounding box
            for py in (cy_i - ry_i).max(0)..(cy_i + ry_i + 1).min(self.image_height as i32) {
                let dy = (py - cy_i) as f64;
                // x^2/rx^2 + y^2/ry^2 = 1 => x = rx * sqrt(1 - y^2/ry^2)
                let ratio = 1.0 - (dy * dy) / (ry * ry);
                if ratio < 0.0 {
                    continue;
                }
                let half_width = (rx * ratio.sqrt()) as i32;
                for px in
                    (cx_i - half_width).max(0)..(cx_i + half_width + 1).min(self.image_width as i32)
                {
                    self.set_pixel(pixels, px as u32, py as u32, r, g, b, a);
                }
            }
        } else {
            // Stroked ellipse: draw outline with thickness
            let stroke = stroke_width.max(1.0) as i32;
            for py in (cy_i - ry_i - stroke).max(0)
                ..(cy_i + ry_i + stroke + 1).min(self.image_height as i32)
            {
                for px in (cx_i - rx_i - stroke).max(0)
                    ..(cx_i + rx_i + stroke + 1).min(self.image_width as i32)
                {
                    let dx = (px - cx_i) as f64;
                    let dy = (py - cy_i) as f64;
                    // Normalized distance from ellipse boundary
                    let dist = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
                    let dist_sqrt = dist.sqrt();
                    // Check if pixel is on the ellipse border (within stroke width)
                    let half_stroke = stroke as f64 / (2.0 * rx.min(ry));
                    if (dist_sqrt - 1.0).abs() <= half_stroke {
                        self.set_pixel(pixels, px as u32, py as u32, r, g, b, a);
                    }
                }
            }
        }
        Ok(())
    }

    /// Draw an arrow (line with arrowhead) on the image
    #[allow(clippy::too_many_arguments)]
    fn draw_arrow(
        &self,
        pixels: &mut [u8],
        start_x: f64,
        start_y: f64,
        end_x: f64,
        end_y: f64,
        color: &str,
        stroke_width: f64,
    ) -> Result<(), String> {
        let (r, g, b, a) = parse_color(color)?;
        let thickness = stroke_width.max(1.0) as i32;

        // Draw line shaft
        self.draw_thick_line(
            pixels, start_x, start_y, end_x, end_y, r, g, b, a, thickness,
        );

        // Draw arrowhead
        let angle = (end_y - start_y).atan2(end_x - start_x);
        let head_length = (stroke_width * 4.0).max(8.0);
        let head_angle = std::f64::consts::PI / 6.0; // 30 degrees

        let left_x = end_x - head_length * (angle - head_angle).cos();
        let left_y = end_y - head_length * (angle - head_angle).sin();
        let right_x = end_x - head_length * (angle + head_angle).cos();
        let right_y = end_y - head_length * (angle + head_angle).sin();

        // Fill the arrowhead triangle
        self.fill_triangle(
            pixels, end_x, end_y, left_x, left_y, right_x, right_y, r, g, b, a,
        );

        Ok(())
    }

    /// Draw a freehand path on the image
    fn draw_freehand(
        &self,
        pixels: &mut [u8],
        points: &[(f64, f64)],
        color: &str,
        stroke_width: f64,
    ) -> Result<(), String> {
        if points.len() < 2 {
            return Ok(());
        }
        let (r, g, b, a) = parse_color(color)?;
        let thickness = stroke_width.max(1.0) as i32;

        for i in 1..points.len() {
            let (x1, y1) = points[i - 1];
            let (x2, y2) = points[i];
            self.draw_thick_line(pixels, x1, y1, x2, y2, r, g, b, a, thickness);
        }
        Ok(())
    }

    /// Draw text annotation on the image (bitmap rendering of basic ASCII characters)
    #[allow(clippy::too_many_arguments)]
    fn draw_text(
        &self,
        pixels: &mut [u8],
        x: f64,
        y: f64,
        text: &str,
        font_size: f64,
        color: &str,
        background: Option<&str>,
    ) -> Result<(), String> {
        let (r, g, b, a) = parse_color(color)?;
        let char_width = (font_size * 0.6) as i32;
        let char_height = font_size as i32;
        let text_width = text.len() as i32 * char_width;
        let padding = 4;
        let x_i = x as i32;
        let y_i = y as i32 - char_height;

        // Draw background if specified
        if let Some(bg_color) = background {
            let (bg_r, bg_g, bg_b, bg_a) = parse_color(bg_color)?;
            for py in
                (y_i - padding).max(0)..(y_i + char_height + padding).min(self.image_height as i32)
            {
                for px in (x_i - padding).max(0)
                    ..(x_i + text_width + padding).min(self.image_width as i32)
                {
                    self.set_pixel(pixels, px as u32, py as u32, bg_r, bg_g, bg_b, bg_a);
                }
            }
        }

        // Render each character as a simple block glyph
        for (ci, _ch) in text.chars().enumerate() {
            let cx = x_i + ci as i32 * char_width;
            // Simple block representation: fill a smaller rectangle for each character
            let glyph_margin_x = (char_width as f64 * 0.15) as i32;
            let glyph_margin_y = (char_height as f64 * 0.1) as i32;
            for py in (y_i + glyph_margin_y).max(0)
                ..(y_i + char_height - glyph_margin_y).min(self.image_height as i32)
            {
                for px in (cx + glyph_margin_x).max(0)
                    ..(cx + char_width - glyph_margin_x).min(self.image_width as i32)
                {
                    self.set_pixel(pixels, px as u32, py as u32, r, g, b, a);
                }
            }
        }

        Ok(())
    }

    /// Draw a numbered marker (circle with number) on the image
    #[allow(clippy::too_many_arguments)]
    fn draw_marker(
        &self,
        pixels: &mut [u8],
        x: f64,
        y: f64,
        number: u32,
        color: &str,
        size: f64,
    ) -> Result<(), String> {
        let (r, g, b, a) = parse_color(color)?;
        let radius = (size / 2.0) as i32;
        let cx = x as i32;
        let cy = y as i32;

        // Draw filled circle
        for py in (cy - radius).max(0)..(cy + radius + 1).min(self.image_height as i32) {
            for px in (cx - radius).max(0)..(cx + radius + 1).min(self.image_width as i32) {
                let dx = px - cx;
                let dy = py - cy;
                if dx * dx + dy * dy <= radius * radius {
                    self.set_pixel(pixels, px as u32, py as u32, r, g, b, a);
                }
            }
        }

        // Draw number in white (simple block rendering)
        let num_str = number.to_string();
        let num_char_w = (size * 0.35) as i32;
        let num_char_h = (size * 0.5) as i32;
        let total_w = num_str.len() as i32 * num_char_w;
        let start_x = cx - total_w / 2;
        let start_y = cy - num_char_h / 2;

        for (ci, _ch) in num_str.chars().enumerate() {
            let gx = start_x + ci as i32 * num_char_w;
            let margin = (num_char_w as f64 * 0.15) as i32;
            for py in (start_y + margin).max(0)
                ..(start_y + num_char_h - margin).min(self.image_height as i32)
            {
                for px in
                    (gx + margin).max(0)..(gx + num_char_w - margin).min(self.image_width as i32)
                {
                    // White text
                    self.set_pixel(pixels, px as u32, py as u32, 255, 255, 255, 255);
                }
            }
        }

        Ok(())
    }

    /// Draw a thick line using Bresenham's algorithm with thickness
    #[allow(clippy::too_many_arguments)]
    fn draw_thick_line(
        &self,
        pixels: &mut [u8],
        x1: f64,
        y1: f64,
        x2: f64,
        y2: f64,
        r: u8,
        g: u8,
        b: u8,
        a: u8,
        thickness: i32,
    ) {
        let half = thickness / 2;
        let dx = (x2 - x1).abs();
        let dy = (y2 - y1).abs();
        let steps = dx.max(dy).max(1.0) as i32;

        for i in 0..=steps {
            let t = i as f64 / steps as f64;
            let px = (x1 + t * (x2 - x1)) as i32;
            let py = (y1 + t * (y2 - y1)) as i32;

            // Draw a square brush at each point
            for oy in -half..=half {
                for ox in -half..=half {
                    let fx = px + ox;
                    let fy = py + oy;
                    if fx >= 0
                        && fx < self.image_width as i32
                        && fy >= 0
                        && fy < self.image_height as i32
                    {
                        self.set_pixel(pixels, fx as u32, fy as u32, r, g, b, a);
                    }
                }
            }
        }
    }

    /// Fill a triangle using scanline algorithm
    #[allow(clippy::too_many_arguments)]
    fn fill_triangle(
        &self,
        pixels: &mut [u8],
        x1: f64,
        y1: f64,
        x2: f64,
        y2: f64,
        x3: f64,
        y3: f64,
        r: u8,
        g: u8,
        b: u8,
        a: u8,
    ) {
        let min_y = (y1.min(y2).min(y3) as i32).max(0);
        let max_y = (y1.max(y2).max(y3) as i32).min(self.image_height as i32 - 1);
        let min_x = (x1.min(x2).min(x3) as i32).max(0);
        let max_x = (x1.max(x2).max(x3) as i32).min(self.image_width as i32 - 1);

        for py in min_y..=max_y {
            for px in min_x..=max_x {
                // Barycentric coordinate check
                let px_f = px as f64 + 0.5;
                let py_f = py as f64 + 0.5;
                let d1 = (px_f - x2) * (y1 - y2) - (x1 - x2) * (py_f - y2);
                let d2 = (px_f - x3) * (y2 - y3) - (x2 - x3) * (py_f - y3);
                let d3 = (px_f - x1) * (y3 - y1) - (x3 - x1) * (py_f - y1);

                let has_neg = (d1 < 0.0) || (d2 < 0.0) || (d3 < 0.0);
                let has_pos = (d1 > 0.0) || (d2 > 0.0) || (d3 > 0.0);

                if !(has_neg && has_pos) {
                    self.set_pixel(pixels, px as u32, py as u32, r, g, b, a);
                }
            }
        }
    }

    /// Set a pixel value
    #[allow(clippy::too_many_arguments)]
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
    #[allow(clippy::too_many_arguments)]
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
    if let Some(hex) = color.strip_prefix('#') {
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

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== parse_color Tests ====================

    #[test]
    fn test_parse_color_hex_6() {
        let (r, g, b, a) = parse_color("#FF0000").unwrap();
        assert_eq!((r, g, b, a), (255, 0, 0, 255));

        let (r, g, b, a) = parse_color("#00FF00").unwrap();
        assert_eq!((r, g, b, a), (0, 255, 0, 255));

        let (r, g, b, a) = parse_color("#0000FF").unwrap();
        assert_eq!((r, g, b, a), (0, 0, 255, 255));
    }

    #[test]
    fn test_parse_color_hex_8() {
        let (r, g, b, a) = parse_color("#FF000080").unwrap();
        assert_eq!((r, g, b, a), (255, 0, 0, 128));

        let (r, g, b, a) = parse_color("#00FF00FF").unwrap();
        assert_eq!((r, g, b, a), (0, 255, 0, 255));
    }

    #[test]
    fn test_parse_color_hex_3() {
        let (r, g, b, a) = parse_color("#F00").unwrap();
        assert_eq!((r, g, b, a), (255, 0, 0, 255));

        let (r, g, b, a) = parse_color("#0F0").unwrap();
        assert_eq!((r, g, b, a), (0, 255, 0, 255));

        let (r, g, b, a) = parse_color("#00F").unwrap();
        assert_eq!((r, g, b, a), (0, 0, 255, 255));
    }

    #[test]
    fn test_parse_color_named_colors() {
        assert_eq!(parse_color("red").unwrap(), (255, 0, 0, 255));
        assert_eq!(parse_color("green").unwrap(), (0, 255, 0, 255));
        assert_eq!(parse_color("blue").unwrap(), (0, 0, 255, 255));
        assert_eq!(parse_color("yellow").unwrap(), (255, 255, 0, 255));
        assert_eq!(parse_color("orange").unwrap(), (255, 165, 0, 255));
        assert_eq!(parse_color("purple").unwrap(), (128, 0, 128, 255));
        assert_eq!(parse_color("pink").unwrap(), (255, 192, 203, 255));
        assert_eq!(parse_color("white").unwrap(), (255, 255, 255, 255));
        assert_eq!(parse_color("black").unwrap(), (0, 0, 0, 255));
        assert_eq!(parse_color("gray").unwrap(), (128, 128, 128, 255));
        assert_eq!(parse_color("grey").unwrap(), (128, 128, 128, 255));
        assert_eq!(parse_color("cyan").unwrap(), (0, 255, 255, 255));
        assert_eq!(parse_color("magenta").unwrap(), (255, 0, 255, 255));
    }

    #[test]
    fn test_parse_color_case_insensitive() {
        assert_eq!(parse_color("RED").unwrap(), (255, 0, 0, 255));
        assert_eq!(parse_color("Red").unwrap(), (255, 0, 0, 255));
        assert_eq!(parse_color("rEd").unwrap(), (255, 0, 0, 255));
    }

    #[test]
    fn test_parse_color_with_whitespace() {
        assert_eq!(parse_color("  red  ").unwrap(), (255, 0, 0, 255));
        assert_eq!(parse_color(" #FF0000 ").unwrap(), (255, 0, 0, 255));
    }

    #[test]
    fn test_parse_color_invalid() {
        assert!(parse_color("invalid").is_err());
        assert!(parse_color("#GG0000").is_err());
        assert!(parse_color("#12345").is_err());
        assert!(parse_color("#1234567890").is_err());
    }

    // ==================== ScreenshotAnnotator Tests ====================

    #[test]
    fn test_annotator_new() {
        let annotator = ScreenshotAnnotator::new(800, 600);
        assert_eq!(annotator.image_width, 800);
        assert_eq!(annotator.image_height, 600);
        assert!(annotator.annotations.is_empty());
    }

    #[test]
    fn test_annotator_default() {
        let annotator = ScreenshotAnnotator::default();
        assert_eq!(annotator.image_width, 0);
        assert_eq!(annotator.image_height, 0);
    }

    #[test]
    fn test_annotator_add_annotation() {
        let mut annotator = ScreenshotAnnotator::new(100, 100);

        annotator.add_annotation(Annotation::Rectangle {
            x: 10.0,
            y: 10.0,
            width: 50.0,
            height: 50.0,
            color: "#FF0000".to_string(),
            stroke_width: 2.0,
            filled: false,
        });

        assert_eq!(annotator.get_annotations().len(), 1);
    }

    #[test]
    fn test_annotator_multiple_annotations() {
        let mut annotator = ScreenshotAnnotator::new(100, 100);

        annotator.add_annotation(Annotation::Rectangle {
            x: 10.0,
            y: 10.0,
            width: 20.0,
            height: 20.0,
            color: "red".to_string(),
            stroke_width: 1.0,
            filled: false,
        });
        annotator.add_annotation(Annotation::Ellipse {
            cx: 50.0,
            cy: 50.0,
            rx: 20.0,
            ry: 15.0,
            color: "blue".to_string(),
            stroke_width: 2.0,
            filled: true,
        });
        annotator.add_annotation(Annotation::Arrow {
            start_x: 0.0,
            start_y: 0.0,
            end_x: 100.0,
            end_y: 100.0,
            color: "green".to_string(),
            stroke_width: 3.0,
        });

        assert_eq!(annotator.get_annotations().len(), 3);
    }

    #[test]
    fn test_annotator_undo() {
        let mut annotator = ScreenshotAnnotator::new(100, 100);

        annotator.add_annotation(Annotation::Rectangle {
            x: 0.0,
            y: 0.0,
            width: 10.0,
            height: 10.0,
            color: "red".to_string(),
            stroke_width: 1.0,
            filled: false,
        });
        annotator.add_annotation(Annotation::Rectangle {
            x: 20.0,
            y: 20.0,
            width: 10.0,
            height: 10.0,
            color: "blue".to_string(),
            stroke_width: 1.0,
            filled: false,
        });

        assert_eq!(annotator.get_annotations().len(), 2);

        let undone = annotator.undo();
        assert!(undone.is_some());
        assert_eq!(annotator.get_annotations().len(), 1);

        let undone = annotator.undo();
        assert!(undone.is_some());
        assert_eq!(annotator.get_annotations().len(), 0);

        let undone = annotator.undo();
        assert!(undone.is_none());
    }

    #[test]
    fn test_annotator_clear() {
        let mut annotator = ScreenshotAnnotator::new(100, 100);

        for _ in 0..5 {
            annotator.add_annotation(Annotation::Rectangle {
                x: 0.0,
                y: 0.0,
                width: 10.0,
                height: 10.0,
                color: "red".to_string(),
                stroke_width: 1.0,
                filled: false,
            });
        }

        assert_eq!(annotator.get_annotations().len(), 5);

        annotator.clear();
        assert!(annotator.get_annotations().is_empty());
    }

    #[test]
    fn test_annotator_export_import_annotations() {
        let mut annotator = ScreenshotAnnotator::new(100, 100);

        annotator.add_annotation(Annotation::Rectangle {
            x: 10.0,
            y: 10.0,
            width: 50.0,
            height: 50.0,
            color: "#FF0000".to_string(),
            stroke_width: 2.0,
            filled: false,
        });
        annotator.add_annotation(Annotation::Text {
            x: 20.0,
            y: 20.0,
            text: "Hello".to_string(),
            font_size: 12.0,
            color: "black".to_string(),
            background: Some("white".to_string()),
        });

        let json = annotator.export_annotations();
        assert!(!json.is_empty());

        let mut new_annotator = ScreenshotAnnotator::new(100, 100);
        new_annotator.import_annotations(&json).unwrap();

        assert_eq!(new_annotator.get_annotations().len(), 2);
    }

    #[test]
    fn test_annotator_import_invalid_json() {
        let mut annotator = ScreenshotAnnotator::new(100, 100);
        let result = annotator.import_annotations("invalid json");
        assert!(result.is_err());
    }

    // ==================== Annotation Serialization Tests ====================

    #[test]
    fn test_annotation_rectangle_serialization() {
        let annotation = Annotation::Rectangle {
            x: 10.0,
            y: 20.0,
            width: 100.0,
            height: 50.0,
            color: "#FF0000".to_string(),
            stroke_width: 2.0,
            filled: true,
        };

        let json = serde_json::to_string(&annotation).unwrap();
        let deserialized: Annotation = serde_json::from_str(&json).unwrap();

        if let Annotation::Rectangle {
            x,
            y,
            width,
            height,
            color,
            stroke_width,
            filled,
        } = deserialized
        {
            assert_eq!(x, 10.0);
            assert_eq!(y, 20.0);
            assert_eq!(width, 100.0);
            assert_eq!(height, 50.0);
            assert_eq!(color, "#FF0000");
            assert_eq!(stroke_width, 2.0);
            assert!(filled);
        } else {
            panic!("Wrong annotation type");
        }
    }

    #[test]
    fn test_annotation_ellipse_serialization() {
        let annotation = Annotation::Ellipse {
            cx: 50.0,
            cy: 50.0,
            rx: 30.0,
            ry: 20.0,
            color: "blue".to_string(),
            stroke_width: 1.5,
            filled: false,
        };

        let json = serde_json::to_string(&annotation).unwrap();
        let deserialized: Annotation = serde_json::from_str(&json).unwrap();

        if let Annotation::Ellipse { cx, cy, rx, ry, .. } = deserialized {
            assert_eq!(cx, 50.0);
            assert_eq!(cy, 50.0);
            assert_eq!(rx, 30.0);
            assert_eq!(ry, 20.0);
        } else {
            panic!("Wrong annotation type");
        }
    }

    #[test]
    fn test_annotation_arrow_serialization() {
        let annotation = Annotation::Arrow {
            start_x: 0.0,
            start_y: 0.0,
            end_x: 100.0,
            end_y: 100.0,
            color: "green".to_string(),
            stroke_width: 3.0,
        };

        let json = serde_json::to_string(&annotation).unwrap();
        let deserialized: Annotation = serde_json::from_str(&json).unwrap();

        if let Annotation::Arrow {
            start_x,
            start_y,
            end_x,
            end_y,
            ..
        } = deserialized
        {
            assert_eq!(start_x, 0.0);
            assert_eq!(start_y, 0.0);
            assert_eq!(end_x, 100.0);
            assert_eq!(end_y, 100.0);
        } else {
            panic!("Wrong annotation type");
        }
    }

    #[test]
    fn test_annotation_freehand_serialization() {
        let annotation = Annotation::Freehand {
            points: vec![(0.0, 0.0), (10.0, 10.0), (20.0, 5.0), (30.0, 15.0)],
            color: "black".to_string(),
            stroke_width: 2.0,
        };

        let json = serde_json::to_string(&annotation).unwrap();
        let deserialized: Annotation = serde_json::from_str(&json).unwrap();

        if let Annotation::Freehand { points, .. } = deserialized {
            assert_eq!(points.len(), 4);
            assert_eq!(points[0], (0.0, 0.0));
        } else {
            panic!("Wrong annotation type");
        }
    }

    #[test]
    fn test_annotation_text_serialization() {
        let annotation = Annotation::Text {
            x: 50.0,
            y: 50.0,
            text: "Test Text".to_string(),
            font_size: 16.0,
            color: "black".to_string(),
            background: Some("yellow".to_string()),
        };

        let json = serde_json::to_string(&annotation).unwrap();
        let deserialized: Annotation = serde_json::from_str(&json).unwrap();

        if let Annotation::Text {
            text,
            font_size,
            background,
            ..
        } = deserialized
        {
            assert_eq!(text, "Test Text");
            assert_eq!(font_size, 16.0);
            assert_eq!(background, Some("yellow".to_string()));
        } else {
            panic!("Wrong annotation type");
        }
    }

    #[test]
    fn test_annotation_blur_serialization() {
        let annotation = Annotation::Blur {
            x: 10.0,
            y: 10.0,
            width: 100.0,
            height: 50.0,
            intensity: 0.8,
        };

        let json = serde_json::to_string(&annotation).unwrap();
        let deserialized: Annotation = serde_json::from_str(&json).unwrap();

        if let Annotation::Blur { intensity, .. } = deserialized {
            assert_eq!(intensity, 0.8);
        } else {
            panic!("Wrong annotation type");
        }
    }

    #[test]
    fn test_annotation_highlight_serialization() {
        let annotation = Annotation::Highlight {
            x: 0.0,
            y: 0.0,
            width: 200.0,
            height: 100.0,
            color: "yellow".to_string(),
            opacity: 0.5,
        };

        let json = serde_json::to_string(&annotation).unwrap();
        let deserialized: Annotation = serde_json::from_str(&json).unwrap();

        if let Annotation::Highlight { opacity, color, .. } = deserialized {
            assert_eq!(opacity, 0.5);
            assert_eq!(color, "yellow");
        } else {
            panic!("Wrong annotation type");
        }
    }

    #[test]
    fn test_annotation_marker_serialization() {
        let annotation = Annotation::Marker {
            x: 100.0,
            y: 100.0,
            number: 1,
            color: "red".to_string(),
            size: 24.0,
        };

        let json = serde_json::to_string(&annotation).unwrap();
        let deserialized: Annotation = serde_json::from_str(&json).unwrap();

        if let Annotation::Marker { number, size, .. } = deserialized {
            assert_eq!(number, 1);
            assert_eq!(size, 24.0);
        } else {
            panic!("Wrong annotation type");
        }
    }

    // ==================== Drawing Tests ====================

    #[test]
    fn test_set_pixel() {
        let annotator = ScreenshotAnnotator::new(10, 10);
        let mut pixels = vec![0u8; 10 * 10 * 4];

        annotator.set_pixel(&mut pixels, 5, 5, 255, 128, 64, 255);

        let idx = (5 * 10 + 5) * 4;
        assert_eq!(pixels[idx], 255);
        assert_eq!(pixels[idx + 1], 128);
        assert_eq!(pixels[idx + 2], 64);
        assert_eq!(pixels[idx + 3], 255);
    }

    #[test]
    fn test_set_pixel_out_of_bounds() {
        let annotator = ScreenshotAnnotator::new(10, 10);
        let mut pixels = vec![0u8; 10 * 10 * 4];

        // Should not panic or modify anything when out of bounds
        annotator.set_pixel(&mut pixels, 100, 100, 255, 0, 0, 255);

        // All pixels should still be zero
        assert!(pixels.iter().all(|&p| p == 0));
    }

    #[test]
    fn test_blend_pixel() {
        let annotator = ScreenshotAnnotator::new(10, 10);
        let mut pixels = vec![0u8; 10 * 10 * 4];

        // Set initial pixel to white
        let idx = (5 * 10 + 5) * 4;
        pixels[idx] = 255;
        pixels[idx + 1] = 255;
        pixels[idx + 2] = 255;
        pixels[idx + 3] = 255;

        // Blend with semi-transparent red (50% alpha)
        annotator.blend_pixel(&mut pixels, 5, 5, 255, 0, 0, 128);

        // Result should be between white and red
        assert!(pixels[idx] > 127);
        assert!(pixels[idx + 1] < 255);
        assert!(pixels[idx + 2] < 255);
    }

    #[test]
    fn test_draw_rectangle_filled() {
        let annotator = ScreenshotAnnotator::new(20, 20);
        let mut pixels = vec![0u8; 20 * 20 * 4];

        annotator
            .draw_rectangle(&mut pixels, 5.0, 5.0, 10.0, 10.0, "#FF0000", 1.0, true)
            .unwrap();

        // Check a pixel inside the rectangle
        let idx = (7 * 20 + 7) * 4;
        assert_eq!(pixels[idx], 255); // Red
        assert_eq!(pixels[idx + 1], 0); // Green
        assert_eq!(pixels[idx + 2], 0); // Blue
    }

    #[test]
    fn test_draw_rectangle_unfilled() {
        let annotator = ScreenshotAnnotator::new(20, 20);
        let mut pixels = vec![0u8; 20 * 20 * 4];

        annotator
            .draw_rectangle(&mut pixels, 2.0, 2.0, 10.0, 10.0, "blue", 1.0, false)
            .unwrap();

        // Check top edge pixel
        let idx = (2 * 20 + 5) * 4;
        assert_eq!(pixels[idx], 0);
        assert_eq!(pixels[idx + 1], 0);
        assert_eq!(pixels[idx + 2], 255);

        // Check center pixel (should be empty)
        let center_idx = (7 * 20 + 7) * 4;
        assert_eq!(pixels[center_idx], 0);
    }

    #[test]
    fn test_apply_blur() {
        let annotator = ScreenshotAnnotator::new(20, 20);
        let mut pixels = vec![128u8; 20 * 20 * 4];

        // Set alpha channel
        for i in 0..(20 * 20) {
            pixels[i * 4 + 3] = 255;
        }

        let result = annotator.apply_blur(&mut pixels, 5.0, 5.0, 10.0, 10.0, 0.5);
        assert!(result.is_ok());
    }

    #[test]
    fn test_apply_highlight() {
        let annotator = ScreenshotAnnotator::new(20, 20);
        let mut pixels = vec![0u8; 20 * 20 * 4];

        let result = annotator.apply_highlight(&mut pixels, 5.0, 5.0, 10.0, 10.0, "yellow", 0.5);
        assert!(result.is_ok());

        // Check that pixels were modified
        let idx = (7 * 20 + 7) * 4;
        assert!(pixels[idx] > 0 || pixels[idx + 1] > 0);
    }

    #[test]
    fn test_apply_to_image() {
        let mut annotator = ScreenshotAnnotator::new(50, 50);
        let mut pixels = vec![255u8; 50 * 50 * 4];

        annotator.add_annotation(Annotation::Rectangle {
            x: 10.0,
            y: 10.0,
            width: 20.0,
            height: 20.0,
            color: "red".to_string(),
            stroke_width: 2.0,
            filled: true,
        });
        annotator.add_annotation(Annotation::Highlight {
            x: 30.0,
            y: 30.0,
            width: 10.0,
            height: 10.0,
            color: "yellow".to_string(),
            opacity: 0.5,
        });

        let result = annotator.apply_to_image(&mut pixels);
        assert!(result.is_ok());
    }

    #[test]
    fn test_apply_to_image_empty() {
        let annotator = ScreenshotAnnotator::new(10, 10);
        let mut pixels = vec![0u8; 10 * 10 * 4];

        let result = annotator.apply_to_image(&mut pixels);
        assert!(result.is_ok());
    }

    // ==================== New Annotation Rendering Tests ====================

    #[test]
    fn test_draw_ellipse_filled() {
        let annotator = ScreenshotAnnotator::new(40, 40);
        let mut pixels = vec![0u8; 40 * 40 * 4];

        let result =
            annotator.draw_ellipse(&mut pixels, 20.0, 20.0, 10.0, 8.0, "#00FF00", 1.0, true);
        assert!(result.is_ok());

        // Center pixel should be green
        let idx = (20 * 40 + 20) * 4;
        assert_eq!(pixels[idx], 0);
        assert_eq!(pixels[idx + 1], 255);
        assert_eq!(pixels[idx + 2], 0);
    }

    #[test]
    fn test_draw_ellipse_stroked() {
        let annotator = ScreenshotAnnotator::new(40, 40);
        let mut pixels = vec![0u8; 40 * 40 * 4];

        let result =
            annotator.draw_ellipse(&mut pixels, 20.0, 20.0, 10.0, 8.0, "#FF0000", 2.0, false);
        assert!(result.is_ok());

        // Center pixel should remain empty (stroked, not filled)
        let center_idx = (20 * 40 + 20) * 4;
        assert_eq!(pixels[center_idx], 0);
    }

    #[test]
    fn test_draw_arrow() {
        let annotator = ScreenshotAnnotator::new(50, 50);
        let mut pixels = vec![0u8; 50 * 50 * 4];

        let result = annotator.draw_arrow(&mut pixels, 5.0, 25.0, 45.0, 25.0, "#0000FF", 2.0);
        assert!(result.is_ok());

        // A pixel along the shaft should be blue
        let idx = (25 * 50 + 20) * 4;
        assert_eq!(pixels[idx], 0);
        assert_eq!(pixels[idx + 1], 0);
        assert_eq!(pixels[idx + 2], 255);
    }

    #[test]
    fn test_draw_freehand() {
        let annotator = ScreenshotAnnotator::new(30, 30);
        let mut pixels = vec![0u8; 30 * 30 * 4];

        let points = vec![(5.0, 5.0), (10.0, 10.0), (15.0, 5.0), (20.0, 10.0)];
        let result = annotator.draw_freehand(&mut pixels, &points, "#FF00FF", 2.0);
        assert!(result.is_ok());

        // Check that some pixels along the path are colored
        let idx = (10 * 30 + 10) * 4;
        assert!(pixels[idx] > 0 || pixels[idx + 2] > 0);
    }

    #[test]
    fn test_draw_freehand_single_point() {
        let annotator = ScreenshotAnnotator::new(10, 10);
        let mut pixels = vec![0u8; 10 * 10 * 4];

        // Single point should not draw anything (need at least 2)
        let points = vec![(5.0, 5.0)];
        let result = annotator.draw_freehand(&mut pixels, &points, "#FF0000", 1.0);
        assert!(result.is_ok());
        assert!(pixels.iter().all(|&p| p == 0));
    }

    #[test]
    fn test_draw_text() {
        let annotator = ScreenshotAnnotator::new(100, 40);
        let mut pixels = vec![0u8; 100 * 40 * 4];

        let result = annotator.draw_text(&mut pixels, 10.0, 30.0, "Hi", 16.0, "#FF0000", None);
        assert!(result.is_ok());

        // Some pixels in the text area should be colored
        let mut any_colored = false;
        for py in 14..30 {
            for px in 10..30 {
                let idx = (py * 100 + px) * 4;
                if pixels[idx] == 255 && pixels[idx + 1] == 0 && pixels[idx + 2] == 0 {
                    any_colored = true;
                    break;
                }
            }
            if any_colored {
                break;
            }
        }
        assert!(any_colored, "Text should have drawn some red pixels");
    }

    #[test]
    fn test_draw_text_with_background() {
        let annotator = ScreenshotAnnotator::new(100, 40);
        let mut pixels = vec![0u8; 100 * 40 * 4];

        let result = annotator.draw_text(
            &mut pixels,
            10.0,
            30.0,
            "AB",
            16.0,
            "#000000",
            Some("#FFFF00"),
        );
        assert!(result.is_ok());

        // Background yellow pixel should exist
        let mut has_yellow = false;
        for py in 10..34 {
            for px in 6..40 {
                let idx = (py * 100 + px) * 4;
                if pixels[idx] == 255 && pixels[idx + 1] == 255 && pixels[idx + 2] == 0 {
                    has_yellow = true;
                    break;
                }
            }
            if has_yellow {
                break;
            }
        }
        assert!(has_yellow, "Background should have drawn yellow pixels");
    }

    #[test]
    fn test_draw_marker() {
        let annotator = ScreenshotAnnotator::new(40, 40);
        let mut pixels = vec![0u8; 40 * 40 * 4];

        let result = annotator.draw_marker(&mut pixels, 20.0, 20.0, 1, "#FF0000", 20.0);
        assert!(result.is_ok());

        // Center should have the marker color or white (number text)
        let idx = (20 * 40 + 20) * 4;
        // White number text at center
        assert_eq!(pixels[idx], 255);
        assert_eq!(pixels[idx + 1], 255);
        assert_eq!(pixels[idx + 2], 255);

        // Edge of circle should be red
        let edge_idx = (20 * 40 + 11) * 4;
        assert_eq!(pixels[edge_idx], 255);
        assert_eq!(pixels[edge_idx + 1], 0);
        assert_eq!(pixels[edge_idx + 2], 0);
    }

    #[test]
    fn test_draw_thick_line() {
        let annotator = ScreenshotAnnotator::new(20, 20);
        let mut pixels = vec![0u8; 20 * 20 * 4];

        annotator.draw_thick_line(&mut pixels, 2.0, 10.0, 18.0, 10.0, 255, 0, 0, 255, 3);

        // Pixels along the horizontal center should be red
        let idx = (10 * 20 + 10) * 4;
        assert_eq!(pixels[idx], 255);
        assert_eq!(pixels[idx + 1], 0);
        assert_eq!(pixels[idx + 2], 0);
    }

    #[test]
    fn test_fill_triangle() {
        let annotator = ScreenshotAnnotator::new(30, 30);
        let mut pixels = vec![0u8; 30 * 30 * 4];

        annotator.fill_triangle(
            &mut pixels,
            15.0,
            5.0,
            5.0,
            25.0,
            25.0,
            25.0,
            0,
            255,
            0,
            255,
        );

        // Center of triangle should be green
        let idx = (15 * 30 + 15) * 4;
        assert_eq!(pixels[idx], 0);
        assert_eq!(pixels[idx + 1], 255);
        assert_eq!(pixels[idx + 2], 0);

        // Outside triangle should be empty
        let outside = (2 * 30 + 2) * 4;
        assert_eq!(pixels[outside], 0);
    }

    #[test]
    fn test_apply_to_image_all_types() {
        let mut annotator = ScreenshotAnnotator::new(100, 100);
        let mut pixels = vec![128u8; 100 * 100 * 4];
        for i in 0..(100 * 100) {
            pixels[i * 4 + 3] = 255;
        }

        annotator.add_annotation(Annotation::Rectangle {
            x: 5.0,
            y: 5.0,
            width: 10.0,
            height: 10.0,
            color: "#FF0000".to_string(),
            stroke_width: 1.0,
            filled: true,
        });
        annotator.add_annotation(Annotation::Ellipse {
            cx: 50.0,
            cy: 50.0,
            rx: 15.0,
            ry: 10.0,
            color: "#00FF00".to_string(),
            stroke_width: 2.0,
            filled: true,
        });
        annotator.add_annotation(Annotation::Arrow {
            start_x: 70.0,
            start_y: 10.0,
            end_x: 90.0,
            end_y: 30.0,
            color: "#0000FF".to_string(),
            stroke_width: 2.0,
        });
        annotator.add_annotation(Annotation::Freehand {
            points: vec![(10.0, 80.0), (20.0, 85.0), (30.0, 75.0)],
            color: "#FF00FF".to_string(),
            stroke_width: 2.0,
        });
        annotator.add_annotation(Annotation::Text {
            x: 40.0,
            y: 90.0,
            text: "OK".to_string(),
            font_size: 12.0,
            color: "#000000".to_string(),
            background: None,
        });
        annotator.add_annotation(Annotation::Blur {
            x: 60.0,
            y: 60.0,
            width: 15.0,
            height: 15.0,
            intensity: 0.5,
        });
        annotator.add_annotation(Annotation::Highlight {
            x: 80.0,
            y: 80.0,
            width: 15.0,
            height: 15.0,
            color: "#FFFF00".to_string(),
            opacity: 0.4,
        });
        annotator.add_annotation(Annotation::Marker {
            x: 30.0,
            y: 30.0,
            number: 1,
            color: "#FF6600".to_string(),
            size: 16.0,
        });

        let result = annotator.apply_to_image(&mut pixels);
        assert!(
            result.is_ok(),
            "apply_to_image with all annotation types should succeed"
        );
    }
}
