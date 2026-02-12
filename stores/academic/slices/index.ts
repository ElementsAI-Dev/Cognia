/**
 * Academic Store Slices - Barrel Exports
 */

export { createSearchSlice, initialSearchState } from './search-slice';
export type { SearchState, SearchActions } from './search-slice';

export { createLibrarySlice, initialLibraryState } from './library-slice';
export type { LibraryState, LibraryActions } from './library-slice';

export { createCollectionSlice } from './collection-slice';
export type { CollectionActions } from './collection-slice';

export { createPdfSlice } from './pdf-slice';
export type { PdfActions } from './pdf-slice';

export { createAnnotationSlice } from './annotation-slice';
export type { AnnotationActions } from './annotation-slice';

export { createProviderSlice } from './provider-slice';
export type { ProviderActions } from './provider-slice';
