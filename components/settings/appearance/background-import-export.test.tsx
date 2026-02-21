/**
 * BackgroundImportExport Component Tests
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BackgroundImportExport } from './background-import-export';
import { useSettingsStore } from '@/stores';
import { NextIntlClientProvider } from 'next-intl';

jest.mock('@/stores', () => {
  const defaultState = {
    language: 'en' as const,
    backgroundSettings: {
      mode: 'single' as const,
      layers: [
        {
          id: 'layer-1',
          enabled: true,
          source: 'preset' as const,
          imageUrl: '',
          localAssetId: null,
          presetId: 'gradient-blue',
          fit: 'cover' as const,
          position: 'center' as const,
          opacity: 80,
          blur: 5,
          overlayColor: '#000000',
          overlayOpacity: 20,
          brightness: 100,
          saturation: 100,
          attachment: 'fixed' as const,
          animation: 'none' as const,
          animationSpeed: 5,
          contrast: 100,
          grayscale: 0,
        },
      ],
      slideshow: {
        slides: [],
        intervalMs: 15000,
        transitionMs: 1000,
        shuffle: false,
      },
      enabled: true,
      source: 'preset' as const,
      imageUrl: '',
      localAssetId: null,
      presetId: 'gradient-blue',
      fit: 'cover' as const,
      position: 'center' as const,
      opacity: 80,
      blur: 5,
      overlayColor: '#000000',
      overlayOpacity: 20,
      brightness: 100,
      saturation: 100,
      attachment: 'fixed' as const,
      animation: 'none' as const,
      animationSpeed: 5,
      contrast: 100,
      grayscale: 0,
    },
    setBackgroundSettings: jest.fn(),
  };

  let state = { ...defaultState };

  const useSettingsStoreImpl = ((selector: (s: typeof state) => unknown) => selector(state)) as unknown as {
    <T>(selector: (s: typeof state) => T): T;
    setState: (partial: Partial<typeof state>) => void;
    getState: () => typeof state;
  };

  useSettingsStoreImpl.setState = (partial) => {
    state = {
      ...state,
      ...partial,
      backgroundSettings: partial.backgroundSettings
        ? { ...state.backgroundSettings, ...partial.backgroundSettings }
        : state.backgroundSettings,
    };
  };
  useSettingsStoreImpl.getState = () => state;

  return {
    useSettingsStore: useSettingsStoreImpl,
  };
});

// Mock next-intl
const messages = {
  settings: {},
  common: {
    close: 'Close',
  },
  backgroundImportExport: {
    importExportButton: 'Import/Export',
    dialogTitle: 'Background Import/Export',
    dialogDescription: 'Share your background settings or import from a file',
    exportSettings: 'Export Settings',
    exportSettingsDesc: 'Export current background settings to a JSON file',
    exportToFile: 'Export to File',
    exportSuccess: 'Export successful',
    importSettings: 'Import Settings',
    importSettingsDesc: 'Import background settings from a JSON file',
    selectFile: 'Select File',
    importSuccess: 'Import successful',
    parseFileFailed: 'Failed to parse file',
    invalidFileFormat: 'Invalid file format',
    localFilesNote: 'Note: Locally uploaded images are not included in exports. Only URL and preset backgrounds are exported.',
  },
};

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {component}
    </NextIntlClientProvider>
  );
};

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = jest.fn(() => 'blob:test-url');
const mockRevokeObjectURL = jest.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset store
  useSettingsStore.setState({
    backgroundSettings: {
      mode: 'single',
      layers: [
        {
          id: 'layer-1',
          enabled: true,
          source: 'preset',
          imageUrl: '',
          localAssetId: null,
          presetId: 'gradient-blue',
          fit: 'cover',
          position: 'center',
          opacity: 80,
          blur: 5,
          overlayColor: '#000000',
          overlayOpacity: 20,
          brightness: 100,
          saturation: 100,
          attachment: 'fixed',
          animation: 'none',
          animationSpeed: 5,
          contrast: 100,
          grayscale: 0,
        },
      ],
      slideshow: {
        slides: [],
        intervalMs: 15000,
        transitionMs: 1000,
        shuffle: false,
      },
      enabled: true,
      source: 'preset',
      imageUrl: '',
      localAssetId: null,
      presetId: 'gradient-blue',
      fit: 'cover',
      position: 'center',
      opacity: 80,
      blur: 5,
      overlayColor: '#000000',
      overlayOpacity: 20,
      brightness: 100,
      saturation: 100,
      attachment: 'fixed',
      animation: 'none',
      animationSpeed: 5,
      contrast: 100,
      grayscale: 0,
    },
    language: 'en' as const,
  });
});

describe('BackgroundImportExport', () => {
  describe('rendering', () => {
    it('should render import/export button', () => {
      renderWithProviders(<BackgroundImportExport />);
      
      expect(screen.getByRole('button', { name: /import.*export/i })).toBeInTheDocument();
    });

    it('should open dialog when button is clicked', async () => {
      renderWithProviders(<BackgroundImportExport />);
      
      const button = screen.getByRole('button', { name: /import.*export/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/background import.*export/i)).toBeInTheDocument();
      });
    });
  });

  describe('export functionality', () => {
    it('should have export button in dialog', async () => {
      renderWithProviders(<BackgroundImportExport />);
      
      // Open dialog
      fireEvent.click(screen.getByRole('button', { name: /import.*export/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export to file/i })).toBeInTheDocument();
      });
    });
  });

  describe('import functionality', () => {
    it('should have import button in dialog', async () => {
      renderWithProviders(<BackgroundImportExport />);
      
      // Open dialog
      fireEvent.click(screen.getByRole('button', { name: /import.*export/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /select file/i })).toBeInTheDocument();
      });
    });

    it('should have hidden file input', async () => {
      renderWithProviders(<BackgroundImportExport />);
      
      // Open dialog
      fireEvent.click(screen.getByRole('button', { name: /import.*export/i }));

      await waitFor(() => {
        const fileInput = document.querySelector('input[type="file"]');
        expect(fileInput).toBeInTheDocument();
        expect(fileInput).toHaveAttribute('accept', '.json');
      });
    });

    it('rejects unsafe imported URLs', async () => {
      renderWithProviders(<BackgroundImportExport />);
      fireEvent.click(screen.getByRole('button', { name: /import.*export/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /select file/i })).toBeInTheDocument();
      });

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const unsafePayload = JSON.stringify({
        version: '1.0',
        settings: {
          enabled: true,
          source: 'url',
          imageUrl: 'javascript:alert(1)',
        },
      });
      const file = new File(
        [unsafePayload],
        'invalid.json',
        { type: 'application/json' }
      );

      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null as ((e: ProgressEvent<FileReader>) => void) | null,
      };
      jest.spyOn(global, 'FileReader').mockImplementation(
        () => mockFileReader as unknown as FileReader
      );

      Object.defineProperty(fileInput, 'files', { value: [file] });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(mockFileReader.readAsText).toHaveBeenCalled();
      });

      if (mockFileReader.onload) {
        await act(async () => {
          mockFileReader.onload?.({
            target: { result: unsafePayload },
          } as unknown as ProgressEvent<FileReader>);
        });
      }

      const setBackgroundSettingsMock = useSettingsStore.getState()
        .setBackgroundSettings as jest.Mock;
      expect(setBackgroundSettingsMock).not.toHaveBeenCalled();
    });

    it('downgrades imported local source without asset to none', async () => {
      renderWithProviders(<BackgroundImportExport />);
      fireEvent.click(screen.getByRole('button', { name: /import.*export/i }));

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const legacyLocalPayload = JSON.stringify({
        version: '1.0',
        settings: {
          enabled: true,
          source: 'local',
          imageUrl: '',
          localAssetId: null,
        },
      });
      const file = new File(
        [legacyLocalPayload],
        'legacy-local.json',
        { type: 'application/json' }
      );

      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null as ((e: ProgressEvent<FileReader>) => void) | null,
      };
      jest.spyOn(global, 'FileReader').mockImplementation(
        () => mockFileReader as unknown as FileReader
      );

      const setBackgroundSettingsMock = useSettingsStore.getState()
        .setBackgroundSettings as jest.Mock;
      setBackgroundSettingsMock.mockClear();

      Object.defineProperty(fileInput, 'files', { value: [file] });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(mockFileReader.readAsText).toHaveBeenCalled();
      });

      if (mockFileReader.onload) {
        await act(async () => {
          mockFileReader.onload?.({
            target: { result: legacyLocalPayload },
          } as unknown as ProgressEvent<FileReader>);
        });
      }

      expect(setBackgroundSettingsMock).toHaveBeenCalled();
      expect(setBackgroundSettingsMock.mock.calls[0][0].source).toBe('none');
    });
  });

  describe('Chinese language support', () => {
    const zhMessages = {
      settings: {},
      common: {
        close: '关闭',
      },
      backgroundImportExport: {
        importExportButton: '导入/导出',
        dialogTitle: '背景导入/导出',
        dialogDescription: '分享你的背景设置或从文件导入',
        exportSettings: '导出设置',
        exportSettingsDesc: '将当前背景设置导出为 JSON 文件',
        exportToFile: '导出到文件',
        exportSuccess: '导出成功',
        importSettings: '导入设置',
        importSettingsDesc: '从 JSON 文件导入背景设置',
        selectFile: '选择文件',
        importSuccess: '导入成功',
        parseFileFailed: '解析文件失败',
        invalidFileFormat: '文件格式无效',
        localFilesNote: '注意：本地上传的图片不会包含在导出中。仅导出 URL 和预设背景。',
      },
    };

    it('should show Chinese labels', () => {
      render(
        <NextIntlClientProvider locale="zh-CN" messages={zhMessages}>
          <BackgroundImportExport />
        </NextIntlClientProvider>
      );
      
      expect(screen.getByRole('button', { name: /导入.*导出/i })).toBeInTheDocument();
    });
  });

  describe('dialog controls', () => {
    it('should close dialog when close button is clicked', async () => {
      renderWithProviders(<BackgroundImportExport />);
      
      // Open dialog
      fireEvent.click(screen.getByRole('button', { name: /import.*export/i }));

      await waitFor(() => {
        expect(screen.getByText(/background import.*export/i)).toBeInTheDocument();
      });

      // Close dialog
      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      const closeButton = closeButtons[closeButtons.length - 1];
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText(/background import.*export/i)).not.toBeInTheDocument();
      });
    });
  });
});
