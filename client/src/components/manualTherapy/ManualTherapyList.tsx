import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search, Filter, Info } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';
import BodyHeatMap from './BodyHeatMap';
import { getTherapyTechniqueImage, getBodyPartGradient } from '../../lib/therapyImageUtils';

// Manual Therapy Technique type
interface ManualTherapyTechnique {
  id: number;
  title: string;
  bodyPart: string;
  description: string;
  indications: string;
  contraindications: string | null;
  technique: string;
  evidence: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
}

// Component for displaying a single manual therapy technique
function TechniqueCard({ technique }: { technique: ManualTherapyTechnique }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="h-full flex flex-col hover:shadow-md transition-shadow duration-300">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <div>
            <CardTitle className="text-lg line-clamp-2">{technique.title}</CardTitle>
            <CardDescription className="line-clamp-2 mt-1">
              {technique.description}
            </CardDescription>
          </div>
          <Badge 
            variant="outline" 
            className="capitalize"
          >
            {technique.bodyPart}
          </Badge>
        </div>
      </CardHeader>

      {/* Image display */}
      <div className="px-6 pb-2">
        <div 
          className={`relative w-full h-48 overflow-hidden rounded-md bg-gradient-to-br ${getBodyPartGradient(technique.bodyPart)}`}
        >
          <img 
            src={technique.imageUrl || getTherapyTechniqueImage(technique.title, technique.bodyPart)} 
            alt={`${technique.title} technique`} 
            className="object-cover w-full h-full"
            onError={(e) => {
              // If the image fails to load, we show a custom color gradient with an icon
              e.currentTarget.style.display = 'none';
              // The gradient background is already set as a fallback
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity duration-300">
            <div className="text-white text-center p-2">
              <h4 className="font-medium text-sm">{technique.title}</h4>
              <p className="text-xs capitalize mt-1">{technique.bodyPart} Technique</p>
            </div>
          </div>
        </div>
      </div>

      <CardContent className="flex-1">
        <div className={`space-y-2 ${!isExpanded ? 'line-clamp-3' : ''}`}>
          <div>
            <h4 className="font-semibold text-sm mb-1">Indications:</h4>
            <p className="text-sm text-muted-foreground">{technique.indications}</p>
          </div>
          
          {technique.contraindications && (
            <div>
              <h4 className="font-semibold text-sm mb-1">Contraindications:</h4>
              <p className="text-sm text-muted-foreground">{technique.contraindications}</p>
            </div>
          )}
          
          <div>
            <h4 className="font-semibold text-sm mb-1">Technique:</h4>
            <p className="text-sm text-muted-foreground">{technique.technique}</p>
          </div>
          
          {technique.evidence && (
            <div>
              <h4 className="font-semibold text-sm mb-1">Evidence:</h4>
              <p className="text-sm text-muted-foreground">{technique.evidence}</p>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-center" 
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Show Less' : 'Show More'}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function ManualTherapyList() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const techniquesPerPage = 6;
  const [viewMode, setViewMode] = useState<'tabs' | 'heatmap'>('heatmap');

  // Fetch manual therapy techniques
  const { data: techniques, isLoading, error } = useQuery<ManualTherapyTechnique[]>({
    queryKey: ['/api/manual-therapy', activeTab !== 'all' ? activeTab : null],
    queryFn: async () => {
      const url = new URL('/api/manual-therapy', window.location.origin);
      if (activeTab !== 'all') {
        url.searchParams.append('bodyPart', activeTab);
      }
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch techniques');
      }
      return response.json();
    }
  });

  // Search functionality
  const searchResults = isSearching && searchQuery
    ? techniques?.filter(technique => {
        const searchText = searchQuery.toLowerCase();
        return (
          technique.title.toLowerCase().includes(searchText) ||
          technique.description.toLowerCase().includes(searchText) ||
          technique.technique.toLowerCase().includes(searchText) ||
          technique.indications.toLowerCase().includes(searchText) ||
          (technique.contraindications && technique.contraindications.toLowerCase().includes(searchText))
        );
      })
    : null;

  // Filter techniques by tab (only when not searching)
  const filteredTechniques = searchResults || techniques || [];

  // Calculate pagination
  const totalTechniques = filteredTechniques.length;
  const totalPages = Math.ceil(totalTechniques / techniquesPerPage);

  // Get current page techniques
  const currentTechniques = filteredTechniques.slice(
    (currentPage - 1) * techniquesPerPage,
    currentPage * techniquesPerPage
  );

  // Define body part tabs
  const bodyPartTabs = [
    { id: 'all', label: 'All' },
    { id: 'shoulder', label: 'Shoulder' },
    { id: 'neck', label: 'Neck' },
    { id: 'back', label: 'Back' },
    { id: 'elbow', label: 'Elbow' },
    { id: 'wrist', label: 'Wrist' },
    { id: 'hand', label: 'Hand' },
    { id: 'hip', label: 'Hip' },
    { id: 'knee', label: 'Knee' },
    { id: 'ankle', label: 'Ankle' },
    { id: 'foot', label: 'Foot' },
  ];

  // Handle page change
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <p className="text-muted-foreground">
          Browse evidence-based manual therapy techniques for different body parts
        </p>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2 mr-2">
            <Button 
              variant={viewMode === 'heatmap' ? "default" : "outline"} 
              size="sm"
              onClick={() => setViewMode('heatmap')}
            >
              Heat Map
            </Button>
            <Button 
              variant={viewMode === 'tabs' ? "default" : "outline"} 
              size="sm"
              onClick={() => setViewMode('tabs')}
            >
              Tabs
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              type="search"
              placeholder="Search techniques..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page when searching
                if (e.target.value.length > 2) {
                  setIsSearching(true);
                } else {
                  setIsSearching(false);
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Body Heat Map View */}
      {viewMode === 'heatmap' && (
        <div className="my-6">
          <BodyHeatMap 
            onSelectBodyPart={(bodyPart) => {
              setActiveTab(bodyPart);
              setCurrentPage(1);
              setSearchQuery('');
              setIsSearching(false);
            }}
            selectedBodyPart={activeTab}
          />
        </div>
      )}

      {/* Body Part Tabs */}
      {viewMode === 'tabs' && (
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          setCurrentPage(1); // Reset to first page when changing tabs
          setSearchQuery(''); // Clear search when changing tabs
          setIsSearching(false);
        }}>
          <TabsList className="mb-4 flex flex-wrap h-auto">
            {bodyPartTabs.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className="capitalize">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Techniques Content */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500">Error loading techniques. Please try again later.</p>
          </div>
        ) : currentTechniques.length === 0 ? (
          <div className="text-center py-12">
            <Info className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No techniques found</h3>
            <p className="text-muted-foreground mt-2">
              {isSearching 
                ? "No techniques match your search criteria. Try a different search term."
                : `No techniques available for ${activeTab}. Check back later or select a different body part.`
              }
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentTechniques.map((technique) => (
                <TechniqueCard key={technique.id} technique={technique} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination className="mt-6">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) handlePageChange(currentPage - 1);
                      }}
                      className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink 
                        href="#" 
                        isActive={currentPage === i + 1}
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(i + 1);
                        }}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) handlePageChange(currentPage + 1);
                      }}
                      className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
      </div>
    </div>
  );
}