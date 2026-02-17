/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DesignerPanel } from './designer-panel';

const capturedProps: Record<string, unknown>[] = [];

jest.mock('./designer-shell', () => ({
  DesignerShell: (props: Record<string, unknown>) => {
    capturedProps.push(props);
    return <div data-testid="designer-shell" />;
  },
}));

describe('DesignerPanel', () => {
  beforeEach(() => {
    capturedProps.length = 0;
  });

  it('forwards required props to DesignerShell', () => {
    const onOpenChange = jest.fn();

    render(<DesignerPanel open onOpenChange={onOpenChange} />);

    expect(screen.getByTestId('designer-shell')).toBeInTheDocument();
    expect(capturedProps[0]).toMatchObject({
      open: true,
      onOpenChange,
    });
  });

  it('forwards optional props including framework and onSave', () => {
    const onOpenChange = jest.fn();
    const onCodeChange = jest.fn();
    const onSave = jest.fn();

    render(
      <DesignerPanel
        open
        onOpenChange={onOpenChange}
        initialCode="<div>test</div>"
        framework="vue"
        onCodeChange={onCodeChange}
        onSave={onSave}
      />
    );

    expect(capturedProps[0]).toMatchObject({
      initialCode: '<div>test</div>',
      framework: 'vue',
      onCodeChange,
      onSave,
    });
  });
});
