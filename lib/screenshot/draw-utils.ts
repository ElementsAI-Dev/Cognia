/**
 * Screenshot Annotation Drawing Utilities
 *
 * Extracted from annotation-canvas.tsx to improve modularity.
 * Contains pure drawing functions with no React dependencies.
 */

import type { Annotation } from '@/types/screenshot';

/**
 * Draw an arrow with arrowhead
 */
export function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  strokeWidth: number
) {
  const headLength = strokeWidth * 4;
  const angle = Math.atan2(toY - fromY, toX - fromX);

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLength * Math.cos(angle - Math.PI / 6),
    toY - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toX - headLength * Math.cos(angle + Math.PI / 6),
    toY - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}

/**
 * Get the bounding box of an annotation
 */
export function getAnnotationBounds(annotation: Annotation) {
  switch (annotation.type) {
    case 'rectangle':
    case 'blur':
    case 'highlight':
      return {
        x: annotation.x,
        y: annotation.y,
        width: annotation.width,
        height: annotation.height,
      };
    case 'ellipse':
      return {
        x: annotation.cx - annotation.rx,
        y: annotation.cy - annotation.ry,
        width: annotation.rx * 2,
        height: annotation.ry * 2,
      };
    case 'arrow':
      return {
        x: Math.min(annotation.startX, annotation.endX),
        y: Math.min(annotation.startY, annotation.endY),
        width: Math.abs(annotation.endX - annotation.startX),
        height: Math.abs(annotation.endY - annotation.startY),
      };
    case 'freehand':
      if (annotation.points.length === 0) {
        return { x: 0, y: 0, width: 0, height: 0 };
      }
      const xs = annotation.points.map((p) => p[0]);
      const ys = annotation.points.map((p) => p[1]);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      return {
        x: minX,
        y: minY,
        width: Math.max(...xs) - minX,
        height: Math.max(...ys) - minY,
      };
    case 'text': {
      const textFontSize = annotation.style.fontSize || 16;
      // Estimate text width based on character count and font size (~0.6 avg char width ratio)
      const estimatedWidth = Math.max(20, annotation.text.length * textFontSize * 0.6);
      return {
        x: annotation.x,
        y: annotation.y - textFontSize,
        width: estimatedWidth,
        height: textFontSize,
      };
    }
    case 'marker':
      const size = annotation.size || 24;
      return {
        x: annotation.x - size / 2,
        y: annotation.y - size / 2,
        width: size,
        height: size,
      };
  }
}

/**
 * Draw an annotation on a canvas context
 */
export function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  annotation: Annotation,
  isSelected: boolean
) {
  ctx.save();
  ctx.strokeStyle = annotation.style.color;
  ctx.fillStyle = annotation.style.color;
  ctx.lineWidth = annotation.style.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (annotation.type) {
    case 'rectangle':
      if (annotation.style.filled) {
        ctx.globalAlpha = annotation.style.opacity;
        ctx.fillRect(annotation.x, annotation.y, annotation.width, annotation.height);
      } else {
        ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
      }
      break;

    case 'ellipse':
      ctx.beginPath();
      ctx.ellipse(
        annotation.cx,
        annotation.cy,
        annotation.rx,
        annotation.ry,
        0,
        0,
        Math.PI * 2
      );
      if (annotation.style.filled) {
        ctx.globalAlpha = annotation.style.opacity;
        ctx.fill();
      } else {
        ctx.stroke();
      }
      break;

    case 'arrow':
      drawArrow(
        ctx,
        annotation.startX,
        annotation.startY,
        annotation.endX,
        annotation.endY,
        annotation.style.strokeWidth
      );
      break;

    case 'freehand':
      if (annotation.points.length < 2) break;
      ctx.beginPath();
      ctx.moveTo(annotation.points[0][0], annotation.points[0][1]);
      for (let i = 1; i < annotation.points.length; i++) {
        ctx.lineTo(annotation.points[i][0], annotation.points[i][1]);
      }
      ctx.stroke();
      break;

    case 'text':
      ctx.font = `${annotation.style.fontSize || 16}px sans-serif`;
      if (annotation.background) {
        const metrics = ctx.measureText(annotation.text);
        const padding = 4;
        ctx.fillStyle = annotation.background;
        ctx.fillRect(
          annotation.x - padding,
          annotation.y - (annotation.style.fontSize || 16) - padding,
          metrics.width + padding * 2,
          (annotation.style.fontSize || 16) + padding * 2
        );
      }
      ctx.fillStyle = annotation.style.color;
      ctx.fillText(annotation.text, annotation.x, annotation.y);
      break;

    case 'blur': {
      // GPU-accelerated pixelation via canvas scale-down/up trick
      const blurBlockSize = Math.max(4, Math.round(annotation.intensity * 12));
      const blurX = Math.floor(annotation.x);
      const blurY = Math.floor(annotation.y);
      const blurW = Math.ceil(annotation.width);
      const blurH = Math.ceil(annotation.height);

      if (blurW > 0 && blurH > 0) {
        const scaleFactor = blurBlockSize;
        const smallW = Math.max(1, Math.ceil(blurW / scaleFactor));
        const smallH = Math.max(1, Math.ceil(blurH / scaleFactor));

        const offscreen = document.createElement('canvas');
        offscreen.width = smallW;
        offscreen.height = smallH;
        const offCtx = offscreen.getContext('2d');
        if (offCtx) {
          offCtx.imageSmoothingEnabled = false;
          offCtx.drawImage(
            ctx.canvas,
            blurX, blurY, blurW, blurH,
            0, 0, smallW, smallH
          );
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(
            offscreen,
            0, 0, smallW, smallH,
            blurX, blurY, blurW, blurH
          );
          ctx.imageSmoothingEnabled = true;
        }
      }
      break;
    }

    case 'highlight':
      ctx.globalAlpha = annotation.style.opacity;
      ctx.fillStyle = annotation.style.color;
      ctx.fillRect(annotation.x, annotation.y, annotation.width, annotation.height);
      break;

    case 'marker':
      const markerSize = annotation.size || 24;
      ctx.beginPath();
      ctx.arc(annotation.x, annotation.y, markerSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = annotation.style.color;
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${markerSize * 0.6}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(annotation.number), annotation.x, annotation.y);
      break;
  }

  if (isSelected) {
    ctx.strokeStyle = '#0066FF';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    const bounds = getAnnotationBounds(annotation);
    ctx.strokeRect(bounds.x - 4, bounds.y - 4, bounds.width + 8, bounds.height + 8);
  }

  ctx.restore();
}

/**
 * Get the position of an annotation (for dragging)
 */
export function getAnnotationPosition(annotation: Annotation): { x: number; y: number } {
  switch (annotation.type) {
    case 'rectangle':
    case 'blur':
    case 'highlight':
    case 'text':
      return { x: annotation.x, y: annotation.y };
    case 'ellipse':
      return { x: annotation.cx - annotation.rx, y: annotation.cy - annotation.ry };
    case 'arrow':
      return { x: annotation.startX, y: annotation.startY };
    case 'marker':
      return { x: annotation.x, y: annotation.y };
    case 'freehand':
      if (annotation.points.length > 0) {
        return { x: annotation.points[0][0], y: annotation.points[0][1] };
      }
      return { x: 0, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
}

/**
 * Calculate annotation position after move by delta
 */
export function moveAnnotation(annotation: Annotation, dx: number, dy: number): Partial<Annotation> {
  switch (annotation.type) {
    case 'rectangle':
    case 'blur':
    case 'highlight':
    case 'text':
      return { x: annotation.x + dx, y: annotation.y + dy };
    case 'ellipse':
      return { cx: annotation.cx + dx, cy: annotation.cy + dy };
    case 'arrow':
      return {
        startX: annotation.startX + dx,
        startY: annotation.startY + dy,
        endX: annotation.endX + dx,
        endY: annotation.endY + dy,
      };
    case 'marker':
      return { x: annotation.x + dx, y: annotation.y + dy };
    case 'freehand':
      return {
        points: annotation.points.map(([px, py]) => [px + dx, py + dy] as [number, number]),
      };
    default:
      return {};
  }
}
