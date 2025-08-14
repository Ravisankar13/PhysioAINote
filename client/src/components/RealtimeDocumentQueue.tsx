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
  sessionId: string;
  isRecording: boolean;
  pollInterval?: number;
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

export function RealtimeDocumentQueue({ sessionId, isRecording, pollInterval = 5000 }: RealtimeDocumentQueueProps) {
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [generatingTypes, setGeneratingTypes] = useState<Set<string>>(new Set());
  const [showQueue, setShowQueue] = useState(true);
  const [pollingDocuments, setPollingDocuments] = useState<Map<string, NodeJS.Timeout>>(new Map());
  const { toast } = useToast();

  // Function to add a document to the queue for polling
  const addDocumentForPolling = (documentId: string, documentType: string, documentName: string) => {
    // Add to generating types
    setGeneratingTypes(prev => new Set([...prev, documentType]));
    
    // Add placeholder document
    const placeholderDoc: GeneratedDocument = {
      id: documentId,
      type: documentType,
      filename: `${documentType}_${Date.now()}`,
      status: 'generating'
    };
    
    setDocuments(prev => [placeholderDoc, ...prev]);
    
    // Start polling for document status
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/documents/status/${documentId}?sessionId=${sessionId}`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.status === 'ready') {
            // Clear interval
            clearInterval(interval);
            setPollingDocuments(prev => {
              const newMap = new Map(prev);
              newMap.delete(documentId);
              return newMap;
            });
            
            // Remove from generating types
            setGeneratingTypes(prev => {
              const newSet = new Set(prev);
              newSet.delete(documentType);
              return newSet;
            });
            
            // Update document in queue
            const readyDoc: GeneratedDocument = {
              id: documentId,
              type: documentType,
              filename: data.filename || `${documentType}_${Date.now()}`,
              status: 'ready',
              wordPath: data.downloadUrl,
              generatedAt: new Date()
            };
            
            setDocuments(prev => prev.map(d => d.id === documentId ? readyDoc : d));
            
            // Show success toast with download button
            toast({
              title: "Document Ready",
              description: (
                <div className="flex items-center justify-between">
                  <span>{documentName} is ready!</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadDocument(readyDoc)}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </div>
              ),
              duration: 10000,
            });
          } else if (data.status === 'error') {
            // Clear interval
            clearInterval(interval);
            setPollingDocuments(prev => {
              const newMap = new Map(prev);
              newMap.delete(documentId);
              return newMap;
            });
            
            // Update document status to error
            setDocuments(prev => prev.map(d => 
              d.id === documentId 
                ? { ...d, status: 'error', error: data.error } 
                : d
            ));
            
            // Remove from generating types
            setGeneratingTypes(prev => {
              const newSet = new Set(prev);
              newSet.delete(documentType);
              return newSet;
            });
            
            toast({
              title: "Document Generation Failed",
              description: `Failed to generate ${documentName}: ${data.error || 'Unknown error'}`,
              variant: "destructive"
            });
          }
        }
      } catch (error) {
        console.error(`Error polling document status ${documentId}:`, error);
      }
    }, pollInterval);
    
    // Store interval for cleanup
    setPollingDocuments(prev => new Map(prev).set(documentId, interval));
  };
  
  // Expose function to parent component for adding documents
  useEffect(() => {
    // Attach function to window for parent access
    (window as any).addDocumentToQueue = addDocumentForPolling;
    
    return () => {
      // Cleanup polling intervals
      pollingDocuments.forEach(interval => clearInterval(interval));
      delete (window as any).addDocumentToQueue;
    };
  }, [pollingDocuments]);



  const downloadDocument = async (doc: GeneratedDocument) => {
    try {
      const response = await fetch(`/api/documents/download/${doc.id}?sessionId=${sessionId}`);
      
      if (!response.ok) {
        throw new Error('Failed to download document');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${doc.filename}.docx`;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
      
      toast({
        title: "Downloaded",
        description: `${documentTypeLabels[doc.type]} downloaded successfully`,
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