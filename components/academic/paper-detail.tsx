'use client';

/**
 * PaperDetail - Comprehensive paper detail view with all metadata
 */

import { useState, useCallback } from 'react';
import {
  ExternalLink, Download, Star, BookOpen, Users, Calendar,
  Quote, Link2, Tag, Clock, FileText, Brain, MessageSquare,
  ChevronDown, ChevronUp, Copy, Check, Bookmark,
  GraduationCap, Building2, Globe, Hash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAcademic } from '@/hooks/academic';
import { cn } from '@/lib/utils';
import type { LibraryPaper, PaperReadingStatus, PaperAnalysisType } from '@/types/academic';

const ANALYSIS_TYPES: { value: PaperAnalysisType; label: string; description: string }[] = [
  { value: 'summary', label: 'Summary', description: 'Comprehensive paper summary' },
  { value: 'key-insights', label: 'Key Insights', description: 'Main takeaways and findings' },
  { value: 'methodology', label: 'Methodology', description: 'Research methods analysis' },
  { value: 'findings', label: 'Findings', description: 'Results and conclusions' },
  { value: 'limitations', label: 'Limitations', description: 'Study limitations' },
  { value: 'future-work', label: 'Future Work', description: 'Suggested research directions' },
  { value: 'related-work', label: 'Related Work', description: 'Connection to other research' },
  { value: 'technical-details', label: 'Technical Details', description: 'Implementation specifics' },
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
  paper: LibraryPaper | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaperDetail({ paper, open, onOpenChange }: PaperDetailProps) {
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
  } = useAcademic();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isAbstractExpanded, setIsAbstractExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userNote, setUserNote] = useState(paper?.userNotes || '');
  const [newTag, setNewTag] = useState('');
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<PaperAnalysisType>('summary');
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const handleCopyDoi = useCallback(async () => {
    if (paper?.metadata?.doi) {
      await navigator.clipboard.writeText(paper.metadata.doi);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [paper?.metadata?.doi]);
  
  const handleCopyCitation = useCallback(async () => {
    if (!paper) return;
    const authors = paper.authors.map(a => a.name).join(', ');
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
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [paper, selectedAnalysisType, analyzePaper]);
  
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
                  {paper.citationCount.toLocaleString()} citations
                </span>
              )}
              {paper.referenceCount !== undefined && (
                <span className="flex items-center gap-1">
                  <Link2 className="h-3.5 w-3.5" />
                  {paper.referenceCount} references
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
                    <TooltipContent>Click to copy DOI</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <Badge variant="outline">
                <Globe className="h-3 w-3 mr-1" />
                {paper.providerId}
              </Badge>
              {paper.isOpenAccess && (
                <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                  Open Access
                </Badge>
              )}
              {hasLocalPdf && (
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                  <FileText className="h-3 w-3 mr-1" />
                  PDF Cached
                </Badge>
              )}
            </div>
            
            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              {paper.pdfUrl && (
                <Button size="sm" variant="outline" onClick={handleDownloadPdf}>
                  <Download className="h-4 w-4 mr-2" />
                  {hasLocalPdf ? 'Open PDF' : 'Download PDF'}
                </Button>
              )}
              {paper.urls && paper.urls.length > 0 && (
                <Button size="sm" variant="outline" asChild>
                  <a href={paper.urls[0].url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Source
                  </a>
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={handleCopyCitation}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Citation
              </Button>
              <Button size="sm" variant="outline" onClick={() => startGuidedLearning(paper.id)}>
                <GraduationCap className="h-4 w-4 mr-2" />
                Start Learning
              </Button>
            </div>
            
            <Separator />
            
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
                <TabsTrigger value="citations">Citations</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4 mt-4">
                {/* Abstract */}
                {paper.abstract && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Abstract
                    </h4>
                    <p className={cn(
                      "text-sm text-muted-foreground leading-relaxed",
                      !isAbstractExpanded && "line-clamp-4"
                    )}>
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
                            Show less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" />
                            Show more
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
                      Fields of Study
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
                
                {/* Reading Status */}
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Reading Status
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
                        {STATUS_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Rating */}
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(i => (
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
                
                {/* Collections */}
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Bookmark className="h-4 w-4" />
                    Collections
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {paper.collections?.map(collId => {
                      const coll = collections.find(c => c.id === collId);
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
                        <span className="text-muted-foreground">+ Add to collection</span>
                      </SelectTrigger>
                      <SelectContent>
                        {collections
                          .filter(c => !paper.collections?.includes(c.id))
                          .map(coll => (
                            <SelectItem key={coll.id} value={coll.id}>
                              {coll.name}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Tags */}
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {paper.tags?.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    <div className="flex items-center gap-1">
                      <Input
                        placeholder="Add tag..."
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        className="h-6 w-24 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newTag.trim()) {
                            // Add tag logic
                            setNewTag('');
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="notes" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Personal Notes
                  </h4>
                  <Textarea
                    placeholder="Add your notes about this paper..."
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    className="min-h-[200px]"
                  />
                  <Button size="sm" onClick={handleSaveNote}>
                    Save Notes
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="analysis" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    AI-Powered Analysis
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Use AI to analyze this paper and extract insights
                  </p>
                  
                  <div className="flex gap-2">
                    <Select 
                      value={selectedAnalysisType} 
                      onValueChange={(v) => setSelectedAnalysisType(v as PaperAnalysisType)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ANALYSIS_TYPES.map(type => (
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
                      {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                    </Button>
                  </div>
                  
                  {analysisResult && (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <pre className="text-sm whitespace-pre-wrap">{analysisResult}</pre>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="citations" className="space-y-4 mt-4">
                <div className="text-center text-muted-foreground py-8">
                  <Quote className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Citation network coming soon</p>
                  <p className="text-sm mt-1">
                    View papers that cite this work and references
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export default PaperDetail;
