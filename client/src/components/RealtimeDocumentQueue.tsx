import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, Download, Loader2, CheckCircle, 
  AlertCircle, FileCheck, Shield, BarChart3, 
  Briefcase, Clock, DollarSign, Users, X 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GeneratedDocument {
  id: string;
  type: string;
  filename: string;
  status: 'generating' | 'ready' | 'error';
  error?: string;
  wordPath?: string;
  generatedAt?: Date;
}

interface RealtimeDocumentQueueProps {
  webSocket: WebSocket | null;
  sessionId: string;
  isRecording: boolean;
}

const documentTypeLabels: Record<string, string> = {
  'doctor_report': 'Doctor Report',
  'ahtr': 'AHTR Form',
  'discharge_summary': 'Discharge Summary',
  'imaging_referral': 'Imaging Referral',
  'insurance': 'Insurance Documentation',
  'progress_report': 'Progress Report',
  'specialist_referral': 'Specialist Referral',
  'return_to_work': 'Return to Work Certificate',
  'time_off_work': 'Medical Certificate'
};

const documentTypeIcons: Record<string, React.ReactNode> = {
  'doctor_report': <FileText className="w-4 h-4" />,
  'ahtr': <FileCheck className="w-4 h-4" />,
  'discharge_summary': <FileCheck className="w-4 h-4" />,
  'imaging_referral': <Shield className="w-4 h-4" />,
  'insurance': <DollarSign className="w-4 h-4" />,
  'progress_report': <BarChart3 className="w-4 h-4" />,
  'specialist_referral': <Users className="w-4 h-4" />,
  'return_to_work': <Briefcase className="w-4 h-4" />,
  'time_off_work': <Clock className="w-4 h-4" />
};

export function RealtimeDocumentQueue({ webSocket, sessionId, isRecording }: RealtimeDocumentQueueProps) {
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [generatingTypes, setGeneratingTypes] = useState<Set<string>>(new Set());
  const [showQueue, setShowQueue] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!webSocket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'document_generation_started') {
          // Add to generating types
          setGeneratingTypes(prev => new Set([...prev, data.documentType]));
          
          // Show toast notification
          toast({
            title: "Generating Document",
            description: `Creating ${documentTypeLabels[data.documentType] || data.documentType}...`,
            duration: 3000,
          });
          
          // Add placeholder document
          const placeholderDoc: GeneratedDocument = {
            id: `temp-${data.documentType}-${Date.now()}`,
            type: data.documentType,
            filename: `${data.documentType}_${Date.now()}`,
            status: 'generating'
          };
          
          setDocuments(prev => [placeholderDoc, ...prev]);
        }
        
        if (data.type === 'document_ready') {
          const { document } = data;
          
          // Remove from generating types
          setGeneratingTypes(prev => {
            const newSet = new Set(prev);
            newSet.delete(document.type);
            return newSet;
          });
          
          // Update document in queue
          setDocuments(prev => {
            // Remove placeholder and add real document
            const filtered = prev.filter(d => !d.id.startsWith(`temp-${document.type}`));
            return [document, ...filtered];
          });
          
          // Show success toast with download button
          toast({
            title: "Document Ready",
            description: (
              <div className="flex items-center justify-between">
                <span>{documentTypeLabels[document.type]} is ready!</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadDocument(document)}
                >
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </Button>
              </div>
            ),
            duration: 10000,
          });
        }
        
        if (data.type === 'document_error') {
          // Remove from generating types
          setGeneratingTypes(prev => {
            const newSet = new Set(prev);
            newSet.delete(data.documentType);
            return newSet;
          });
          
          // Update document status to error
          setDocuments(prev => prev.map(doc => {
            if (doc.id.startsWith(`temp-${data.documentType}`)) {
              return { ...doc, status: 'error', error: data.error };
            }
            return doc;
          }));
          
          // Show error toast
          toast({
            title: "Document Generation Failed",
            description: `Failed to create ${documentTypeLabels[data.documentType]}: ${data.error}`,
            variant: "destructive",
            duration: 5000,
          });
        }
      } catch (error) {
        console.error('Error processing document WebSocket message:', error);
      }
    };

    webSocket.addEventListener('message', handleMessage);
    
    return () => {
      webSocket.removeEventListener('message', handleMessage);
    };
  }, [webSocket, toast]);

  const downloadDocument = async (document: GeneratedDocument) => {
    try {
      const response = await fetch(`/api/documents/download/${document.id}?sessionId=${sessionId}`);
      
      if (!response.ok) {
        throw new Error('Failed to download document');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${document.filename}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Downloaded",
        description: `${documentTypeLabels[document.type]} downloaded successfully`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const clearDocument = (documentId: string) => {
    setDocuments(prev => prev.filter(d => d.id !== documentId));
  };

  const clearAllDocuments = () => {
    setDocuments([]);
  };

  // Don't show if not recording and no documents
  if (!isRecording && documents.length === 0) {
    return null;
  }

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-5 h-5" />
            Generated Documents
            {documents.length > 0 && (
              <Badge variant="secondary">{documents.length}</Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {documents.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={clearAllDocuments}
              >
                Clear All
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowQueue(!showQueue)}
            >
              {showQueue ? 'Hide' : 'Show'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {showQueue && (
        <CardContent>
          {isRecording && (
            <Alert className="mb-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Say "generate [document type]" during recording to create documents instantly
              </AlertDescription>
            </Alert>
          )}
          
          {documents.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No documents generated yet</p>
              <p className="text-xs mt-1">
                Documents will appear here when triggered
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {documents.map((document) => (
                  <div
                    key={document.id}
                    className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {document.status === 'generating' ? (
                          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                        ) : document.status === 'ready' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {documentTypeIcons[document.type]}
                        <div>
                          <p className="font-medium text-sm">
                            {documentTypeLabels[document.type] || document.type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {document.status === 'generating' ? 'Generating...' : 
                             document.status === 'ready' ? 'Ready to download' :
                             document.error || 'Error occurred'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {document.status === 'ready' && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => downloadDocument(document)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => clearDocument(document.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          
          {generatingTypes.size > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground">
                Generating: {Array.from(generatingTypes).map(type => 
                  documentTypeLabels[type] || type
                ).join(', ')}
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}