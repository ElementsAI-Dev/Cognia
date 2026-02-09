/**
 * Extreme Mode Engine Tests
 */

import {
  ExtremeModeEngine,
  createExtremeModeEngine,
  formatCountdown,
  getUrgencyLevel,
  getModeRecommendation,
  DEFAULT_EXTREME_CONFIG,
} from './extreme-mode-engine';
import type {
  TutorialSection,
  TextbookKnowledgePoint,
  TextbookQuestion,
} from '@/types/learning/speedpass';

// ============================================================================
// Test Data
// ============================================================================

const mockSections: TutorialSection[] = [
  {
    id: 'section-1',
    knowledgePointId: 'kp-1',
    orderIndex: 0,
    importanceLevel: 'critical',
    textbookLocation: {
      textbookName: 'Test Textbook',
      chapter: 'Chapter 1',
      section: 'Section 1.1',
      pageRange: '1-10',
    },
    originalContent: 'Original content',
    quickSummary: 'Quick summary',
    keyPoints: ['Key point 1', 'Key point 2'],
    mustKnowFormulas: [
      { formula: 'E = mc^2', explanation: 'Energy-mass equivalence', pageNumber: 5 },
    ],
    examples: [],
    recommendedExercises: [],
    commonMistakes: ['Common mistake 1'],
    estimatedMinutes: 15,
  },
  {
    id: 'section-2',
    knowledgePointId: 'kp-2',
    orderIndex: 1,
    importanceLevel: 'important',
    textbookLocation: {
      textbookName: 'Test Textbook',
      chapter: 'Chapter 1',
      section: 'Section 1.2',
      pageRange: '11-20',
    },
    originalContent: 'Original content 2',
    quickSummary: 'Quick summary 2',
    keyPoints: ['Key point 3'],
    mustKnowFormulas: [],
    examples: [],
    recommendedExercises: [],
    commonMistakes: [],
    estimatedMinutes: 10,
  },
  {
    id: 'section-3',
    knowledgePointId: 'kp-3',
    orderIndex: 2,
    importanceLevel: 'supplementary',
    textbookLocation: {
      textbookName: 'Test Textbook',
      chapter: 'Chapter 2',
      section: 'Section 2.1',
      pageRange: '21-30',
    },
    originalContent: 'Original content 3',
    quickSummary: 'Quick summary 3',
    keyPoints: [],
    mustKnowFormulas: [],
    examples: [],
    recommendedExercises: [],
    commonMistakes: [],
    estimatedMinutes: 5,
  },
];

const mockKnowledgePoints: TextbookKnowledgePoint[] = [
  {
    id: 'kp-1',
    textbookId: 'tb-1',
    chapterId: 'ch-1',
    title: 'Critical Concept',
    content: 'Important content',
    type: 'concept',
    importance: 'critical',
    difficulty: 0.5,
    pageNumber: 5,
    extractionConfidence: 0.9,
    verified: true,
  },
  {
    id: 'kp-2',
    textbookId: 'tb-1',
    chapterId: 'ch-1',
    title: 'High Priority Concept',
    content: 'High priority content',
    type: 'concept',
    importance: 'high',
    difficulty: 0.6,
    pageNumber: 15,
    extractionConfidence: 0.85,
    verified: true,
  },
  {
    id: 'kp-3',
    textbookId: 'tb-1',
    chapterId: 'ch-2',
    title: 'Low Priority Concept',
    content: 'Low priority content',
    type: 'concept',
    importance: 'low',
    difficulty: 0.3,
    pageNumber: 25,
    extractionConfidence: 0.8,
    verified: false,
  },
];

const mockQuestions: TextbookQuestion[] = [
  {
    id: 'q-1',
    textbookId: 'tb-1',
    chapterId: 'ch-1',
    knowledgePointIds: ['kp-1'],
    content: 'Exam question 1',
    questionType: 'choice',
    questionNumber: '1',
    sourceType: 'exam',
    difficulty: 0.5,
    pageNumber: 50,
    extractionConfidence: 0.9,
    verified: true,
    hasSolution: true,
    learningValue: 'essential',
  },
  {
    id: 'q-2',
    textbookId: 'tb-1',
    chapterId: 'ch-1',
    knowledgePointIds: ['kp-2'],
    content: 'Example question',
    questionType: 'choice',
    questionNumber: '2',
    sourceType: 'example',
    difficulty: 0.4,
    pageNumber: 55,
    extractionConfidence: 0.85,
    verified: true,
    hasSolution: true,
    learningValue: 'recommended',
  },
];

// ============================================================================
// Tests
// ============================================================================

describe('ExtremeModeEngine', () => {
  describe('constructor', () => {
    it('should create engine with default config', () => {
      const engine = new ExtremeModeEngine();
      expect(engine).toBeDefined();
    });

    it('should create engine with custom config', () => {
      const engine = new ExtremeModeEngine({
        totalTimeMinutes: 60,
        targetScore: 70,
      });
      expect(engine).toBeDefined();
    });
  });

  describe('startSession', () => {
    it('should start a new session', () => {
      const engine = new ExtremeModeEngine();
      const session = engine.startSession();

      expect(session).toBeDefined();
      expect(session.currentPhase).toBe('formulas');
      expect(session.completedItems.size).toBe(0);
      expect(session.skippedItems.size).toBe(0);
      expect(session.masteredItems.size).toBe(0);
    });

    it('should store session reference', () => {
      const engine = new ExtremeModeEngine();
      engine.startSession();

      expect(engine.getSession()).not.toBeNull();
    });
  });

  describe('filterSectionsForExtremeMode', () => {
    it('should filter out supplementary sections', () => {
      const engine = new ExtremeModeEngine();
      const filtered = engine.filterSectionsForExtremeMode(mockSections);

      expect(filtered.length).toBe(2);
      expect(filtered.every((s) => s.importanceLevel !== 'supplementary')).toBe(true);
    });

    it('should keep critical and important sections', () => {
      const engine = new ExtremeModeEngine();
      const filtered = engine.filterSectionsForExtremeMode(mockSections);

      expect(filtered.some((s) => s.importanceLevel === 'critical')).toBe(true);
      expect(filtered.some((s) => s.importanceLevel === 'important')).toBe(true);
    });
  });

  describe('filterKnowledgePoints', () => {
    it('should filter to critical and high importance only', () => {
      const engine = new ExtremeModeEngine();
      const filtered = engine.filterKnowledgePoints(mockKnowledgePoints);

      expect(filtered.length).toBe(2);
      expect(filtered.every((kp) => kp.importance === 'critical' || kp.importance === 'high')).toBe(
        true
      );
    });

    it('should sort by importance (critical first)', () => {
      const engine = new ExtremeModeEngine();
      const filtered = engine.filterKnowledgePoints(mockKnowledgePoints);

      expect(filtered[0].importance).toBe('critical');
      expect(filtered[1].importance).toBe('high');
    });
  });

  describe('filterQuestions', () => {
    it('should filter to exam and example questions', () => {
      const engine = new ExtremeModeEngine();
      const filtered = engine.filterQuestions(mockQuestions);

      expect(filtered.length).toBe(2);
    });

    it('should prioritize exam questions', () => {
      const engine = new ExtremeModeEngine();
      const filtered = engine.filterQuestions(mockQuestions);

      expect(filtered[0].sourceType).toBe('exam');
    });

    it('should limit to 10 questions', () => {
      const engine = new ExtremeModeEngine();
      const manyQuestions = Array.from({ length: 20 }, (_, i) => ({
        ...mockQuestions[0],
        id: `q-${i}`,
      }));
      const filtered = engine.filterQuestions(manyQuestions);

      expect(filtered.length).toBe(10);
    });
  });

  describe('generateOverview', () => {
    it('should generate overview with phases', () => {
      const engine = new ExtremeModeEngine();
      const overview = engine.generateOverview(mockSections, mockKnowledgePoints, mockQuestions);

      expect(overview.phases.length).toBeGreaterThan(0);
      expect(overview.totalItems).toBeGreaterThan(0);
    });

    it('should include formula phase when enabled', () => {
      const engine = new ExtremeModeEngine({ prioritizeMustKnowFormulas: true });
      const overview = engine.generateOverview(mockSections, mockKnowledgePoints, mockQuestions);

      const formulaPhase = overview.phases.find((p) => p.id === 'formulas');
      expect(formulaPhase).toBeDefined();
    });

    it('should calculate progress correctly', () => {
      const engine = new ExtremeModeEngine();
      engine.startSession();
      const overview = engine.generateOverview(mockSections, mockKnowledgePoints, mockQuestions);

      expect(overview.completedItems).toBe(0);
      expect(overview.onTrack).toBeDefined();
      expect(overview.recommendation).toBeDefined();
    });
  });

  describe('markCompleted', () => {
    it('should mark item as completed', () => {
      const engine = new ExtremeModeEngine();
      engine.startSession();
      engine.markCompleted('item-1');

      const session = engine.getSession();
      expect(session?.completedItems.has('item-1')).toBe(true);
    });
  });

  describe('markMastered', () => {
    it('should mark item as mastered and completed', () => {
      const engine = new ExtremeModeEngine();
      engine.startSession();
      engine.markMastered('item-1');

      const session = engine.getSession();
      expect(session?.masteredItems.has('item-1')).toBe(true);
      expect(session?.completedItems.has('item-1')).toBe(true);
    });
  });

  describe('skipItem', () => {
    it('should mark item as skipped', () => {
      const engine = new ExtremeModeEngine();
      engine.startSession();
      engine.skipItem('item-1');

      const session = engine.getSession();
      expect(session?.skippedItems.has('item-1')).toBe(true);
    });
  });

  describe('advancePhase', () => {
    it('should advance to next phase', () => {
      const engine = new ExtremeModeEngine();
      engine.startSession();

      expect(engine.getSession()?.currentPhase).toBe('formulas');

      engine.advancePhase();
      expect(engine.getSession()?.currentPhase).toBe('concepts');

      engine.advancePhase();
      expect(engine.getSession()?.currentPhase).toBe('practice');

      engine.advancePhase();
      expect(engine.getSession()?.currentPhase).toBe('review');
    });
  });

  describe('getTimeAllocation', () => {
    it('should return time allocation for passing score', () => {
      const engine = new ExtremeModeEngine({ targetScore: 60 });
      const allocation = engine.getTimeAllocation();

      expect(allocation.formulas).toBeGreaterThan(0);
      expect(allocation.concepts).toBeGreaterThan(0);
      expect(allocation.practice).toBeGreaterThan(0);
      expect(allocation.review).toBeGreaterThan(0);
    });

    it('should allocate more practice time for higher scores', () => {
      const passingEngine = new ExtremeModeEngine({ targetScore: 60 });
      const highEngine = new ExtremeModeEngine({ targetScore: 85 });

      const passingAlloc = passingEngine.getTimeAllocation();
      const highAlloc = highEngine.getTimeAllocation();

      expect(highAlloc.practice).toBeGreaterThan(passingAlloc.practice);
    });
  });
});

describe('createExtremeModeEngine', () => {
  it('should create engine instance', () => {
    const engine = createExtremeModeEngine();
    expect(engine).toBeInstanceOf(ExtremeModeEngine);
  });

  it('should accept custom config', () => {
    const engine = createExtremeModeEngine({ totalTimeMinutes: 45 });
    expect(engine).toBeInstanceOf(ExtremeModeEngine);
  });
});

describe('formatCountdown', () => {
  it('should format zero as 00:00', () => {
    expect(formatCountdown(0)).toBe('00:00');
  });

  it('should format negative as 00:00', () => {
    expect(formatCountdown(-1000)).toBe('00:00');
  });

  it('should format minutes and seconds', () => {
    expect(formatCountdown(90000)).toBe('01:30'); // 1 minute 30 seconds
  });

  it('should format hours', () => {
    expect(formatCountdown(3661000)).toBe('1:01:01'); // 1 hour 1 minute 1 second
  });
});

describe('getUrgencyLevel', () => {
  it('should return critical for <= 15 minutes', () => {
    expect(getUrgencyLevel(15)).toBe('critical');
    expect(getUrgencyLevel(10)).toBe('critical');
    expect(getUrgencyLevel(0)).toBe('critical');
  });

  it('should return warning for <= 30 minutes', () => {
    expect(getUrgencyLevel(30)).toBe('warning');
    expect(getUrgencyLevel(20)).toBe('warning');
  });

  it('should return normal for > 30 minutes', () => {
    expect(getUrgencyLevel(31)).toBe('normal');
    expect(getUrgencyLevel(60)).toBe('normal');
  });
});

describe('getModeRecommendation', () => {
  it('should recommend extreme for <= 90 minutes', () => {
    expect(getModeRecommendation(90, 60)).toBe('extreme');
    expect(getModeRecommendation(60, 80)).toBe('extreme');
  });

  it('should recommend speed for moderate time', () => {
    expect(getModeRecommendation(180, 80)).toBe('speed');
  });

  it('should recommend comprehensive for sufficient time', () => {
    expect(getModeRecommendation(400, 90)).toBe('comprehensive');
  });
});

describe('DEFAULT_EXTREME_CONFIG', () => {
  it('should have sensible defaults', () => {
    expect(DEFAULT_EXTREME_CONFIG.totalTimeMinutes).toBe(90);
    expect(DEFAULT_EXTREME_CONFIG.targetScore).toBe(60);
    expect(DEFAULT_EXTREME_CONFIG.prioritizeMustKnowFormulas).toBe(true);
    expect(DEFAULT_EXTREME_CONFIG.skipMasteredContent).toBe(true);
    expect(DEFAULT_EXTREME_CONFIG.focusHighFrequency).toBe(true);
  });
});
