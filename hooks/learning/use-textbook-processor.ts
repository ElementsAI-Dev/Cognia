/**
 * Textbook Processor Hook
 * 
 * Provides React hooks for processing textbooks, extracting knowledge points,
 * and generating tutorials. Integrates library utilities with the SpeedPass store.
 */

import { useCallback, useState, useRef } from 'react';
import { useSpeedPassStore } from '@/stores/learning/speedpass-store';
import type {
  Textbook,
  TextbookChapter,
  TextbookKnowledgePoint,
  TextbookQuestion,
  SpeedLearningMode,
  SpeedLearningTutorial,
  Quiz,
  WrongQuestionRecord,
} from '@/types/learning/speedpass';
import {
  parseTextbookContent,
  type ParsedPage,
} from '@/lib/learning/speedpass/textbook-parser';
import {
  extractKnowledgePoints,
  type ExtractionOptions,
} from '@/lib/learning/speedpass/knowledge-extractor';
import {
  calculateQuizResult,
  type QuizResult,
} from '@/lib/learning/speedpass/quiz-engine';
import {
  generateStudyReport,
  generateLearningInsights,
  type LearningInsights,
} from '@/lib/learning/speedpass/study-analyzer';

// ============================================================================
// Types
// ============================================================================

export interface ProcessingProgress {
  stage: 'idle' | 'parsing' | 'extracting' | 'generating' | 'complete' | 'error';
  current: number;
  total: number;
  message: string;
}

export interface ProcessingResult {
  textbook: Textbook;
  chapters: TextbookChapter[];
  knowledgePoints: TextbookKnowledgePoint[];
  questions: TextbookQuestion[];
}

// ============================================================================
// Main Hook: useTextbookProcessor
// ============================================================================

export function useTextbookProcessor() {
  const [progress, setProgress] = useState<ProcessingProgress>({
    stage: 'idle',
    current: 0,
    total: 0,
    message: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef(false);

  const store = useSpeedPassStore();

  const processTextbook = useCallback(
    async (
      textbookId: string,
      rawContent: string,
      options?: ExtractionOptions
    ): Promise<ProcessingResult | null> => {
      setIsProcessing(true);
      setError(null);
      abortRef.current = false;

      try {
        const textbookData = store.textbooks[textbookId];
        if (!textbookData) {
          throw new Error('Textbook data not found');
        }

        // Stage 1: Parse content
        setProgress({
          stage: 'parsing',
          current: 0,
          total: 100,
          message: '正在解析教材内容...',
        });

        const parseResult = parseTextbookContent(rawContent, (p: { progress: number; message?: string }) => {
          if (abortRef.current) throw new Error('Aborted');
          setProgress({
            stage: 'parsing',
            current: p.progress,
            total: 100,
            message: p.message || '正在解析...',
          });
        });

        if (abortRef.current) return null;

        const { chapters, pages } = parseResult;

        // Store chapters
        store.setTextbookChapters(textbookId, chapters);

        // Stage 2: Extract knowledge points
        setProgress({
          stage: 'extracting',
          current: 0,
          total: 100,
          message: '正在提取知识点...',
        });

        const extractionResult = extractKnowledgePoints(
          textbookId,
          chapters,
          pages,
          {
            extractDefinitions: true,
            extractTheorems: true,
            extractFormulas: true,
            extractConcepts: true,
            extractMethods: true,
            minConfidence: 0.6,
            ...options,
          },
          (p: { current: number; total: number; message: string }) => {
            if (abortRef.current) throw new Error('Aborted');
            setProgress({
              stage: 'extracting',
              current: p.current,
              total: p.total,
              message: p.message,
            });
          }
        );

        // Store knowledge points
        store.setTextbookKnowledgePoints(textbookId, extractionResult.knowledgePoints);

        if (abortRef.current) return null;

        // Stage 3: Extract questions
        setProgress({
          stage: 'generating',
          current: 0,
          total: 100,
          message: '正在提取例题和习题...',
        });

        const questions = extractQuestionsFromPages(
          pages,
          textbookId,
          chapters,
          extractionResult.knowledgePoints
        );

        // Store questions
        store.setTextbookQuestions(textbookId, questions);

        // Update parse progress
        store.setParseProgress({
          textbookId,
          status: 'completed',
          progress: 100,
          message: '处理完成',
        });

        setProgress({
          stage: 'complete',
          current: 100,
          total: 100,
          message: '处理完成！',
        });

        setIsProcessing(false);

        return {
          textbook: textbookData,
          chapters,
          knowledgePoints: extractionResult.knowledgePoints,
          questions,
        };
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (error.message !== 'Aborted') {
          setError(error);
          setProgress({
            stage: 'error',
            current: 0,
            total: 0,
            message: error.message,
          });
        }
        setIsProcessing(false);
        return null;
      }
    },
    [store]
  );

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  const reset = useCallback(() => {
    setProgress({
      stage: 'idle',
      current: 0,
      total: 0,
      message: '',
    });
    setError(null);
    setIsProcessing(false);
    abortRef.current = false;
  }, []);

  return {
    processTextbook,
    progress,
    isProcessing,
    error,
    abort,
    reset,
  };
}

// ============================================================================
// Helper: Extract Questions from Pages
// ============================================================================

function extractQuestionsFromPages(
  pages: ParsedPage[],
  textbookId: string,
  chapters: TextbookChapter[],
  knowledgePoints: TextbookKnowledgePoint[]
): TextbookQuestion[] {
  const questions: TextbookQuestion[] = [];
  let questionIndex = 0;

  const examplePatterns = [
    /【?例\s*(\d+[\.\-]?\d*)】?[：:．]?\s*(.+)/,
    /例题\s*(\d+[\.\-]?\d*)[：:．]?\s*(.+)/,
  ];

  for (const page of pages) {
    const chapter = chapters.find(
      (c) => page.pageNumber >= c.pageStart && page.pageNumber <= c.pageEnd
    );

    for (const pattern of examplePatterns) {
      const matches = page.content.matchAll(new RegExp(pattern, 'g'));
      for (const match of matches) {
        questionIndex++;
        const relatedKPs = findRelatedKnowledgePoints(
          match[2],
          knowledgePoints,
          page.pageNumber
        );

        questions.push({
          id: `q_${textbookId}_${questionIndex}`,
          textbookId,
          chapterId: chapter?.id || '',
          sourceType: 'example',
          questionNumber: `例${match[1]}`,
          content: match[2].trim(),
          pageNumber: page.pageNumber,
          difficulty: 0.4,
          knowledgePointIds: relatedKPs.map((kp) => kp.id),
          questionType: 'calculation',
          hasSolution: false,
          learningValue: 'recommended',
          extractionConfidence: 0.7,
          verified: false,
        });
      }
    }
  }

  return questions;
}

function findRelatedKnowledgePoints(
  questionContent: string,
  knowledgePoints: TextbookKnowledgePoint[],
  pageNumber: number
): TextbookKnowledgePoint[] {
  const nearbyKPs = knowledgePoints.filter(
    (kp) => Math.abs(kp.pageNumber - pageNumber) <= 3
  );

  const questionKeywords = extractKeywords(questionContent);

  return nearbyKPs
    .map((kp) => {
      const kpKeywords = extractKeywords(kp.title + ' ' + kp.content);
      const overlap = questionKeywords.filter((k) => kpKeywords.includes(k)).length;
      return { kp, score: overlap };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.kp);
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    '的', '是', '在', '了', '和', '与', '或', '有', '为', '被',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'of', 'to', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1 && !stopWords.has(word));
}

// ============================================================================
// Hook: useTutorialGenerator
// ============================================================================

export function useTutorialGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const store = useSpeedPassStore();

  const generate = useCallback(
    async (
      textbookId: string,
      mode: SpeedLearningMode,
      teacherKeyPointIds?: string[],
      userId?: string,
      courseId?: string
    ): Promise<SpeedLearningTutorial | null> => {
      setIsGenerating(true);
      setError(null);

      try {
        const tutorial = await store.createTutorial({
          textbookId,
          mode,
          teacherKeyPointIds,
          userId: userId || 'default',
          courseId: courseId || 'default',
        });

        setIsGenerating(false);
        return tutorial;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setIsGenerating(false);
        return null;
      }
    },
    [store]
  );

  return {
    generate,
    isGenerating,
    error,
  };
}

// ============================================================================
// Hook: useQuizManager
// ============================================================================

export function useQuizManager() {
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  const store = useSpeedPassStore();

  const createQuiz = useCallback(
    (
      textbookId: string,
      knowledgePointIds: string[],
      questionCount: number
    ): Quiz => {
      const quiz = store.createQuiz({
        textbookId,
        knowledgePointIds,
        questionCount,
      });

      store.startQuiz(quiz.id);
      setCurrentQuiz(quiz);
      setQuizResult(null);

      return quiz;
    },
    [store]
  );

  const submitAnswer = useCallback(
    (questionIndex: number, answer: string) => {
      if (!currentQuiz) return;

      store.answerQuestion(currentQuiz.id, questionIndex, answer);
      setCurrentQuiz(store.quizzes[currentQuiz.id] || null);
    },
    [store, currentQuiz]
  );

  const finishQuiz = useCallback(
    (timeSpentMs: number): QuizResult | null => {
      if (!currentQuiz) return null;

      const quiz = store.quizzes[currentQuiz.id];
      if (!quiz) return null;

      store.completeQuiz(currentQuiz.id);
      const result = calculateQuizResult(quiz, timeSpentMs);

      setQuizResult(result);
      return result;
    },
    [store, currentQuiz]
  );

  return {
    currentQuiz,
    quizResult,
    createQuiz,
    submitAnswer,
    finishQuiz,
  };
}

// ============================================================================
// Hook: useStudyInsights
// ============================================================================

export function useStudyInsights(textbookId?: string) {
  const store = useSpeedPassStore();

  const getInsights = useCallback((): LearningInsights | null => {
    const sessions = Object.values(store.studySessions);
    const quizzes = Object.values(store.quizzes);
    const wrongQuestions = Object.values(store.wrongQuestions) as WrongQuestionRecord[];

    let knowledgePoints: TextbookKnowledgePoint[] = [];
    if (textbookId) {
      knowledgePoints = store.textbookKnowledgePoints[textbookId] || [];
    } else {
      for (const kps of Object.values(store.textbookKnowledgePoints) as TextbookKnowledgePoint[][]) {
        knowledgePoints.push(...kps);
      }
    }

    if (sessions.length === 0) return null;

    return generateLearningInsights(sessions, quizzes, wrongQuestions, knowledgePoints);
  }, [store, textbookId]);

  const createReport = useCallback(
    (userId: string, periodDays: number = 7) => {
      const sessions = Object.values(store.studySessions);
      const tutorials = Object.values(store.tutorials);
      const quizzes = Object.values(store.quizzes);
      const wrongQuestions = Object.values(store.wrongQuestions) as WrongQuestionRecord[];

      let knowledgePoints: TextbookKnowledgePoint[] = [];
      if (textbookId) {
        knowledgePoints = store.textbookKnowledgePoints[textbookId] || [];
      } else {
        for (const kps of Object.values(store.textbookKnowledgePoints) as TextbookKnowledgePoint[][]) {
          knowledgePoints.push(...kps);
        }
      }

      return generateStudyReport(
        sessions,
        tutorials,
        quizzes,
        wrongQuestions,
        knowledgePoints,
        userId,
        periodDays
      );
    },
    [store, textbookId]
  );

  return {
    getInsights,
    createReport,
    globalStats: store.globalStats,
  };
}
