/**
 * Tests for ResponsiveControls component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponsiveControls } from './responsive-controls';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock the designer store
const mockSetViewport = jest.fn();
const mockSetCustomViewport = jest.fn();
const mockSetZoom = jest.fn();

jest.mock('@/stores/designer', () => ({
  useDesignerStore: jest.fn(),
}));

 
const { useDesignerStore } = require('@/stores/designer');

const defaultState: Record<string, unknown> = {
  viewport: 'desktop',
  customViewport: null,
  setViewport: mockSetViewport,
  setCustomViewport: mockSetCustomViewport,
  zoom: 100,
  setZoom: mockSetZoom,
};

function setupStore(overrides: Record<string, unknown> = {}) {
  const state = { ...defaultState, ...overrides };
  (useDesignerStore as jest.Mock).mockImplementation(
    (selector: (s: typeof state) => unknown) => selector(state)
  );
}

describe('ResponsiveControls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupStore();
  });

  describe('rendering', () => {
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
  });

  describe('custom viewport display', () => {
    it('should show custom viewport dimensions when set', () => {
      setupStore({ customViewport: { width: 1440, height: 900 } });
      render(<ResponsiveControls />);
      expect(screen.getByText(/1440×900/)).toBeInTheDocument();
    });

    it('should show "Full" when viewport is full and no custom viewport', () => {
      setupStore({ viewport: 'full', customViewport: null });
      render(<ResponsiveControls />);
      expect(screen.getByText('Full')).toBeInTheDocument();
    });

    it('should show mobile dimensions when viewport is mobile', () => {
      setupStore({ viewport: 'mobile', customViewport: null });
      render(<ResponsiveControls />);
      expect(screen.getByText(/375×667/)).toBeInTheDocument();
    });

    it('custom viewport takes priority over viewport preset', () => {
      setupStore({ viewport: 'mobile', customViewport: { width: 500, height: 800 } });
      render(<ResponsiveControls />);
      expect(screen.getByText(/500×800/)).toBeInTheDocument();
    });
  });

  describe('device presets popover', () => {
    it('should open device presets popover when clicked', async () => {
      render(<ResponsiveControls />);
      
      const devicesButton = screen.getByText('devices');
      await userEvent.click(devicesButton);
      
      expect(screen.getByText('mobile')).toBeInTheDocument();
      expect(screen.getByText('tablet')).toBeInTheDocument();
      expect(screen.getByText('desktop')).toBeInTheDocument();
    });

    it('should show device presets in popover', async () => {
      render(<ResponsiveControls />);
      
      const devicesButton = screen.getByText('devices');
      await userEvent.click(devicesButton);
      
      expect(screen.getByText('iPhone SE')).toBeInTheDocument();
      expect(screen.getByText('iPad Mini')).toBeInTheDocument();
      expect(screen.getByText('Laptop')).toBeInTheDocument();
    });

    it('should call setCustomViewport when device preset is selected', async () => {
      render(<ResponsiveControls />);

      const devicesButton = screen.getByText('devices');
      await userEvent.click(devicesButton);

      const iphoneSE = screen.getByText('iPhone SE');
      await userEvent.click(iphoneSE);

      expect(mockSetCustomViewport).toHaveBeenCalledWith({
        width: 375,
        height: 667,
        label: 'iPhone SE',
      });
    });

    it('should call setCustomViewport for tablet device preset', async () => {
      render(<ResponsiveControls />);

      const devicesButton = screen.getByText('devices');
      await userEvent.click(devicesButton);

      const ipadMini = screen.getByText('iPad Mini');
      await userEvent.click(ipadMini);

      expect(mockSetCustomViewport).toHaveBeenCalledWith({
        width: 768,
        height: 1024,
        label: 'iPad Mini',
      });
    });
  });

  describe('breakpoint buttons', () => {
    it('should call setCustomViewport for sm breakpoint', async () => {
      render(<ResponsiveControls />);
      
      const smButton = screen.getByText('sm');
      await userEvent.click(smButton);
      
      expect(mockSetCustomViewport).toHaveBeenCalledWith({
        width: 640,
        height: 800,
        label: '≥640px',
      });
    });

    it('should call setCustomViewport for md breakpoint', async () => {
      render(<ResponsiveControls />);
      
      const mdButton = screen.getByText('md');
      await userEvent.click(mdButton);
      
      expect(mockSetCustomViewport).toHaveBeenCalledWith({
        width: 768,
        height: 800,
        label: '≥768px',
      });
    });

    it('should call setCustomViewport for lg breakpoint', async () => {
      render(<ResponsiveControls />);
      
      const lgButton = screen.getByText('lg');
      await userEvent.click(lgButton);
      
      expect(mockSetCustomViewport).toHaveBeenCalledWith({
        width: 1024,
        height: 800,
        label: '≥1024px',
      });
    });

    it('should call setCustomViewport for xl breakpoint', async () => {
      render(<ResponsiveControls />);
      
      const xlButton = screen.getByText('xl');
      await userEvent.click(xlButton);
      
      expect(mockSetCustomViewport).toHaveBeenCalledWith({
        width: 1280,
        height: 800,
        label: '≥1280px',
      });
    });
  });

  describe('custom size input', () => {
    it('should show custom size input in popover', async () => {
      render(<ResponsiveControls />);
      
      const devicesButton = screen.getByText('devices');
      await userEvent.click(devicesButton);
      
      expect(screen.getByText('customSize')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Width')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Height')).toBeInTheDocument();
    });

    it('should call setCustomViewport with custom dimensions', async () => {
      render(<ResponsiveControls />);

      const devicesButton = screen.getByText('devices');
      await userEvent.click(devicesButton);

      const widthInput = screen.getByPlaceholderText('Width');
      const heightInput = screen.getByPlaceholderText('Height');
      const applyButton = screen.getByText('apply');

      await userEvent.type(widthInput, '800');
      await userEvent.type(heightInput, '600');
      await userEvent.click(applyButton);

      expect(mockSetCustomViewport).toHaveBeenCalledWith({
        width: 800,
        height: 600,
        label: '800×600',
      });
    });

    it('should not call setCustomViewport when inputs are empty', async () => {
      render(<ResponsiveControls />);

      const devicesButton = screen.getByText('devices');
      await userEvent.click(devicesButton);

      const applyButton = screen.getByText('apply');
      // Apply button should be disabled when no input
      expect(applyButton).toBeDisabled();
    });
  });

  describe('reset button', () => {
    it('should reset viewport, customViewport, and zoom when reset is clicked', async () => {
      render(<ResponsiveControls />);
      
      const resetButton = screen.getAllByRole('button').find(
        (btn) => btn.querySelector('svg.lucide-rotate-ccw')
      );
      
      if (resetButton) {
        await userEvent.click(resetButton);
        expect(mockSetViewport).toHaveBeenCalledWith('desktop');
        expect(mockSetCustomViewport).toHaveBeenCalledWith(null);
        expect(mockSetZoom).toHaveBeenCalledWith(100);
      }
    });
  });
});
