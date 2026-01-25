/**
 * Unit tests for SpeedPass Store
 */

import { act } from '@testing-library/react';
import { useSpeedPassStore } from './speedpass-store';
import {
  TextbookChapter,
  TextbookKnowledgePoint,
  TextbookQuestion,
  UserTextbook,
  StartSpeedLearningInput,
  SpeedStudySession,
  Textbook,
  Quiz,
} from '@/types/learning/speedpass';

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-id'),
}));

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
        useSpeedPassStore.getState().answerQuestion(quiz.id, 0, 'A');
        useSpeedPassStore.getState().answerQuestion(quiz.id, 1, 'B');
        useSpeedPassStore.getState().completeQuiz(quiz.id);
      });

      const completedQuiz = useSpeedPassStore.getState().quizzes[quiz.id];
      expect(completedQuiz.completedAt).toBeDefined();
      expect(completedQuiz.totalScore).toBeDefined();
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
