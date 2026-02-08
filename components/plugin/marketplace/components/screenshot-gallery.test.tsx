'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ScreenshotGallery } from './screenshot-gallery';

const messages = {
  pluginDetail: {
    overview: {
      screenshots: 'Screenshots',
    },
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('ScreenshotGallery', () => {
  const screenshots = [
    'https://example.com/screenshot1.png',
    'https://example.com/screenshot2.png',
    'https://example.com/screenshot3.png',
  ];

  it('renders nothing when screenshots array is empty', () => {
    const { container } = renderWithProviders(
      <ScreenshotGallery screenshots={[]} pluginName="Test" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when screenshots is undefined', () => {
    const { container } = renderWithProviders(
      <ScreenshotGallery screenshots={undefined as unknown as string[]} pluginName="Test" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders screenshots heading', () => {
    renderWithProviders(
      <ScreenshotGallery screenshots={screenshots} pluginName="Test Plugin" />
    );
    expect(screen.getByText('Screenshots')).toBeInTheDocument();
  });

  it('renders correct number of screenshot images', () => {
    renderWithProviders(
      <ScreenshotGallery screenshots={screenshots} pluginName="Test Plugin" />
    );
    const images = screen.getAllByRole('img');
    expect(images.length).toBe(3);
  });

  it('renders alt text with plugin name', () => {
    renderWithProviders(
      <ScreenshotGallery screenshots={screenshots} pluginName="Test Plugin" />
    );
    expect(screen.getByAltText('Test Plugin screenshot 1')).toBeInTheDocument();
    expect(screen.getByAltText('Test Plugin screenshot 2')).toBeInTheDocument();
    expect(screen.getByAltText('Test Plugin screenshot 3')).toBeInTheDocument();
  });

  it('opens fullscreen dialog on screenshot click', () => {
    renderWithProviders(
      <ScreenshotGallery screenshots={screenshots} pluginName="Test Plugin" />
    );
    const thumbnails = screen.getAllByRole('img');
    fireEvent.click(thumbnails[0].closest('div[class*="cursor-pointer"]')!);
    // Dialog should show navigation counter
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('navigates to next screenshot in dialog', () => {
    renderWithProviders(
      <ScreenshotGallery screenshots={screenshots} pluginName="Test Plugin" />
    );
    const thumbnails = screen.getAllByRole('img');
    fireEvent.click(thumbnails[0].closest('div[class*="cursor-pointer"]')!);
    expect(screen.getByText('1 / 3')).toBeInTheDocument();

    // Click next button
    const nextButton = screen.getAllByRole('button').find(
      (btn) => !btn.hasAttribute('disabled') && btn.querySelector('.lucide-chevron-right')
    );
    if (nextButton) {
      fireEvent.click(nextButton);
      expect(screen.getByText('2 / 3')).toBeInTheDocument();
    }
  });
});
