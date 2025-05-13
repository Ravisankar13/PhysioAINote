import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, FileText, EditIcon, CheckIcon, XIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TranscriptViewProps {
  transcript: string;
  isLoading?: boolean;
  isGeneratingSoapNote?: boolean;
  onGenerateSoapNote: () => void;
  onEditTranscript?: (updatedTranscript: string) => void;
}

const TranscriptView: React.FC<TranscriptViewProps> = ({
  transcript,
  isLoading = false,
  isGeneratingSoapNote = false,
  onGenerateSoapNote,
  onEditTranscript,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState(transcript);
  const { toast } = useToast();
  
  const handleEditToggle = () => {
    if (isEditing) {
      setEditedTranscript(transcript);
    }
    setIsEditing(!isEditing);
  };
  
  const handleSaveTranscript = () => {
    if (onEditTranscript) {
      onEditTranscript(editedTranscript);
      setIsEditing(false);
      toast({
        title: "Transcript updated",
        description: "Your changes have been saved.",
      });
    }
  };
  
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading transcript...</p>
        </div>
      );
    }
    
    if (!transcript) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Transcript Available</h3>
          <p className="text-muted-foreground max-w-md">
            Record and upload audio to generate a transcript. 
            The transcript will appear here once processing is complete.
          </p>
        </div>
      );
    }
    
    if (isEditing) {
      return (
        <div className="space-y-4">
          <Textarea 
            value={editedTranscript}
            onChange={(e) => setEditedTranscript(e.target.value)}
            className="min-h-[300px] font-mono text-sm"
          />
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleEditToggle}
            >
              <XIcon className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleSaveTranscript}
            >
              <CheckIcon className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        <div className="whitespace-pre-wrap p-4 bg-muted rounded-md max-h-[400px] overflow-y-auto">
          {transcript}
        </div>
        <div className="flex justify-between">
          {onEditTranscript && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleEditToggle}
            >
              <EditIcon className="h-4 w-4 mr-2" />
              Edit Transcript
            </Button>
          )}
          <Button 
            onClick={onGenerateSoapNote}
            disabled={isGeneratingSoapNote}
          >
            {isGeneratingSoapNote ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating SOAP Note...
              </>
            ) : (
              'Generate SOAP Note'
            )}
          </Button>
        </div>
      </div>
    );
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Transcript</CardTitle>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
};

export default TranscriptView;