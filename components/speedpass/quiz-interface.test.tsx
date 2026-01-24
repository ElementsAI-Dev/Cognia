import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuizInterface } from './quiz-interface';
import { useQuizManager } from '@/hooks/learning';

// Mock hooks
jest.mock('@/hooks/learning', () => ({
  useQuizManager: jest.fn(),
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

  it.skip('handles option selection', async () => {
    render(<QuizInterface textbookId="tb1" />);
    const optionB = screen.getByLabelText(/B\./);
    fireEvent.click(optionB);

    // Check if state updated (controlled component pattern test or just interaction)
    // Here we can't easily check state, but we can check if handleNext submits it.
    // However, clicking option doesn't submit immediately in this UI, it just selects.
  });

  it.skip('navigates to next question', async () => {
    const user = userEvent.setup();
    render(<QuizInterface textbookId="tb1" />);

    // Select answer first
    const optionB = screen.getByLabelText(/2/); // "B. 2"
    await user.click(optionB);

    const nextButton = screen.getByRole('button', { name: /下一题/i });
    await user.click(nextButton);

    expect(mockSubmitAnswer).toHaveBeenCalledWith(0, 'B');
    // And should show next question
    expect(await screen.findByText('Q2')).toBeInTheDocument();
  });

  it.skip('submits quiz on finish', async () => {
    const user = userEvent.setup();
    // Start at last question (index 1)
    // We can't set state directly, so we nav to it or mock quiz with 1 question.
    const oneQuestionQuiz = { ...mockQuiz, questions: [mockQuestion] };
    (useQuizManager as unknown as jest.Mock).mockReturnValue({
      currentQuiz: oneQuestionQuiz,
      createQuiz: mockCreateQuiz,
      submitAnswer: mockSubmitAnswer,
      finishQuiz: mockFinishQuiz,
    });

    render(<QuizInterface textbookId="tb1" />);

    await user.click(screen.getByLabelText(/2/));

    const submitButton = screen.getByRole('button', { name: /交卷/i });
    await user.click(submitButton);

    expect(mockSubmitAnswer).toHaveBeenCalledWith(0, 'B');
    expect(mockFinishQuiz).toHaveBeenCalled();
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
