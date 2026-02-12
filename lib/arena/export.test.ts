import { exportLeaderboardData } from './export';
import type { ArenaModelRating } from '@/types/arena';

describe('arena export utilities', () => {
  describe('exportLeaderboardData', () => {
    let mockCreateElement: jest.SpyInstance;
    let mockAppendChild: jest.SpyInstance;
    let mockRemoveChild: jest.SpyInstance;
    let clickSpy: jest.Mock;
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    beforeEach(() => {
      clickSpy = jest.fn();
      mockCreateElement = jest.spyOn(document, 'createElement').mockReturnValue({
        href: '',
        download: '',
        click: clickSpy,
      } as unknown as HTMLAnchorElement);
      mockAppendChild = jest.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
      mockRemoveChild = jest.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
      URL.createObjectURL = jest.fn().mockReturnValue('blob:test');
      URL.revokeObjectURL = jest.fn();
    });

    afterEach(() => {
      mockCreateElement.mockRestore();
      mockAppendChild.mockRestore();
      mockRemoveChild.mockRestore();
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    });

    it('should create a download link and trigger click', () => {
      const ratings: ArenaModelRating[] = [
        {
          modelId: 'openai:gpt-4o',
          provider: 'openai',
          model: 'gpt-4o',
          rating: 1600,
          categoryRatings: {},
          totalBattles: 10,
          wins: 7,
          losses: 3,
          ties: 0,
          updatedAt: new Date(),
        },
      ];

      exportLeaderboardData(ratings, 'all');

      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    });

    it('should handle empty ratings', () => {
      exportLeaderboardData([], 'coding');

      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it('should create blob with JSON content', () => {
      const ratings: ArenaModelRating[] = [
        {
          modelId: 'openai:gpt-4o',
          provider: 'openai',
          model: 'gpt-4o',
          rating: 1600,
          ci95Lower: 1550,
          ci95Upper: 1650,
          winRate: 0.7,
          categoryRatings: {},
          totalBattles: 10,
          wins: 7,
          losses: 2,
          ties: 1,
          updatedAt: new Date(),
        },
      ];

      exportLeaderboardData(ratings, 'all');

      // Verify the Blob was created with JSON content
      const blobArg = (URL.createObjectURL as jest.Mock).mock.calls[0][0];
      expect(blobArg).toBeInstanceOf(Blob);
    });
  });
});
