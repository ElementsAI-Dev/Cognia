/**
 * Mock for artifact-icons module
 * @jest-environment jsdom
 */
import React from 'react';

export const getArtifactTypeIcon = jest.fn((type, className) => 
  React.createElement('span', { 'data-testid': `icon-${type}`, className }, type)
);

export const ARTIFACT_TYPE_ICONS = {
  code: React.createElement('span', { 'data-testid': 'icon-code' }, 'code'),
  document: React.createElement('span', { 'data-testid': 'icon-document' }, 'document'),
  svg: React.createElement('span', { 'data-testid': 'icon-svg' }, 'svg'),
  html: React.createElement('span', { 'data-testid': 'icon-html' }, 'html'),
  react: React.createElement('span', { 'data-testid': 'icon-react' }, 'react'),
  mermaid: React.createElement('span', { 'data-testid': 'icon-mermaid' }, 'mermaid'),
  chart: React.createElement('span', { 'data-testid': 'icon-chart' }, 'chart'),
  math: React.createElement('span', { 'data-testid': 'icon-math' }, 'math'),
  jupyter: React.createElement('span', { 'data-testid': 'icon-jupyter' }, 'jupyter'),
};
