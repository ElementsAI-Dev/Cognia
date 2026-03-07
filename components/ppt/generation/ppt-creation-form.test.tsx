import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PPTCreationForm } from './ppt-creation-form';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('PPTCreationForm', () => {
  const defaultProps = {
    isGenerating: false,
    progress: { message: '' },
    error: null,
    onGenerate: jest.fn().mockResolvedValue({}),
    onGenerateFromMaterials: jest.fn().mockResolvedValue({}),
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
});

