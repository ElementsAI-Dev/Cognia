import {
  exportQuestionsToQTI3Package,
  fromQTI3ItemXml,
  fromQTILikeItem,
  importQuestionsFromQTI3Package,
  toQTI3ItemXml,
  toQTILikeItem,
} from './qti-adapter';
import JSZip from 'jszip';
import type { TextbookQuestion } from '@/types/learning/speedpass';

describe('qti-adapter', () => {
  it('maps internal question to qti-like item', () => {
    const question: TextbookQuestion = {
      id: 'q-1',
      textbookId: 'tb-1',
      chapterId: 'ch-1',
      sourceType: 'exercise',
      questionNumber: '1',
      pageNumber: 10,
      content: '1 + 1 = ?',
      questionType: 'choice',
      options: [
        { label: 'A', content: '1' },
        { label: 'B', content: '2' },
      ],
      solution: {
        steps: [],
        answer: 'B',
      },
      hasSolution: true,
      difficulty: 0.3,
      knowledgePointIds: ['kp-1'],
      extractionConfidence: 1,
      verified: true,
      learningValue: 'recommended',
    };

    const item = toQTILikeItem(question);
    expect(item.identifier).toBe('q-1');
    expect(item.correctResponse).toEqual(['B']);
    expect(item.choices).toHaveLength(2);
  });

  it('maps qti-like item back to internal question', () => {
    const mapped = fromQTILikeItem({
      identifier: 'q-2',
      title: 'Question 2',
      type: 'choice',
      prompt: '2 + 2 = ?',
      choices: [
        { identifier: 'A', content: '3' },
        { identifier: 'B', content: '4' },
      ],
      correctResponse: ['B'],
      metadata: {
        sourceQuestionId: 'q-2',
        textbookId: 'tb-1',
        chapterId: 'ch-1',
        difficulty: 0.5,
        knowledgePointIds: ['kp-2'],
      },
    });

    expect(mapped.id).toBe('q-2');
    expect(mapped.questionType).toBe('choice');
    expect(mapped.solution?.answer).toBe('B');
  });

  it('round-trips a question through QTI 3 item XML', () => {
    const source: TextbookQuestion = {
      id: 'q-3',
      textbookId: 'tb-1',
      chapterId: 'ch-2',
      sourceType: 'exercise',
      questionNumber: '3',
      pageNumber: 12,
      content: 'Explain event loop in JavaScript.',
      questionType: 'short_answer',
      hasSolution: true,
      solution: {
        steps: [
          { stepNumber: 1, content: 'Call stack' },
          { stepNumber: 2, content: 'Task queue' },
          { stepNumber: 3, content: 'Microtask queue' },
        ],
        answer: 'Event loop coordinates stack and queues.',
      },
      difficulty: 0.7,
      knowledgePointIds: ['kp-loop'],
      extractionConfidence: 1,
      verified: false,
      learningValue: 'recommended',
    };

    const exported = toQTI3ItemXml(source);
    const restored = fromQTI3ItemXml(exported.xml);

    expect(restored.id).toBe(source.id);
    expect(['short_answer', 'fill_blank']).toContain(restored.questionType);
    expect(restored.content).toContain('Explain event loop');
    expect(restored.solution?.answer).toBe(source.solution?.answer);
  });

  it('exports and imports QTI 3 package', async () => {
    const source: TextbookQuestion[] = [
      {
        id: 'q-4',
        textbookId: 'tb-2',
        chapterId: 'ch-5',
        sourceType: 'exercise',
        questionNumber: '4',
        pageNumber: 20,
        content: '2 + 2 = ?',
        questionType: 'choice',
        options: [
          { label: 'A', content: '3' },
          { label: 'B', content: '4' },
        ],
        solution: { steps: [], answer: 'B' },
        hasSolution: true,
        difficulty: 0.2,
        knowledgePointIds: ['kp-math'],
        extractionConfidence: 1,
        verified: true,
        learningValue: 'recommended',
      },
    ];

    const exported = await exportQuestionsToQTI3Package(source);
    expect(exported.manifestXml).toContain('<manifest');
    expect(exported.items).toHaveLength(1);
    expect(exported.zipBase64.length).toBeGreaterThan(0);

    const imported = await importQuestionsFromQTI3Package(exported.zipBase64);
    expect(imported.errors).toHaveLength(0);
    expect(imported.warnings).toHaveLength(0);
    expect(imported.questions).toHaveLength(1);
    expect(imported.questions[0].questionType).toBe('choice');
  });

  it('falls back to XML scan when manifest is invalid and reports warnings', async () => {
    const xml = toQTI3ItemXml({
      id: 'q-fallback',
      textbookId: 'tb-fallback',
      chapterId: 'ch-fallback',
      sourceType: 'exercise',
      questionNumber: '1',
      pageNumber: 1,
      content: 'Fallback question',
      questionType: 'short_answer',
      hasSolution: true,
      solution: {
        steps: [],
        answer: 'Fallback answer',
      },
      difficulty: 0.5,
      knowledgePointIds: [],
      extractionConfidence: 1,
      verified: false,
      learningValue: 'recommended',
    }).xml;

    const zip = new JSZip();
    zip.file('imsmanifest.xml', '<manifest><resources></resources></manifest>');
    zip.file('items/q-fallback.xml', xml);
    const zipBase64 = await zip.generateAsync({ type: 'base64' });

    const imported = await importQuestionsFromQTI3Package(zipBase64);
    expect(imported.questions).toHaveLength(1);
    expect(imported.errors).toHaveLength(0);
    expect(imported.warnings.length).toBeGreaterThan(0);
  });
});
