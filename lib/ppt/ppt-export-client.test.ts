import { exportPresentationClient } from './ppt-export-client';
import type { PPTPresentation } from '@/types/workflow';

jest.mock('@/lib/ai/tools/ppt-tool', () => ({
  executePPTExport: jest.fn(),
}));

jest.mock('@/lib/export/document/pptx-export', () => ({
  downloadPPTX: jest.fn(),
}));

const { executePPTExport } = jest.requireMock('@/lib/ai/tools/ppt-tool') as {
  executePPTExport: jest.Mock;
};
const { downloadPPTX } = jest.requireMock('@/lib/export/document/pptx-export') as {
  downloadPPTX: jest.Mock;
};

const createPresentation = (): PPTPresentation => ({
  id: 'ppt-1',
  title: 'Test PPT',
  theme: {
    id: 'modern-light',
    name: 'Modern Light',
    primaryColor: '#2563EB',
    secondaryColor: '#1D4ED8',
    accentColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
    textColor: '#1E293B',
    headingFont: 'Inter',
    bodyFont: 'Inter',
    codeFont: 'JetBrains Mono',
  },
  slides: [
    {
      id: 'slide-1',
      order: 0,
      layout: 'title-content',
      title: 'Slide',
      elements: [],
    },
  ],
  totalSlides: 1,
  aspectRatio: '16:9',
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('exportPresentationClient', () => {
  let originalCreateObjectURL: typeof URL.createObjectURL | undefined;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    originalCreateObjectURL = (URL as unknown as { createObjectURL?: typeof URL.createObjectURL })
      .createObjectURL;
    originalRevokeObjectURL = (URL as unknown as { revokeObjectURL?: typeof URL.revokeObjectURL })
      .revokeObjectURL;

    Object.defineProperty(URL, 'createObjectURL', {
      value: jest.fn(() => 'blob:mock'),
      configurable: true,
      writable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: jest.fn(() => undefined),
      configurable: true,
      writable: true,
    });
    document.body.innerHTML = '';
    jest.spyOn(document.body, 'appendChild');
    jest.spyOn(document.body, 'removeChild');
  });

  afterEach(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      value: originalCreateObjectURL,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: originalRevokeObjectURL,
      configurable: true,
      writable: true,
    });
  });

  it('returns invalid_presentation for empty slide deck', async () => {
    const presentation = { ...createPresentation(), slides: [], totalSlides: 0 };
    const result = await exportPresentationClient(presentation, 'html');
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('invalid_presentation');
  });

  it('exports pptx through native pipeline', async () => {
    downloadPPTX.mockResolvedValue({
      success: true,
      filename: 'deck.pptx',
    });
    const result = await exportPresentationClient(createPresentation(), 'pptx');
    expect(downloadPPTX).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('returns popup_blocked when PDF window is blocked', async () => {
    executePPTExport.mockReturnValue({
      success: true,
      data: {
        content: '<html></html>',
        filename: 'deck.pdf',
      },
    });
    const openSpy = jest.spyOn(window, 'open').mockReturnValueOnce(null);
    const result = await exportPresentationClient(createPresentation(), 'pdf');
    expect(openSpy).toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('popup_blocked');
  });

  it('downloads non-PDF exports as files', async () => {
    executePPTExport.mockReturnValue({
      success: true,
      data: {
        content: '# deck',
        filename: 'deck.md',
      },
    });

    const clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    const result = await exportPresentationClient(createPresentation(), 'marp');
    expect(result.success).toBe(true);
    expect(clickSpy).toHaveBeenCalled();
  });
});
