/**
 * @jest-environment jsdom
 */

import { act } from '@testing-library/react';
import { useChunkedDocumentStore } from './chunked-document-store';

describe('useChunkedDocumentStore', () => {
  beforeEach(() => {
    act(() => {
      useChunkedDocumentStore.setState({
        chunkedDocuments: {},
        loadedChunks: {},
        documentIndices: {},
        visibleRanges: {},
      });
    });
  });

  it('does not rewrite chunked documents when content is unchanged', () => {
    let originalDocument;

    act(() => {
      originalDocument = useChunkedDocumentStore
        .getState()
        .addChunkedDocument('doc-1', 'function example() {\n  return 1;\n}');
    });

    let updatedDocument;
    act(() => {
      updatedDocument = useChunkedDocumentStore
        .getState()
        .updateDocument('doc-1', 'function example() {\n  return 1;\n}');
    });

    expect(updatedDocument).toBe(originalDocument);
    expect(useChunkedDocumentStore.getState().chunkedDocuments['doc-1']).toBe(originalDocument);
  });
});
