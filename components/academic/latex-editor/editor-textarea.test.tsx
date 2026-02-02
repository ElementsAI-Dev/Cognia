import { render, screen, fireEvent } from '@testing-library/react';
import { EditorTextarea, type EditorTextareaConfig } from './editor-textarea';

const defaultConfig: EditorTextareaConfig = {
  fontFamily: 'monospace',
  fontSize: 14,
  tabSize: 2,
  wordWrap: true,
  spellCheck: false,
};

describe('EditorTextarea', () => {
  const mockOnChange = jest.fn();
  const mockOnKeyDown = jest.fn();
  const mockOnSelect = jest.fn();
  const mockOnClick = jest.fn();
  const mockOnContextMenu = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders textarea with value', () => {
    render(
      <EditorTextarea
        value="Hello World"
        onChange={mockOnChange}
        onKeyDown={mockOnKeyDown}
        onSelect={mockOnSelect}
        onClick={mockOnClick}
        onContextMenu={mockOnContextMenu}
        config={defaultConfig}
      />
    );

    expect(screen.getByDisplayValue('Hello World')).toBeInTheDocument();
  });

  it('applies font family from config', () => {
    render(
      <EditorTextarea
        value=""
        onChange={mockOnChange}
        onKeyDown={mockOnKeyDown}
        onSelect={mockOnSelect}
        onClick={mockOnClick}
        onContextMenu={mockOnContextMenu}
        config={{ ...defaultConfig, fontFamily: 'Consolas' }}
      />
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveStyle({ fontFamily: 'Consolas' });
  });

  it('applies font size from config', () => {
    render(
      <EditorTextarea
        value=""
        onChange={mockOnChange}
        onKeyDown={mockOnKeyDown}
        onSelect={mockOnSelect}
        onClick={mockOnClick}
        onContextMenu={mockOnContextMenu}
        config={{ ...defaultConfig, fontSize: 16 }}
      />
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveStyle({ fontSize: '16px' });
  });

  it('applies tab size from config', () => {
    render(
      <EditorTextarea
        value=""
        onChange={mockOnChange}
        onKeyDown={mockOnKeyDown}
        onSelect={mockOnSelect}
        onClick={mockOnClick}
        onContextMenu={mockOnContextMenu}
        config={{ ...defaultConfig, tabSize: 4 }}
      />
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveStyle({ tabSize: '4' });
  });

  it('sets spellcheck based on config', () => {
    render(
      <EditorTextarea
        value=""
        onChange={mockOnChange}
        onKeyDown={mockOnKeyDown}
        onSelect={mockOnSelect}
        onClick={mockOnClick}
        onContextMenu={mockOnContextMenu}
        config={{ ...defaultConfig, spellCheck: true }}
      />
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('spellcheck', 'true');
  });

  it('calls onChange when text is typed', () => {
    render(
      <EditorTextarea
        value=""
        onChange={mockOnChange}
        onKeyDown={mockOnKeyDown}
        onSelect={mockOnSelect}
        onClick={mockOnClick}
        onContextMenu={mockOnContextMenu}
        config={defaultConfig}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'new text' } });

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('calls onKeyDown when key is pressed', () => {
    render(
      <EditorTextarea
        value=""
        onChange={mockOnChange}
        onKeyDown={mockOnKeyDown}
        onSelect={mockOnSelect}
        onClick={mockOnClick}
        onContextMenu={mockOnContextMenu}
        config={defaultConfig}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.keyDown(textarea, { key: 'Enter' });

    expect(mockOnKeyDown).toHaveBeenCalled();
  });

  it('calls onSelect when text is selected', () => {
    render(
      <EditorTextarea
        value="some text"
        onChange={mockOnChange}
        onKeyDown={mockOnKeyDown}
        onSelect={mockOnSelect}
        onClick={mockOnClick}
        onContextMenu={mockOnContextMenu}
        config={defaultConfig}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.select(textarea);

    expect(mockOnSelect).toHaveBeenCalled();
  });

  it('calls onClick when clicked', () => {
    render(
      <EditorTextarea
        value=""
        onChange={mockOnChange}
        onKeyDown={mockOnKeyDown}
        onSelect={mockOnSelect}
        onClick={mockOnClick}
        onContextMenu={mockOnContextMenu}
        config={defaultConfig}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.click(textarea);

    expect(mockOnClick).toHaveBeenCalled();
  });

  it('calls onContextMenu on right click', () => {
    render(
      <EditorTextarea
        value=""
        onChange={mockOnChange}
        onKeyDown={mockOnKeyDown}
        onSelect={mockOnSelect}
        onClick={mockOnClick}
        onContextMenu={mockOnContextMenu}
        config={defaultConfig}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.contextMenu(textarea);

    expect(mockOnContextMenu).toHaveBeenCalled();
  });

  it('sets readOnly when prop is true', () => {
    render(
      <EditorTextarea
        value=""
        onChange={mockOnChange}
        onKeyDown={mockOnKeyDown}
        onSelect={mockOnSelect}
        onClick={mockOnClick}
        onContextMenu={mockOnContextMenu}
        config={defaultConfig}
        readOnly={true}
      />
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('readonly');
  });

  it('shows placeholder text', () => {
    render(
      <EditorTextarea
        value=""
        onChange={mockOnChange}
        onKeyDown={mockOnKeyDown}
        onSelect={mockOnSelect}
        onClick={mockOnClick}
        onContextMenu={mockOnContextMenu}
        config={defaultConfig}
        placeholder="Enter your code here"
      />
    );

    const textarea = screen.getByPlaceholderText('Enter your code here');
    expect(textarea).toBeInTheDocument();
  });

  it('uses default placeholder if not provided', () => {
    render(
      <EditorTextarea
        value=""
        onChange={mockOnChange}
        onKeyDown={mockOnKeyDown}
        onSelect={mockOnSelect}
        onClick={mockOnClick}
        onContextMenu={mockOnContextMenu}
        config={defaultConfig}
      />
    );

    const textarea = screen.getByPlaceholderText('Enter LaTeX code here...');
    expect(textarea).toBeInTheDocument();
  });

  it('applies word wrap class when enabled', () => {
    render(
      <EditorTextarea
        value=""
        onChange={mockOnChange}
        onKeyDown={mockOnKeyDown}
        onSelect={mockOnSelect}
        onClick={mockOnClick}
        onContextMenu={mockOnContextMenu}
        config={{ ...defaultConfig, wordWrap: true }}
      />
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('whitespace-pre-wrap');
  });

  it('applies overflow-x-auto class when word wrap is disabled', () => {
    render(
      <EditorTextarea
        value=""
        onChange={mockOnChange}
        onKeyDown={mockOnKeyDown}
        onSelect={mockOnSelect}
        onClick={mockOnClick}
        onContextMenu={mockOnContextMenu}
        config={{ ...defaultConfig, wordWrap: false }}
      />
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('overflow-x-auto');
  });

  it('applies custom className', () => {
    render(
      <EditorTextarea
        value=""
        onChange={mockOnChange}
        onKeyDown={mockOnKeyDown}
        onSelect={mockOnSelect}
        onClick={mockOnClick}
        onContextMenu={mockOnContextMenu}
        config={defaultConfig}
        className="custom-class"
      />
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('custom-class');
  });
});
