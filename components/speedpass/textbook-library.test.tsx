import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextbookLibrary } from './textbook-library';
import { useSpeedPassStore } from '@/stores/learning/speedpass-store';
import { useTextbookProcessor } from '@/hooks/learning';

// Mock the stores and hooks
jest.mock('@/stores/learning/speedpass-store', () => ({
  useSpeedPassStore: jest.fn(),
}));

jest.mock('@/hooks/learning', () => ({
  useTextbookProcessor: jest.fn(),
}));

// Mock lucide-react to render icons as text for easier testing
jest.mock('lucide-react', () => ({
  BookOpen: () => <div data-testid="icon-book-open">BookOpen</div>,
  Upload: () => <div data-testid="icon-upload">Upload</div>,
  MoreVertical: () => <div data-testid="icon-more-vertical">MoreVertical</div>,
  Trash2: () => <div data-testid="icon-trash-2">Trash2</div>,
  Edit: () => <div data-testid="icon-edit">Edit</div>,
  Play: () => <div data-testid="icon-play">Play</div>,
  FileText: () => <div data-testid="icon-file-text">FileText</div>,
  Brain: () => <div data-testid="icon-brain">Brain</div>,
  CheckCircle: () => <div data-testid="icon-check-circle">CheckCircle</div>,
  Clock: () => <div data-testid="icon-clock">Clock</div>,
  AlertCircle: () => <div data-testid="icon-alert-circle">AlertCircle</div>,
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: '我的教材',
      subtitle: '共 {count} 本教材',
      addTextbook: '添加教材',
      'emptyState.title': '还没有教材',
      'emptyState.description': '上传 PDF 格式的教材开始学习',
      'emptyState.action': '添加第一本教材',
      'dialog.title': '添加教材',
      'dialog.nameLabel': '教材名称 *',
      'dialog.authorLabel': '作者',
      edit: '编辑信息',
      delete: '删除教材',
      chapters: '章节',
      knowledgePoints: '知识点',
      questions: '题目',
      startLearning: '开始学习',
      practice: '练习',
      unknownAuthor: '未知作者',
    };
    return translations[key] || key;
  },
}));

jest.mock('nanoid', () => ({
  nanoid: () => 'test-id',
}));

describe('TextbookLibrary', () => {
  const mockAddTextbook = jest.fn();
  const mockRemoveTextbook = jest.fn();
  const mockProcessTextbook = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementation
    (useSpeedPassStore as unknown as jest.Mock).mockReturnValue({
      textbooks: {},
      textbookChapters: {},
      textbookKnowledgePoints: {},
      textbookQuestions: {},
      addTextbook: mockAddTextbook,
      removeTextbook: mockRemoveTextbook,
      parseProgress: null,
    });

    (useTextbookProcessor as unknown as jest.Mock).mockReturnValue({
      processTextbook: mockProcessTextbook,
      progress: { current: 0, message: '' },
      isProcessing: false,
    });
  });

  it('renders empty state when no textbooks exist', () => {
    render(<TextbookLibrary />);

    expect(screen.getByText('我的教材')).toBeInTheDocument();
    expect(screen.getByText('还没有教材')).toBeInTheDocument();
    expect(screen.getByText('上传 PDF 格式的教材开始学习')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /添加第一本教材/i })).toBeInTheDocument();
  });

  it('renders textbook cards when textbooks exist', () => {
    const mockTextbooks = {
      '1': {
        id: '1',
        name: 'Test Book',
        author: 'Test Author',
        source: 'user_upload',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    (useSpeedPassStore as unknown as jest.Mock).mockReturnValue({
      textbooks: mockTextbooks,
      textbookChapters: { '1': [] },
      textbookKnowledgePoints: { '1': [] },
      textbookQuestions: { '1': [] },
      addTextbook: mockAddTextbook,
      removeTextbook: mockRemoveTextbook,
      parseProgress: null,
    });

    render(<TextbookLibrary />);

    expect(screen.getByText('Test Book')).toBeInTheDocument();
    expect(screen.getByText('Test Author')).toBeInTheDocument();
    expect(screen.queryByText('还没有教材')).not.toBeInTheDocument();
  });

  it('opens add dialog when clicking add button', async () => {
    userEvent.setup();
    render(<TextbookLibrary />);

    // Click the add button in the header
    const addButton = screen.getByTestId('add-textbook-button');
    fireEvent.click(addButton);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('添加教材')).toBeInTheDocument();
    expect(screen.getByLabelText('教材名称 *')).toBeInTheDocument();
  });

  it('adds a new textbook', async () => {
    const user = userEvent.setup();
    render(<TextbookLibrary />);

    // Open dialog
    const addButton = screen.getByTestId('add-textbook-button');
    fireEvent.click(addButton);

    // Wait for dialog
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    // Fill form
    await user.type(screen.getByLabelText('教材名称 *'), 'New Book');
    await user.type(screen.getByLabelText('作者'), 'New Author');

    // Submit
    const submitButton = screen.getByRole('button', { name: '添加教材' });
    await user.click(submitButton);

    expect(mockAddTextbook).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New Book',
        author: 'New Author',
        id: expect.any(String),
      })
    );
  });

  it('handles delete action', async () => {
    const mockTextbooks = {
      '1': {
        id: '1',
        name: 'Test Book',
        author: 'Test Author',
        source: 'user_upload',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    (useSpeedPassStore as unknown as jest.Mock).mockReturnValue({
      textbooks: mockTextbooks,
      textbookChapters: { '1': [] },
      textbookKnowledgePoints: { '1': [] },
      textbookQuestions: { '1': [] },
      addTextbook: mockAddTextbook,
      removeTextbook: mockRemoveTextbook,
      parseProgress: null,
    });

    const user = userEvent.setup();
    render(<TextbookLibrary />);

    // Open dropdown menu
    // Use fireEvent to ensure click is registered even if structure is complex
    const menuButton = screen.getByTestId('textbook-menu-trigger');
    fireEvent.click(menuButton);

    // Wait for dropdown to appear
    await waitFor(() => {
      expect(screen.getByText('删除教材')).toBeInTheDocument();
    });

    // Click delete
    // Dropdown items usually work with user.click since they are standard divs/items
    await user.click(screen.getByText('删除教材'));

    expect(mockRemoveTextbook).toHaveBeenCalledWith('1');
  });
});
