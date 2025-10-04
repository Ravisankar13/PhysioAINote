/**
 * Clinical Images Viewer Component
 * 
 * Displays clinical images from NIH Open-i and other medical image sources
 * with support for different imaging modalities and clinical annotations
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Image as ImageIcon,
  FileX,
  Loader2,
  ExternalLink,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Info,
  AlertCircle
} from "lucide-react";

export interface ClinicalImage {
  source: "nih_openi" | "manual_upload";
  imageUrl: string;
  thumbnail?: string;
  title: string;
  description?: string;
  imageType?: "xray" | "mri" | "ct" | "ultrasound" | "clinical_photo";
  attribution?: string;
  pmid?: string; // PubMed ID if from NIH
  abstract?: string;
  keywords?: string[];
}

interface ClinicalImagesViewerProps {
  images: ClinicalImage[];
  title?: string;
  showSearch?: boolean;
  onSearchImages?: (query: string) => Promise<ClinicalImage[]>;
  bodyPart?: string;
  condition?: string;
}

export function ClinicalImagesViewer({
  images: initialImages,
  title = "Clinical Images",
  showSearch = false,
  onSearchImages,
  bodyPart,
  condition
}: ClinicalImagesViewerProps) {
  const [images, setImages] = useState<ClinicalImage[]>(initialImages);
  const [selectedImage, setSelectedImage] = useState<ClinicalImage | null>(
    images.length > 0 ? images[0] : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Group images by type
  const imagesByType = images.reduce((acc, img) => {
    const type = img.imageType || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(img);
    return acc;
  }, {} as Record<string, ClinicalImage[]>);
  
  // Auto-fetch images if none provided but search is available
  useEffect(() => {
    if (images.length === 0 && onSearchImages && (bodyPart || condition)) {
      handleAutoSearch();
    }
  }, [bodyPart, condition]);
  
  const handleAutoSearch = async () => {
    if (!onSearchImages) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const query = [bodyPart, condition].filter(Boolean).join(' ');
      const results = await onSearchImages(query);
      setImages(results);
      if (results.length > 0) {
        setSelectedImage(results[0]);
      }
    } catch (err) {
      setError("Failed to fetch clinical images");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSearch = async () => {
    if (!onSearchImages || !searchQuery.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const results = await onSearchImages(searchQuery);
      setImages(results);
      if (results.length > 0) {
        setSelectedImage(results[0]);
      }
    } catch (err) {
      setError("Search failed. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const navigateImage = (direction: 'prev' | 'next') => {
    const currentIndex = images.findIndex(img => img === selectedImage);
    if (direction === 'prev' && currentIndex > 0) {
      setSelectedImage(images[currentIndex - 1]);
    } else if (direction === 'next' && currentIndex < images.length - 1) {
      setSelectedImage(images[currentIndex + 1]);
    }
  };
  
  const getImageTypeIcon = (type?: string) => {
    const typeColors = {
      xray: 'bg-blue-500',
      mri: 'bg-purple-500',
      ct: 'bg-orange-500',
      ultrasound: 'bg-green-500',
      clinical_photo: 'bg-pink-500'
    };
    
    return (
      <Badge 
        variant="secondary" 
        className={`text-xs ${type ? typeColors[type as keyof typeof typeColors] : 'bg-gray-500'} text-white`}
      >
        {type ? type.toUpperCase() : 'IMAGE'}
      </Badge>
    );
  };
  
  return (
    <Card className="w-full" data-testid="clinical-images-viewer">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            {title}
            {condition && (
              <Badge variant="outline">{condition}</Badge>
            )}
          </CardTitle>
          {images.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {images.length} {images.length === 1 ? 'image' : 'images'}
            </Badge>
          )}
        </div>
        
        {/* Search bar */}
        {showSearch && onSearchImages && (
          <div className="flex gap-2 mt-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={`Search clinical images... ${bodyPart ? `(${bodyPart})` : ''}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background"
                data-testid="search-input"
              />
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={isLoading}
              data-testid="button-search"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleAutoSearch}
              disabled={isLoading || (!bodyPart && !condition)}
              title="Refresh images"
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading clinical images...</p>
            </div>
          </div>
        )}
        
        {!isLoading && images.length === 0 && (
          <div className="text-center py-8">
            <FileX className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No clinical images available</p>
            {showSearch && (
              <p className="text-sm text-muted-foreground mt-2">
                Try searching for specific conditions or imaging types
              </p>
            )}
          </div>
        )}
        
        {!isLoading && images.length > 0 && (
          <>
            {/* Image type tabs */}
            {Object.keys(imagesByType).length > 1 ? (
              <Tabs defaultValue={Object.keys(imagesByType)[0]} className="w-full">
                <TabsList className="w-full">
                  {Object.entries(imagesByType).map(([type, typeImages]) => (
                    <TabsTrigger 
                      key={type} 
                      value={type}
                      onClick={() => setSelectedImage(typeImages[0])}
                      className="flex-1"
                      data-testid={`tab-${type}`}
                    >
                      {getImageTypeIcon(type === 'other' ? undefined : type)}
                      <span className="ml-2">{typeImages.length}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {Object.entries(imagesByType).map(([type, typeImages]) => (
                  <TabsContent key={type} value={type} className="mt-4">
                    <ScrollArea className="h-32">
                      <div className="flex gap-2">
                        {typeImages.map((img, idx) => (
                          <div
                            key={idx}
                            className={`cursor-pointer border-2 rounded-lg overflow-hidden transition-all flex-shrink-0 ${
                              selectedImage === img ? 'border-primary' : 'border-transparent hover:border-muted-foreground'
                            }`}
                            onClick={() => setSelectedImage(img)}
                            data-testid={`thumbnail-${type}-${idx}`}
                          >
                            <img
                              src={img.thumbnail || img.imageUrl}
                              alt={img.title}
                              className="w-24 h-24 object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <ScrollArea className="h-32">
                <div className="flex gap-2">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className={`cursor-pointer border-2 rounded-lg overflow-hidden transition-all flex-shrink-0 ${
                        selectedImage === img ? 'border-primary' : 'border-transparent hover:border-muted-foreground'
                      }`}
                      onClick={() => setSelectedImage(img)}
                      data-testid={`thumbnail-${idx}`}
                    >
                      <img
                        src={img.thumbnail || img.imageUrl}
                        alt={img.title}
                        className="w-24 h-24 object-cover"
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            
            {/* Main image viewer */}
            {selectedImage && (
              <div className="space-y-4">
                <div className="relative bg-muted rounded-lg overflow-hidden" style={{ height: '400px' }}>
                  <img
                    src={selectedImage.imageUrl}
                    alt={selectedImage.title}
                    className="w-full h-full object-contain"
                    data-testid="main-image"
                  />
                  
                  {/* Navigation arrows */}
                  {images.length > 1 && (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80"
                        onClick={() => navigateImage('prev')}
                        disabled={images.indexOf(selectedImage) === 0}
                        data-testid="button-prev"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80"
                        onClick={() => navigateImage('next')}
                        disabled={images.indexOf(selectedImage) === images.length - 1}
                        data-testid="button-next"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  
                  {/* Image type badge */}
                  <div className="absolute top-4 left-4">
                    {getImageTypeIcon(selectedImage.imageType)}
                  </div>
                </div>
                
                {/* Image information */}
                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{selectedImage.title}</h4>
                      {selectedImage.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {selectedImage.description}
                        </p>
                      )}
                    </div>
                    {selectedImage.pmid && (
                      <a
                        href={`https://pubmed.ncbi.nlm.nih.gov/${selectedImage.pmid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                        data-testid="pubmed-link"
                      >
                        PubMed
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  
                  {selectedImage.abstract && (
                    <div className="border-t pt-3">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="text-xs font-medium mb-1">Clinical Context</p>
                          <p className="text-xs text-muted-foreground line-clamp-3">
                            {selectedImage.abstract}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {selectedImage.keywords && selectedImage.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedImage.keywords.slice(0, 5).map((keyword, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {selectedImage.attribution && (
                    <p className="text-xs text-muted-foreground">
                      Source: {selectedImage.attribution}
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}