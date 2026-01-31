//! Window snap/dock functionality
//!
//! Provides edge snapping and docking behavior for floating windows,
//! similar to QQ/WeChat style window management.

use serde::{Deserialize, Serialize};

/// Edge to snap to
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SnapEdge {
    Top,
    Bottom,
    Left,
    Right,
    TopLeft,
    TopRight,
    BottomLeft,
    BottomRight,
}

/// Window snap utilities
pub struct WindowSnap;

impl WindowSnap {
    /// Detect if a window position is close enough to an edge to snap
    /// Returns the edge to snap to, or None if not close enough
    pub fn detect_snap_edge(
        window_x: i32,
        window_y: i32,
        window_width: i32,
        window_height: i32,
        work_x: i32,
        work_y: i32,
        work_width: i32,
        work_height: i32,
        threshold: i32,
    ) -> Option<SnapEdge> {
        let dist_left = window_x - work_x;
        let dist_right = (work_x + work_width) - (window_x + window_width);
        let dist_top = window_y - work_y;
        let dist_bottom = (work_y + work_height) - (window_y + window_height);

        let near_left = dist_left.abs() <= threshold;
        let near_right = dist_right.abs() <= threshold;
        let near_top = dist_top.abs() <= threshold;
        let near_bottom = dist_bottom.abs() <= threshold;

        // Check corners first (they take priority)
        if near_top && near_left {
            return Some(SnapEdge::TopLeft);
        }
        if near_top && near_right {
            return Some(SnapEdge::TopRight);
        }
        if near_bottom && near_left {
            return Some(SnapEdge::BottomLeft);
        }
        if near_bottom && near_right {
            return Some(SnapEdge::BottomRight);
        }

        // Check edges
        if near_top {
            return Some(SnapEdge::Top);
        }
        if near_bottom {
            return Some(SnapEdge::Bottom);
        }
        if near_left {
            return Some(SnapEdge::Left);
        }
        if near_right {
            return Some(SnapEdge::Right);
        }

        None
    }

    /// Calculate the snapped position for a given edge
    pub fn calculate_snapped_position(
        edge: SnapEdge,
        window_width: i32,
        window_height: i32,
        work_x: i32,
        work_y: i32,
        work_width: i32,
        work_height: i32,
        padding: i32,
    ) -> (i32, i32) {
        match edge {
            SnapEdge::Top => {
                let x = work_x + (work_width - window_width) / 2;
                let y = work_y + padding;
                (x, y)
            }
            SnapEdge::Bottom => {
                let x = work_x + (work_width - window_width) / 2;
                let y = work_y + work_height - window_height - padding;
                (x, y)
            }
            SnapEdge::Left => {
                let x = work_x + padding;
                let y = work_y + (work_height - window_height) / 2;
                (x, y)
            }
            SnapEdge::Right => {
                let x = work_x + work_width - window_width - padding;
                let y = work_y + (work_height - window_height) / 2;
                (x, y)
            }
            SnapEdge::TopLeft => {
                (work_x + padding, work_y + padding)
            }
            SnapEdge::TopRight => {
                let x = work_x + work_width - window_width - padding;
                let y = work_y + padding;
                (x, y)
            }
            SnapEdge::BottomLeft => {
                let x = work_x + padding;
                let y = work_y + work_height - window_height - padding;
                (x, y)
            }
            SnapEdge::BottomRight => {
                let x = work_x + work_width - window_width - padding;
                let y = work_y + work_height - window_height - padding;
                (x, y)
            }
        }
    }

    /// Apply magnetic snap effect - if within threshold, return snapped position
    /// Otherwise return the original position
    pub fn apply_magnetic_snap(
        window_x: i32,
        window_y: i32,
        window_width: i32,
        window_height: i32,
        work_x: i32,
        work_y: i32,
        work_width: i32,
        work_height: i32,
        threshold: i32,
        padding: i32,
    ) -> (i32, i32, Option<SnapEdge>) {
        if let Some(edge) = Self::detect_snap_edge(
            window_x,
            window_y,
            window_width,
            window_height,
            work_x,
            work_y,
            work_width,
            work_height,
            threshold,
        ) {
            let (x, y) = Self::calculate_snapped_position(
                edge,
                window_width,
                window_height,
                work_x,
                work_y,
                work_width,
                work_height,
                padding,
            );
            (x, y, Some(edge))
        } else {
            (window_x, window_y, None)
        }
    }

    /// Clamp a position to stay within the work area
    pub fn clamp_to_work_area(
        window_x: i32,
        window_y: i32,
        window_width: i32,
        window_height: i32,
        work_x: i32,
        work_y: i32,
        work_width: i32,
        work_height: i32,
        padding: i32,
    ) -> (i32, i32) {
        let min_x = work_x + padding;
        let max_x = work_x + work_width - window_width - padding;
        let min_y = work_y + padding;
        let max_y = work_y + work_height - window_height - padding;

        let x = window_x.max(min_x).min(max_x);
        let y = window_y.max(min_y).min(max_y);

        (x, y)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const WORK_X: i32 = 0;
    const WORK_Y: i32 = 0;
    const WORK_WIDTH: i32 = 1920;
    const WORK_HEIGHT: i32 = 1080;
    const WINDOW_WIDTH: i32 = 320;
    const WINDOW_HEIGHT: i32 = 56;
    const THRESHOLD: i32 = 20;
    const PADDING: i32 = 16;

    #[test]
    fn test_detect_snap_edge_top() {
        // Window at top center, within threshold
        let edge = WindowSnap::detect_snap_edge(
            800, 10, // x, y - close to top
            WINDOW_WIDTH, WINDOW_HEIGHT,
            WORK_X, WORK_Y, WORK_WIDTH, WORK_HEIGHT,
            THRESHOLD,
        );
        assert_eq!(edge, Some(SnapEdge::Top));
    }

    #[test]
    fn test_detect_snap_edge_bottom() {
        // Window at bottom center
        let edge = WindowSnap::detect_snap_edge(
            800, 1080 - 56 - 10, // x, y - close to bottom
            WINDOW_WIDTH, WINDOW_HEIGHT,
            WORK_X, WORK_Y, WORK_WIDTH, WORK_HEIGHT,
            THRESHOLD,
        );
        assert_eq!(edge, Some(SnapEdge::Bottom));
    }

    #[test]
    fn test_detect_snap_edge_top_left_corner() {
        let edge = WindowSnap::detect_snap_edge(
            10, 10, // x, y - close to top-left
            WINDOW_WIDTH, WINDOW_HEIGHT,
            WORK_X, WORK_Y, WORK_WIDTH, WORK_HEIGHT,
            THRESHOLD,
        );
        assert_eq!(edge, Some(SnapEdge::TopLeft));
    }

    #[test]
    fn test_detect_snap_edge_none() {
        // Window in the middle, not near any edge
        let edge = WindowSnap::detect_snap_edge(
            500, 500,
            WINDOW_WIDTH, WINDOW_HEIGHT,
            WORK_X, WORK_Y, WORK_WIDTH, WORK_HEIGHT,
            THRESHOLD,
        );
        assert_eq!(edge, None);
    }

    #[test]
    fn test_calculate_snapped_position_top() {
        let (x, y) = WindowSnap::calculate_snapped_position(
            SnapEdge::Top,
            WINDOW_WIDTH, WINDOW_HEIGHT,
            WORK_X, WORK_Y, WORK_WIDTH, WORK_HEIGHT,
            PADDING,
        );
        // Should be centered horizontally, at top with padding
        assert_eq!(x, (WORK_WIDTH - WINDOW_WIDTH) / 2);
        assert_eq!(y, PADDING);
    }

    #[test]
    fn test_calculate_snapped_position_bottom_right() {
        let (x, y) = WindowSnap::calculate_snapped_position(
            SnapEdge::BottomRight,
            WINDOW_WIDTH, WINDOW_HEIGHT,
            WORK_X, WORK_Y, WORK_WIDTH, WORK_HEIGHT,
            PADDING,
        );
        assert_eq!(x, WORK_WIDTH - WINDOW_WIDTH - PADDING);
        assert_eq!(y, WORK_HEIGHT - WINDOW_HEIGHT - PADDING);
    }

    #[test]
    fn test_apply_magnetic_snap() {
        // Window close to top edge
        let (x, y, edge) = WindowSnap::apply_magnetic_snap(
            800, 10,
            WINDOW_WIDTH, WINDOW_HEIGHT,
            WORK_X, WORK_Y, WORK_WIDTH, WORK_HEIGHT,
            THRESHOLD, PADDING,
        );
        
        assert_eq!(edge, Some(SnapEdge::Top));
        assert_eq!(y, PADDING); // Should snap to top with padding
    }

    #[test]
    fn test_apply_magnetic_snap_no_snap() {
        // Window in the middle
        let (x, y, edge) = WindowSnap::apply_magnetic_snap(
            500, 500,
            WINDOW_WIDTH, WINDOW_HEIGHT,
            WORK_X, WORK_Y, WORK_WIDTH, WORK_HEIGHT,
            THRESHOLD, PADDING,
        );
        
        assert_eq!(edge, None);
        assert_eq!(x, 500); // Should return original position
        assert_eq!(y, 500);
    }

    #[test]
    fn test_clamp_to_work_area() {
        // Window outside left edge
        let (x, y) = WindowSnap::clamp_to_work_area(
            -100, 500,
            WINDOW_WIDTH, WINDOW_HEIGHT,
            WORK_X, WORK_Y, WORK_WIDTH, WORK_HEIGHT,
            PADDING,
        );
        assert_eq!(x, PADDING);
        assert_eq!(y, 500);
    }

    #[test]
    fn test_clamp_to_work_area_outside_bottom() {
        let (x, y) = WindowSnap::clamp_to_work_area(
            500, 2000,
            WINDOW_WIDTH, WINDOW_HEIGHT,
            WORK_X, WORK_Y, WORK_WIDTH, WORK_HEIGHT,
            PADDING,
        );
        assert_eq!(x, 500);
        assert_eq!(y, WORK_HEIGHT - WINDOW_HEIGHT - PADDING);
    }

    #[test]
    fn test_snap_edge_serialization() {
        let edge = SnapEdge::TopRight;
        let json = serde_json::to_string(&edge).unwrap();
        assert_eq!(json, "\"topRight\"");

        let deserialized: SnapEdge = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, SnapEdge::TopRight);
    }
}
