import JSZip from 'jszip';
import { nanoid } from 'nanoid';
import type {
  QTILikeChoiceOption,
  QTILikeItem,
  QTI3ImportResult,
  QTI3ItemExport,
  QTI3PackageExport,
  QuestionType,
  TextbookQuestion,
} from '@/types/learning/speedpass';

const QTI3_ITEM_RESOURCE_TYPE = 'imsqti_item_xmlv3p0';
const QTI3_RESPONSE_PROCESSING_TEMPLATE =
  'https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct';

function resolveQuestionType(type: QTILikeItem['type']): QuestionType {
  const supportedTypes: QuestionType[] = [
    'choice',
    'fill_blank',
    'calculation',
    'proof',
    'short_answer',
    'comprehensive',
  ];
  return supportedTypes.includes(type) ? type : 'short_answer';
}

function escapeXml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function decodeXml(input: string): string {
  return input
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

function resolveQtiInteractionType(type: QuestionType): 'choice' | 'text-entry' | 'extended-text' {
  if (type === 'choice') {
    return 'choice';
  }
  if (type === 'fill_blank' || type === 'short_answer') {
    return 'text-entry';
  }
  return 'extended-text';
}

export function toQTILikeItem(question: TextbookQuestion): QTILikeItem {
  const choices: QTILikeChoiceOption[] | undefined = question.options?.map((option) => ({
    identifier: option.label,
    content: option.content,
  }));

  return {
    identifier: question.id,
    title: question.questionNumber || question.id,
    type: question.questionType,
    prompt: question.content,
    choices,
    correctResponse: question.solution?.answer ? [question.solution.answer] : [],
    metadata: {
      sourceQuestionId: question.id,
      textbookId: question.textbookId,
      chapterId: question.chapterId,
      difficulty: question.difficulty,
      knowledgePointIds: question.knowledgePointIds,
    },
  };
}

export function fromQTILikeItem(item: QTILikeItem): TextbookQuestion {
  const options = item.choices?.map((choice) => ({
    label: choice.identifier,
    content: choice.content,
    isCorrect: item.correctResponse.includes(choice.identifier),
  }));

  return {
    id: item.metadata.sourceQuestionId || item.identifier || nanoid(),
    textbookId: item.metadata.textbookId,
    chapterId: item.metadata.chapterId,
    sourceType: 'ai_generated',
    questionNumber: item.title || item.identifier,
    pageNumber: 0,
    content: item.prompt,
    questionType: resolveQuestionType(item.type),
    options,
    solution:
      item.correctResponse.length > 0
        ? {
            steps: [],
            answer: item.correctResponse[0],
          }
        : undefined,
    hasSolution: item.correctResponse.length > 0,
    difficulty: item.metadata.difficulty ?? 0.5,
    knowledgePointIds: item.metadata.knowledgePointIds || [],
    extractionConfidence: 1,
    verified: false,
    learningValue: 'recommended',
  };
}

export function toQTI3ItemXml(question: TextbookQuestion): QTI3ItemExport {
  const qtiLike = toQTILikeItem(question);
  const interactionType = resolveQtiInteractionType(question.questionType);
  const metadataComment = escapeXml(JSON.stringify(qtiLike.metadata));

  const responseDeclaration =
    interactionType === 'choice'
      ? `<responseDeclaration identifier="RESPONSE" cardinality="single" baseType="identifier">
  <correctResponse>${qtiLike.correctResponse.map((value) => `<value>${escapeXml(value)}</value>`).join('')}</correctResponse>
</responseDeclaration>`
      : `<responseDeclaration identifier="RESPONSE" cardinality="single" baseType="string">
  <correctResponse>${qtiLike.correctResponse.map((value) => `<value>${escapeXml(value)}</value>`).join('')}</correctResponse>
</responseDeclaration>`;

  const interactionBody =
    interactionType === 'choice'
      ? `<choiceInteraction responseIdentifier="RESPONSE" maxChoices="1">
    <prompt>${escapeXml(qtiLike.prompt)}</prompt>
    ${(qtiLike.choices || [])
      .map((choice) => `<simpleChoice identifier="${escapeXml(choice.identifier)}">${escapeXml(choice.content)}</simpleChoice>`)
      .join('\n    ')}
  </choiceInteraction>`
      : interactionType === 'text-entry'
        ? `<p>${escapeXml(qtiLike.prompt)}</p>
  <textEntryInteraction responseIdentifier="RESPONSE" expectedLength="120" />`
        : `<p>${escapeXml(qtiLike.prompt)}</p>
  <extendedTextInteraction responseIdentifier="RESPONSE" expectedLines="6" />`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
  identifier="${escapeXml(qtiLike.identifier)}"
  title="${escapeXml(qtiLike.title)}"
  adaptive="false"
  timeDependent="false">
  <!-- cognia-metadata:${metadataComment} -->
  ${responseDeclaration}
  <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float"/>
  <itemBody>
    ${interactionBody}
  </itemBody>
  <responseProcessing template="${QTI3_RESPONSE_PROCESSING_TEMPLATE}"/>
</assessmentItem>`;

  return {
    identifier: qtiLike.identifier,
    title: qtiLike.title,
    xml,
    metadata: qtiLike.metadata,
  };
}

export function fromQTI3ItemXml(xml: string): TextbookQuestion {
  const identifierMatch = xml.match(/identifier="([^"]+)"/);
  const titleMatch = xml.match(/title="([^"]+)"/);
  const promptMatch = xml.match(/<prompt>([\s\S]*?)<\/prompt>/);
  const paragraphPromptMatch = xml.match(/<p>([\s\S]*?)<\/p>/);
  const choiceMatches = Array.from(
    xml.matchAll(/<simpleChoice\s+identifier="([^"]+)">([\s\S]*?)<\/simpleChoice>/g)
  );
  const correctValues = Array.from(xml.matchAll(/<correctResponse>[\s\S]*?<\/correctResponse>/g))
    .flatMap((block) => Array.from(block[0].matchAll(/<value>([\s\S]*?)<\/value>/g)).map((value) => decodeXml(value[1])));
  const metadataMatch = xml.match(/<!--\s*cognia-metadata:([\s\S]*?)\s*-->/);

  let metadata: QTILikeItem['metadata'] = {
    sourceQuestionId: identifierMatch?.[1] || nanoid(),
    textbookId: 'unknown-textbook',
    chapterId: 'unknown-chapter',
    difficulty: 0.5,
    knowledgePointIds: [],
  };

  if (metadataMatch?.[1]) {
    try {
      metadata = {
        ...metadata,
        ...(JSON.parse(decodeXml(metadataMatch[1])) as QTILikeItem['metadata']),
      };
    } catch {
      // keep fallback metadata
    }
  }

  const interactionType = xml.includes('<choiceInteraction')
    ? 'choice'
    : xml.includes('<textEntryInteraction')
      ? 'fill_blank'
      : 'short_answer';

  const qtiLike: QTILikeItem = {
    identifier: identifierMatch?.[1] || nanoid(),
    title: decodeXml(titleMatch?.[1] || identifierMatch?.[1] || 'Imported Question'),
    type: resolveQuestionType(interactionType),
    prompt: decodeXml(promptMatch?.[1] || paragraphPromptMatch?.[1] || ''),
    choices: choiceMatches.length
      ? choiceMatches.map((choice) => ({
          identifier: decodeXml(choice[1]),
          content: decodeXml(choice[2]),
        }))
      : undefined,
    correctResponse: correctValues,
    metadata,
  };

  return fromQTILikeItem(qtiLike);
}

function buildManifest(items: QTI3ItemExport[]): string {
  const resources = items
    .map(
      (item) => `<resource identifier="res-${escapeXml(item.identifier)}" type="${QTI3_ITEM_RESOURCE_TYPE}" href="items/${escapeXml(item.identifier)}.xml">
    <file href="items/${escapeXml(item.identifier)}.xml"/>
  </resource>`
    )
    .join('\n    ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:imsqti="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
  identifier="cognia-qti3-package">
  <organizations/>
  <resources>
    ${resources}
  </resources>
</manifest>`;
}

function validateQti3Export(manifestXml: string, items: QTI3ItemExport[]): void {
  if (!/<manifest[\s>]/.test(manifestXml)) {
    throw new Error('QTI 3 export manifest is missing root <manifest> element.');
  }
  if (!/<resources>[\s\S]*<\/resources>/.test(manifestXml)) {
    throw new Error('QTI 3 export manifest is missing <resources> section.');
  }

  for (const item of items) {
    const expectedResourceType = new RegExp(
      `type="${QTI3_ITEM_RESOURCE_TYPE}".*href="items/${item.identifier}\\.xml"|href="items/${item.identifier}\\.xml".*type="${QTI3_ITEM_RESOURCE_TYPE}"`,
      'i'
    );
    if (!expectedResourceType.test(manifestXml)) {
      throw new Error(`QTI 3 export manifest missing resource entry for item ${item.identifier}.`);
    }
    if (!/<assessmentItem[\s>]/.test(item.xml)) {
      throw new Error(`QTI 3 export item ${item.identifier} is missing <assessmentItem> root.`);
    }
    if (!/xmlns="http:\/\/www\.imsglobal\.org\/xsd\/imsqti(?:_asi|asi)_v3p0"/.test(item.xml)) {
      throw new Error(`QTI 3 export item ${item.identifier} is missing QTI v3 namespace.`);
    }
  }
}

export async function exportQuestionsToQTI3Package(
  questions: TextbookQuestion[]
): Promise<QTI3PackageExport> {
  const items = questions.map((question) => toQTI3ItemXml(question));
  const manifestXml = buildManifest(items);
  validateQti3Export(manifestXml, items);
  const zip = new JSZip();

  zip.file('imsmanifest.xml', manifestXml);
  for (const item of items) {
    zip.file(`items/${item.identifier}.xml`, item.xml);
  }

  const zipBase64 = await zip.generateAsync({ type: 'base64' });
  return { manifestXml, items, zipBase64 };
}

function resolveManifestItemFiles(manifestXml: string): {
  files: string[];
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!/<manifest[\s>]/.test(manifestXml)) {
    errors.push('Invalid QTI package: imsmanifest.xml is missing <manifest> root.');
    return { files: [], errors, warnings };
  }
  if (!/<resources>[\s\S]*<\/resources>/.test(manifestXml)) {
    errors.push('Invalid QTI package: imsmanifest.xml is missing <resources> section.');
    return { files: [], errors, warnings };
  }

  const resources = Array.from(manifestXml.matchAll(/<resource\b([\s\S]*?)>([\s\S]*?)<\/resource>/gi));
  const files: string[] = [];

  for (const resource of resources) {
    const attrs = resource[1] || '';
    const body = resource[2] || '';
    const typeMatch = attrs.match(/\btype="([^"]+)"/i);
    const hrefMatch = attrs.match(/\bhref="([^"]+)"/i);
    const fileMatch = body.match(/<file\b[^>]*\bhref="([^"]+)"/i);
    const resourceType = typeMatch?.[1];
    const resourceFile = (fileMatch?.[1] || hrefMatch?.[1] || '').trim();

    if (!resourceType) {
      warnings.push('Manifest resource without type was ignored.');
      continue;
    }
    if (resourceType !== QTI3_ITEM_RESOURCE_TYPE) {
      continue;
    }
    if (!resourceFile) {
      warnings.push(`Manifest resource of type ${QTI3_ITEM_RESOURCE_TYPE} missing href/file.`);
      continue;
    }
    files.push(resourceFile);
  }

  if (files.length === 0) {
    warnings.push('No QTI item resources found in manifest; falling back to XML file scan.');
  }

  return { files, errors, warnings };
}

export async function importQuestionsFromQTI3Package(
  payload: string | ArrayBuffer | Uint8Array
): Promise<QTI3ImportResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const questions: TextbookQuestion[] = [];

  const zipData =
    typeof payload === 'string'
      ? payload
      : payload instanceof Uint8Array
        ? payload
        : new Uint8Array(payload);

  const zip = await JSZip.loadAsync(zipData, { base64: typeof payload === 'string' });
  const manifestEntry = zip.files['imsmanifest.xml'];
  let files: string[] = [];

  if (manifestEntry) {
    try {
      const manifestXml = await manifestEntry.async('string');
      const parsedManifest = resolveManifestItemFiles(manifestXml);
      errors.push(...parsedManifest.errors);
      warnings.push(...parsedManifest.warnings);
      files = parsedManifest.files.filter((file) => !!zip.files[file]);

      const missingFiles = parsedManifest.files.filter((file) => !zip.files[file]);
      for (const missingFile of missingFiles) {
        errors.push(`Manifest referenced missing item file: ${missingFile}`);
      }
    } catch (error) {
      errors.push(`Failed to read imsmanifest.xml: ${(error as Error).message}`);
    }
  } else {
    warnings.push('imsmanifest.xml not found; using fallback XML scan.');
  }

  if (files.length === 0) {
    files = Object.keys(zip.files).filter((file) => file.endsWith('.xml') && !file.endsWith('imsmanifest.xml'));
  }

  for (const file of files) {
    try {
      const xml = await zip.files[file].async('string');
      questions.push(fromQTI3ItemXml(xml));
    } catch (error) {
      errors.push(`Failed to parse ${file}: ${(error as Error).message}`);
    }
  }

  return { questions, errors, warnings };
}

export default toQTILikeItem;
