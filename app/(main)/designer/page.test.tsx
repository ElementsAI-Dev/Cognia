/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import DesignerPage from './page';

const capturedShellProps: Record<string, unknown>[] = [];

jest.mock('@/components/designer', () => ({
  DesignerShell: (props: Record<string, unknown>) => {
    capturedShellProps.push(props);
    return <div data-testid="designer-shell" />;
  },
}));

describe('DesignerPage', () => {
  beforeEach(() => {
    capturedShellProps.length = 0;
    sessionStorage.clear();
    window.history.pushState({}, '', '/designer');
  });

  it('renders standalone DesignerShell with empty initial code by default', () => {
    render(<DesignerPage />);

    expect(screen.getByTestId('designer-shell')).toBeInTheDocument();
    expect(capturedShellProps[0]).toMatchObject({
      standalone: true,
      initialCode: '',
    });
  });

  it('loads initial code from sessionStorage using key query param', () => {
    const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');
    sessionStorage.setItem('designer-key', '<div>from-session</div>');
    window.history.pushState({}, '', '/designer?key=designer-key');

    render(<DesignerPage />);

    expect(capturedShellProps[0]).toMatchObject({
      standalone: true,
      initialCode: '<div>from-session</div>',
    });
    expect(removeItemSpy).toHaveBeenCalledWith('designer-key');
  });
});

