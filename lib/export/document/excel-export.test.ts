/**
 * Tests for excel-export functionality with media statistics
 */

import { exportChatToExcel } from './excel-export';
import type { UIMessage, Session } from '@/types';

// Mock xlsx module
jest.mock('xlsx', () => ({
  utils: {
    book_new: jest.fn(() => ({})),
    aoa_to_sheet: jest.fn(() => ({})),
    book_append_sheet: jest.fn(),
  },
  write: jest.fn(() => new ArrayBuffer(8)),
}));

// Mock session data
const mockSession: Session = {
  id: 'session-123',
  title: 'Test Conversation',
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T11:00:00Z'),
  provider: 'openai',
  model: 'gpt-4o',
  mode: 'chat',
};

// Mock basic messages
const mockMessages: UIMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'Hello',
    createdAt: new Date('2024-01-15T10:01:00Z'),
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: 'Hi there!',
    createdAt: new Date('2024-01-15T10:01:30Z'),
    tokens: { prompt: 10, completion: 15, total: 25 },
  },
];

// Mock messages with image parts
const mockMessagesWithImages: UIMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'Generate an image',
    createdAt: new Date('2024-01-15T10:01:00Z'),
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: 'Here is the image:',
    createdAt: new Date('2024-01-15T10:01:30Z'),
    parts: [
      { type: 'text', content: 'Here is the image:' },
      {
        type: 'image',
        url: 'https://example.com/image.png',
        alt: 'Generated image',
        width: 1024,
        height: 768,
        isGenerated: true,
        prompt: 'A beautiful landscape',
      },
    ],
  },
];

// Mock messages with video parts
const mockMessagesWithVideos: UIMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'Generate a video',
    createdAt: new Date('2024-01-15T10:01:00Z'),
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: 'Here is the video:',
    createdAt: new Date('2024-01-15T10:01:30Z'),
    parts: [
      { type: 'text', content: 'Here is the video:' },
      {
        type: 'video',
        url: 'https://example.com/video.mp4',
        title: 'AI Generated Video',
        durationSeconds: 30,
        width: 1920,
        height: 1080,
        fps: 30,
        isGenerated: true,
        provider: 'google-veo',
        model: 'veo-2',
        prompt: 'A dancing cat',
      },
    ],
  },
];

// Mock messages with mixed media
const mockMessagesWithMixedMedia: UIMessage[] = [
  {
    id: 'msg-1',
    role: 'assistant',
    content: 'Generated content:',
    createdAt: new Date('2024-01-15T10:01:30Z'),
    parts: [
      {
        type: 'image',
        url: 'https://example.com/img1.png',
        isGenerated: true,
        prompt: 'Image 1',
      },
      {
        type: 'image',
        url: 'https://example.com/img2.png',
        isGenerated: false,
      },
      {
        type: 'video',
        url: 'https://example.com/vid1.mp4',
        durationSeconds: 15,
        isGenerated: true,
        provider: 'openai-sora',
        model: 'sora-1',
      },
      {
        type: 'video',
        url: 'https://example.com/vid2.mp4',
        durationSeconds: 45,
        isGenerated: true,
        provider: 'google-veo',
        model: 'veo-2',
      },
    ],
    attachments: [
      {
        id: 'att-1',
        name: 'photo.jpg',
        type: 'image',
        url: 'https://example.com/photo.jpg',
        size: 1024,
        mimeType: 'image/jpeg',
      },
    ],
  },
];

describe('exportChatToExcel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export basic conversation successfully', async () => {
    const result = await exportChatToExcel(mockSession, mockMessages);

    expect(result.success).toBe(true);
    expect(result.filename).toContain('.xlsx');
    expect(result.blob).toBeInstanceOf(Blob);
  });

  it('should use custom filename when provided', async () => {
    const result = await exportChatToExcel(mockSession, mockMessages, 'custom-export');

    expect(result.success).toBe(true);
    expect(result.filename).toBe('custom-export.xlsx');
  });

  it('should sanitize formula-like content in message sheet', async () => {
    const XLSX = await import('xlsx');
    const formulaMessages: UIMessage[] = [
      {
        id: 'msg-1',
        role: 'user',
        content: '=SUM(1,2)',
        createdAt: new Date('2024-01-15T10:01:00Z'),
      },
    ];

    await exportChatToExcel(mockSession, formulaMessages);

    const aoaCalls = (XLSX.utils.aoa_to_sheet as jest.Mock).mock.calls;
    const messageSheetCall = aoaCalls.find((call) => {
      const data = call[0] as (string | number)[][];
      return data[0] && data[0][0] === '#' && data[0][2] === 'Content';
    });

    expect(messageSheetCall).toBeDefined();
    if (messageSheetCall) {
      const data = messageSheetCall[0] as (string | number)[][];
      expect(data[1][2]).toBe("'=SUM(1,2)");
    }
  });

  describe('media statistics', () => {
    // Helper to find stats data in mock calls
    const findStatsData = (aoaCalls: unknown[][][], searchKey: string) => {
      for (const call of aoaCalls) {
        const data = call[0] as (string | number)[][];
        const row = data.find((r) => r[0] === searchKey);
        if (row) return { data, row };
      }
      return null;
    };

    it('should count images correctly', async () => {
      const XLSX = await import('xlsx');
      await exportChatToExcel(mockSession, mockMessagesWithImages);

      const aoaCalls = (XLSX.utils.aoa_to_sheet as jest.Mock).mock.calls;
      const result = findStatsData(aoaCalls, 'Total Images');
      
      expect(result).not.toBeNull();
      expect(result?.row[1]).toBe(1);
      
      const aiResult = findStatsData(aoaCalls, 'AI Generated Images');
      expect(aiResult?.row[1]).toBe(1);
    });

    it('should count videos correctly', async () => {
      const XLSX = await import('xlsx');
      await exportChatToExcel(mockSession, mockMessagesWithVideos);

      const aoaCalls = (XLSX.utils.aoa_to_sheet as jest.Mock).mock.calls;
      const result = findStatsData(aoaCalls, 'Total Videos');
      
      expect(result).not.toBeNull();
      expect(result?.row[1]).toBe(1);
      
      const aiResult = findStatsData(aoaCalls, 'AI Generated Videos');
      expect(aiResult?.row[1]).toBe(1);
    });

    it('should count mixed media correctly', async () => {
      const XLSX = await import('xlsx');
      await exportChatToExcel(mockSession, mockMessagesWithMixedMedia);

      const aoaCalls = (XLSX.utils.aoa_to_sheet as jest.Mock).mock.calls;
      
      // 2 image parts + 1 image attachment = 3 total images
      const imgResult = findStatsData(aoaCalls, 'Total Images');
      expect(imgResult?.row[1]).toBe(3);
      
      // Only 1 AI generated image
      const aiImgResult = findStatsData(aoaCalls, 'AI Generated Images');
      expect(aiImgResult?.row[1]).toBe(1);
      
      // 2 video parts
      const vidResult = findStatsData(aoaCalls, 'Total Videos');
      expect(vidResult?.row[1]).toBe(2);
      
      // Both videos are AI generated
      const aiVidResult = findStatsData(aoaCalls, 'AI Generated Videos');
      expect(aiVidResult?.row[1]).toBe(2);
    });

    it('should calculate total video duration', async () => {
      const XLSX = await import('xlsx');
      await exportChatToExcel(mockSession, mockMessagesWithMixedMedia);

      const aoaCalls = (XLSX.utils.aoa_to_sheet as jest.Mock).mock.calls;
      // 15s + 45s = 60s = 1m 0s
      const result = findStatsData(aoaCalls, 'Total Video Duration');
      
      expect(result).not.toBeNull();
      expect(result?.row[1]).toBe('1m 0s');
    });

    it('should track video providers', async () => {
      const XLSX = await import('xlsx');
      await exportChatToExcel(mockSession, mockMessagesWithMixedMedia);

      const aoaCalls = (XLSX.utils.aoa_to_sheet as jest.Mock).mock.calls;
      const result = findStatsData(aoaCalls, 'Video Providers');
      
      expect(result).not.toBeNull();
      expect(String(result?.row[1])).toContain('openai-sora');
      expect(String(result?.row[1])).toContain('google-veo');
    });

    it('should track video models', async () => {
      const XLSX = await import('xlsx');
      await exportChatToExcel(mockSession, mockMessagesWithMixedMedia);

      const aoaCalls = (XLSX.utils.aoa_to_sheet as jest.Mock).mock.calls;
      const result = findStatsData(aoaCalls, 'Video Models');
      
      expect(result).not.toBeNull();
      expect(String(result?.row[1])).toContain('sora-1');
      expect(String(result?.row[1])).toContain('veo-2');
    });
  });

  describe('media sheet', () => {
    it('should create Media sheet when media exists', async () => {
      const XLSX = await import('xlsx');
      await exportChatToExcel(mockSession, mockMessagesWithMixedMedia);

      const appendSheetCalls = (XLSX.utils.book_append_sheet as jest.Mock).mock.calls;
      const mediaSheetCall = appendSheetCalls.find((call) => call[2] === 'Media');
      
      expect(mediaSheetCall).toBeDefined();
    });

    it('should not create Media sheet when no media exists', async () => {
      const XLSX = await import('xlsx');
      await exportChatToExcel(mockSession, mockMessages);

      const appendSheetCalls = (XLSX.utils.book_append_sheet as jest.Mock).mock.calls;
      const mediaSheetCall = appendSheetCalls.find((call) => call[2] === 'Media');
      
      expect(mediaSheetCall).toBeUndefined();
    });

    it('should include media details in Media sheet', async () => {
      const XLSX = await import('xlsx');
      await exportChatToExcel(mockSession, mockMessagesWithImages);

      const aoaCalls = (XLSX.utils.aoa_to_sheet as jest.Mock).mock.calls;
      // Find media sheet data by looking for the header structure
      const mediaCall = aoaCalls.find((call) => {
        const data = call[0] as (string | number)[][];
        return data[0] && data[0][0] === '#' && data[0][1] === 'Type';
      });
      
      expect(mediaCall).toBeDefined();
      if (mediaCall) {
        const data = mediaCall[0] as (string | number)[][];
        // Should have header row and at least one data row
        expect(data.length).toBeGreaterThan(1);
        
        // Check data row
        const dataRow = data[1];
        expect(dataRow[1]).toBe('Image'); // Type
        expect(dataRow[2]).toBe('Yes'); // AI Generated
      }
    });
  });
});
