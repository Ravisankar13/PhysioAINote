/**
 * Anatomy Image Gallery Component
 * 
 * Displays anatomical images from Z-Anatomy and other sources
 * with support for multiple views, labels, and zoom functionality
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Download,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Tag,
  Eye,
  Info
} from "lucide-react";

export interface AnatomyImage {
  source: "z_anatomy" | "manual_upload";
  imageUrl: string;
  thumbnail?: string;
  structure: string; // e.g., "biceps tendon", "rotator cuff"
  viewType?: "anterior" | "posterior" | "lateral" | "medial" | "superior" | "inferior";
  labels?: string[]; // anatomical labels
  description?: string;
}

interface AnatomyImageGalleryProps {
  images: AnatomyImage[];
  title?: string;
  currentStructure?: string;
  showLabels?: boolean;
  enableZoom?: boolean;
}

export function AnatomyImageGallery({
  images,
  title = "Anatomical Views",
  currentStructure,
  showLabels = true,
  enableZoom = true
}: AnatomyImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<AnatomyImage | null>(
    images.length > 0 ? images[0] : null
  );
  const [zoom, setZoom] = useState(1);
  const [showImageLabels, setShowImageLabels] = useState(showLabels);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Group images by view type
  const imagesByView = images.reduce((acc, img) => {
    const view = img.viewType || 'other';
    if (!acc[view]) acc[view] = [];
    acc[view].push(img);
    return acc;
  }, {} as Record<string, AnatomyImage[]>);
  
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };
  
  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };
  
  const handleReset = () => {
    setZoom(1);
  };
  
  const handleDownload = () => {
    if (selectedImage) {
      const link = document.createElement('a');
      link.href = selectedImage.imageUrl;
      link.download = `${selectedImage.structure}_${selectedImage.viewType || 'view'}.png`;
      link.click();
    }
  };
  
  const handleFullscreen = () => {
    setIsFullscreen(true);
    // In a real implementation, you'd open a fullscreen modal here
  };
  
  const navigateImage = (direction: 'prev' | 'next') => {
    const currentIndex = images.findIndex(img => img === selectedImage);
    if (direction === 'prev' && currentIndex > 0) {
      setSelectedImage(images[currentIndex - 1]);
    } else if (direction === 'next' && currentIndex < images.length - 1) {
      setSelectedImage(images[currentIndex + 1]);
    }
  };
  
  if (images.length === 0) {
    return (
      <Card data-testid="anatomy-gallery-empty">
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">No anatomical images available</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full" data-testid="anatomy-gallery">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {title}
            {currentStructure && (
              <Badge variant="secondary">{currentStructure}</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {images.length} {images.length === 1 ? 'image' : 'images'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* View type tabs */}
        {Object.keys(imagesByView).length > 1 ? (
          <Tabs defaultValue={Object.keys(imagesByView)[0]} className="w-full">
            <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full">
              {Object.entries(imagesByView).map(([view, viewImages]) => (
                <TabsTrigger 
                  key={view} 
                  value={view}
                  onClick={() => setSelectedImage(viewImages[0])}
                  data-testid={`tab-${view}`}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {viewImages.length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
            
            {Object.entries(imagesByView).map(([view, viewImages]) => (
              <TabsContent key={view} value={view} className="mt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {viewImages.map((img, idx) => (
                    <div
                      key={idx}
                      className={`cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                        selectedImage === img ? 'border-primary' : 'border-transparent hover:border-muted-foreground'
                      }`}
                      onClick={() => setSelectedImage(img)}
                      data-testid={`thumbnail-${idx}`}
                    >
                      <img
                        src={img.thumbnail || img.imageUrl}
                        alt={img.structure}
                        className="w-full h-24 object-cover"
                      />
                      <p className="text-xs text-center p-1 truncate">{img.structure}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {images.map((img, idx) => (
              <div
                key={idx}
                className={`cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                  selectedImage === img ? 'border-primary' : 'border-transparent hover:border-muted-foreground'
                }`}
                onClick={() => setSelectedImage(img)}
                data-testid={`thumbnail-${idx}`}
              >
                <img
                  src={img.thumbnail || img.imageUrl}
                  alt={img.structure}
                  className="w-full h-24 object-cover"
                />
                <p className="text-xs text-center p-1 truncate">{img.structure}</p>
              </div>
            ))}
          </div>
        )}
        
        {/* Main image viewer */}
        {selectedImage && (
          <div className="space-y-4">
            <div className="relative bg-muted rounded-lg overflow-hidden" style={{ height: '400px' }}>
              <div 
                className="absolute inset-0 flex items-center justify-center overflow-auto"
                style={{ transform: `scale(${zoom})` }}
              >
                <img
                  src={selectedImage.imageUrl}
                  alt={selectedImage.structure}
                  className="max-w-full max-h-full object-contain"
                  data-testid="main-image"
                />
                
                {/* Overlay labels if enabled */}
                {showImageLabels && selectedImage.labels && (
                  <div className="absolute inset-0 pointer-events-none">
                    {selectedImage.labels.map((label, idx) => (
                      <div
                        key={idx}
                        className="absolute bg-black/70 text-white text-xs px-2 py-1 rounded"
                        style={{
                          // In a real app, you'd have coordinates for label positions
                          top: `${20 + idx * 30}px`,
                          left: '20px'
                        }}
                      >
                        <Tag className="h-3 w-3 inline mr-1" />
                        {label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
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
              
              {/* Control buttons */}
              <div className="absolute bottom-4 left-4 flex gap-2 bg-background/90 p-2 rounded-lg shadow-lg">
                {enableZoom && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleZoomIn}
                      title="Zoom in"
                      data-testid="button-zoom-in"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleZoomOut}
                      title="Zoom out"
                      data-testid="button-zoom-out"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleReset}
                      title="Reset zoom"
                      data-testid="button-reset"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowImageLabels(!showImageLabels)}
                  title="Toggle labels"
                  disabled={!selectedImage.labels || selectedImage.labels.length === 0}
                  data-testid="button-toggle-labels"
                >
                  <Tag className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDownload}
                  title="Download image"
                  data-testid="button-download"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleFullscreen}
                  title="Fullscreen"
                  data-testid="button-fullscreen"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Image information */}
            {selectedImage.description && (
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{selectedImage.structure}</p>
                    <p className="text-xs text-muted-foreground">{selectedImage.description}</p>
                    <div className="flex gap-2 mt-2">
                      {selectedImage.viewType && (
                        <Badge variant="secondary" className="text-xs">
                          {selectedImage.viewType} view
                        </Badge>
                      )}
                      {selectedImage.source === 'z_anatomy' && (
                        <Badge variant="outline" className="text-xs">
                          Z-Anatomy
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}