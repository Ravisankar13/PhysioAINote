import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Book,
  FileText,
  ExternalLink,
  Star,
  Clock,
  Filter,
  ChevronRight,
  Stethoscope,
  FlaskConical,
  Activity,
  BookOpen,
  GraduationCap,
  TrendingUp
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ClinicalReference {
  id: string;
  title: string;
  category: 'guideline' | 'protocol' | 'test' | 'condition' | 'research' | 'treatment';
  description: string;
  source: string;
  year: number;
  evidenceLevel?: 'A' | 'B' | 'C' | 'D';
  tags: string[];
  url?: string;
  keyPoints?: string[];
  isFavorite?: boolean;
}

// Sample reference data - in production, this would come from a database
const sampleReferences: ClinicalReference[] = [
  {
    id: '1',
    title: 'Low Back Pain Clinical Practice Guidelines',
    category: 'guideline',
    description: 'Evidence-based guidelines for assessment and treatment of acute and chronic low back pain',
    source: 'American Physical Therapy Association',
    year: 2023,
    evidenceLevel: 'A',
    tags: ['low back pain', 'spine', 'guidelines', 'treatment'],
    keyPoints: [
      'Use validated outcome measures for assessment',
      'Prioritize active interventions over passive',
      'Education and exercise show strongest evidence',
      'Avoid excessive imaging in absence of red flags'
    ]
  },
  {
    id: '2',
    title: 'Ottawa Ankle Rules',
    category: 'test',
    description: 'Clinical decision rule for determining need for ankle X-rays following injury',
    source: 'Canadian Medical Association',
    year: 2022,
    evidenceLevel: 'A',
    tags: ['ankle', 'clinical prediction rule', 'imaging', 'acute injury'],
    keyPoints: [
      'Bone tenderness at posterior edge of lateral/medial malleolus',
      'Inability to bear weight immediately and in emergency',
      '100% sensitive for clinically significant fractures',
      'Reduces unnecessary X-rays by 30-40%'
    ]
  },
  {
    id: '3',
    title: 'Rotator Cuff Tendinopathy Management',
    category: 'protocol',
    description: 'Progressive loading protocol for rotator cuff rehabilitation',
    source: 'British Journal of Sports Medicine',
    year: 2024,
    evidenceLevel: 'B',
    tags: ['shoulder', 'rotator cuff', 'exercise', 'tendinopathy'],
    keyPoints: [
      'Isometric loading in acute phase',
      'Progressive isotonic strengthening',
      'Kinetic chain exercises essential',
      '12-16 week typical recovery timeline'
    ]
  },
  {
    id: '4',
    title: 'Patellofemoral Pain Syndrome',
    category: 'condition',
    description: 'Comprehensive overview of PFPS assessment and management strategies',
    source: 'International Patellofemoral Research Group',
    year: 2023,
    evidenceLevel: 'A',
    tags: ['knee', 'patellofemoral', 'anterior knee pain'],
    keyPoints: [
      'Hip and quadriceps strengthening primary intervention',
      'Gait retraining for runners showing benefit',
      'Taping/bracing for short-term pain relief',
      'Patient education crucial for adherence'
    ]
  },
  {
    id: '5',
    title: 'ACL Rehabilitation Protocol',
    category: 'protocol',
    description: 'Evidence-based ACL reconstruction rehabilitation guidelines',
    source: 'Sports Physical Therapy Section',
    year: 2024,
    evidenceLevel: 'A',
    tags: ['knee', 'ACL', 'post-surgical', 'sports'],
    keyPoints: [
      'Criteria-based progression, not time-based',
      'Early quadriceps activation critical',
      'Psychological readiness assessment before RTS',
      'Minimum 9 months before return to pivoting sports'
    ]
  }
];

interface ClinicalReferenceLibraryProps {
  onCiteReference?: (reference: ClinicalReference) => void;
  onOpenReference?: (reference: ClinicalReference) => void;
}

export default function ClinicalReferenceLibrary({ 
  onCiteReference,
  onOpenReference 
}: ClinicalReferenceLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedEvidenceLevel, setSelectedEvidenceLevel] = useState<string>('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [references] = useState<ClinicalReference[]>(sampleReferences);

  const filteredReferences = useMemo(() => {
    return references.filter(ref => {
      const matchesSearch = searchTerm === '' || 
        ref.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ref.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ref.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || ref.category === selectedCategory;
      const matchesEvidence = selectedEvidenceLevel === 'all' || ref.evidenceLevel === selectedEvidenceLevel;
      
      return matchesSearch && matchesCategory && matchesEvidence;
    });
  }, [searchTerm, selectedCategory, selectedEvidenceLevel, references]);

  const toggleFavorite = (id: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(id)) {
      newFavorites.delete(id);
    } else {
      newFavorites.add(id);
    }
    setFavorites(newFavorites);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'guideline': return <BookOpen className="h-4 w-4" />;
      case 'protocol': return <FileText className="h-4 w-4" />;
      case 'test': return <FlaskConical className="h-4 w-4" />;
      case 'condition': return <Stethoscope className="h-4 w-4" />;
      case 'research': return <GraduationCap className="h-4 w-4" />;
      case 'treatment': return <Activity className="h-4 w-4" />;
      default: return <Book className="h-4 w-4" />;
    }
  };

  const getEvidenceBadgeColor = (level?: string) => {
    switch (level) {
      case 'A': return 'bg-green-500';
      case 'B': return 'bg-blue-500';
      case 'C': return 'bg-yellow-500';
      case 'D': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Book className="h-5 w-5" />
          Clinical Reference Library
        </CardTitle>
        
        {/* Search and Filters */}
        <div className="space-y-3 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search guidelines, protocols, conditions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="guideline">Guidelines</SelectItem>
                <SelectItem value="protocol">Protocols</SelectItem>
                <SelectItem value="test">Clinical Tests</SelectItem>
                <SelectItem value="condition">Conditions</SelectItem>
                <SelectItem value="research">Research</SelectItem>
                <SelectItem value="treatment">Treatments</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedEvidenceLevel} onValueChange={setSelectedEvidenceLevel}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Evidence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="A">Level A</SelectItem>
                <SelectItem value="B">Level B</SelectItem>
                <SelectItem value="C">Level C</SelectItem>
                <SelectItem value="D">Level D</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        <Tabs defaultValue="all" className="h-full">
          <TabsList className="w-full rounded-none">
            <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
            <TabsTrigger value="favorites" className="flex-1">
              <Star className="h-3 w-3 mr-1" />
              Favorites
            </TabsTrigger>
            <TabsTrigger value="recent" className="flex-1">
              <Clock className="h-3 w-3 mr-1" />
              Recent
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="h-[calc(100%-40px)] p-4">
            <ScrollArea className="h-full">
              <div className="space-y-3">
                {filteredReferences.map((ref) => (
                  <Card key={ref.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(ref.category)}
                          <h4 className="font-semibold text-sm">{ref.title}</h4>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFavorite(ref.id)}
                        >
                          <Star 
                            className={`h-4 w-4 ${favorites.has(ref.id) ? 'fill-yellow-400 text-yellow-400' : ''}`} 
                          />
                        </Button>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-3">
                        {ref.description}
                      </p>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="text-xs">
                          {ref.source}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {ref.year}
                        </Badge>
                        {ref.evidenceLevel && (
                          <Badge className={`text-xs text-white ${getEvidenceBadgeColor(ref.evidenceLevel)}`}>
                            Level {ref.evidenceLevel}
                          </Badge>
                        )}
                      </div>
                      
                      {ref.keyPoints && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold mb-1">Key Points:</p>
                          <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                            {ref.keyPoints.slice(0, 2).map((point, idx) => (
                              <li key={idx}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onCiteReference?.(ref)}
                          className="flex-1"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Cite
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onOpenReference?.(ref)}
                          className="flex-1"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Open
                        </Button>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mt-3">
                        {ref.tags.slice(0, 3).map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="favorites" className="h-[calc(100%-40px)] p-4">
            <ScrollArea className="h-full">
              <div className="space-y-3">
                {filteredReferences
                  .filter(ref => favorites.has(ref.id))
                  .map((ref) => (
                    <Card key={ref.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          {getCategoryIcon(ref.category)}
                          <h4 className="font-semibold text-sm">{ref.title}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {ref.description}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onCiteReference?.(ref)}
                          >
                            Cite in Chat
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="recent" className="h-[calc(100%-40px)] p-4">
            <ScrollArea className="h-full">
              <div className="text-center text-muted-foreground py-8">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Recently viewed references will appear here</p>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}