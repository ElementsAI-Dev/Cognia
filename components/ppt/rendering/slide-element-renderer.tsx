'use client';

import { cn } from '@/lib/utils';
import { ChartElement } from '../elements';
import type { SlideElementRendererProps } from '../types';
import type { ChartData, ChartType } from '../elements';

/**
 * SlideElementRenderer - Renders different slide element types
 */
export function SlideElementRenderer({ element, theme }: SlideElementRendererProps) {
  const baseStyle: React.CSSProperties = {
    ...(element.position && {
      position: 'absolute',
      left: `${element.position.x}%`,
      top: `${element.position.y}%`,
      width: `${element.position.width}%`,
      height: `${element.position.height}%`,
    }),
    ...element.style,
  };

  switch (element.type) {
    case 'text':
      return (
        <div style={{ ...baseStyle, fontFamily: theme.bodyFont }}>
          {element.content}
        </div>
      );

    case 'image':
      return (
        <div style={baseStyle} className="flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={element.content}
            alt={element.metadata?.alt as string || 'Slide image'}
            className="max-w-full max-h-full object-contain rounded"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>';
            }}
          />
        </div>
      );

    case 'code':
      return (
        <pre
          style={{
            ...baseStyle,
            fontFamily: theme.codeFont,
            backgroundColor: 'rgba(0,0,0,0.05)',
            padding: '1rem',
            borderRadius: '0.5rem',
            overflow: 'auto',
          }}
          className="text-sm"
        >
          <code>{element.content}</code>
        </pre>
      );

    case 'shape': {
      const shapeType = element.metadata?.shape as string || 'rectangle';
      return (
        <div
          style={{
            ...baseStyle,
            backgroundColor: element.style?.backgroundColor || theme.primaryColor,
            borderRadius: shapeType === 'circle' ? '50%' : shapeType === 'rounded' ? '0.5rem' : '0',
          }}
        />
      );
    }

    case 'chart': {
      const chartType = (element.metadata?.chartType as ChartType) || 'bar';
      const chartData = element.metadata?.chartData as ChartData | undefined;

      // If no chart data provided, show placeholder
      if (!chartData) {
        return (
          <div
            style={baseStyle}
            className="flex items-center justify-center border rounded bg-muted/20"
          >
            <div className="text-center text-muted-foreground">
              <div className="text-2xl mb-2">📊</div>
              <div className="text-sm">Chart: {chartType}</div>
              <div className="text-xs">{element.content}</div>
            </div>
          </div>
        );
      }

      return (
        <div style={baseStyle} className="overflow-hidden">
          <ChartElement
            type={chartType}
            data={chartData}
            options={{
              title: element.metadata?.title as string,
              showLegend: element.metadata?.showLegend as boolean,
              showGrid: element.metadata?.showGrid as boolean,
              showDataLabels: element.metadata?.showDataLabels as boolean,
              colors: element.metadata?.colors as string[],
            }}
            theme={{
              primaryColor: theme.primaryColor,
              textColor: theme.textColor,
              backgroundColor: theme.backgroundColor,
            }}
            width="100%"
            height="100%"
          />
        </div>
      );
    }

    case 'table': {
      const tableData = element.metadata?.data as string[][] || [];
      return (
        <div style={baseStyle} className="overflow-auto">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {tableData.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={cn(
                        'border px-2 py-1',
                        rowIndex === 0 && 'font-bold bg-muted/30'
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'icon':
      return (
        <div
          style={{ ...baseStyle, color: theme.primaryColor }}
          className="flex items-center justify-center text-4xl"
        >
          {element.content}
        </div>
      );

    case 'video': {
      const videoUrl = element.content || '';
      const youtubeMatch = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
      const bilibiliMatch = videoUrl.match(/bilibili\.com\/video\/(BV[\w]+)/);

      if (youtubeMatch) {
        return (
          <div style={baseStyle} className="rounded overflow-hidden bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeMatch[1]}`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="YouTube video"
            />
          </div>
        );
      }

      if (bilibiliMatch) {
        return (
          <div style={baseStyle} className="rounded overflow-hidden bg-black">
            <iframe
              src={`https://player.bilibili.com/player.html?bvid=${bilibiliMatch[1]}&autoplay=0`}
              className="w-full h-full border-0"
              allowFullScreen
              title="Bilibili video"
            />
          </div>
        );
      }

      if (videoUrl && (videoUrl.startsWith('data:') || videoUrl.startsWith('blob:') || videoUrl.match(/\.(mp4|webm|ogg)$/i))) {
        return (
          <div style={baseStyle} className="rounded overflow-hidden bg-black">
            <video src={videoUrl} controls className="w-full h-full object-contain">
              <track kind="captions" />
            </video>
          </div>
        );
      }

      return (
        <div style={baseStyle} className="flex items-center justify-center bg-black/10 rounded">
          <div className="text-center text-muted-foreground">
            <div className="text-3xl mb-2">🎬</div>
            <div className="text-sm">{videoUrl ? `Video: ${videoUrl}` : 'No video URL'}</div>
          </div>
        </div>
      );
    }

    default:
      return (
        <div style={baseStyle} className="text-muted-foreground text-sm">
          Unknown element type: {element.type}
        </div>
      );
  }
}

export default SlideElementRenderer;
