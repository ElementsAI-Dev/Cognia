import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModeSelectorDialog } from './mode-selector-dialog';

jest.mock('next-intl', () => ({
  useLocale: () => 'zh-CN',
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    if (key === 'startMode' && values?.modeName) {
      return `start-${String(values.modeName)}`;
    }
    return key;
  },
}));

describe('ModeSelectorDialog', () => {
  it('prefills recommended mode from context hint', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();

    render(
      <ModeSelectorDialog
        open
        onOpenChange={jest.fn()}
        textbook={null}
        contextHint={{ availableTimeMinutes: 90 }}
        onSelect={onSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /start-modes\.extreme\.title/ })).toBeEnabled();
    });

    await user.click(screen.getByRole('button', { name: /start-modes\.extreme\.title/ }));
    expect(onSelect).toHaveBeenCalledWith('extreme');
  });

  it('uses initialMode over recommendation', async () => {
    render(
      <ModeSelectorDialog
        open
        onOpenChange={jest.fn()}
        textbook={null}
        contextHint={{ availableTimeMinutes: 90 }}
        initialMode="speed"
        onSelect={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /start-modes\.speed\.title/ })).toBeEnabled();
    });
  });
});
