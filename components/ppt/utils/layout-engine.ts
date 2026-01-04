/**
 * PPT Layout Engine
 * Smart layout algorithms for automatic content arrangement
 */

import type { PPTSlideElement, PPTSlideLayout } from '@/types/workflow';

// Layout zones for different slide types
export interface LayoutZone {
  id: string;
  name: string;
  x: number;      // percentage
  y: number;      // percentage
  width: number;  // percentage
  height: number; // percentage
  contentType: 'title' | 'subtitle' | 'content' | 'image' | 'chart' | 'bullets' | 'any';
  priority: number; // higher = fill first
}

// Layout templates with predefined zones
export const LAYOUT_TEMPLATES: Record<PPTSlideLayout, LayoutZone[]> = {
  'title': [
    { id: 'title', name: 'Title', x: 10, y: 35, width: 80, height: 20, contentType: 'title', priority: 1 },
    { id: 'subtitle', name: 'Subtitle', x: 10, y: 55, width: 80, height: 10, contentType: 'subtitle', priority: 2 },
  ],
  'title-content': [
    { id: 'title', name: 'Title', x: 5, y: 5, width: 90, height: 12, contentType: 'title', priority: 1 },
    { id: 'content', name: 'Content', x: 5, y: 20, width: 90, height: 75, contentType: 'content', priority: 2 },
  ],
  'section': [
    { id: 'title', name: 'Section Title', x: 10, y: 40, width: 80, height: 15, contentType: 'title', priority: 1 },
    { id: 'subtitle', name: 'Description', x: 10, y: 55, width: 80, height: 8, contentType: 'subtitle', priority: 2 },
  ],
  'two-column': [
    { id: 'title', name: 'Title', x: 5, y: 5, width: 90, height: 12, contentType: 'title', priority: 1 },
    { id: 'left', name: 'Left Column', x: 5, y: 20, width: 42, height: 75, contentType: 'content', priority: 2 },
    { id: 'right', name: 'Right Column', x: 53, y: 20, width: 42, height: 75, contentType: 'content', priority: 3 },
  ],
  'image-left': [
    { id: 'title', name: 'Title', x: 52, y: 5, width: 43, height: 12, contentType: 'title', priority: 1 },
    { id: 'image', name: 'Image', x: 5, y: 5, width: 42, height: 90, contentType: 'image', priority: 3 },
    { id: 'content', name: 'Content', x: 52, y: 20, width: 43, height: 75, contentType: 'content', priority: 2 },
  ],
  'image-right': [
    { id: 'title', name: 'Title', x: 5, y: 5, width: 43, height: 12, contentType: 'title', priority: 1 },
    { id: 'content', name: 'Content', x: 5, y: 20, width: 43, height: 75, contentType: 'content', priority: 2 },
    { id: 'image', name: 'Image', x: 53, y: 5, width: 42, height: 90, contentType: 'image', priority: 3 },
  ],
  'full-image': [
    { id: 'image', name: 'Full Image', x: 0, y: 0, width: 100, height: 100, contentType: 'image', priority: 1 },
    { id: 'title', name: 'Overlay Title', x: 10, y: 70, width: 80, height: 15, contentType: 'title', priority: 2 },
  ],
  'bullets': [
    { id: 'title', name: 'Title', x: 5, y: 5, width: 90, height: 12, contentType: 'title', priority: 1 },
    { id: 'bullets', name: 'Bullet Points', x: 5, y: 20, width: 90, height: 75, contentType: 'bullets', priority: 2 },
  ],
  'numbered': [
    { id: 'title', name: 'Title', x: 5, y: 5, width: 90, height: 12, contentType: 'title', priority: 1 },
    { id: 'bullets', name: 'Numbered List', x: 5, y: 20, width: 90, height: 75, contentType: 'bullets', priority: 2 },
  ],
  'comparison': [
    { id: 'title', name: 'Title', x: 5, y: 5, width: 90, height: 10, contentType: 'title', priority: 1 },
    { id: 'left-header', name: 'Left Header', x: 5, y: 18, width: 42, height: 8, contentType: 'subtitle', priority: 2 },
    { id: 'right-header', name: 'Right Header', x: 53, y: 18, width: 42, height: 8, contentType: 'subtitle', priority: 3 },
    { id: 'left', name: 'Left Content', x: 5, y: 28, width: 42, height: 67, contentType: 'content', priority: 4 },
    { id: 'right', name: 'Right Content', x: 53, y: 28, width: 42, height: 67, contentType: 'content', priority: 5 },
  ],
  'quote': [
    { id: 'quote', name: 'Quote', x: 10, y: 25, width: 80, height: 40, contentType: 'content', priority: 1 },
    { id: 'author', name: 'Author', x: 10, y: 70, width: 80, height: 10, contentType: 'subtitle', priority: 2 },
  ],
  'blank': [],
  'chart': [
    { id: 'title', name: 'Title', x: 5, y: 5, width: 90, height: 10, contentType: 'title', priority: 1 },
    { id: 'chart', name: 'Chart', x: 10, y: 18, width: 80, height: 77, contentType: 'chart', priority: 2 },
  ],
  'table': [
    { id: 'title', name: 'Title', x: 5, y: 5, width: 90, height: 10, contentType: 'title', priority: 1 },
    { id: 'table', name: 'Table', x: 5, y: 18, width: 90, height: 77, contentType: 'any', priority: 2 },
  ],
  'timeline': [
    { id: 'title', name: 'Title', x: 5, y: 5, width: 90, height: 10, contentType: 'title', priority: 1 },
    { id: 'timeline', name: 'Timeline', x: 5, y: 20, width: 90, height: 75, contentType: 'content', priority: 2 },
  ],
  'closing': [
    { id: 'title', name: 'Thank You', x: 10, y: 30, width: 80, height: 25, contentType: 'title', priority: 1 },
    { id: 'contact', name: 'Contact Info', x: 10, y: 60, width: 80, height: 20, contentType: 'content', priority: 2 },
  ],
};

// Calculate optimal font size based on content length and container
export function calculateOptimalFontSize(
  text: string,
  containerWidth: number,
  containerHeight: number,
  minSize: number = 12,
  maxSize: number = 72
): number {
  const charCount = text.length;
  const lineEstimate = Math.ceil(charCount / (containerWidth / 10));
  const availableHeight = containerHeight / lineEstimate;
  
  const calculatedSize = Math.min(availableHeight * 0.8, maxSize);
  return Math.max(calculatedSize, minSize);
}

// Determine best layout for given content
export function suggestLayout(content: {
  title?: string;
  subtitle?: string;
  bullets?: string[];
  images?: string[];
  hasChart?: boolean;
  hasTable?: boolean;
}): PPTSlideLayout {
  const { title, subtitle, bullets, images, hasChart, hasTable } = content;
  
  // Title slide - only title and subtitle
  if (title && subtitle && !bullets?.length && !images?.length && !hasChart && !hasTable) {
    return 'title';
  }
  
  // Section header
  if (title && !bullets?.length && !images?.length && !hasChart && !hasTable) {
    return 'section';
  }
  
  // Image layouts
  if (images?.length === 1) {
    if (bullets && bullets.length > 3) {
      return 'image-left';
    }
    return 'image-right';
  }
  
  // Full image
  if (images?.length === 1 && !bullets?.length && !hasChart && !hasTable) {
    return 'full-image';
  }
  
  // Comparison layout
  if (bullets && bullets.length >= 4 && bullets.length % 2 === 0) {
    return 'comparison';
  }
  
  // Bullet points
  if (bullets && bullets.length > 0) {
    return 'bullets';
  }
  
  // Default
  return 'title-content';
}

// Calculate element positions with smart snapping
export interface SnapGuide {
  type: 'horizontal' | 'vertical';
  position: number;
  label?: string;
}

export function calculateSnapGuides(
  elements: PPTSlideElement[],
  currentElement: PPTSlideElement,
  _snapThreshold: number = 2
): SnapGuide[] {
  const guides: SnapGuide[] = [];
  
  // Center guides
  guides.push({ type: 'vertical', position: 50, label: 'Center' });
  guides.push({ type: 'horizontal', position: 50, label: 'Middle' });
  
  // Element alignment guides
  elements.forEach(el => {
    if (el.id === currentElement.id || !el.position) return;
    
    // Left edge
    guides.push({ type: 'vertical', position: el.position.x });
    // Right edge
    guides.push({ type: 'vertical', position: el.position.x + el.position.width });
    // Center X
    guides.push({ type: 'vertical', position: el.position.x + el.position.width / 2 });
    
    // Top edge
    guides.push({ type: 'horizontal', position: el.position.y });
    // Bottom edge
    guides.push({ type: 'horizontal', position: el.position.y + el.position.height });
    // Center Y
    guides.push({ type: 'horizontal', position: el.position.y + el.position.height / 2 });
  });
  
  return guides;
}

// Snap position to nearest guide
export function snapToGuide(
  position: number,
  guides: SnapGuide[],
  orientation: 'horizontal' | 'vertical',
  threshold: number = 2
): { snapped: number; guide: SnapGuide | null } {
  const relevantGuides = guides.filter(g => g.type === orientation);
  
  for (const guide of relevantGuides) {
    if (Math.abs(position - guide.position) <= threshold) {
      return { snapped: guide.position, guide };
    }
  }
  
  return { snapped: position, guide: null };
}

// Auto-arrange elements in a grid
export function autoArrangeElements(
  elements: PPTSlideElement[],
  containerWidth: number = 100,
  containerHeight: number = 100,
  padding: number = 5,
  gap: number = 3
): PPTSlideElement[] {
  if (elements.length === 0) return elements;
  
  const cols = Math.ceil(Math.sqrt(elements.length));
  const rows = Math.ceil(elements.length / cols);
  
  const cellWidth = (containerWidth - padding * 2 - gap * (cols - 1)) / cols;
  const cellHeight = (containerHeight - padding * 2 - gap * (rows - 1)) / rows;
  
  return elements.map((el, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    
    return {
      ...el,
      position: {
        x: padding + col * (cellWidth + gap),
        y: padding + row * (cellHeight + gap),
        width: cellWidth,
        height: cellHeight,
      },
    };
  });
}

// Distribute elements evenly
export function distributeElements(
  elements: PPTSlideElement[],
  direction: 'horizontal' | 'vertical',
  startPosition: number = 5,
  endPosition: number = 95
): PPTSlideElement[] {
  if (elements.length <= 1) return elements;
  
  const totalSpace = endPosition - startPosition;
  const spacing = totalSpace / (elements.length - 1);
  
  return elements.map((el, index) => {
    const position = startPosition + index * spacing;
    
    if (!el.position) {
      el.position = { x: 0, y: 0, width: 20, height: 20 };
    }
    
    if (direction === 'horizontal') {
      return {
        ...el,
        position: {
          ...el.position,
          x: position - el.position.width / 2,
        },
      };
    } else {
      return {
        ...el,
        position: {
          ...el.position,
          y: position - el.position.height / 2,
        },
      };
    }
  });
}

// Align elements
export function alignElements(
  elements: PPTSlideElement[],
  alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
): PPTSlideElement[] {
  if (elements.length === 0) return elements;
  
  const positions = elements.map(el => el.position || { x: 0, y: 0, width: 20, height: 20 });
  
  let targetPosition: number;
  
  switch (alignment) {
    case 'left':
      targetPosition = Math.min(...positions.map(p => p.x));
      return elements.map((el, i) => ({
        ...el,
        position: { ...positions[i], x: targetPosition },
      }));
    
    case 'center':
      const centerX = positions.reduce((sum, p) => sum + p.x + p.width / 2, 0) / positions.length;
      return elements.map((el, i) => ({
        ...el,
        position: { ...positions[i], x: centerX - positions[i].width / 2 },
      }));
    
    case 'right':
      targetPosition = Math.max(...positions.map(p => p.x + p.width));
      return elements.map((el, i) => ({
        ...el,
        position: { ...positions[i], x: targetPosition - positions[i].width },
      }));
    
    case 'top':
      targetPosition = Math.min(...positions.map(p => p.y));
      return elements.map((el, i) => ({
        ...el,
        position: { ...positions[i], y: targetPosition },
      }));
    
    case 'middle':
      const centerY = positions.reduce((sum, p) => sum + p.y + p.height / 2, 0) / positions.length;
      return elements.map((el, i) => ({
        ...el,
        position: { ...positions[i], y: centerY - positions[i].height / 2 },
      }));
    
    case 'bottom':
      targetPosition = Math.max(...positions.map(p => p.y + p.height));
      return elements.map((el, i) => ({
        ...el,
        position: { ...positions[i], y: targetPosition - positions[i].height },
      }));
    
    default:
      return elements;
  }
}

const layoutEngine = {
  LAYOUT_TEMPLATES,
  calculateOptimalFontSize,
  suggestLayout,
  calculateSnapGuides,
  snapToGuide,
  autoArrangeElements,
  distributeElements,
  alignElements,
};

export default layoutEngine;
