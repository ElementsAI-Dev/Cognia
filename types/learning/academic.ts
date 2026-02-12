/**
 * Academic Mode Type Definitions
 * Re-exports from @/types/academic for backward compatibility
 *
 * @deprecated Import from '@/types/academic' instead
 */

// Paper types
export type {
  Paper,
  PaperAuthor,
  PaperCitation,
  PaperReference,
  PaperMetadata,
  PaperUrl,
} from '@/types/academic/paper';

// Provider types
export type {
  AcademicProviderType,
  AcademicProviderConfig,
} from '@/types/academic/provider';
export { DEFAULT_ACADEMIC_PROVIDERS } from '@/types/academic/provider';

// Library types
export type {
  LibraryPaper,
  PaperReadingStatus,
  PaperPriority,
  PaperAnnotation,
  PaperNote,
} from '@/types/academic/library';

// Collection types
export type { PaperCollection } from '@/types/academic/collection';

// Search types
export type {
  PaperSearchFilter,
  PaperSearchOptions,
  PaperSearchResult,
  AggregatedSearchResult,
} from '@/types/academic/search';

// Analysis types
export type {
  PaperAnalysisRequest,
  PaperAnalysisType,
  PaperAnalysisOptions,
  PaperAnalysisResult,
} from '@/types/academic/analysis';

// Learning types
export type {
  AcademicLearningSession,
  AcademicLearningPhase,
  AcademicConcept,
  AcademicQuestion,
} from '@/types/academic/learning';

// Import/Export types
export type {
  ImportFormat,
  AcademicExportFormat,
  ImportOptions,
  ImportResult,
  AcademicExportOptions,
  AcademicExportResult,
} from '@/types/academic/import-export';

// Settings types
export type {
  AcademicModeSettings,
  AcademicStatistics,
} from '@/types/academic/settings';
export { DEFAULT_ACADEMIC_SETTINGS } from '@/types/academic/settings';

// PPT types
export type {
  PaperToPPTOptions,
  PaperPPTSection,
  PaperToPPTResult,
  PaperPPTOutlineItem,
} from '@/types/academic/ppt';
export { DEFAULT_PPT_SECTIONS } from '@/types/academic/ppt';
