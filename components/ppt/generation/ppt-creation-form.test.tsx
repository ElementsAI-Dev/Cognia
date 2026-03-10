import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PPTCreationForm } from './ppt-creation-form';
import {
  ingestPPTMaterials,
  validatePPTMaterialQuality,
} from '@/lib/ppt/material-ingestion';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/lib/ppt/material-ingestion', () => ({
  ingestPPTMaterials: jest.fn().mockResolvedValue({ materials: [], errors: [] }),
  validatePPTMaterialQuality: jest.fn().mockReturnValue({ isValid: true, issues: [] }),
}));

describe('PPTCreationForm', () => {
  const mockIngestPPTMaterials = ingestPPTMaterials as jest.MockedFunction<typeof ingestPPTMaterials>;
  const mockValidatePPTMaterialQuality = validatePPTMaterialQuality as jest.MockedFunction<typeof validatePPTMaterialQuality>;

  const defaultProps = {
    isGenerating: false,
    progress: { message: '' },
    error: null,
    onGenerate: jest.fn().mockResolvedValue({}),
    onGenerateFromMaterials: jest.fn().mockResolvedValue({}),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIngestPPTMaterials.mockResolvedValue({ materials: [], errors: [] });
    mockValidatePPTMaterialQuality.mockReturnValue({ isValid: true, issues: [] });
  });

  it('requires a valid URL in import mode', async () => {
    const user = userEvent.setup();
    render(<PPTCreationForm {...defaultProps} initialMode="import" />);

    await user.type(screen.getByTestId('ppt-form-topic'), 'Import deck');
    await user.type(screen.getByTestId('ppt-import-url'), 'not-a-url');

    expect(screen.getByTestId('ppt-create-submit')).toBeDisabled();
  });

  it('enables submit in paste mode when text is long enough', async () => {
    const user = userEvent.setup();
    render(<PPTCreationForm {...defaultProps} initialMode="paste" />);

    await user.type(
      screen.getByTestId('ppt-paste-text'),
      'This is a long enough pasted content block that should pass minimum validation for generation.'
    );

    expect(screen.getByTestId('ppt-create-submit')).not.toBeDisabled();
  });

  it('shows retry action for recoverable errors', async () => {
    const onRetry = jest.fn().mockResolvedValue({});
    const user = userEvent.setup();

    render(
      <PPTCreationForm
        {...defaultProps}
        error="Generation failed"
        canRetry
        onRetry={onRetry}
      />
    );

    await user.click(screen.getByTestId('ppt-create-retry'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('shows actionable ingestion feedback in import mode and blocks submission', async () => {
    const user = userEvent.setup();
    const onGenerateFromMaterials = jest.fn().mockResolvedValue({});
    mockIngestPPTMaterials.mockResolvedValue({
      materials: [],
      errors: [
        {
          code: 'extraction_failed',
          source: 'file',
          message: 'Cannot extract file content',
          suggestion: 'Convert to TXT/MD or paste text',
        },
      ],
    });

    render(
      <PPTCreationForm
        {...defaultProps}
        initialMode="import"
        onGenerateFromMaterials={onGenerateFromMaterials}
      />
    );

    await user.type(screen.getByTestId('ppt-form-topic'), 'Import deck');
    await user.type(screen.getByTestId('ppt-import-url'), 'https://example.com/report');
    await user.click(screen.getByTestId('ppt-create-submit'));

    expect(onGenerateFromMaterials).not.toHaveBeenCalled();
    expect(await screen.findByTestId('ppt-material-feedback')).toBeInTheDocument();
    expect(screen.getByText('Convert to TXT/MD or paste text')).toBeInTheDocument();
  });

  it('shows quality gate feedback in paste mode and blocks generation call', async () => {
    const user = userEvent.setup();
    const onGenerateFromMaterials = jest.fn().mockResolvedValue({});
    mockIngestPPTMaterials.mockResolvedValue({
      materials: [
        {
          id: 'material-1',
          type: 'text',
          name: 'Pasted Content',
          content: 'valid-ish content',
        },
      ],
      errors: [],
    });
    mockValidatePPTMaterialQuality.mockReturnValue({
      isValid: false,
      issues: [
        {
          code: 'content_too_short',
          materialId: 'material-1',
          materialName: 'Pasted Content',
          message: 'Content too short',
          suggestion: 'Add more details',
        },
      ],
    });

    render(
      <PPTCreationForm
        {...defaultProps}
        initialMode="paste"
        onGenerateFromMaterials={onGenerateFromMaterials}
      />
    );

    await user.type(screen.getByTestId('ppt-form-topic'), 'Paste deck');
    await user.type(
      screen.getByTestId('ppt-paste-text'),
      'This is a long enough pasted content block that should pass minimum validation for generation.'
    );
    await user.click(screen.getByTestId('ppt-create-submit'));

    expect(onGenerateFromMaterials).not.toHaveBeenCalled();
    expect(await screen.findByTestId('ppt-quality-issue-item')).toBeInTheDocument();
    expect(screen.getByText('Add more details')).toBeInTheDocument();
  });
});

