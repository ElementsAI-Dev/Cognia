export const PPT_TEST_IDS = {
  page: {
    newPresentationButton: 'ppt-new-presentation-button',
  },
  creation: {
    submitButton: 'ppt-create-submit',
    materialFeedback: 'ppt-material-feedback',
    ingestionErrorItem: 'ppt-ingestion-error-item',
    qualityIssueItem: 'ppt-quality-issue-item',
  },
  editor: {
    startPresentation: 'ppt-editor-start-presentation',
    exportTrigger: 'ppt-export-trigger',
    exportMarp: 'ppt-export-marp',
    exportHtml: 'ppt-export-html',
    exportReveal: 'ppt-export-reveal',
    exportPdf: 'ppt-export-pdf',
    exportPptx: 'ppt-export-pptx',
  },
  slideshow: {
    root: 'ppt-slideshow-view',
    exit: 'ppt-slideshow-exit',
  },
} as const;

export type PPTTestIds = typeof PPT_TEST_IDS;
