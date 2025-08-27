import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Save, 
  Edit, 
  Copy, 
  Download,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Check,
  X,
  AlertCircle,
  ClipboardList,
  Brain,
  Eye,
  Target,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PhysioGptMessage } from "@shared/schema";

interface SOAPSection {
  subjective: string[];
  objective: string[];
  assessment: string[];
  plan: string[];
}

interface SOAPBuilderPanelProps {
  messages: PhysioGptMessage[];
  conversationId: number | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export default function SOAPBuilderPanel({ 
  messages, 
  conversationId,
  isCollapsed = false,
  onToggleCollapse,
  className 
}: SOAPBuilderPanelProps) {
  const { toast } = useToast();
  const [soapSections, setSoapSections] = useState<SOAPSection>({
    subjective: [],
    objective: [],
    assessment: [],
    plan: []
  });
  
  const [editMode, setEditMode] = useState<{ [key: string]: boolean }>({
    subjective: false,
    objective: false,
    assessment: false,
    plan: false
  });
  
  const [editedContent, setEditedContent] = useState<{ [key: string]: string }>({
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  });
  
  const [messageTagging, setMessageTagging] = useState<Map<number, Set<string>>>(new Map());
  const [autoExtractEnabled, setAutoExtractEnabled] = useState(true);
  const [showPreview, setShowPreview] = useState(true);

  // Auto-extract SOAP content from messages
  useEffect(() => {
    if (!autoExtractEnabled || messages.length === 0) return;
    
    const extractedSections: SOAPSection = {
      subjective: [],
      objective: [],
      assessment: [],
      plan: []
    };
    
    messages.forEach((msg) => {
      if (msg.role === 'assistant') {
        const content = msg.content.toLowerCase();
        
        // Extract subjective information
        if (content.includes('patient reports') || 
            content.includes('complains of') || 
            content.includes('symptoms') ||
            content.includes('history')) {
          const subjectiveMatch = extractSubjectiveInfo(msg.content);
          if (subjectiveMatch) extractedSections.subjective.push(subjectiveMatch);
        }
        
        // Extract objective information
        if (content.includes('rom') || 
            content.includes('range of motion') || 
            content.includes('strength') ||
            content.includes('test') ||
            content.includes('measurement')) {
          const objectiveMatch = extractObjectiveInfo(msg.content);
          if (objectiveMatch) extractedSections.objective.push(objectiveMatch);
        }
        
        // Extract assessment information
        if (content.includes('diagnosis') || 
            content.includes('likely') || 
            content.includes('assessment') ||
            content.includes('clinical impression')) {
          const assessmentMatch = extractAssessmentInfo(msg.content);
          if (assessmentMatch) extractedSections.assessment.push(assessmentMatch);
        }
        
        // Extract plan information
        if (content.includes('exercise') || 
            content.includes('treatment') || 
            content.includes('recommend') ||
            content.includes('prescription') ||
            content.includes('plan')) {
          const planMatch = extractPlanInfo(msg.content);
          if (planMatch) extractedSections.plan.push(planMatch);
        }
      }
    });
    
    setSoapSections(extractedSections);
  }, [messages, autoExtractEnabled]);

  const extractSubjectiveInfo = (content: string): string => {
    // Extract key subjective information
    const patterns = [
      /patient reports? (.+?)(?:\.|$)/i,
      /complains? of (.+?)(?:\.|$)/i,
      /experiences? (.+?)(?:\.|$)/i,
      /describes? (.+?)(?:\.|$)/i
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) return match[0];
    }
    
    return '';
  };

  const extractObjectiveInfo = (content: string): string => {
    // Extract key objective findings
    const patterns = [
      /(?:rom|range of motion):? (.+?)(?:\.|$)/i,
      /strength:? (.+?)(?:\.|$)/i,
      /test(?:ing)? (?:shows?|reveals?):? (.+?)(?:\.|$)/i,
      /measurement:? (.+?)(?:\.|$)/i
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) return match[0];
    }
    
    return '';
  };

  const extractAssessmentInfo = (content: string): string => {
    // Extract assessment/diagnosis information
    const patterns = [
      /(?:likely |probable |possible )?diagnosis:? (.+?)(?:\.|$)/i,
      /clinical impression:? (.+?)(?:\.|$)/i,
      /assessment:? (.+?)(?:\.|$)/i,
      /findings? (?:suggest|indicate):? (.+?)(?:\.|$)/i
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) return match[0];
    }
    
    return '';
  };

  const extractPlanInfo = (content: string): string => {
    // Extract treatment plan information
    const patterns = [
      /recommend(?:ed|ation)?:? (.+?)(?:\.|$)/i,
      /prescrib(?:e|ed):? (.+?)(?:\.|$)/i,
      /treatment plan:? (.+?)(?:\.|$)/i,
      /exercise(?:s)?:? (.+?)(?:\.|$)/i
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) return match[0];
    }
    
    return '';
  };

  const handleTagMessage = (messageId: number, section: keyof SOAPSection) => {
    const tags = messageTagging.get(messageId) || new Set();
    
    if (tags.has(section)) {
      tags.delete(section);
    } else {
      tags.add(section);
    }
    
    const newTagging = new Map(messageTagging);
    newTagging.set(messageId, tags);
    setMessageTagging(newTagging);
    
    // Add tagged content to the appropriate section
    const message = messages.find(m => m.id === messageId);
    if (message && !tags.has(section)) {
      const newSections = { ...soapSections };
      newSections[section] = [...newSections[section], message.content];
      setSoapSections(newSections);
    }
  };

  const handleEditSection = (section: keyof SOAPSection) => {
    setEditMode({ ...editMode, [section]: true });
    setEditedContent({ 
      ...editedContent, 
      [section]: soapSections[section].join('\n') 
    });
  };

  const handleSaveEdit = (section: keyof SOAPSection) => {
    const newSections = { ...soapSections };
    newSections[section] = editedContent[section].split('\n').filter(line => line.trim());
    setSoapSections(newSections);
    setEditMode({ ...editMode, [section]: false });
  };

  const handleCancelEdit = (section: keyof SOAPSection) => {
    setEditMode({ ...editMode, [section]: false });
    setEditedContent({ ...editedContent, [section]: '' });
  };

  const handleAddToSection = (section: keyof SOAPSection, content: string) => {
    const newSections = { ...soapSections };
    newSections[section] = [...newSections[section], content];
    setSoapSections(newSections);
  };

  const handleRemoveFromSection = (section: keyof SOAPSection, index: number) => {
    const newSections = { ...soapSections };
    newSections[section] = newSections[section].filter((_, i) => i !== index);
    setSoapSections(newSections);
  };

  const generateSOAPNote = (): string => {
    let note = "SOAP NOTE\n";
    note += "=" .repeat(50) + "\n\n";
    
    note += "SUBJECTIVE:\n";
    note += soapSections.subjective.map(s => `• ${s}`).join('\n') || "No subjective data recorded\n";
    note += "\n\n";
    
    note += "OBJECTIVE:\n";
    note += soapSections.objective.map(o => `• ${o}`).join('\n') || "No objective data recorded\n";
    note += "\n\n";
    
    note += "ASSESSMENT:\n";
    note += soapSections.assessment.map(a => `• ${a}`).join('\n') || "No assessment recorded\n";
    note += "\n\n";
    
    note += "PLAN:\n";
    note += soapSections.plan.map(p => `• ${p}`).join('\n') || "No plan recorded\n";
    
    return note;
  };

  const handleSaveSOAP = async () => {
    try {
      const soapNote = generateSOAPNote();
      
      // Here you would save to your backend
      // For now, we'll just show a success message
      toast({
        title: "SOAP Note Saved",
        description: "Your SOAP note has been saved successfully",
      });
      
      console.log("Saving SOAP note:", soapNote);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save SOAP note",
        variant: "destructive",
      });
    }
  };

  const handleCopySOAP = () => {
    const soapNote = generateSOAPNote();
    navigator.clipboard.writeText(soapNote);
    toast({
      title: "Copied to Clipboard",
      description: "SOAP note copied to clipboard",
    });
  };

  const handleExportSOAP = () => {
    const soapNote = generateSOAPNote();
    const blob = new Blob([soapNote], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soap-note-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isCollapsed) {
    return (
      <div className={cn("w-12 bg-background border-l", className)}>
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-full flex items-center justify-center"
          onClick={onToggleCollapse}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Card className={cn("w-96 h-full border-l rounded-none", className)}>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            SOAP Builder
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSaveSOAP}
              title="Save SOAP Note"
            >
              <Save className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopySOAP}
              title="Copy to Clipboard"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExportSOAP}
              title="Export as Text"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              title="Collapse Panel"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          <Badge 
            variant={autoExtractEnabled ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setAutoExtractEnabled(!autoExtractEnabled)}
          >
            {autoExtractEnabled ? <Brain className="h-3 w-3 mr-1" /> : null}
            Auto-Extract: {autoExtractEnabled ? "ON" : "OFF"}
          </Badge>
          <Badge 
            variant={showPreview ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? <Eye className="h-3 w-3 mr-1" /> : null}
            Preview: {showPreview ? "ON" : "OFF"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 h-[calc(100%-80px)]">
        <Tabs defaultValue="builder" className="h-full">
          <TabsList className="w-full rounded-none">
            <TabsTrigger value="builder" className="flex-1">Builder</TabsTrigger>
            <TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger>
            <TabsTrigger value="tags" className="flex-1">Tags</TabsTrigger>
          </TabsList>
          
          <TabsContent value="builder" className="h-[calc(100%-40px)] p-4">
            <ScrollArea className="h-full">
              <div className="space-y-4">
                {/* Subjective Section */}
                <SectionEditor
                  title="Subjective"
                  icon={<AlertCircle className="h-4 w-4" />}
                  content={soapSections.subjective}
                  isEditing={editMode.subjective}
                  editedContent={editedContent.subjective}
                  onEdit={() => handleEditSection('subjective')}
                  onSave={() => handleSaveEdit('subjective')}
                  onCancel={() => handleCancelEdit('subjective')}
                  onRemove={(index) => handleRemoveFromSection('subjective', index)}
                  onContentChange={(value) => setEditedContent({ ...editedContent, subjective: value })}
                />
                
                {/* Objective Section */}
                <SectionEditor
                  title="Objective"
                  icon={<Eye className="h-4 w-4" />}
                  content={soapSections.objective}
                  isEditing={editMode.objective}
                  editedContent={editedContent.objective}
                  onEdit={() => handleEditSection('objective')}
                  onSave={() => handleSaveEdit('objective')}
                  onCancel={() => handleCancelEdit('objective')}
                  onRemove={(index) => handleRemoveFromSection('objective', index)}
                  onContentChange={(value) => setEditedContent({ ...editedContent, objective: value })}
                />
                
                {/* Assessment Section */}
                <SectionEditor
                  title="Assessment"
                  icon={<Brain className="h-4 w-4" />}
                  content={soapSections.assessment}
                  isEditing={editMode.assessment}
                  editedContent={editedContent.assessment}
                  onEdit={() => handleEditSection('assessment')}
                  onSave={() => handleSaveEdit('assessment')}
                  onCancel={() => handleCancelEdit('assessment')}
                  onRemove={(index) => handleRemoveFromSection('assessment', index)}
                  onContentChange={(value) => setEditedContent({ ...editedContent, assessment: value })}
                />
                
                {/* Plan Section */}
                <SectionEditor
                  title="Plan"
                  icon={<Target className="h-4 w-4" />}
                  content={soapSections.plan}
                  isEditing={editMode.plan}
                  editedContent={editedContent.plan}
                  onEdit={() => handleEditSection('plan')}
                  onSave={() => handleSaveEdit('plan')}
                  onCancel={() => handleCancelEdit('plan')}
                  onRemove={(index) => handleRemoveFromSection('plan', index)}
                  onContentChange={(value) => setEditedContent({ ...editedContent, plan: value })}
                />
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="preview" className="h-[calc(100%-40px)] p-4">
            <ScrollArea className="h-full">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {generateSOAPNote()}
              </pre>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="tags" className="h-[calc(100%-40px)] p-4">
            <ScrollArea className="h-full">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-3">
                  Click tags to assign messages to SOAP sections
                </p>
                {messages.map((msg, index) => {
                  const tags = messageTagging.get(msg.id!) || new Set();
                  return (
                    <div key={msg.id || index} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant={msg.role === 'user' ? 'secondary' : 'default'}>
                          {msg.role === 'user' ? 'You' : 'PhysioGPT'}
                        </Badge>
                        <div className="flex gap-1">
                          {(['subjective', 'objective', 'assessment', 'plan'] as const).map((section) => (
                            <Button
                              key={section}
                              size="sm"
                              variant={tags.has(section) ? 'default' : 'outline'}
                              className="h-6 px-2 text-xs"
                              onClick={() => handleTagMessage(msg.id!, section)}
                            >
                              {section[0].toUpperCase()}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {msg.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Section Editor Component
interface SectionEditorProps {
  title: string;
  icon: React.ReactNode;
  content: string[];
  isEditing: boolean;
  editedContent: string;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onRemove: (index: number) => void;
  onContentChange: (value: string) => void;
}

function SectionEditor({
  title,
  icon,
  content,
  isEditing,
  editedContent,
  onEdit,
  onSave,
  onCancel,
  onRemove,
  onContentChange
}: SectionEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  return (
    <div className="border rounded-lg">
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{title}</span>
          <Badge variant="outline" className="ml-2">
            {content.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {!isEditing && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Edit className="h-3 w-3" />
            </Button>
          )}
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-3 pb-3">
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editedContent}
                onChange={(e) => onContentChange(e.target.value)}
                className="min-h-[100px]"
                placeholder={`Enter ${title.toLowerCase()} findings...`}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={onSave}>
                  <Check className="h-3 w-3 mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={onCancel}>
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {content.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No {title.toLowerCase()} data</p>
              ) : (
                content.map((item, index) => (
                  <div key={index} className="flex items-start justify-between group">
                    <p className="text-sm flex-1">• {item}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                      onClick={() => onRemove(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}