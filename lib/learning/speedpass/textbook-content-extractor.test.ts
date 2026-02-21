import { extractTextbookContent } from './textbook-content-extractor';
import { isTauri } from '@/lib/utils';
import { speedpassRuntime } from '@/lib/native/speedpass-runtime';
import { parsePDFFile } from '@/lib/document/parsers/pdf-parser';

jest.mock('@/lib/utils', () => ({
  isTauri: jest.fn(() => false),
}));

jest.mock('@/lib/native/speedpass-runtime', () => ({
  speedpassRuntime: {
    extractTextbookContent: jest.fn(),
  },
}));

jest.mock('@/lib/document/parsers/pdf-parser', () => ({
  parsePDFFile: jest.fn(),
}));

const mockIsTauri = isTauri as jest.MockedFunction<typeof isTauri>;
const mockRuntimeExtract = speedpassRuntime.extractTextbookContent as jest.Mock;
const mockParsePdf = parsePDFFile as jest.MockedFunction<typeof parsePDFFile>;

function createMockFile(content: string, name: string, type: string): File {
  const byteArray = Uint8Array.from(Buffer.from(content, 'utf8'));
  const buffer = byteArray.buffer.slice(
    byteArray.byteOffset,
    byteArray.byteOffset + byteArray.byteLength
  );
  return {
    name,
    type,
    arrayBuffer: async () => buffer,
    text: async () => content,
  } as unknown as File;
}

describe('extractTextbookContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(false);
  });

  it('uses tauri runtime extractor in tauri env', async () => {
    mockIsTauri.mockReturnValue(true);
    mockRuntimeExtract.mockResolvedValue({
      content: 'runtime-content',
      source: 'bytes',
      fileName: 'test.pdf',
    });

    const file = createMockFile('pdf-binary', 'test.pdf', 'application/pdf');
    const result = await extractTextbookContent({ file });

    expect(mockRuntimeExtract).toHaveBeenCalled();
    expect(result.content).toBe('runtime-content');
  });

  it('uses web pdf parser for pdf files in web env', async () => {
    mockParsePdf.mockResolvedValue({
      text: 'parsed-pdf-content',
      pageCount: 2,
      pages: [],
      metadata: {},
    });

    const file = createMockFile('pdf-binary', 'test.pdf', 'application/pdf');
    const result = await extractTextbookContent({ file });

    expect(mockParsePdf).toHaveBeenCalledWith(file, expect.any(Object));
    expect(result.content).toBe('parsed-pdf-content');
    expect(result.pageCount).toBe(2);
  });

  it('reads plain text for txt files', async () => {
    const file = createMockFile('hello speedpass', 'test.txt', 'text/plain');
    const result = await extractTextbookContent({ file });

    expect(result.content).toBe('hello speedpass');
    expect(result.source).toBe('bytes');
  });
});
