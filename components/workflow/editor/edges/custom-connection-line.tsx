'use client';

/**
 * CustomConnectionLine - Visual feedback during edge creation
 */

import { memo } from 'react';
import { type ConnectionLineComponentProps } from '@xyflow/react';

function CustomConnectionLineComponent({
  fromX,
  fromY,
  toX,
  toY,
  connectionLineStyle,
}: ConnectionLineComponentProps) {
  return (
    <g>
      {/* Glow effect */}
      <path
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={6}
        strokeOpacity={0.3}
        className="animated"
        d={`M${fromX},${fromY} C ${fromX} ${(fromY + toY) / 2}, ${toX} ${(fromY + toY) / 2}, ${toX},${toY}`}
      />
      {/* Main line */}
      <path
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={2}
        className="animated"
        style={connectionLineStyle}
        d={`M${fromX},${fromY} C ${fromX} ${(fromY + toY) / 2}, ${toX} ${(fromY + toY) / 2}, ${toX},${toY}`}
      />
      {/* Animated dot at end */}
      <circle
        cx={toX}
        cy={toY}
        fill="hsl(var(--primary))"
        r={4}
        className="animate-pulse"
      />
      {/* Target indicator ring */}
      <circle
        cx={toX}
        cy={toY}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={2}
        r={8}
        strokeOpacity={0.5}
        className="animate-ping"
        style={{ animationDuration: '1s' }}
      />
    </g>
  );
}

export const CustomConnectionLine = memo(CustomConnectionLineComponent);
export default CustomConnectionLine;
