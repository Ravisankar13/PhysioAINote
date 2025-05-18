import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  RotateCcw, 
  Maximize, 
  Minimize,
  ArrowLeft,
  Info
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RegionHotspot {
  id: string;
  name: string;
  x: number;
  y: number;
  description: string;
  techniques: TechniqueItem[];
}

interface TechniqueItem {
  id: string;
  name: string;
  description: string;
  procedure: string;
  evidence: string;
  imageUrl?: string;
}

interface BodyPartZoomProps {
  bodyPart: string;
  imageUrl: string;
  hotspots?: RegionHotspot[];
}

export default function BodyPartZoom({ bodyPart, imageUrl, hotspots = [] }: BodyPartZoomProps) {
  // State for the component
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [selectedHotspot, setSelectedHotspot] = useState<RegionHotspot | null>(null);
  const [selectedTechnique, setSelectedTechnique] = useState<TechniqueItem | null>(null);
  const [isZoomedIn, setIsZoomedIn] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Reset position when zooming out
  useEffect(() => {
    if (scale === 1) {
      setPosition({ x: 0, y: 0 });
    }
  }, [scale]);
  
  // Handle zoom in/out
  const handleZoomIn = () => {
    setScale(prevScale => Math.min(prevScale + 0.5, 4));
    if (scale === 1) {
      setIsZoomedIn(true);
    }
  };
  
  const handleZoomOut = () => {
    setScale(prevScale => Math.max(prevScale - 0.5, 1));
    if (scale <= 1.5) {
      setIsZoomedIn(false);
    }
  };
  
  // Handle rotation
  const handleRotateClockwise = () => {
    setRotation(prevRotation => prevRotation + 15);
  };
  
  const handleRotateCounterclockwise = () => {
    setRotation(prevRotation => prevRotation - 15);
  };
  
  // Reset view
  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setIsZoomedIn(false);
    setSelectedHotspot(null);
    setSelectedTechnique(null);
  };
  
  // Handle hotspot selection
  const handleHotspotClick = (hotspot: RegionHotspot) => {
    setSelectedHotspot(hotspot);
    
    // Calculate the position to center on the hotspot
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      
      // Calculate the center position
      const targetX = -(hotspot.x / 100 * containerWidth - containerWidth / 2);
      const targetY = -(hotspot.y / 100 * containerHeight - containerHeight / 2);
      
      setPosition({ x: targetX, y: targetY });
      setScale(2); // Zoom in on the hotspot
      setIsZoomedIn(true);
    }
  };
  
  // Handle technique selection
  const handleTechniqueClick = (technique: TechniqueItem) => {
    setSelectedTechnique(technique);
  };
  
  // Back button functionality for technique view
  const handleBackToHotspot = () => {
    setSelectedTechnique(null);
  };
  
  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{bodyPart} Technique Explorer</CardTitle>
            <CardDescription>
              Zoom and interact with specific regions to explore manual therapy techniques
            </CardDescription>
          </div>
          
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleZoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Zoom In</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleZoomOut} disabled={scale <= 1}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Zoom Out</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleRotateClockwise}>
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Rotate Clockwise</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleRotateCounterclockwise}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Rotate Counter-clockwise</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleReset}>
                    <Minimize className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reset View</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative">
        <div className="flex flex-col lg:flex-row w-full h-[600px] gap-4">
          {/* Left side: Interactive body part image */}
          <div 
            ref={containerRef}
            className="relative overflow-hidden w-full lg:w-2/3 h-full border rounded-md bg-slate-50 shadow-inner"
          >
            <motion.div
              className="relative w-full h-full"
              style={{
                cursor: isZoomedIn ? "grab" : "default",
              }}
              drag={isZoomedIn}
              dragConstraints={containerRef}
              dragElastic={0.1}
              animate={{
                x: position.x,
                y: position.y,
                scale,
                rotate: rotation,
              }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30
              }}
            >
              <img 
                src={imageUrl}
                alt={`${bodyPart} anatomy`}
                className="object-contain w-full h-full"
              />
              
              {/* Hotspots */}
              {hotspots.map((hotspot) => (
                <motion.button
                  key={hotspot.id}
                  className={`absolute w-6 h-6 rounded-full ${
                    selectedHotspot?.id === hotspot.id 
                      ? 'bg-primary border-2 border-white' 
                      : 'bg-primary/70 hover:bg-primary border border-white'
                  }`}
                  style={{
                    left: `${hotspot.x}%`,
                    top: `${hotspot.y}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10,
                  }}
                  onClick={() => handleHotspotClick(hotspot)}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 17 }}
                >
                  <span className="sr-only">{hotspot.name}</span>
                </motion.button>
              ))}
            </motion.div>
          </div>
          
          {/* Right side: Details panel */}
          <div className="w-full lg:w-1/3 h-full border rounded-md bg-background shadow overflow-auto">
            <AnimatePresence mode="wait">
              {selectedTechnique ? (
                // Technique detail view
                <motion.div
                  key="technique-detail"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 h-full"
                >
                  <div className="flex items-center mb-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mr-2"
                      onClick={handleBackToHotspot}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                    <h3 className="text-lg font-semibold">{selectedTechnique.name}</h3>
                  </div>
                  
                  {selectedTechnique.imageUrl && (
                    <div className="mb-4 rounded-md overflow-hidden">
                      <img 
                        src={selectedTechnique.imageUrl} 
                        alt={selectedTechnique.name} 
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Description</h4>
                      <p className="text-sm">{selectedTechnique.description}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Procedure</h4>
                      <p className="text-sm">{selectedTechnique.procedure}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Research Evidence</h4>
                      <p className="text-sm">{selectedTechnique.evidence}</p>
                    </div>
                  </div>
                </motion.div>
              ) : selectedHotspot ? (
                // Hotspot techniques list view
                <motion.div
                  key="hotspot-detail"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 h-full"
                >
                  <div className="flex items-center mb-4">
                    <h3 className="text-lg font-semibold">{selectedHotspot.name}</h3>
                  </div>
                  
                  <p className="text-sm mb-4">{selectedHotspot.description}</p>
                  
                  <h4 className="text-sm font-semibold mb-2">Available Techniques</h4>
                  <div className="space-y-2">
                    {selectedHotspot.techniques.map((technique) => (
                      <motion.div
                        key={technique.id}
                        className="border rounded-md p-3 cursor-pointer hover:bg-secondary/20"
                        onClick={() => handleTechniqueClick(technique)}
                        whileHover={{ scale: 1.01 }}
                        transition={{ type: 'spring', stiffness: 500 }}
                      >
                        <div className="flex justify-between items-center">
                          <h5 className="font-medium">{technique.name}</h5>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {technique.description.substring(0, 60)}
                          {technique.description.length > 60 ? '...' : ''}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                // Initial instruction view
                <motion.div
                  key="instruction"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-full p-6 text-center"
                >
                  <Maximize className="h-12 w-12 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-semibold mb-2">Interactive Explorer</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Click on any highlighted point on the {bodyPart} to explore specific regions and associated manual therapy techniques.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Use the zoom and rotation controls to get a better view of the anatomy.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Mock data generator for demo purposes
export function getDefaultHotspots(bodyPart: string): RegionHotspot[] {
  if (bodyPart === 'shoulder') {
    return [
      {
        id: 'rotator-cuff',
        name: 'Rotator Cuff',
        x: 30,
        y: 25,
        description: 'The rotator cuff is a group of muscles and tendons that surround the shoulder joint, keeping the head of the upper arm bone firmly within the shoulder socket.',
        techniques: [
          {
            id: 'mulligan-mwm',
            name: 'Mulligan Mobilization with Movement (MWM)',
            description: 'A manual therapy technique that combines a sustained manual glide with active movement, used for shoulder impingement and rotator cuff pathologies.',
            procedure: 'The therapist applies a posterolateral glide to the humeral head while the patient actively abducts the shoulder through a pain-free range. The glide is held during the movement and released at the end range.',
            evidence: 'Multiple randomized controlled trials have shown immediate improvements in pain-free range of motion with MWM techniques for shoulder impingement (Teys et al., 2013; Djordjevic et al., 2012).'
          },
          {
            id: 'maitland-oscillations',
            name: 'Maitland Oscillations',
            description: 'Rhythmic oscillatory movements applied to the glenohumeral joint to improve mobility and reduce pain in rotator cuff conditions.',
            procedure: 'With the patient supine, the therapist stabilizes the scapula with one hand and applies grades I-IV posteroanterior oscillations to the humeral head with the other hand at varying speeds.',
            evidence: 'Systematic reviews support the use of Maitland mobilizations for shoulder pain, with moderate evidence for effectiveness in improving short-term pain and function (Camarinos & Marinko, 2009).'
          }
        ]
      },
      {
        id: 'ac-joint',
        name: 'Acromioclavicular (AC) Joint',
        x: 25,
        y: 15,
        description: 'The AC joint is where the acromion process of the scapula meets the clavicle. It's commonly affected by sprains, osteoarthritis and osteolysis.',
        techniques: [
          {
            id: 'ac-mobilization',
            name: 'AC Joint Mobilization',
            description: 'Gentle mobilization techniques to improve mobility and reduce pain in the acromioclavicular joint.',
            procedure: 'The patient is positioned supine. The therapist stabilizes the acromion with one hand and applies graded anterior-posterior or superior-inferior mobilizations to the lateral end of the clavicle.',
            evidence: 'Clinical studies show joint mobilization of the AC joint can reduce pain and improve function in patients with AC joint arthritis and instability (Moeley et al., 2019).'
          }
        ]
      },
      {
        id: 'glenohumeral-joint',
        name: 'Glenohumeral Joint',
        x: 35,
        y: 30,
        description: 'The main shoulder joint formed by the articulation between the head of the humerus and the glenoid cavity of the scapula.',
        techniques: [
          {
            id: 'inferior-glide',
            name: 'Inferior Glide Technique',
            description: 'A manual therapy technique used to increase shoulder abduction range and treat adhesive capsulitis (frozen shoulder).',
            procedure: 'With the patient supine and the shoulder in slight abduction, the therapist stabilizes the scapula and applies a gentle, sustained inferior glide to the humeral head while progressively increasing shoulder abduction.',
            evidence: 'Research by Johnson et al. (2007) demonstrated significant improvements in shoulder abduction range following application of inferior glenohumeral glides in patients with restricted mobility.'
          },
          {
            id: 'kaltenborn-traction',
            name: 'Kaltenborn Traction',
            description: 'Axial traction technique applied to the glenohumeral joint to improve joint mobility and reduce pain.',
            procedure: 'The patient lies supine with the shoulder at the edge of the table. The therapist grasps the proximal humerus and applies a gentle, sustained longitudinal traction force along the axis of the humerus.',
            evidence: 'Studies show traction techniques can create negative intra-articular pressure, potentially improving synovial fluid circulation and reducing joint compression (Hsieh et al., 2002).'
          }
        ]
      }
    ];
  } else if (bodyPart === 'knee') {
    return [
      {
        id: 'patellofemoral',
        name: 'Patellofemoral Joint',
        x: 50,
        y: 40,
        description: 'The joint between the patella (kneecap) and the femur. Common site of anterior knee pain and tracking issues.',
        techniques: [
          {
            id: 'patella-mobilization',
            name: 'Patella Mobilization',
            description: 'Manual mobilization of the patella to improve tracking and reduce pain in patellofemoral conditions.',
            procedure: 'With the patient supine and knee slightly flexed with a towel roll, the therapist gently mobilizes the patella in superior, inferior, medial, and lateral directions.',
            evidence: 'Research by McConnell and Bennell has shown that patella mobilization can immediately reduce pain and improve function in patients with patellofemoral pain syndrome.'
          }
        ]
      },
      {
        id: 'tibiofemoral',
        name: 'Tibiofemoral Joint',
        x: 50,
        y: 50,
        description: 'The main knee joint between the femur and tibia, crucial for weight-bearing and movement.',
        techniques: [
          {
            id: 'maitland-ap-mobilization',
            name: 'Maitland Anteroposterior Mobilization',
            description: 'Rhythmic oscillatory movements applied to the tibiofemoral joint to improve knee flexion and extension.',
            procedure: 'With the patient supine and knee supported, the therapist applies graded anteroposterior glides to the proximal tibia while monitoring pain response and tissue resistance.',
            evidence: 'Systematic reviews indicate that manual therapy including AP mobilizations can reduce pain and improve function in patients with knee osteoarthritis (Jansen et al., 2011).'
          }
        ]
      }
    ];
  } else {
    // Default hotspots for any other body part
    return [
      {
        id: 'region-1',
        name: `Primary ${bodyPart} Region`,
        x: 40,
        y: 40,
        description: `This is the main region of the ${bodyPart} commonly affected by musculoskeletal conditions.`,
        techniques: [
          {
            id: 'technique-1',
            name: 'Mobilization Technique',
            description: `Standard mobilization approach for the ${bodyPart}.`,
            procedure: 'The therapist positions the patient comfortably and applies graded oscillatory movements to the affected joint or tissue.',
            evidence: 'Clinical evidence supports the use of manual therapy techniques for improving range of motion and reducing pain.'
          }
        ]
      },
      {
        id: 'region-2',
        name: `Secondary ${bodyPart} Region`,
        x: 60,
        y: 60,
        description: `Another important area of the ${bodyPart} often requiring therapeutic intervention.`,
        techniques: [
          {
            id: 'technique-2',
            name: 'Soft Tissue Technique',
            description: `Specialized soft tissue manipulation for ${bodyPart} conditions.`,
            procedure: 'The therapist uses specific hand positions and pressure to address soft tissue restrictions and improve tissue mobility.',
            evidence: 'Research supports the efficacy of targeted soft tissue techniques for reducing pain and improving function.'
          }
        ]
      }
    ];
  }
}