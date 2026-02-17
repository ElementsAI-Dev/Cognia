/**
 * @jest-environment jsdom
 */
import { render, fireEvent } from '@testing-library/react';
import { GhostTextOverlay } from './ghost-text-overlay';

describe('GhostTextOverlay', () => {
  it('does not accept or dismiss via global document keydown', () => {
    const textarea = document.createElement('textarea');
    textarea.value = 'hello';
    document.body.appendChild(textarea);
    const textareaRef = { current: textarea };
    const onAccept = jest.fn();
    const onDismiss = jest.fn();

    render(
      <GhostTextOverlay
        text=" world"
        textareaRef={textareaRef}
        onAccept={onAccept}
        onDismiss={onDismiss}
      />
    );

    fireEvent.keyDown(document, { key: 'Tab' });
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onAccept).not.toHaveBeenCalled();
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

