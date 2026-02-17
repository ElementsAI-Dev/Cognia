/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { V0Designer } from './v0-designer';

const capturedProps: Record<string, unknown>[] = [];

jest.mock('./designer-shell', () => ({
  DesignerShell: (props: Record<string, unknown>) => {
    capturedProps.push(props);
    return <div data-testid="designer-shell" />;
  },
}));

describe('V0Designer', () => {
  beforeEach(() => {
    capturedProps.length = 0;
  });

  it('forwards core props to DesignerShell', () => {
    const onOpenChange = jest.fn();
    const onCodeChange = jest.fn();
    const onSave = jest.fn();

    render(
      <V0Designer
        open
        onOpenChange={onOpenChange}
        initialCode="<div>Hello</div>"
        onCodeChange={onCodeChange}
        onSave={onSave}
      />
    );

    expect(screen.getByTestId('designer-shell')).toBeInTheDocument();
    expect(capturedProps[0]).toMatchObject({
      open: true,
      onOpenChange,
      initialCode: '<div>Hello</div>',
      onCodeChange,
      onSave,
    });
  });

  it('supports optional framework prop', () => {
    const onOpenChange = jest.fn();

    render(<V0Designer open onOpenChange={onOpenChange} framework="html" />);

    expect(capturedProps[0]).toMatchObject({
      framework: 'html',
    });
  });
});
