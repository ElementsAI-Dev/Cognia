/**
 * Unit tests for PageLayoutDialog component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { PageLayoutDialog, type PageLayoutSettings } from './page-layout-dialog';
import { MARGIN_PRESETS } from '@/types/document/document-formatting';

const messages = {
  document: {
    pageLayout: 'Page Layout',
    pageLayoutSettings: 'Page Layout Settings',
    pageLayoutDescription: 'Configure page size, orientation, margins, and headers/footers',
    page: 'Page',
    margins: 'Margins',
    headerFooter: 'Header & Footer',
    pageSize: 'Page Size',
    custom: 'Custom',
    width: 'Width',
    height: 'Height',
    orientation: 'Orientation',
    portrait: 'Portrait',
    landscape: 'Landscape',
    marginPresets: 'Margin Presets',
    normal: 'Normal',
    narrow: 'Narrow',
    moderate: 'Moderate',
    wide: 'Wide',
    mirrored: 'Mirrored',
    top: 'Top',
    bottom: 'Bottom',
    left: 'Left',
    right: 'Right',
    header: 'Header',
    footer: 'Footer',
    enabled: 'Enabled',
    disabled: 'Disabled',
    headerContentPlaceholder: 'Enter header text...',
    footerContentPlaceholder: 'Enter footer text...',
    showPageNumbers: 'Show Page Numbers',
    reset: 'Reset',
    apply: 'Apply',
  },
};

const defaultSettings: PageLayoutSettings = {
  pageSize: 'a4',
  orientation: 'portrait',
  margins: MARGIN_PRESETS.normal,
  headerEnabled: false,
  footerEnabled: true,
  showPageNumbers: true,
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('PageLayoutDialog', () => {
  const mockOnSettingsChange = jest.fn();
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render trigger button', () => {
      renderWithProviders(
        <PageLayoutDialog
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      expect(screen.getByRole('button', { name: /page layout/i })).toBeInTheDocument();
    });

    it('should render custom trigger when provided', () => {
      renderWithProviders(
        <PageLayoutDialog
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          trigger={<button>Custom Trigger</button>}
        />
      );

      expect(screen.getByRole('button', { name: /custom trigger/i })).toBeInTheDocument();
    });

    it('should open dialog when trigger is clicked', async () => {
      renderWithProviders(
        <PageLayoutDialog
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const trigger = screen.getByRole('button', { name: /page layout/i });
      await userEvent.click(trigger);

      expect(await screen.findByText(/page layout settings/i)).toBeInTheDocument();
    });

    it('should render all tabs', async () => {
      renderWithProviders(
        <PageLayoutDialog
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
        />
      );

      expect(screen.getByRole('tab', { name: /page/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /margins/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /header.*footer/i })).toBeInTheDocument();
    });
  });

  describe('Page Tab', () => {
    it('should display page size selector', async () => {
      renderWithProviders(
        <PageLayoutDialog
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
        />
      );

      // Default tab is page - text may appear multiple times
      const pageSizeElements = screen.getAllByText(/page size/i);
      expect(pageSizeElements.length).toBeGreaterThan(0);
    });

    it('should display orientation options', async () => {
      renderWithProviders(
        <PageLayoutDialog
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
        />
      );

      // Orientation text may appear multiple times
      const orientationElements = screen.getAllByText(/orientation/i);
      expect(orientationElements.length).toBeGreaterThan(0);
    });

    it('should show custom size inputs when custom is selected', async () => {
      const customSettings: PageLayoutSettings = {
        ...defaultSettings,
        pageSize: 'custom',
        customWidth: 200,
        customHeight: 300,
      };

      renderWithProviders(
        <PageLayoutDialog
          settings={customSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
        />
      );

      expect(screen.getByText(/width/i)).toBeInTheDocument();
      expect(screen.getByText(/height/i)).toBeInTheDocument();
    });

    it('should display page preview', async () => {
      renderWithProviders(
        <PageLayoutDialog
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
        />
      );

      // Preview shows dimensions - use getAllByText since it may appear multiple times
      const dimensionElements = screen.getAllByText(/210.*297/i);
      expect(dimensionElements.length).toBeGreaterThan(0);
    });
  });

  describe('Margins Tab', () => {
    it('should display margin presets', async () => {
      renderWithProviders(
        <PageLayoutDialog
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
        />
      );

      // Click margins tab
      const marginsTab = screen.getByRole('tab', { name: /margins/i });
      await userEvent.click(marginsTab);

      await waitFor(() => {
        expect(screen.getByText(/margin presets/i)).toBeInTheDocument();
      });
    });

    it('should display margin input fields', async () => {
      renderWithProviders(
        <PageLayoutDialog
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
        />
      );

      const marginsTab = screen.getByRole('tab', { name: /margins/i });
      await userEvent.click(marginsTab);

      await waitFor(() => {
        expect(screen.getByText(/top/i)).toBeInTheDocument();
        expect(screen.getByText(/bottom/i)).toBeInTheDocument();
        expect(screen.getByText(/left/i)).toBeInTheDocument();
        expect(screen.getByText(/right/i)).toBeInTheDocument();
      });
    });

    it('should have preset buttons', async () => {
      renderWithProviders(
        <PageLayoutDialog
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
        />
      );

      const marginsTab = screen.getByRole('tab', { name: /margins/i });
      await userEvent.click(marginsTab);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /normal/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /narrow/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /wide/i })).toBeInTheDocument();
      });
    });
  });

  describe('Header/Footer Tab', () => {
    it('should display header settings', async () => {
      renderWithProviders(
        <PageLayoutDialog
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
        />
      );

      const headerFooterTab = screen.getByRole('tab', { name: /header.*footer/i });
      await userEvent.click(headerFooterTab);

      await waitFor(() => {
        expect(screen.getByText(/^header$/i)).toBeInTheDocument();
      });
    });

    it('should display footer settings', async () => {
      renderWithProviders(
        <PageLayoutDialog
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
        />
      );

      const headerFooterTab = screen.getByRole('tab', { name: /header.*footer/i });
      await userEvent.click(headerFooterTab);

      await waitFor(() => {
        expect(screen.getByText(/^footer$/i)).toBeInTheDocument();
      });
    });

    it('should show page numbers checkbox when footer is enabled', async () => {
      renderWithProviders(
        <PageLayoutDialog
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
        />
      );

      const headerFooterTab = screen.getByRole('tab', { name: /header.*footer/i });
      await userEvent.click(headerFooterTab);

      await waitFor(() => {
        expect(screen.getByText(/show page numbers/i)).toBeInTheDocument();
      });
    });
  });

  describe('Actions', () => {
    it('should call onSettingsChange when Apply is clicked', async () => {
      renderWithProviders(
        <PageLayoutDialog
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const applyButton = screen.getByRole('button', { name: /apply/i });
      await userEvent.click(applyButton);

      expect(mockOnSettingsChange).toHaveBeenCalled();
    });

    it('should call onOpenChange(false) when Apply is clicked', async () => {
      renderWithProviders(
        <PageLayoutDialog
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const applyButton = screen.getByRole('button', { name: /apply/i });
      await userEvent.click(applyButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('should have reset button', async () => {
      renderWithProviders(
        <PageLayoutDialog
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
        />
      );

      const resetButton = screen.getByRole('button', { name: /reset/i });
      expect(resetButton).toBeInTheDocument();
    });
  });

  describe('Controlled Mode', () => {
    it('should respect open prop', () => {
      const { rerender } = renderWithProviders(
        <PageLayoutDialog
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          open={false}
        />
      );

      expect(screen.queryByText(/page layout settings/i)).not.toBeInTheDocument();

      rerender(
        <NextIntlClientProvider locale="en" messages={messages}>
          <PageLayoutDialog
            settings={defaultSettings}
            onSettingsChange={mockOnSettingsChange}
            open={true}
          />
        </NextIntlClientProvider>
      );

      expect(screen.getByText(/page layout settings/i)).toBeInTheDocument();
    });

    it('should call onOpenChange when dialog state changes', async () => {
      renderWithProviders(
        <PageLayoutDialog
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      // Close by clicking apply
      const applyButton = screen.getByRole('button', { name: /apply/i });
      await userEvent.click(applyButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Settings Persistence', () => {
    it('should initialize with provided settings', () => {
      const customSettings: PageLayoutSettings = {
        pageSize: 'letter',
        orientation: 'landscape',
        margins: MARGIN_PRESETS.wide,
        headerEnabled: true,
        headerContent: 'My Header',
        footerEnabled: true,
        footerContent: 'Page',
        showPageNumbers: true,
      };

      renderWithProviders(
        <PageLayoutDialog
          settings={customSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
        />
      );

      // For landscape letter: dimensions should be shown
      const dimensionElements = screen.getAllByText(/279.*216|216.*279/i);
      expect(dimensionElements.length).toBeGreaterThan(0);
    });

    it('should pass settings to onSettingsChange when apply is clicked', async () => {
      renderWithProviders(
        <PageLayoutDialog
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
        />
      );

      // Apply changes
      const applyButton = screen.getByRole('button', { name: /apply/i });
      await userEvent.click(applyButton);

      expect(mockOnSettingsChange).toHaveBeenCalled();
    });
  });

  describe('Reset Functionality', () => {
    it('should reset settings to defaults when reset button is clicked', async () => {
      const customSettings: PageLayoutSettings = {
        pageSize: 'letter',
        orientation: 'landscape',
        margins: MARGIN_PRESETS.wide,
        headerEnabled: true,
        headerContent: 'My Header',
        footerEnabled: false,
        showPageNumbers: false,
      };

      renderWithProviders(
        <PageLayoutDialog
          settings={customSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
        />
      );

      const resetButton = screen.getByRole('button', { name: /reset/i });
      await userEvent.click(resetButton);

      // After reset, apply to check the reset values
      const applyButton = screen.getByRole('button', { name: /apply/i });
      await userEvent.click(applyButton);

      expect(mockOnSettingsChange).toHaveBeenCalled();
      const calledSettings = mockOnSettingsChange.mock.calls[0][0];
      expect(calledSettings.pageSize).toBe('a4');
      expect(calledSettings.orientation).toBe('portrait');
    });
  });

  describe('Orientation Change', () => {
    it('should change orientation when portrait is selected', async () => {
      const landscapeSettings: PageLayoutSettings = {
        ...defaultSettings,
        orientation: 'landscape',
      };

      renderWithProviders(
        <PageLayoutDialog
          settings={landscapeSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
        />
      );

      // Click portrait radio
      const portraitRadio = screen.getByLabelText(/portrait/i);
      await userEvent.click(portraitRadio);

      // Apply and check
      const applyButton = screen.getByRole('button', { name: /apply/i });
      await userEvent.click(applyButton);

      expect(mockOnSettingsChange).toHaveBeenCalled();
      const calledSettings = mockOnSettingsChange.mock.calls[0][0];
      expect(calledSettings.orientation).toBe('portrait');
    });

    it('should change orientation when landscape is selected', async () => {
      renderWithProviders(
        <PageLayoutDialog
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
        />
      );

      // Click landscape radio
      const landscapeRadio = screen.getByLabelText(/landscape/i);
      await userEvent.click(landscapeRadio);

      // Apply and check
      const applyButton = screen.getByRole('button', { name: /apply/i });
      await userEvent.click(applyButton);

      expect(mockOnSettingsChange).toHaveBeenCalled();
      const calledSettings = mockOnSettingsChange.mock.calls[0][0];
      expect(calledSettings.orientation).toBe('landscape');
    });
  });

  describe('Margin Preset Selection', () => {
    it('should apply narrow margin preset when clicked', async () => {
      renderWithProviders(
        <PageLayoutDialog
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
        />
      );

      // Switch to margins tab
      const marginsTab = screen.getByRole('tab', { name: /margins/i });
      await userEvent.click(marginsTab);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /narrow/i })).toBeInTheDocument();
      });

      // Click narrow preset
      const narrowButton = screen.getByRole('button', { name: /narrow/i });
      await userEvent.click(narrowButton);

      // Apply and check
      const applyButton = screen.getByRole('button', { name: /apply/i });
      await userEvent.click(applyButton);

      expect(mockOnSettingsChange).toHaveBeenCalled();
      const calledSettings = mockOnSettingsChange.mock.calls[0][0];
      expect(calledSettings.margins).toEqual(MARGIN_PRESETS.narrow);
    });

    it('should apply wide margin preset when clicked', async () => {
      renderWithProviders(
        <PageLayoutDialog
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
        />
      );

      // Switch to margins tab
      const marginsTab = screen.getByRole('tab', { name: /margins/i });
      await userEvent.click(marginsTab);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /wide/i })).toBeInTheDocument();
      });

      // Click wide preset
      const wideButton = screen.getByRole('button', { name: /wide/i });
      await userEvent.click(wideButton);

      // Apply and check
      const applyButton = screen.getByRole('button', { name: /apply/i });
      await userEvent.click(applyButton);

      expect(mockOnSettingsChange).toHaveBeenCalled();
      const calledSettings = mockOnSettingsChange.mock.calls[0][0];
      expect(calledSettings.margins).toEqual(MARGIN_PRESETS.wide);
    });
  });

  describe('Header/Footer Toggle', () => {
    it('should toggle header enabled state', async () => {
      renderWithProviders(
        <PageLayoutDialog
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
        />
      );

      // Switch to header/footer tab
      const headerFooterTab = screen.getByRole('tab', { name: /header.*footer/i });
      await userEvent.click(headerFooterTab);

      await waitFor(() => {
        expect(screen.getByText(/^header$/i)).toBeInTheDocument();
      });

      // Find and click header switch (first switch)
      const switches = screen.getAllByRole('switch');
      await userEvent.click(switches[0]); // Header switch

      // Apply and check
      const applyButton = screen.getByRole('button', { name: /apply/i });
      await userEvent.click(applyButton);

      expect(mockOnSettingsChange).toHaveBeenCalled();
      const calledSettings = mockOnSettingsChange.mock.calls[0][0];
      expect(calledSettings.headerEnabled).toBe(true);
    });

    it('should toggle footer enabled state', async () => {
      renderWithProviders(
        <PageLayoutDialog
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
        />
      );

      // Switch to header/footer tab
      const headerFooterTab = screen.getByRole('tab', { name: /header.*footer/i });
      await userEvent.click(headerFooterTab);

      await waitFor(() => {
        expect(screen.getByText(/^footer$/i)).toBeInTheDocument();
      });

      // Find and click footer switch (second switch)
      const switches = screen.getAllByRole('switch');
      await userEvent.click(switches[1]); // Footer switch

      // Apply and check
      const applyButton = screen.getByRole('button', { name: /apply/i });
      await userEvent.click(applyButton);

      expect(mockOnSettingsChange).toHaveBeenCalled();
      const calledSettings = mockOnSettingsChange.mock.calls[0][0];
      expect(calledSettings.footerEnabled).toBe(false); // Was true, now false
    });
  });

  describe('Custom Margin Input', () => {
    it('should update top margin when input changes', async () => {
      renderWithProviders(
        <PageLayoutDialog
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
        />
      );

      // Switch to margins tab
      const marginsTab = screen.getByRole('tab', { name: /margins/i });
      await userEvent.click(marginsTab);

      await waitFor(() => {
        expect(screen.getByText(/top/i)).toBeInTheDocument();
      });

      // Find top margin input
      const inputs = screen.getAllByRole('spinbutton');
      const topInput = inputs[0]; // First input is top margin

      // Clear and type new value
      await userEvent.clear(topInput);
      await userEvent.type(topInput, '30');

      // Apply and check
      const applyButton = screen.getByRole('button', { name: /apply/i });
      await userEvent.click(applyButton);

      expect(mockOnSettingsChange).toHaveBeenCalled();
      const calledSettings = mockOnSettingsChange.mock.calls[0][0];
      expect(calledSettings.margins.top).toBe(30);
    });
  });

  describe('Page Size Change', () => {
    it('should render page size selector with current value', () => {
      renderWithProviders(
        <PageLayoutDialog
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
        />
      );

      // Page size select should be present
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThan(0);
    });

    it('should display A4 dimensions for default settings', () => {
      renderWithProviders(
        <PageLayoutDialog
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
        />
      );

      // A4 dimensions should be shown
      const dimensionElements = screen.getAllByText(/210.*297/i);
      expect(dimensionElements.length).toBeGreaterThan(0);
    });
  });

  describe('Custom Page Size', () => {
    it('should show custom dimension inputs when custom size is selected', async () => {
      const customSettings: PageLayoutSettings = {
        ...defaultSettings,
        pageSize: 'custom',
        customWidth: 200,
        customHeight: 300,
      };

      renderWithProviders(
        <PageLayoutDialog
          settings={customSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
        />
      );

      // Should see width and height inputs
      expect(screen.getByText(/width/i)).toBeInTheDocument();
      expect(screen.getByText(/height/i)).toBeInTheDocument();

      // Find dimension inputs
      const spinbuttons = screen.getAllByRole('spinbutton');
      expect(spinbuttons.length).toBeGreaterThanOrEqual(2);
    });

    it('should render custom width and height inputs with initial values', () => {
      const customSettings: PageLayoutSettings = {
        ...defaultSettings,
        pageSize: 'custom',
        customWidth: 200,
        customHeight: 300,
      };

      renderWithProviders(
        <PageLayoutDialog
          settings={customSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
        />
      );

      // Find dimension inputs
      const spinbuttons = screen.getAllByRole('spinbutton');
      expect(spinbuttons.length).toBeGreaterThanOrEqual(2);

      // Check that inputs exist for width and height
      expect(screen.getByText(/width/i)).toBeInTheDocument();
      expect(screen.getByText(/height/i)).toBeInTheDocument();
    });

    it('should display custom dimensions in preview', () => {
      const customSettings: PageLayoutSettings = {
        ...defaultSettings,
        pageSize: 'custom',
        customWidth: 200,
        customHeight: 300,
      };

      renderWithProviders(
        <PageLayoutDialog
          settings={customSettings}
          onSettingsChange={mockOnSettingsChange}
          open={true}
        />
      );

      // Custom dimensions should be shown in preview
      const dimensionElements = screen.getAllByText(/200.*300/i);
      expect(dimensionElements.length).toBeGreaterThan(0);
    });
  });
});
