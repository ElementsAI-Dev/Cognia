import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextbookLibrary, TextbookCardSkeleton } from './textbook-library';
import { useSpeedPassStore } from '@/stores/learning/speedpass-store';
import { useTextbookProcessor } from '@/hooks/learning';

// Mock the stores and hooks
jest.mock('@/stores/learning/speedpass-store', () => ({
  useSpeedPassStore: jest.fn(),
}));

jest.mock('@/hooks/learning', () => ({
  useTextbookProcessor: jest.fn(),
}));

// Mock UI components to avoid Radix Portal issues
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-container">{children}</div>
  ),
  DialogTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <>{asChild ? children : <button>{children}</button>}</>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div role="dialog" data-testid="dialog-content">
      {children}
    </div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div data-testid="alert-dialog">{children}</div> : null,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button onClick={onClick} data-testid="alert-dialog-action">
      {children}
    </button>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button onClick={onClick} data-testid="dropdown-item">
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
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
      'dialog.description': '添加教材描述',
      'dialog.nameLabel': '教材名称 *',
      'dialog.namePlaceholder': '请输入教材名称',
      'dialog.authorLabel': '作者',
      'dialog.authorPlaceholder': '请输入作者',
      'dialog.editionLabel': '版本',
      'dialog.editionPlaceholder': '第几版',
      'dialog.isbnLabel': 'ISBN',
      'dialog.isbnPlaceholder': '请输入ISBN',
      'dialog.cancel': '取消',
      'dialog.submit': '添加教材',
      'dialog.uploading': '添加中...',
      nameLabel: '教材名称 *',
      namePlaceholder: '请输入教材名称',
      authorLabel: '作者',
      authorPlaceholder: '请输入作者',
      editionLabel: '版本',
      editionPlaceholder: '第几版',
      isbnLabel: 'ISBN',
      isbnPlaceholder: '请输入ISBN',
      cancel: '取消',
      submit: '添加教材',
      uploading: '添加中...',
      description: '添加教材描述',
      edit: '编辑信息',
      delete: '删除教材',
      chapters: '章节',
      knowledgePoints: '知识点',
      questions: '题目',
      startLearning: '开始学习',
      practice: '练习',
      unknownAuthor: '未知作者',
      moreActions: '更多操作',
      'deleteConfirm.title': '确认删除',
      'deleteConfirm.description': '确定要删除这本教材吗？',
      'deleteConfirm.cancel': '取消',
      'deleteConfirm.confirm': '确认删除',
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

    // Check page renders with title
    expect(screen.getAllByText('我的教材').length).toBeGreaterThan(0);
    // Empty state has icon and buttons
    expect(screen.getByTestId('icon-book-open')).toBeInTheDocument();
    // Multiple add buttons exist (header + empty state)
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
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
    render(<TextbookLibrary />);

    // Click the add button in the header
    const addButton = screen.getByTestId('add-textbook-button');
    fireEvent.click(addButton);

    // Dialog should be visible with form fields
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('教材名称 *')).toBeInTheDocument();
    expect(screen.getByLabelText('作者')).toBeInTheDocument();
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

    // Submit - find the submit button within the dialog
    const submitButtons = screen.getAllByRole('button', { name: '添加教材' });
    const submitButton = submitButtons[submitButtons.length - 1]; // Last one is in dialog footer
    await user.click(submitButton);

    expect(mockAddTextbook).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New Book',
        author: 'New Author',
        id: expect.any(String),
      })
    );
  });

  it('renders TextbookCardSkeleton loading state', () => {
    render(<TextbookCardSkeleton />);

    // Skeleton should render multiple skeleton elements
    const skeletons = document.querySelectorAll('[class*="animate-pulse"], [data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
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
    const menuButton = screen.getByTestId('textbook-menu-trigger');
    await user.click(menuButton);

    // Wait for dropdown to appear and click delete
    const deleteMenuItem = await screen.findByText('删除教材');
    await user.click(deleteMenuItem);

    // Wait for confirmation dialog to appear
    const confirmButton = await screen.findByRole('button', { name: /confirm|确认删除/i });
    await user.click(confirmButton);

    expect(mockRemoveTextbook).toHaveBeenCalledWith('1');
  });
});
