'use client';

/**
 * Academic Mode Page - Paper search, library, analysis, and statistics
 */

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Library, BarChart3, ArrowLeftRight, Brain, GraduationCap, Lightbulb, Wand2 } from 'lucide-react';
import { PaperSearch } from '@/components/academic/paper-search';
import { PaperLibrary } from '@/components/academic/paper-library';
import { PaperDetail } from '@/components/academic/paper-detail';
import { AcademicStats } from '@/components/academic/academic-stats';
import { PaperComparison } from '@/components/academic/paper-comparison';
import { PaperRecommendations } from '@/components/academic/paper-recommendations';
import { SmartCollections } from '@/components/academic/smart-collections';
import { AcademicChatPanel } from '@/components/academic/academic-chat-panel';
import { useAcademicStore } from '@/stores/academic';
import type { LibraryPaper, Paper } from '@/types/learning/academic';

type AcademicTab = 'search' | 'library' | 'stats' | 'compare' | 'recommend' | 'smart' | 'analysis';

export default function AcademicPage() {
  const { activeTab, setActiveTab, refreshLibrary, refreshCollections } = useAcademicStore();
  const [selectedPaper, setSelectedPaper] = useState<LibraryPaper | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  
  // Load library and collections on mount
  useEffect(() => {
    refreshLibrary();
    refreshCollections();
  }, [refreshLibrary, refreshCollections]);
  
  const handlePaperSelect = (paper: LibraryPaper) => {
    setSelectedPaper(paper);
    setDetailOpen(true);
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center gap-3">
        <GraduationCap className="h-6 w-6 text-primary" />
        <div>
          <h1 className="font-semibold">Academic Research</h1>
          <p className="text-xs text-muted-foreground">Search, manage, and analyze academic papers</p>
        </div>
      </div>
      
      <Tabs 
        value={activeTab} 
        onValueChange={(v) => setActiveTab(v as AcademicTab)}
        className="flex-1 flex flex-col"
      >
        <div className="border-b px-4">
          <TabsList className="h-11">
            <TabsTrigger value="search" className="gap-2 text-sm" data-tour="academic-research">
              <Search className="h-4 w-4" />
              Search
            </TabsTrigger>
            <TabsTrigger value="library" className="gap-2 text-sm">
              <Library className="h-4 w-4" />
              Library
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2 text-sm">
              <BarChart3 className="h-4 w-4" />
              Statistics
            </TabsTrigger>
            <TabsTrigger value="compare" className="gap-2 text-sm">
              <ArrowLeftRight className="h-4 w-4" />
              Compare
            </TabsTrigger>
            <TabsTrigger value="recommend" className="gap-2 text-sm">
              <Lightbulb className="h-4 w-4" />
              Discover
            </TabsTrigger>
            <TabsTrigger value="smart" className="gap-2 text-sm">
              <Wand2 className="h-4 w-4" />
              Smart
            </TabsTrigger>
            <TabsTrigger value="analysis" className="gap-2 text-sm" data-tour="academic-writing">
              <Brain className="h-4 w-4" />
              AI
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="search" className="flex-1 mt-0 data-[state=active]:flex data-[state=active]:flex-col">
          <PaperSearch className="flex-1" />
        </TabsContent>
        
        <TabsContent value="library" className="flex-1 mt-0 data-[state=active]:flex data-[state=active]:flex-col">
          <PaperLibrary className="flex-1" onPaperSelect={handlePaperSelect} />
        </TabsContent>
        
        <TabsContent value="stats" className="flex-1 mt-0 overflow-auto">
          <AcademicStats />
        </TabsContent>
        
        <TabsContent value="compare" className="flex-1 mt-0 data-[state=active]:flex data-[state=active]:flex-col">
          <PaperComparison className="flex-1" />
        </TabsContent>
        
        <TabsContent value="recommend" className="flex-1 mt-0 data-[state=active]:flex data-[state=active]:flex-col">
          <PaperRecommendations className="flex-1" />
        </TabsContent>
        
        <TabsContent value="smart" className="flex-1 mt-0 data-[state=active]:flex data-[state=active]:flex-col">
          <SmartCollections className="flex-1" />
        </TabsContent>
        
        <TabsContent value="analysis" className="flex-1 mt-0 data-[state=active]:flex data-[state=active]:flex-col">
          <AcademicChatPanel 
            className="flex-1"
            onPaperSelect={(paper: Paper) => {
              setSelectedPaper(paper as LibraryPaper);
              setDetailOpen(true);
            }}
            onAddToLibrary={() => {
              refreshLibrary();
            }}
          />
        </TabsContent>
      </Tabs>
      
      {/* Paper Detail Sheet */}
      <PaperDetail 
        paper={selectedPaper} 
        open={detailOpen} 
        onOpenChange={setDetailOpen} 
      />
    </div>
  );
}
