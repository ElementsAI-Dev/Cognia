/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';
import { getArtifactTypeIcon, ARTIFACT_TYPE_ICONS } from './artifact-icons';
import type { ArtifactType } from '@/types';

describe('artifact-icons', () => {
  describe('getArtifactTypeIcon', () => {
    const allTypes: ArtifactType[] = [
      'code',
      'document',
      'svg',
      'html',
      'react',
      'mermaid',
      'chart',
      'math',
      'jupyter',
    ];

    it.each(allTypes)('should return an icon for %s type', (type) => {
      const icon = getArtifactTypeIcon(type);
      expect(icon).toBeDefined();
      expect(React.isValidElement(icon)).toBe(true);
    });

    it('should use default className', () => {
      const icon = getArtifactTypeIcon('code');
      const { container } = render(<>{icon}</>);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-4', 'w-4');
    });

    it('should accept custom className', () => {
      const icon = getArtifactTypeIcon('code', 'h-6 w-6 text-red-500');
      const { container } = render(<>{icon}</>);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-6', 'w-6', 'text-red-500');
    });

    it('should return Code icon as fallback for unknown types', () => {
      // @ts-expect-error - testing unknown type handling
      const icon = getArtifactTypeIcon('unknown-type');
      expect(icon).toBeDefined();
      expect(React.isValidElement(icon)).toBe(true);
    });
  });

  describe('ARTIFACT_TYPE_ICONS', () => {
    it('should have icons for all artifact types', () => {
      expect(ARTIFACT_TYPE_ICONS.code).toBeDefined();
      expect(ARTIFACT_TYPE_ICONS.document).toBeDefined();
      expect(ARTIFACT_TYPE_ICONS.svg).toBeDefined();
      expect(ARTIFACT_TYPE_ICONS.html).toBeDefined();
      expect(ARTIFACT_TYPE_ICONS.react).toBeDefined();
      expect(ARTIFACT_TYPE_ICONS.mermaid).toBeDefined();
      expect(ARTIFACT_TYPE_ICONS.chart).toBeDefined();
      expect(ARTIFACT_TYPE_ICONS.math).toBeDefined();
      expect(ARTIFACT_TYPE_ICONS.jupyter).toBeDefined();
    });

    it('should have valid React elements for all types', () => {
      Object.values(ARTIFACT_TYPE_ICONS).forEach((icon) => {
        expect(React.isValidElement(icon)).toBe(true);
      });
    });
  });
});
