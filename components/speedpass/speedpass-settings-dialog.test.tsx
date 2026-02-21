import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpeedPassSettingsDialog } from './speedpass-settings-dialog';
import { useSpeedPassUser } from '@/hooks/learning';

jest.mock('@/hooks/learning', () => ({
  useSpeedPassUser: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
  },
}));

const mockUseSpeedPassUser = useSpeedPassUser as jest.MockedFunction<typeof useSpeedPassUser>;

describe('SpeedPassSettingsDialog', () => {
  it('saves speedpass profile updates', async () => {
    const user = userEvent.setup();
    const updateProfile = jest.fn();
    mockUseSpeedPassUser.mockReturnValue({
      profile: {
        id: 'local-user',
        displayName: 'Local User',
        preferredMode: 'speed',
        studyGoal: 'good',
        dailyStudyTarget: 60,
        reminderEnabled: false,
      },
      stats: {} as any,
      progress: {} as any,
      updateProfile,
      isDailyGoalMet: false,
      todayProgress: { studyMinutes: 0, targetMinutes: 60, percentage: 0 },
      isAuthenticated: false,
      isLocalMode: true,
    });

    const onOpenChange = jest.fn();
    render(<SpeedPassSettingsDialog open onOpenChange={onOpenChange} />);

    const input = screen.getByLabelText('每日学习目标分钟');
    await user.clear(input);
    await user.type(input, '90');

    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        dailyStudyTarget: 90,
      })
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
