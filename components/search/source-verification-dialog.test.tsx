'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SourceVerificationDialog } from './source-verification-dialog';
import type { VerifiedSearchResponse } from '@/types/search';

const mockSearchResponse: VerifiedSearchResponse = {
  results: [
    {
      title: 'Test Source 1',
      url: 'https://example.com/1',
      content: 'Test content 1',
      isEnabled: true,
      verification: {
        domain: 'example.com',
        rootDomain: 'example.com',
        isHttps: true,
        sourceType: 'news',
        credibilityLevel: 'high',
        credibilityScore: 0.9,
        trustIndicators: ['Verified source'],
        warningIndicators: [],
      },
    },
    {
      title: 'Test Source 2',
      url: 'https://test.org/2',
      content: 'Test content 2',
      isEnabled: false,
      verification: {
        domain: 'test.org',
        rootDomain: 'test.org',
        isHttps: true,
        sourceType: 'academic',
        credibilityLevel: 'medium',
        credibilityScore: 0.6,
        trustIndicators: [],
        warningIndicators: ['Unverified'],
      },
    },
  ],
  verificationReport: {
    totalSources: 2,
    highCredibility: 1,
    mediumCredibility: 1,
    lowCredibility: 0,
    averageCredibility: 0.75,
    recommendations: ['Verify sources'],
    crossValidation: [],
  },
} as unknown as VerifiedSearchResponse;

describe('SourceVerificationDialog', () => {
  const mockOnOpenChange = jest.fn();
  const mockOnConfirm = jest.fn();
  const mockOnSkip = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dialog when open', () => {
    render(
      <SourceVerificationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        searchResponse={mockSearchResponse}
        onConfirm={mockOnConfirm}
        onSkip={mockOnSkip}
      />
    );
    expect(screen.getByText('信源验证')).toBeInTheDocument();
  });

  it('shows source count', () => {
    render(
      <SourceVerificationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        searchResponse={mockSearchResponse}
        onConfirm={mockOnConfirm}
        onSkip={mockOnSkip}
      />
    );
    expect(screen.getByText(/搜索找到 2 个来源/)).toBeInTheDocument();
  });

  it('renders source titles', () => {
    render(
      <SourceVerificationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        searchResponse={mockSearchResponse}
        onConfirm={mockOnConfirm}
        onSkip={mockOnSkip}
      />
    );
    expect(screen.getByText('Test Source 1')).toBeInTheDocument();
    expect(screen.getByText('Test Source 2')).toBeInTheDocument();
  });

  it('renders tabs', () => {
    render(
      <SourceVerificationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        searchResponse={mockSearchResponse}
        onConfirm={mockOnConfirm}
        onSkip={mockOnSkip}
      />
    );
    expect(screen.getByText('信源列表')).toBeInTheDocument();
    expect(screen.getByText('验证报告')).toBeInTheDocument();
  });

  it('renders selection buttons', () => {
    render(
      <SourceVerificationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        searchResponse={mockSearchResponse}
        onConfirm={mockOnConfirm}
        onSkip={mockOnSkip}
      />
    );
    expect(screen.getByText('全选')).toBeInTheDocument();
    expect(screen.getByText('全不选')).toBeInTheDocument();
    expect(screen.getByText('仅高可信度')).toBeInTheDocument();
  });

  it('calls onSkip when skip clicked', () => {
    render(
      <SourceVerificationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        searchResponse={mockSearchResponse}
        onConfirm={mockOnConfirm}
        onSkip={mockOnSkip}
      />
    );
    fireEvent.click(screen.getByText('跳过验证'));
    expect(mockOnSkip).toHaveBeenCalled();
  });

  it('renders confirm button with count', () => {
    render(
      <SourceVerificationDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        searchResponse={mockSearchResponse}
        onConfirm={mockOnConfirm}
        onSkip={mockOnSkip}
      />
    );
    expect(screen.getByText(/使用已选信源/)).toBeInTheDocument();
  });
});
