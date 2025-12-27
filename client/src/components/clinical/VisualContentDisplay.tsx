import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Image, 
  Video, 
  ExternalLink,
  Sparkles,
  Camera,
  Play,
  X
} from "lucide-react";
import { useState } from "react";

interface VisualContentItem {
  url?: string;
  prompt?: string;
  type: 'generated' | 'external' | 'video';
  description?: string;
  source?: string;
  photographer?: string;
  videoId?: string;
  title?: string;
  thumbnail?: string;
  embedUrl?: string;
}

interface VisualContentDisplayProps {
  visualContent?: VisualContentItem[];
  exerciseImages?: Array<{
    exerciseName: string;
    primaryImageUrl: string;
    instructions?: string[];
    tips?: string[];
    category?: string;
    source?: string;
    videoUrl?: string;
  }>;
}

export default function VisualContentDisplay({ visualContent, exerciseImages }: VisualContentDisplayProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState<string | null>(null);

  if (!visualContent?.length && !exerciseImages?.length) {
    return null;
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Visual Content Section */}
      {visualContent && visualContent.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-500" />
            Visual Content
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visualContent.map((item, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
                {item.type === 'generated' && (
                  <div className="relative">
                    <img 
                      src={item.url} 
                      alt={item.prompt || "Generated image"}
                      className="w-full h-48 object-cover cursor-pointer"
                      onClick={() => setSelectedImage(item.url!)}
                    />
                    <Badge className="absolute top-2 right-2 bg-purple-500">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI Generated
                    </Badge>
                  </div>
                )}
                
                {item.type === 'external' && (
                  <div className="relative">
                    <img 
                      src={item.url} 
                      alt={item.description || "External image"}
                      className="w-full h-48 object-cover cursor-pointer"
                      onClick={() => setSelectedImage(item.url!)}
                    />
                    <Badge className="absolute top-2 right-2 bg-green-500">
                      <Camera className="h-3 w-3 mr-1" />
                      {item.source}
                    </Badge>
                  </div>
                )}
                
                {item.type === 'video' && (
                  <div className="relative">
                    <img 
                      src={item.thumbnail} 
                      alt={item.title || "Video thumbnail"}
                      className="w-full h-48 object-cover cursor-pointer"
                      onClick={() => setShowVideo(item.embedUrl!)}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/50 rounded-full p-3">
                        <Play className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <Badge className="absolute top-2 right-2 bg-red-500">
                      <Video className="h-3 w-3 mr-1" />
                      Video
                    </Badge>
                  </div>
                )}
                
                <CardContent className="p-3">
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {item.type === 'generated' && item.prompt}
                    {item.type === 'external' && item.description}
                    {item.type === 'video' && item.title}
                  </p>
                  {item.photographer && (
                    <p className="text-xs text-gray-500 mt-1">
                      Photo by {item.photographer}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Exercise Images Section */}
      {exerciseImages && exerciseImages.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Image className="h-4 w-4 text-green-500" />
            Exercise Demonstrations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exerciseImages.map((exercise, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  <img 
                    src={exercise.primaryImageUrl} 
                    alt={exercise.exerciseName}
                    className="w-full h-48 object-cover cursor-pointer"
                    onClick={() => setSelectedImage(exercise.primaryImageUrl)}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23e5e7eb" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%239ca3af" font-size="10">No Image</text></svg>';
                    }}
                  />
                  <div className="absolute top-2 right-2 flex gap-1">
                    {exercise.source === 'Rehab My Patient' && (
                      <Badge className="bg-teal-600">
                        RMP
                      </Badge>
                    )}
                    {exercise.category && (
                      <Badge variant="secondary">
                        {exercise.category}
                      </Badge>
                    )}
                  </div>
                </div>
                <CardContent className="p-3">
                  <h4 className="font-semibold text-sm mb-2">{exercise.exerciseName}</h4>
                  {exercise.instructions && exercise.instructions.length > 0 && (
                    <div className="text-xs text-gray-600 space-y-1">
                      <p className="font-medium">Instructions:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {exercise.instructions.slice(0, 2).map((instruction, i) => (
                          <li key={i} className="line-clamp-1">{instruction}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {exercise.tips && exercise.tips.length > 0 && (
                    <div className="text-xs text-gray-500 mt-2">
                      <p className="font-medium">Tip:</p>
                      <p className="line-clamp-2">{exercise.tips[0]}</p>
                    </div>
                  )}
                  {exercise.videoUrl && (
                    <a 
                      href={exercise.videoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-teal-600 hover:underline mt-2 inline-flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Watch Video
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img 
              src={selectedImage} 
              alt="Full size"
              className="w-auto h-auto max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-white/10 hover:bg-white/20"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-5 w-5 text-white" />
            </Button>
          </div>
        </div>
      )}

      {/* Video Modal */}
      {showVideo && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowVideo(null)}
        >
          <div className="relative w-full max-w-4xl">
            <div className="relative pt-[56.25%]" onClick={(e) => e.stopPropagation()}>
              <iframe
                src={showVideo}
                className="absolute inset-0 w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-white/10 hover:bg-white/20"
              onClick={() => setShowVideo(null)}
            >
              <X className="h-5 w-5 text-white" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}