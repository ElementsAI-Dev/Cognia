'use client';

/**
 * PaperDetail - Comprehensive paper detail view with all metadata
 */

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  ExternalLink,
  Download,
  Star,
  BookOpen,
  Users,
  Calendar,
  Quote,
  Link2,
  Tag,
  Clock,
  FileText,
  Brain,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Bookmark,
  GraduationCap,
  Building2,
  Globe,
  Hash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAcademic } from '@/hooks/academic';
import { CitationGraph } from '@/components/academic/citation-graph';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';
import type {
  Paper,
  LibraryPaper,
  PaperReadingStatus,
  PaperAnalysisType,
  PaperAnalysisResult,
} from '@/types/learning/academic';

const ANALYSIS_TYPES: { value: PaperAnalysisType; label: string; description: string }[] = [
  { value: 'summary', label: 'Summary', description: 'Comprehensive paper summary' },
  { value: 'key-insights', label: 'Key Insights', description: 'Main takeaways and findings' },
  { value: 'methodology', label: 'Methodology', description: 'Research methods analysis' },
  { value: 'findings', label: 'Findings', description: 'Results and conclusions' },
  { value: 'limitations', label: 'Limitations', description: 'Study limitations' },
  { value: 'future-work', label: 'Future Work', description: 'Suggested research directions' },
  { value: 'related-work', label: 'Related Work', description: 'Connection to other research' },
  {
    value: 'technical-details',
    label: 'Technical Details',
    description: 'Implementation specifics',
  },
  { value: 'critique', label: 'Critical Analysis', description: 'Strengths and weaknesses' },
  { value: 'eli5', label: 'ELI5', description: 'Simple explanation' },
];

const STATUS_OPTIONS: { value: PaperReadingStatus; label: string }[] = [
  { value: 'unread', label: 'Unread' },
  { value: 'reading', label: 'Reading' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

interface PaperDetailProps {
  paper: Paper | LibraryPaper | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function isLibraryPaper(paper: Paper | LibraryPaper): paper is LibraryPaper {
  return 'libraryId' in paper && 'readingStatus' in paper;
}

export function PaperDetail({ paper, open, onOpenChange }: PaperDetailProps) {
  const t = useTranslations('academic.paperDetail');
  const {
    updatePaperStatus,
    updatePaperRating,
    addPaperNote,
    downloadPdf,
    hasPdf,
    analyzePaper,
    startGuidedLearning,
    addToCollection,
    collections,
    addTag,
    removeTag,
    saveAnalysisResult,
    getAnalysisHistory,
  } = useAcademic();

  const [activeTab, setActiveTab] = useState('overview');
  const [isAbstractExpanded, setIsAbstractExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userNote, setUserNote] = useState((paper && isLibraryPaper(paper) ? paper.userNotes : '') || '');
  const [newTag, setNewTag] = useState('');
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<PaperAnalysisType>('summary');
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysisHistory, setShowAnalysisHistory] = useState(false);

  // Reset state when paper changes
  useEffect(() => {
    setActiveTab('overview');
    setIsAbstractExpanded(false);
    setCopied(false);
    setUserNote((paper && isLibraryPaper(paper) ? paper.userNotes : '') || '');
    setNewTag('');
    setSelectedAnalysisType('summary');
    setAnalysisResult(null);
    setIsAnalyzing(false);
    setShowAnalysisHistory(false);
  }, [paper?.id, paper]);

  // Get analysis history for this paper
  const analysisHistory = paper ? getAnalysisHistory(paper.id) : [];

  const handleCopyDoi = useCallback(async () => {
    if (paper?.metadata?.doi) {
      await navigator.clipboard.writeText(paper.metadata.doi);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [paper?.metadata?.doi]);

  const handleCopyCitation = useCallback(async () => {
    if (!paper) return;
    const authors = paper.authors.map((a) => a.name).join(', ');
    const doi = paper.metadata?.doi;
    const citation = `${authors} (${paper.year}). ${paper.title}. ${paper.venue || ''}${doi ? ` https://doi.org/${doi}` : ''}`;
    await navigator.clipboard.writeText(citation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [paper]);

  const handleSaveNote = useCallback(async () => {
    if (paper) {
      await addPaperNote(paper.id, userNote);
    }
  }, [paper, userNote, addPaperNote]);

  const handleAnalyze = useCallback(async () => {
    if (!paper) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzePaper(paper.id, selectedAnalysisType);
      setAnalysisResult(result);

      // Save analysis result to history
      const analysisResultObj: PaperAnalysisResult = {
        paperId: paper.id,
        analysisType: selectedAnalysisType,
        content: result,
        createdAt: new Date(),
      };
      saveAnalysisResult(paper.id, analysisResultObj);
    } catch (error) {
      toast({ type: 'error', title: 'Analysis failed', description: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsAnalyzing(false);
    }
  }, [paper, selectedAnalysisType, analyzePaper, saveAnalysisResult]);

  const handleDownloadPdf = useCallback(async () => {
    if (paper?.pdfUrl) {
      await downloadPdf(paper.id, paper.pdfUrl);
    }
  }, [paper, downloadPdf]);

  if (!paper) return null;

  const hasLocalPdf = hasPdf(paper.id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px] p-0 flex flex-col">
        <SheetHeader className="p-4 pb-0">
          <div className="flex items-start justify-between gap-2">
            <SheetTitle className="text-lg font-semibold leading-tight pr-8">
              {paper.title}
            </SheetTitle>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Authors */}
            <div className="flex items-start gap-2">
              <Users className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="text-sm">
                {paper.authors.map((author, idx) => (
                  <span key={idx}>
                    <span className="hover:underline cursor-pointer">{author.name}</span>
                    {author.affiliation && (
                      <span className="text-muted-foreground text-xs ml-1">
                        ({author.affiliation})
                      </span>
                    )}
                    {idx < paper.authors.length - 1 && ', '}
                  </span>
                ))}
              </div>
            </div>

            {/* Metadata row */}
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {paper.year && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {paper.year}
                </span>
              )}
              {paper.venue && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {paper.venue}
                </span>
              )}
              {paper.citationCount !== undefined && (
                <span className="flex items-center gap-1">
                  <Quote className="h-3.5 w-3.5" />
                  {paper.citationCount.toLocaleString()} {t('citations')}
                </span>
              )}
              {paper.referenceCount !== undefined && (
                <span className="flex items-center gap-1">
                  <Link2 className="h-3.5 w-3.5" />
                  {paper.referenceCount} {t('references')}
                </span>
              )}
            </div>

            {/* Identifiers */}
            <div className="flex flex-wrap gap-2">
              {paper.metadata?.doi && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="cursor-pointer gap-1"
                        onClick={handleCopyDoi}
                      >
                        <Hash className="h-3 w-3" />
                        DOI: {paper.metadata.doi}
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>{t('clickToCopyDoi')}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <Badge variant="outline">
                <Globe className="h-3 w-3 mr-1" />
                {paper.providerId}
              </Badge>
              {paper.isOpenAccess && (
                <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                  {t('openAccess')}
                </Badge>
              )}
              {hasLocalPdf && (
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                  <FileText className="h-3 w-3 mr-1" />
                  {t('pdfCached')}
                </Badge>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              {paper.pdfUrl && (
                <Button size="sm" variant="outline" onClick={handleDownloadPdf}>
                  <Download className="h-4 w-4 mr-2" />
                  {hasLocalPdf ? t('openPdf') : t('downloadPdf')}
                </Button>
              )}
              {paper.urls && paper.urls.length > 0 && (
                <Button size="sm" variant="outline" asChild>
                  <a href={paper.urls[0].url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t('viewSource')}
                  </a>
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={handleCopyCitation}>
                <Copy className="h-4 w-4 mr-2" />
                {t('copyCitation')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => startGuidedLearning(paper.id)}>
                <GraduationCap className="h-4 w-4 mr-2" />
                {t('startLearning')}
              </Button>
            </div>

            <Separator />

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start">
                <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
                <TabsTrigger value="notes">{t('tabs.notes')}</TabsTrigger>
                <TabsTrigger value="analysis">{t('tabs.analysis')}</TabsTrigger>
                <TabsTrigger value="citations">{t('tabs.citations')}</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                {/* Abstract */}
                {paper.abstract && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      {t('abstract')}
                    </h4>
                    <p
                      className={cn(
                        'text-sm text-muted-foreground leading-relaxed',
                        !isAbstractExpanded && 'line-clamp-4'
                      )}
                    >
                      {paper.abstract}
                    </p>
                    {paper.abstract.length > 300 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsAbstractExpanded(!isAbstractExpanded)}
                        className="h-7 px-2"
                      >
                        {isAbstractExpanded ? (
                          <>
                            <ChevronUp className="h-3 w-3 mr-1" />
                            {t('showLess')}
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" />
                            {t('showMore')}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}

                {/* Keywords/Topics */}
                {paper.fieldsOfStudy && paper.fieldsOfStudy.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      {t('fieldsOfStudy')}
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {paper.fieldsOfStudy.map((field, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reading Status — only for library papers */}
                {isLibraryPaper(paper) && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t('readingStatus')}
                  </h4>
                  <div className="flex items-center gap-4">
                    <Select
                      value={paper.readingStatus}
                      onValueChange={(v) => updatePaperStatus(paper.id, v)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Rating */}
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={cn(
                            'h-5 w-5 cursor-pointer transition-colors',
                            i <= (paper.userRating || 0)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-muted-foreground/30 hover:text-yellow-400'
                          )}
                          onClick={() => updatePaperRating(paper.id, i)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                )}

                {/* Collections — only for library papers */}
                {isLibraryPaper(paper) && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Bookmark className="h-4 w-4" />
                    {t('collections')}
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {paper.collections?.map((collId) => {
                      const coll = collections.find((c) => c.id === collId);
                      return coll ? (
                        <Badge key={collId} variant="outline" className="gap-1">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: coll.color || '#888' }}
                          />
                          {coll.name}
                        </Badge>
                      ) : null;
                    })}
                    <Select onValueChange={(collId) => addToCollection(paper.id, collId)}>
                      <SelectTrigger className="w-auto h-6 text-xs border-dashed">
                        <span className="text-muted-foreground">{t('addToCollection')}</span>
                      </SelectTrigger>
                      <SelectContent>
                        {collections
                          .filter((c) => !paper.collections?.includes(c.id))
                          .map((coll) => (
                            <SelectItem key={coll.id} value={coll.id}>
                              {coll.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                )}

                {/* Tags — only for library papers */}
                {isLibraryPaper(paper) && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    {t('tags')}
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {paper.tags?.map((tag, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="text-xs cursor-pointer hover:bg-destructive/10 group"
                        onClick={() => removeTag(paper.id, tag)}
                      >
                        {tag}
                        <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          ×
                        </span>
                      </Badge>
                    ))}
                    <div className="flex items-center gap-1">
                      <Input
                        placeholder={t('addTag')}
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        className="h-6 w-24 text-xs"
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter' && newTag.trim() && paper) {
                            await addTag(paper.id, newTag.trim());
                            setNewTag('');
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
                )}
              </TabsContent>

              <TabsContent value="notes" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    {t('personalNotes')}
                  </h4>
                  <Textarea
                    placeholder={t('addNotesPlaceholder')}
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    className="min-h-[200px]"
                  />
                  <Button size="sm" onClick={handleSaveNote}>
                    {t('saveNotes')}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="analysis" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    {t('aiAnalysis')}
                  </h4>
                  <p className="text-sm text-muted-foreground">{t('aiAnalysisDescription')}</p>

                  <div className="flex gap-2">
                    <Select
                      value={selectedAnalysisType}
                      onValueChange={(v) => setSelectedAnalysisType(v as PaperAnalysisType)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ANALYSIS_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div>
                              <div>{type.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {type.description}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                      {isAnalyzing ? t('analyzing') : t('analyze')}
                    </Button>
                  </div>

                  {analysisResult && (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <pre className="text-sm whitespace-pre-wrap">{analysisResult}</pre>
                    </div>
                  )}

                  {/* Analysis History */}
                  {analysisHistory.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAnalysisHistory(!showAnalysisHistory)}
                        className="w-full justify-between"
                      >
                        <span className="text-sm font-medium">
                          {t('analysisHistory')} ({analysisHistory.length})
                        </span>
                        {showAnalysisHistory ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>

                      {showAnalysisHistory && (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {analysisHistory.map((item, idx) => (
                            <div
                              key={idx}
                              className="p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                              onClick={() => setAnalysisResult(item.content)}
                            >
                              <div className="flex items-center justify-between">
                                <Badge variant="outline" className="text-xs">
                                  {item.analysisType}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(item.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {item.content.slice(0, 100)}...
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="citations" className="space-y-4 mt-4">
                <CitationGraph
                  paper={paper}
                  onPaperClick={(paperId: string, _title: string) => {
                    window.open(`https://www.semanticscholar.org/paper/${paperId}`, '_blank');
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export default PaperDetail;
