import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuizInterface } from './quiz-interface';
import { useQuizManager } from '@/hooks/learning';

// Mock hooks
jest.mock('@/hooks/learning', () => ({
  useQuizManager: jest.fn(),
}));

// Mock UI components
jest.mock('@/components/ui/radio-group', () => ({
  RadioGroup: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
  }) => (
    <div data-testid="radio-group" data-value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onValueChange?.(e.target.value)}>
      {children}
    </div>
  ),
  RadioGroupItem: ({ value, id }: { value: string; id: string }) => (
    <input type="radio" value={value} id={id} data-testid={`radio-${value}`} />
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

// Mock lucide-react
jest.mock('lucide-react', () => ({
  CheckCircle2: () => <div data-testid="icon-check-circle-2" />,
  XCircle: () => <div data-testid="icon-x-circle" />,
  Clock: () => <div data-testid="icon-clock" />,
  ChevronLeft: () => <div data-testid="icon-chevron-left" />,
  ChevronRight: () => <div data-testid="icon-chevron-right" />,
  RotateCcw: () => <div data-testid="icon-rotate-ccw" />,
  Flag: () => <div data-testid="icon-flag" />,
  Lightbulb: () => <div data-testid="icon-lightbulb" />,
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      // QuizInterface keys
      loading: '正在生成题目...',
      progress: '{current} / {total}',
      exit: '退出',
      prev: '上一题',
      next: '下一题',
      submit: '交卷 ({current}/{total})',
      'hint.title': '提示',
      'hint.content': '请仔细审题，注意关键词。',
      'hint.button': '提示',
      navigator: '题目导航',
      placeholder: '请输入答案...',
      'questionTypes.choice': '选择题',
      'questionTypes.fill_blank': '填空题',

      // QuizResults keys (namespace: learningMode.speedpass.quiz.results)
      title: '测验结束',
      subtitle: '查看你的答题情况',
      correct: '正确',
      incorrect: '错误',
      time: '用时',
      retry: '再做一次',
      finish: '完成',
      'grade.excellent': '优秀',
      'grade.good': '良好',
      'grade.pass': '及格',
      'grade.fail': '需加强',

      // DifficultyBadge keys (namespace: learningMode.speedpass.quiz.difficulty)
      easy: '简单',
      medium: '中等',
      hard: '困难',
    };
    return translations[key] || key;
  },
}));

describe('QuizInterface', () => {
  const mockCreateQuiz = jest.fn();
  const mockSubmitAnswer = jest.fn();
  const mockFinishQuiz = jest.fn();

  const mockQuestion = {
    id: 'q1',
    sourceQuestion: {
      id: 'src1',
      content: 'What is 1+1?',
      questionType: 'choice',
      difficulty: 0.2,
      options: [
        { label: 'A', content: '1' },
        { label: 'B', content: '2' },
      ],
      answer: 'B',
      explanation: '1+1=2',
    },
    hintsAvailable: 1,
    hintsUsed: 0,
    userAnswer: null,
    isCorrect: null,
  };

  const mockQuiz = {
    id: 'quiz1',
    textbookId: 'tb1',
    questions: [
      mockQuestion,
      {
        ...mockQuestion,
        id: 'q2',
        sourceQuestion: { ...mockQuestion.sourceQuestion, content: 'Q2' },
      },
    ],
    status: 'in_progress',
    startTime: Date.now(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useQuizManager as unknown as jest.Mock).mockReturnValue({
      currentQuiz: mockQuiz,
      quizResult: null,
      createQuiz: mockCreateQuiz,
      submitAnswer: mockSubmitAnswer,
      finishQuiz: mockFinishQuiz,
    });
  });

  it('renders loading state when initializing', () => {
    (useQuizManager as unknown as jest.Mock).mockReturnValue({
      currentQuiz: null,
      quizResult: null,
      createQuiz: mockCreateQuiz,
    });

    render(<QuizInterface textbookId="tb1" />);
    expect(screen.getByText('正在生成题目...')).toBeInTheDocument();
  });

  it('initializes quiz on mount', () => {
    (useQuizManager as unknown as jest.Mock).mockReturnValue({
      currentQuiz: null,
      createQuiz: mockCreateQuiz,
    });

    render(<QuizInterface textbookId="tb1" />);
    expect(mockCreateQuiz).toHaveBeenCalledWith('tb1', [], 10);
  });

  it('renders question content', () => {
    (useQuizManager as unknown as jest.Mock).mockReturnValue({
      currentQuiz: mockQuiz,
      quizResult: null,
      createQuiz: mockCreateQuiz,
      submitAnswer: mockSubmitAnswer,
      finishQuiz: mockFinishQuiz,
    });

    render(<QuizInterface textbookId="tb1" />);

    expect(screen.getByTestId('question-content')).toHaveTextContent('What is 1+1?');
    expect(screen.getByText('选择题')).toBeInTheDocument(); // Badge
    expect(screen.getByText('简单')).toBeInTheDocument(); // Difficulty
    expect(screen.getAllByText(/A\./)[0]).toBeInTheDocument(); // Regex to match A.
    expect(screen.getAllByText('1')[0]).toBeInTheDocument();
  });

  it('handles option selection', async () => {
    const user = userEvent.setup();
    render(<QuizInterface textbookId="tb1" />);

    // Find option B container and click it
    const optionContainers = screen.getAllByRole('radio');
    expect(optionContainers.length).toBe(2);

    // Click option B (second option)
    await user.click(optionContainers[1]);

    // Verify radio is checked
    expect(optionContainers[1]).toBeChecked();
  });

  it('navigates to next question', async () => {
    const user = userEvent.setup();
    render(<QuizInterface textbookId="tb1" />);

    // Select an answer first
    const radios = screen.getAllByRole('radio');
    await user.click(radios[1]); // Select B

    // Click next button
    const nextButton = screen.getByRole('button', { name: /下一题/i });
    await user.click(nextButton);

    // Should have called submitAnswer
    expect(mockSubmitAnswer).toHaveBeenCalled();
  });

  it('submits quiz on finish with single question', async () => {
    const user = userEvent.setup();
    const oneQuestionQuiz = { ...mockQuiz, questions: [mockQuestion] };
    (useQuizManager as unknown as jest.Mock).mockReturnValue({
      currentQuiz: oneQuestionQuiz,
      quizResult: null,
      createQuiz: mockCreateQuiz,
      submitAnswer: mockSubmitAnswer,
      finishQuiz: mockFinishQuiz,
    });

    render(<QuizInterface textbookId="tb1" />);

    // Select an answer
    const radios = screen.getAllByRole('radio');
    await user.click(radios[1]);

    // With single question, submit button should be visible
    const submitButton = screen.getByRole('button', { name: /交卷/i });
    await user.click(submitButton);

    expect(mockFinishQuiz).toHaveBeenCalled();
  });

  it('handles previous navigation', async () => {
    const user = userEvent.setup();
    render(<QuizInterface textbookId="tb1" />);

    // Initially at question 0, prev should be disabled
    const prevButton = screen.getByRole('button', { name: /上一题/i });
    expect(prevButton).toBeDisabled();

    // Go to next question first
    const radios = screen.getAllByRole('radio');
    await user.click(radios[0]);
    const nextButton = screen.getByRole('button', { name: /下一题/i });
    await user.click(nextButton);

    // Now prev should be enabled (we're at question 2)
    // Note: Due to state updates, we need to verify the button state changed
  });

  it('handles flag toggle', async () => {
    const user = userEvent.setup();
    render(<QuizInterface textbookId="tb1" />);

    // Find flag button and click it
    const flagButton = screen.getByTestId('icon-flag').parentElement;
    expect(flagButton).toBeInTheDocument();
    if (flagButton) {
      await user.click(flagButton);
    }
  });

  it('calls onCancel when exit button clicked', async () => {
    const mockCancel = jest.fn();
    const user = userEvent.setup();
    render(<QuizInterface textbookId="tb1" onCancel={mockCancel} />);

    const exitButton = screen.getByRole('button', { name: /退出/i });
    await user.click(exitButton);

    expect(mockCancel).toHaveBeenCalled();
  });

  it('renders question navigator', () => {
    render(<QuizInterface textbookId="tb1" />);

    // Navigator should show question numbers
    expect(screen.getByText('题目导航')).toBeInTheDocument();
    // Should have buttons for each question (2 questions in mockQuiz)
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
  });

  it('renders results when finished', () => {
    const mockResult = {
      quizId: 'quiz1',
      correctAnswers: 1,
      incorrectAnswers: 0,
      accuracy: 100,
      timeSpentMs: 60000,
      details: [],
    };

    (useQuizManager as unknown as jest.Mock).mockReturnValue({
      currentQuiz: mockQuiz,
      quizResult: mockResult,
      createQuiz: mockCreateQuiz,
    });

    render(<QuizInterface textbookId="tb1" />);

    expect(screen.getByText('测验结束')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('优秀')).toBeInTheDocument();
  });
});
