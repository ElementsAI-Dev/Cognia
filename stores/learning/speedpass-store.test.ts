/**
 * Unit tests for SpeedPass Store
 */

import { act } from '@testing-library/react';
import { extractSpeedPassPersistedState, useSpeedPassStore } from './speedpass-store';
import {
  DEFAULT_SPEEDPASS_COURSE_ID,
  TextbookChapter,
  TextbookKnowledgePoint,
  TextbookQuestion,
  UserTextbook,
  StartSpeedLearningInput,
  SpeedStudySession,
  Textbook,
  Quiz,
  TeacherKeyPointInput,
  TeacherKeyPointResult,
} from '@/types/learning/speedpass';
import { isTauri } from '@/lib/utils';
import { speedpassRuntime } from '@/lib/native/speedpass-runtime';

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-id'),
}));

jest.mock('@/lib/utils', () => ({
  isTauri: jest.fn(() => false),
}));

jest.mock('@/lib/native/speedpass-runtime', () => ({
  speedpassRuntime: {
    matchTeacherKeyPoints: jest.fn(),
  },
}));

const mockIsTauri = isTauri as jest.MockedFunction<typeof isTauri>;
const mockMatchTeacherKeyPoints = speedpassRuntime.matchTeacherKeyPoints as jest.Mock;

// Mock localStorage for Zustand persist
const localStorageMock = (function () {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('SpeedPass Store', () => {
  beforeEach(() => {
    act(() => {
      useSpeedPassStore.getState().reset();
    });
    localStorageMock.clear();
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(false);
    mockMatchTeacherKeyPoints.mockReset();
  });

  describe('Academic Profile Actions', () => {
    const mockProfile = {
      universityId: 'uni-1',
      majorId: 'major-1',
      grade: 1,
      currentSemester: 1,
      enrolledCourses: ['course-1'],
    };

    it('should set academic profile', () => {
      act(() => {
        useSpeedPassStore.getState().setAcademicProfile(mockProfile);
      });

      expect(useSpeedPassStore.getState().academicProfile).toEqual(mockProfile);
    });

    it('should update academic profile', () => {
      // First set a profile
      act(() => {
        useSpeedPassStore.getState().setAcademicProfile(mockProfile);
      });

      // Then update it
      act(() => {
        useSpeedPassStore.getState().updateAcademicProfile({ grade: 2 });
      });

      expect(useSpeedPassStore.getState().academicProfile).toEqual({
        ...mockProfile,
        grade: 2,
      });
    });

    it('should not update profile if not set', () => {
      act(() => {
        useSpeedPassStore.getState().updateAcademicProfile({ grade: 2 });
      });
      expect(useSpeedPassStore.getState().academicProfile).toBeNull();
    });

    it('should add enrolled course', () => {
      act(() => {
        useSpeedPassStore.getState().setAcademicProfile(mockProfile);
      });

      act(() => {
        useSpeedPassStore.getState().addEnrolledCourse('course-2');
      });

      expect(useSpeedPassStore.getState().academicProfile?.enrolledCourses).toContain('course-2');
      expect(useSpeedPassStore.getState().academicProfile?.enrolledCourses).toHaveLength(2);
    });

    it('should not add duplicate enrolled course', () => {
      act(() => {
        useSpeedPassStore.getState().setAcademicProfile(mockProfile);
      });

      act(() => {
        useSpeedPassStore.getState().addEnrolledCourse('course-1');
      });

      expect(useSpeedPassStore.getState().academicProfile?.enrolledCourses).toHaveLength(1);
    });

    it('should remove enrolled course', () => {
      act(() => {
        useSpeedPassStore.getState().setAcademicProfile(mockProfile);
      });

      act(() => {
        useSpeedPassStore.getState().removeEnrolledCourse('course-1');
      });

      expect(useSpeedPassStore.getState().academicProfile?.enrolledCourses).toHaveLength(0);
    });
  });

  describe('Universities, Majors, Courses Actions', () => {
    it('should set universities', () => {
      const universities = [{ id: 'u1', name: 'Uni 1' }];
      act(() => {
        useSpeedPassStore.getState().setUniversities(universities);
      });
      expect(useSpeedPassStore.getState().universities).toEqual(universities);
    });

    it('should set majors', () => {
      const majors = [{ id: 'm1', code: '001', name: 'Major 1' }];
      act(() => {
        useSpeedPassStore.getState().setMajors(majors);
      });
      expect(useSpeedPassStore.getState().majors).toEqual(majors);
    });

    it('should set courses', () => {
      const courses = [{ id: 'c1', name: 'Course 1' }];
      act(() => {
        useSpeedPassStore.getState().setCourses(courses);
      });
      expect(useSpeedPassStore.getState().courses).toEqual(courses);
    });

    it('should add course', () => {
      const course = { id: 'c2', name: 'Course 2' };
      act(() => {
        useSpeedPassStore.getState().addCourse(course);
      });
      expect(useSpeedPassStore.getState().courses).toContainEqual(course);
    });
  });

  describe('Textbook Actions', () => {
    const mockTextbook = {
      id: 'tb-1',
      name: 'Textbook 1',
      author: 'Author 1',
      publisher: 'Publisher 1',
      source: 'official' as const,
      isPublic: true,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      parseStatus: 'completed' as const,
    };

    it('should add textbook', () => {
      act(() => {
        useSpeedPassStore.getState().addTextbook(mockTextbook);
      });
      expect(useSpeedPassStore.getState().textbooks['tb-1']).toEqual(mockTextbook);
    });

    it('should update textbook', () => {
      act(() => {
        useSpeedPassStore.getState().addTextbook(mockTextbook);
        useSpeedPassStore.getState().updateTextbook('tb-1', { name: 'Updated Name' });
      });
      expect(useSpeedPassStore.getState().textbooks['tb-1'].name).toBe('Updated Name');
    });

    it('should remove textbook', () => {
      act(() => {
        useSpeedPassStore.getState().addTextbook(mockTextbook);
        useSpeedPassStore.getState().removeTextbook('tb-1');
      });
      expect(useSpeedPassStore.getState().textbooks['tb-1']).toBeUndefined();
    });

    it('should set current textbook', () => {
      act(() => {
        useSpeedPassStore.getState().setCurrentTextbook('tb-1');
      });
      expect(useSpeedPassStore.getState().currentTextbookId).toBe('tb-1');
    });

    it('should set textbook content', () => {
      const chapters = [{ id: 'ch-1', title: 'Chapter 1' }] as unknown as TextbookChapter[];
      const points = [{ id: 'kp-1', title: 'Point 1' }] as unknown as TextbookKnowledgePoint[];
      const questions = [{ id: 'q-1', content: 'Question 1' }] as unknown as TextbookQuestion[];

      act(() => {
        useSpeedPassStore.getState().setTextbookChapters('tb-1', chapters);
        useSpeedPassStore.getState().setTextbookKnowledgePoints('tb-1', points);
        useSpeedPassStore.getState().setTextbookQuestions('tb-1', questions);
      });

      expect(useSpeedPassStore.getState().textbookChapters['tb-1']).toEqual(chapters);
      expect(useSpeedPassStore.getState().textbookKnowledgePoints['tb-1']).toEqual(points);
      expect(useSpeedPassStore.getState().textbookQuestions['tb-1']).toEqual(questions);
    });

    it('should add user textbook', () => {
      const userTextbookInput = {
        userId: 'user-1',
        textbookId: 'tb-1',
        source: 'matched' as const,
      };

      let added: UserTextbook = {} as UserTextbook;
      act(() => {
        added = useSpeedPassStore.getState().addUserTextbook(userTextbookInput);
      });

      expect(added.id).toBeDefined();
      expect(useSpeedPassStore.getState().userTextbooks).toHaveLength(1);
      expect(useSpeedPassStore.getState().userTextbooks[0].textbookId).toBe('tb-1');
    });

    it('should remove user textbook', () => {
      let added: UserTextbook = {} as UserTextbook;
      act(() => {
        added = useSpeedPassStore.getState().addUserTextbook({
          userId: 'user-1',
          textbookId: 'tb-1',
          source: 'matched' as const,
        });
        useSpeedPassStore.getState().removeUserTextbook(added.id);
      });
      expect(useSpeedPassStore.getState().userTextbooks).toHaveLength(0);
    });

    it('should update user textbook progress', () => {
      let added: UserTextbook = {} as UserTextbook;
      act(() => {
        added = useSpeedPassStore.getState().addUserTextbook({
          userId: 'user-1',
          textbookId: 'tb-1',
          source: 'matched' as const,
        });
        useSpeedPassStore.getState().updateUserTextbookProgress(added.id, 50);
      });

      expect(useSpeedPassStore.getState().userTextbooks[0].studyProgress).toBe(50);
    });

    it('should add course textbook mapping', () => {
      const mapping = {
        universityId: 'u1',
        courseId: 'c1',
        courseName: 'Course 1',
        textbookId: 'tb-1',
        isPrimary: true,
        usageCount: 10,
        confirmedByUsers: 5,
      };
      act(() => {
        useSpeedPassStore.getState().addCourseTextbookMapping(mapping);
      });
      expect(useSpeedPassStore.getState().courseTextbookMappings).toHaveLength(1);
      expect(useSpeedPassStore.getState().courseTextbookMappings[0].courseId).toBe('c1');
    });

    it('should get recommended textbooks', () => {
      const tb1 = { ...mockTextbook, id: 'tb-1', name: 'TB 1' };
      const tb2 = { ...mockTextbook, id: 'tb-2', name: 'TB 2' };

      act(() => {
        useSpeedPassStore.getState().addTextbook(tb1);
        useSpeedPassStore.getState().addTextbook(tb2);

        useSpeedPassStore.getState().addCourseTextbookMapping({
          universityId: 'u1',
          courseId: 'c1',
          courseName: 'Course 1',
          textbookId: 'tb-1',
          isPrimary: true,
          usageCount: 10,
          confirmedByUsers: 5,
        });

        useSpeedPassStore.getState().addCourseTextbookMapping({
          universityId: 'u1',
          courseId: 'c1',
          courseName: 'Course 1',
          textbookId: 'tb-2',
          isPrimary: false,
          usageCount: 5,
          confirmedByUsers: 2,
        });
      });

      const recommended = useSpeedPassStore.getState().getRecommendedTextbooks('c1', 'u1');
      expect(recommended).toHaveLength(2);
      expect(recommended[0].id).toBe('tb-1'); // Is Primary comes first
      expect(recommended[1].id).toBe('tb-2');
    });

    it('should set parse progress', () => {
      const progress = {
        textbookId: 'tb-1',
        status: 'parsing' as const,
        progress: 50,
      };
      act(() => {
        useSpeedPassStore.getState().setParseProgress(progress);
      });
      expect(useSpeedPassStore.getState().parseProgress).toEqual(progress);
    });
  });

  describe('Teacher Key Points & Local User Defaults', () => {
    const textbookId = 'tb-tkp';

    beforeEach(() => {
      act(() => {
        useSpeedPassStore.getState().addTextbook({
          id: textbookId,
          name: '高等数学',
          author: '同济',
          publisher: '高教社',
          source: 'official',
          isPublic: true,
          usageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          parseStatus: 'completed',
        } as Textbook);

        useSpeedPassStore.getState().setTextbookChapters(textbookId, [
          {
            id: 'ch-1',
            textbookId,
            chapterNumber: '1',
            title: '极限与连续',
            level: 1,
            orderIndex: 1,
            pageStart: 1,
            pageEnd: 20,
            knowledgePointCount: 1,
            exampleCount: 1,
            exerciseCount: 1,
          },
        ] as TextbookChapter[]);

        useSpeedPassStore.getState().setTextbookKnowledgePoints(textbookId, [
          {
            id: 'kp-1',
            textbookId,
            chapterId: 'ch-1',
            title: '函数极限',
            content: '掌握函数极限的定义和计算',
            type: 'definition',
            importance: 'critical',
            difficulty: 0.4,
            pageNumber: 5,
            extractionConfidence: 0.9,
            verified: true,
          },
        ] as TextbookKnowledgePoint[]);

        useSpeedPassStore.getState().setTextbookQuestions(textbookId, [
          {
            id: 'q-1',
            textbookId,
            chapterId: 'ch-1',
            sourceType: 'example',
            questionNumber: '例1',
            pageNumber: 6,
            content: '求极限',
            questionType: 'calculation',
            hasSolution: true,
            difficulty: 0.4,
            knowledgePointIds: ['kp-1'],
            learningValue: 'essential',
            extractionConfidence: 0.9,
            verified: true,
          },
        ] as TextbookQuestion[]);

        useSpeedPassStore.getState().setCurrentTextbook(textbookId);
      });
    });

    it('should call runtime matcher in tauri and pass local-user by default', async () => {
      mockIsTauri.mockReturnValue(true);
      const runtimeResult: TeacherKeyPointResult = {
        status: 'success',
        matchedPoints: [],
        unmatchedNotes: [],
        textbookCoverage: {
          chaptersInvolved: [1],
          totalExamples: 1,
          totalExercises: 0,
        },
        studyPlanSuggestion: {
          totalKnowledgePoints: 1,
          totalExamples: 1,
          totalExercises: 0,
          estimatedTime: '1小时',
        },
      };
      mockMatchTeacherKeyPoints.mockResolvedValue(runtimeResult);

      const input: TeacherKeyPointInput = {
        inputType: 'text',
        courseId: 'course-1',
        textbookId,
        textContent: '重点看函数极限',
      };

      await act(async () => {
        await useSpeedPassStore.getState().processTeacherKeyPoints(input);
      });

      expect(mockMatchTeacherKeyPoints).toHaveBeenCalledWith(
        expect.objectContaining({
          textbookId,
          teacherNotes: ['重点看函数极限'],
        }),
        'local-user'
      );
    });

    it('should fallback to local rule engine when runtime matcher fails', async () => {
      mockIsTauri.mockReturnValue(true);
      mockMatchTeacherKeyPoints.mockRejectedValue(new Error('runtime failed'));

      const input: TeacherKeyPointInput = {
        inputType: 'text',
        courseId: 'course-1',
        textbookId,
        textContent: '函数极限',
      };

      const result = await useSpeedPassStore.getState().processTeacherKeyPoints(input);

      expect(result.matchedPoints.length).toBeGreaterThan(0);
      expect(['success', 'partial']).toContain(result.status);
    });

    it('should use local-user for generated session/quiz/wrong-question/report records', async () => {
      let tutorial: { id: string } = { id: '' };
      await act(async () => {
        tutorial = await useSpeedPassStore.getState().createTutorial({
          courseId: 'course-1',
          textbookId,
          mode: 'speed',
        });
      });

      let session: SpeedStudySession | undefined;
      let quiz: Quiz | undefined;
      act(() => {
        session = useSpeedPassStore.getState().startStudySession(tutorial.id);
        quiz = useSpeedPassStore.getState().createQuiz({
          textbookId,
          questionCount: 1,
        });
        useSpeedPassStore.getState().addWrongQuestion('q-1', textbookId, 'wrong');
      });

      const report = useSpeedPassStore.getState().generateStudyReport(session?.id, tutorial.id);
      const wrongRecord = Object.values(useSpeedPassStore.getState().wrongQuestions)[0];

      expect(session?.userId).toBe('local-user');
      expect(quiz?.userId).toBe('local-user');
      expect(wrongRecord.userId).toBe('local-user');
      expect(report.userId).toBe('local-user');
    });
  });

  describe('Tutorial and Study Session Actions', () => {
    const mockTextbookId = 'tb-1';

    beforeEach(() => {
      act(() => {
        // Setup prerequisite data
        useSpeedPassStore.getState().addTextbook({
          id: mockTextbookId,
          name: 'Test Textbook',
          source: 'official',
          isPublic: true,
          usageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          parseStatus: 'completed',
        } as Textbook);
      });
    });

    it('should create tutorial', async () => {
      const input: StartSpeedLearningInput = {
        courseId: 'c1',
        textbookId: mockTextbookId,
        mode: 'speed',
      };

      await act(async () => {
        await useSpeedPassStore.getState().createTutorial(input);
      });

      const store = useSpeedPassStore.getState();
      expect(store.currentTutorialId).toBeDefined();
      const tutorial = store.tutorials[store.currentTutorialId!];
      expect(tutorial).toBeDefined();
      expect(tutorial.mode).toBe('speed');
      expect(tutorial.textbookId).toBe(mockTextbookId);
    });

    it('should get tutorial', async () => {
      const input: StartSpeedLearningInput = {
        courseId: 'c1',
        textbookId: mockTextbookId,
        mode: 'speed',
      };

      await act(async () => {
        await useSpeedPassStore.getState().createTutorial(input);
      });

      const tutorialId = useSpeedPassStore.getState().currentTutorialId!;
      const tutorial = useSpeedPassStore.getState().getTutorial(tutorialId);
      expect(tutorial).toBeDefined();
      expect(tutorial?.id).toBe(tutorialId);
    });

    it('should set current tutorial', async () => {
      const input: StartSpeedLearningInput = {
        courseId: 'c1',
        textbookId: mockTextbookId,
        mode: 'speed',
      };

      await act(async () => {
        await useSpeedPassStore.getState().createTutorial(input);
      });

      const tutorialId = useSpeedPassStore.getState().currentTutorialId!;

      act(() => {
        useSpeedPassStore.getState().setCurrentTutorial(null);
      });
      expect(useSpeedPassStore.getState().currentTutorialId).toBeNull();

      act(() => {
        useSpeedPassStore.getState().setCurrentTutorial(tutorialId);
      });
      expect(useSpeedPassStore.getState().currentTutorialId).toBe(tutorialId);
    });

    it('should delete tutorial', async () => {
      const input: StartSpeedLearningInput = {
        courseId: 'c1',
        textbookId: mockTextbookId,
        mode: 'speed',
      };

      await act(async () => {
        await useSpeedPassStore.getState().createTutorial(input);
      });

      const tutorialId = useSpeedPassStore.getState().currentTutorialId!;

      act(() => {
        useSpeedPassStore.getState().deleteTutorial(tutorialId);
      });

      expect(useSpeedPassStore.getState().tutorials[tutorialId]).toBeUndefined();
      expect(useSpeedPassStore.getState().currentTutorialId).toBeNull();
    });

    it('should start study session', async () => {
      // Create tutorial first
      const input: StartSpeedLearningInput = {
        courseId: 'c1',
        textbookId: mockTextbookId,
        mode: 'speed',
      };
      await act(async () => {
        await useSpeedPassStore.getState().createTutorial(input);
      });
      const tutorialId = useSpeedPassStore.getState().currentTutorialId!;

      let session: SpeedStudySession = {} as SpeedStudySession;
      act(() => {
        session = useSpeedPassStore.getState().startStudySession(tutorialId);
      });

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.status).toBe('active');
      expect(useSpeedPassStore.getState().currentSessionId).toBe(session.id);
    });

    it('should pause and resume study session', async () => {
      const input: StartSpeedLearningInput = {
        courseId: 'c1',
        textbookId: mockTextbookId,
        mode: 'speed',
      };
      await act(async () => {
        await useSpeedPassStore.getState().createTutorial(input);
      });
      const tutorialId = useSpeedPassStore.getState().currentTutorialId!;

      let session: SpeedStudySession = {} as SpeedStudySession;
      act(() => {
        session = useSpeedPassStore.getState().startStudySession(tutorialId);
      });

      act(() => {
        useSpeedPassStore.getState().pauseStudySession(session.id);
      });
      expect(useSpeedPassStore.getState().studySessions[session.id].status).toBe('paused');

      act(() => {
        useSpeedPassStore.getState().resumeStudySession(session.id);
      });
      expect(useSpeedPassStore.getState().studySessions[session.id].status).toBe('active');
    });

    it('should end study session', async () => {
      const input: StartSpeedLearningInput = {
        courseId: 'c1',
        textbookId: mockTextbookId,
        mode: 'speed',
      };
      await act(async () => {
        await useSpeedPassStore.getState().createTutorial(input);
      });
      const tutorialId = useSpeedPassStore.getState().currentTutorialId!;

      let session: SpeedStudySession = {} as SpeedStudySession;
      act(() => {
        session = useSpeedPassStore.getState().startStudySession(tutorialId);
      });

      act(() => {
        useSpeedPassStore.getState().endStudySession(session.id);
      });

      const updatedSession = useSpeedPassStore.getState().studySessions[session.id];
      expect(updatedSession.status).toBe('completed');
      expect(updatedSession.endedAt).toBeDefined();
    });

    it('should get active session', async () => {
      const input: StartSpeedLearningInput = {
        courseId: 'c1',
        textbookId: mockTextbookId,
        mode: 'speed',
      };
      await act(async () => {
        await useSpeedPassStore.getState().createTutorial(input);
      });
      const tutorialId = useSpeedPassStore.getState().currentTutorialId!;

      act(() => {
        useSpeedPassStore.getState().startStudySession(tutorialId);
      });

      const activeSession = useSpeedPassStore.getState().getActiveSession();
      expect(activeSession).toBeDefined();
      expect(activeSession?.status).toBe('active');
    });
  });

  describe('Quiz Actions', () => {
    const mockTextbookId = 'tb-1';
    beforeEach(() => {
      // Setup textbook with questions
      act(() => {
        useSpeedPassStore.getState().addTextbook({
          id: mockTextbookId,
          name: 'Test Textbook',
          source: 'official',
          isPublic: true,
          usageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          parseStatus: 'completed',
        } as Textbook);

        useSpeedPassStore.getState().setTextbookQuestions(mockTextbookId, [
          {
            id: 'q1',
            textbookId: mockTextbookId,
            sourceType: 'example',
            questionType: 'choice',
            content: 'Question 1',
            solution: { answer: 'A', steps: [] },
            difficulty: 0.2,
            knowledgePointIds: ['kp1'],
          } as unknown as TextbookQuestion,
          {
            id: 'q2',
            textbookId: mockTextbookId,
            sourceType: 'exercise',
            questionType: 'choice',
            content: 'Question 2',
            solution: { answer: 'B', steps: [] },
            difficulty: 0.5,
            knowledgePointIds: ['kp1'],
          } as unknown as TextbookQuestion,
        ]);
      });
    });

    it('should create quiz', () => {
      let quiz: Quiz = {} as Quiz;
      act(() => {
        quiz = useSpeedPassStore.getState().createQuiz({
          textbookId: mockTextbookId,
          questionCount: 2,
        });
      });

      expect(quiz).toBeDefined();
      expect(quiz.questions).toHaveLength(2);
      expect(useSpeedPassStore.getState().quizzes[quiz.id]).toBeDefined();
      expect(useSpeedPassStore.getState().currentQuizId).toBe(quiz.id);
    });

    it('should start quiz', () => {
      let quiz: Quiz = {} as Quiz;
      act(() => {
        quiz = useSpeedPassStore.getState().createQuiz({
          textbookId: mockTextbookId,
          questionCount: 1,
        });
        useSpeedPassStore.getState().startQuiz(quiz.id);
      });

      expect(useSpeedPassStore.getState().quizzes[quiz.id].startedAt).toBeDefined();
    });

    it('should answer question', () => {
      let quiz: Quiz = {} as Quiz;
      act(() => {
        quiz = useSpeedPassStore.getState().createQuiz({
          textbookId: mockTextbookId,
          questionCount: 1,
        });
        useSpeedPassStore.getState().startQuiz(quiz.id);
        useSpeedPassStore.getState().answerQuestion(quiz.id, 0, 'A'); // Correct answer for q1 is usually A if q1 picked? Random pick.
        // We can't guarantee q1 is picked first due to shuffle, but we can check if answer is recorded.
      });

      const updatedQuiz = useSpeedPassStore.getState().quizzes[quiz.id];
      expect(updatedQuiz.questions[0].userAnswer).toBe('A');
    });

    it('should complete quiz', () => {
      let quiz: Quiz = {} as Quiz;
      act(() => {
        quiz = useSpeedPassStore.getState().createQuiz({
          textbookId: mockTextbookId,
          questionCount: 2,
        });
        useSpeedPassStore.getState().startQuiz(quiz.id);
        useSpeedPassStore.getState().answerQuestion(quiz.id, 0, 'wrong-answer-1');
        useSpeedPassStore.getState().answerQuestion(quiz.id, 1, 'wrong-answer-2');
        useSpeedPassStore.getState().completeQuiz(quiz.id);
      });

      const completedQuiz = useSpeedPassStore.getState().quizzes[quiz.id];
      expect(completedQuiz.completedAt).toBeDefined();
      expect(completedQuiz.totalScore).toBeDefined();
      expect(Object.keys(useSpeedPassStore.getState().wrongQuestions).length).toBeGreaterThan(0);
      expect(Object.keys(useSpeedPassStore.getState().eventStatements).length).toBeGreaterThan(0);
    });
  });

  describe('Wrong Question Book Actions', () => {
    it('should add wrong question', () => {
      act(() => {
        useSpeedPassStore.getState().addWrongQuestion('q1', 'tb1', 'Wrong Answer');
      });

      const wrongQuestions = useSpeedPassStore.getState().wrongQuestions;
      const record = Object.values(wrongQuestions)[0];
      expect(record).toBeDefined();
      expect(record.questionId).toBe('q1');
      expect(record.attempts).toHaveLength(1);
    });

    it('should mark wrong question reviewed', () => {
      let recordId: string;
      act(() => {
        useSpeedPassStore.getState().addWrongQuestion('q1', 'tb1', 'Wrong Answer');
        const wrongQuestions = useSpeedPassStore.getState().wrongQuestions;
        recordId = Object.values(wrongQuestions)[0].id;
        useSpeedPassStore.getState().markWrongQuestionReviewed(recordId, true);
      });

      const record = useSpeedPassStore.getState().wrongQuestions[recordId!];
      expect(record.reviewCount).toBe(1);
    });
  });

  describe('Course ID Normalization', () => {
    const textbookId = 'tb-course-normalization';

    const seedTutorialSource = () => {
      act(() => {
        useSpeedPassStore.getState().addTextbook({
          id: textbookId,
          name: '线性代数',
          author: '作者',
          publisher: '出版社',
          source: 'official',
          isPublic: true,
          usageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          parseStatus: 'completed',
        } as Textbook);
        useSpeedPassStore.getState().setTextbookChapters(textbookId, [
          {
            id: 'chapter-1',
            textbookId,
            chapterNumber: '1',
            title: '矩阵',
            level: 1,
            orderIndex: 1,
            pageStart: 1,
            pageEnd: 10,
            knowledgePointCount: 1,
            exampleCount: 1,
            exerciseCount: 1,
          },
        ] as TextbookChapter[]);
        useSpeedPassStore.getState().setTextbookKnowledgePoints(textbookId, [
          {
            id: 'kp-course',
            textbookId,
            chapterId: 'chapter-1',
            title: '矩阵运算',
            content: '矩阵加法与乘法',
            type: 'concept',
            importance: 'critical',
            difficulty: 0.5,
            pageNumber: 2,
            extractionConfidence: 0.9,
            verified: true,
          },
        ] as TextbookKnowledgePoint[]);
        useSpeedPassStore.getState().setTextbookQuestions(textbookId, [
          {
            id: 'q-course',
            textbookId,
            chapterId: 'chapter-1',
            sourceType: 'exercise',
            questionNumber: '1',
            pageNumber: 3,
            content: '计算矩阵乘积',
            questionType: 'calculation',
            hasSolution: true,
            difficulty: 0.4,
            knowledgePointIds: ['kp-course'],
            learningValue: 'essential',
            extractionConfidence: 0.9,
            verified: true,
          },
        ] as TextbookQuestion[]);
      });
    };

    it('should resolve tutorial courseId from explicit input', async () => {
      seedTutorialSource();

      let tutorialCourseId = '';
      await act(async () => {
        const tutorial = await useSpeedPassStore.getState().createTutorial({
          textbookId,
          mode: 'speed',
          courseId: 'course-explicit',
        });
        tutorialCourseId = tutorial.courseId;
      });

      expect(tutorialCourseId).toBe('course-explicit');
    });

    it('should resolve tutorial courseId from user textbook mapping when input is omitted', async () => {
      seedTutorialSource();
      act(() => {
        useSpeedPassStore.getState().addUserTextbook({
          userId: 'user-1',
          textbookId,
          courseId: 'course-from-textbook',
          source: 'uploaded',
        });
      });

      let tutorialCourseId = '';
      await act(async () => {
        const tutorial = await useSpeedPassStore.getState().createTutorial({
          textbookId,
          mode: 'speed',
        });
        tutorialCourseId = tutorial.courseId;
      });

      expect(tutorialCourseId).toBe('course-from-textbook');
    });

    it('should fallback to single enrolled academic course when mapping is missing', async () => {
      seedTutorialSource();
      act(() => {
        useSpeedPassStore.getState().setAcademicProfile({
          universityId: 'u-1',
          majorId: 'm-1',
          grade: 1,
          currentSemester: 1,
          enrolledCourses: ['course-only'],
        });
      });

      let tutorialCourseId = '';
      await act(async () => {
        const tutorial = await useSpeedPassStore.getState().createTutorial({
          textbookId,
          mode: 'speed',
        });
        tutorialCourseId = tutorial.courseId;
      });

      expect(tutorialCourseId).toBe('course-only');
    });

    it('should fallback to unassigned course when no mapping is available', async () => {
      seedTutorialSource();

      let tutorialCourseId = '';
      await act(async () => {
        const tutorial = await useSpeedPassStore.getState().createTutorial({
          textbookId,
          mode: 'speed',
        });
        tutorialCourseId = tutorial.courseId;
      });

      expect(tutorialCourseId).toBe(DEFAULT_SPEEDPASS_COURSE_ID);
    });

    it('should normalize empty courseId fields during hydrateFromSnapshot', () => {
      seedTutorialSource();
      const snapshot = extractSpeedPassPersistedState(useSpeedPassStore.getState());
      const snapshotWithLegacyCourseIds = {
        ...snapshot,
        userTextbooks: [
          {
            id: 'user-book-1',
            userId: 'user-1',
            textbookId,
            courseId: '',
            source: 'uploaded' as UserTextbook['source'],
            addedAt: new Date(),
          },
        ],
        tutorials: {
          'tutorial-legacy': {
            id: 'tutorial-legacy',
            userId: 'user-legacy',
            courseId: '',
            textbookId,
            mode: 'speed' as const,
            title: 'legacy tutorial',
            overview: 'legacy overview',
            sections: [],
            totalEstimatedMinutes: 30,
            createdAt: new Date(),
            progress: 0,
            completedSectionIds: [],
            teacherKeyPointIds: [],
          },
        },
      };

      act(() => {
        useSpeedPassStore.getState().hydrateFromSnapshot(snapshotWithLegacyCourseIds);
      });

      expect(useSpeedPassStore.getState().userTextbooks[0]?.courseId).toBe(
        DEFAULT_SPEEDPASS_COURSE_ID
      );
      expect(useSpeedPassStore.getState().tutorials['tutorial-legacy']?.courseId).toBe(
        DEFAULT_SPEEDPASS_COURSE_ID
      );
    });
  });

  describe('Statistics & Utility Actions', () => {
    it('should update global stats', () => {
      act(() => {
        useSpeedPassStore.getState().updateGlobalStats({ sessionsCompleted: 10 });
      });
      expect(useSpeedPassStore.getState().globalStats.sessionsCompleted).toBe(10);
    });

    it('should record study time', () => {
      act(() => {
        useSpeedPassStore.getState().recordStudyTime(60000); // 1 min
      });
      expect(useSpeedPassStore.getState().globalStats.totalStudyTimeMs).toBe(60000);
    });

    it('should set error', () => {
      act(() => {
        useSpeedPassStore.getState().setError('Test Error');
      });
      expect(useSpeedPassStore.getState().error).toBe('Test Error');
    });

    it('should set loading', () => {
      act(() => {
        useSpeedPassStore.getState().setLoading(true);
      });
      expect(useSpeedPassStore.getState().isLoading).toBe(true);
    });
  });
});
