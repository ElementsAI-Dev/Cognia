'use client';

/**
 * PaperComparison - Compare multiple papers side by side
 */

import { useState, useMemo } from 'react';
import {
  X, Plus, ArrowLeftRight, Users, Calendar, Quote,
  BookOpen, Tag, CheckCircle2, XCircle, Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useAcademic } from '@/hooks/academic';
import { cn } from '@/lib/utils';
import type { LibraryPaper } from '@/types/learning/academic';

interface PaperComparisonProps {
  className?: string;
}

export function PaperComparison({ className }: PaperComparisonProps) {
  const { libraryPapers } = useAcademic();
  const [selectedPapers, setSelectedPapers] = useState<LibraryPaper[]>([]);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  
  const addPaper = (paper: LibraryPaper) => {
    if (selectedPapers.length < 4 && !selectedPapers.find(p => p.id === paper.id)) {
      setSelectedPapers([...selectedPapers, paper]);
    }
    setIsSelectOpen(false);
  };
  
  const removePaper = (paperId: string) => {
    setSelectedPapers(selectedPapers.filter(p => p.id !== paperId));
  };
  
  const availablePapers = useMemo(() => {
    return libraryPapers.filter(p => !selectedPapers.find(sp => sp.id === p.id));
  }, [libraryPapers, selectedPapers]);
  
  // Find common and unique fields
  const comparison = useMemo(() => {
    if (selectedPapers.length < 2) return null;
    
    const allFields = new Set<string>();
    selectedPapers.forEach(p => {
      p.fieldsOfStudy?.forEach(f => allFields.add(f));
    });
    
    const commonFields: string[] = [];
    const uniqueFields: Record<string, string[]> = {};
    
    allFields.forEach(field => {
      const papersWithField = selectedPapers.filter(p => 
        p.fieldsOfStudy?.includes(field)
      );
      if (papersWithField.length === selectedPapers.length) {
        commonFields.push(field);
      } else {
        papersWithField.forEach(p => {
          if (!uniqueFields[p.id]) uniqueFields[p.id] = [];
          uniqueFields[p.id].push(field);
        });
      }
    });
    
    // Find year range
    const years = selectedPapers.map(p => p.year).filter(Boolean) as number[];
    const yearRange = years.length > 0 
      ? { min: Math.min(...years), max: Math.max(...years) }
      : null;
    
    // Citation comparison
    const citations = selectedPapers.map(p => ({
      id: p.id,
      title: p.title,
      citations: p.citationCount || 0,
    }));
    const maxCitations = Math.max(...citations.map(c => c.citations));
    
    return {
      commonFields,
      uniqueFields,
      yearRange,
      citations,
      maxCitations,
    };
  }, [selectedPapers]);
  
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              Paper Comparison
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Compare up to 4 papers side by side
            </p>
          </div>
          
          <Dialog open={isSelectOpen} onOpenChange={setIsSelectOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                disabled={selectedPapers.length >= 4}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Paper
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Select Paper to Compare</DialogTitle>
                <DialogDescription>
                  Choose a paper from your library
                </DialogDescription>
              </DialogHeader>
              <Command className="border rounded-lg">
                <CommandInput placeholder="Search papers..." />
                <CommandList>
                  <CommandEmpty>No papers found.</CommandEmpty>
                  <CommandGroup>
                    {availablePapers.map(paper => (
                      <CommandItem
                        key={paper.id}
                        value={paper.title}
                        onSelect={() => addPaper(paper)}
                        className="flex flex-col items-start gap-1 py-3"
                      >
                        <span className="font-medium line-clamp-1">{paper.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {paper.authors.slice(0, 2).map(a => a.name).join(', ')}
                          {paper.year && ` • ${paper.year}`}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {/* Comparison Content */}
      <ScrollArea className="flex-1">
        {selectedPapers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <ArrowLeftRight className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Select papers to compare</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add 2-4 papers from your library
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {/* Paper Cards */}
            <div className="flex gap-4 overflow-x-auto pb-2">
              {selectedPapers.map(paper => (
                <Card key={paper.id} className="min-w-[280px] max-w-[300px] shrink-0">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-medium line-clamp-2">
                        {paper.title}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => removePaper(paper.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span className="line-clamp-1">
                        {paper.authors.slice(0, 2).map(a => a.name).join(', ')}
                        {paper.authors.length > 2 && ' et al.'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-muted-foreground">
                      {paper.year && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {paper.year}
                        </span>
                      )}
                      {paper.citationCount !== undefined && (
                        <span className="flex items-center gap-1">
                          <Quote className="h-3.5 w-3.5" />
                          {paper.citationCount.toLocaleString()}
                        </span>
                      )}
                    </div>
                    
                    {paper.venue && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                        <span className="line-clamp-1">{paper.venue}</span>
                      </div>
                    )}
                    
                    <Badge variant="outline" className="text-xs">
                      {paper.providerId}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
              
              {/* Add more slot */}
              {selectedPapers.length < 4 && (
                <button
                  onClick={() => setIsSelectOpen(true)}
                  className="min-w-[280px] h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <Plus className="h-8 w-8 mb-2" />
                  <span>Add Paper</span>
                </button>
              )}
            </div>
            
            {/* Comparison Results */}
            {comparison && selectedPapers.length >= 2 && (
              <div className="space-y-6">
                {/* Common Fields */}
                {comparison.commonFields.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Common Research Fields
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {comparison.commonFields.map(field => (
                          <Badge key={field} variant="secondary">{field}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Citation Comparison */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Quote className="h-4 w-4" />
                      Citation Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {comparison.citations.map(({ id, title, citations }) => (
                      <div key={id} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="truncate max-w-[200px]">{title}</span>
                          <span className="font-medium">{citations.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ 
                              width: comparison.maxCitations > 0 
                                ? `${(citations / comparison.maxCitations) * 100}%` 
                                : '0%' 
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                
                {/* Abstract Comparison */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Abstract Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4" style={{ 
                      gridTemplateColumns: `repeat(${selectedPapers.length}, 1fr)` 
                    }}>
                      {selectedPapers.map(paper => (
                        <div key={paper.id} className="space-y-2">
                          <h4 className="font-medium text-sm line-clamp-1">{paper.title}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-6">
                            {paper.abstract || 'No abstract available'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Feature Matrix */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Feature Matrix
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 pr-4">Feature</th>
                            {selectedPapers.map(p => (
                              <th key={p.id} className="text-center py-2 px-2">
                                <span className="line-clamp-1 max-w-[120px]">{p.title.slice(0, 20)}...</span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="py-2 pr-4">Open Access</td>
                            {selectedPapers.map(p => (
                              <td key={p.id} className="text-center py-2">
                                {p.isOpenAccess ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                                )}
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 pr-4">PDF Available</td>
                            {selectedPapers.map(p => (
                              <td key={p.id} className="text-center py-2">
                                {p.pdfUrl || p.hasCachedPdf ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                                )}
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 pr-4">In Reading List</td>
                            {selectedPapers.map(p => (
                              <td key={p.id} className="text-center py-2">
                                {p.readingStatus !== 'archived' ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                                )}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-2 pr-4">User Rating</td>
                            {selectedPapers.map(p => (
                              <td key={p.id} className="text-center py-2">
                                {p.userRating ? `${p.userRating}/5` : '-'}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

export default PaperComparison;
