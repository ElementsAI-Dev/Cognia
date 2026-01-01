/**
 * Tests for ResponsiveControls component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponsiveControls } from './preview/responsive-controls';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock the designer store
const mockSetViewport = jest.fn();
const mockSetZoom = jest.fn();

jest.mock('@/stores/designer-store', () => ({
  useDesignerStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      viewport: 'desktop',
      setViewport: mockSetViewport,
      zoom: 100,
      setZoom: mockSetZoom,
    };
    return selector(state);
  },
}));

describe('ResponsiveControls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render viewport dimensions', () => {
    render(<ResponsiveControls />);
    expect(screen.getByText(/1280×800/)).toBeInTheDocument();
  });

  it('should render zoom percentage', () => {
    render(<ResponsiveControls />);
    expect(screen.getByText(/100%/)).toBeInTheDocument();
  });

  it('should render devices button', () => {
    render(<ResponsiveControls />);
    expect(screen.getByText('devices')).toBeInTheDocument();
  });

  it('should render Tailwind breakpoint buttons', () => {
    render(<ResponsiveControls />);
    expect(screen.getByText('sm')).toBeInTheDocument();
    expect(screen.getByText('md')).toBeInTheDocument();
    expect(screen.getByText('lg')).toBeInTheDocument();
    expect(screen.getByText('xl')).toBeInTheDocument();
  });

  it('should open device presets popover when clicked', async () => {
    render(<ResponsiveControls />);
    
    const devicesButton = screen.getByText('devices');
    await userEvent.click(devicesButton);
    
    // Check for device categories
    expect(screen.getByText('mobileDevices')).toBeInTheDocument();
    expect(screen.getByText('tabletDevices')).toBeInTheDocument();
    expect(screen.getByText('desktopDevices')).toBeInTheDocument();
  });

  it('should show device presets in popover', async () => {
    render(<ResponsiveControls />);
    
    const devicesButton = screen.getByText('devices');
    await userEvent.click(devicesButton);
    
    // Check for some device names
    expect(screen.getByText('iPhone SE')).toBeInTheDocument();
    expect(screen.getByText('iPad Mini')).toBeInTheDocument();
    expect(screen.getByText('Laptop')).toBeInTheDocument();
  });

  it('should call setViewport when breakpoint is clicked', async () => {
    render(<ResponsiveControls />);
    
    const smButton = screen.getByText('sm');
    await userEvent.click(smButton);
    
    expect(mockSetViewport).toHaveBeenCalledWith('mobile');
  });

  it('should call setViewport for md breakpoint', async () => {
    render(<ResponsiveControls />);
    
    const mdButton = screen.getByText('md');
    await userEvent.click(mdButton);
    
    expect(mockSetViewport).toHaveBeenCalledWith('tablet');
  });

  it('should call setViewport for lg breakpoint', async () => {
    render(<ResponsiveControls />);
    
    const lgButton = screen.getByText('lg');
    await userEvent.click(lgButton);
    
    expect(mockSetViewport).toHaveBeenCalledWith('desktop');
  });

  it('should reset viewport and zoom when reset button is clicked', async () => {
    render(<ResponsiveControls />);
    
    // Find reset button by its icon
    const resetButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg.lucide-rotate-ccw')
    );
    
    if (resetButton) {
      await userEvent.click(resetButton);
      expect(mockSetViewport).toHaveBeenCalledWith('desktop');
      expect(mockSetZoom).toHaveBeenCalledWith(100);
    }
  });

  it('should show custom size input in popover', async () => {
    render(<ResponsiveControls />);
    
    const devicesButton = screen.getByText('devices');
    await userEvent.click(devicesButton);
    
    expect(screen.getByText('customSize')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Width')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Height')).toBeInTheDocument();
  });
});
