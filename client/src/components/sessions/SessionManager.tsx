import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryClient as defaultQueryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PatientInfoForm from './PatientInfoForm';
import AudioRecorder from './AudioRecorder';
import TranscriptView from './TranscriptView';
import SoapNoteView from './SoapNoteView';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, ArrowLeft, Plus, FileText } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useLocation, useParams } from 'wouter';

interface PatientSession {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  dob: string | null;
  gender: string | null;
  chiefComplaint: string;
  bodyPart: string;
  pastMedicalHistory: string | null;
  pastSurgicalHistory: string | null;
  status: string;
  transcriptUrl: string | null;
  soapNote: any;
  createdAt: string;
  updatedAt: string;
}

interface FormValues {
  firstName: string;
  lastName: string;
  dob?: string;
  gender?: string;
  pastMedicalHistory?: string;
  pastSurgicalHistory?: string;
  chiefComplaint: string;
  bodyPart: string;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'draft':
      return <Badge variant="outline">Draft</Badge>;
    case 'recorded':
      return <Badge variant="secondary">Recorded</Badge>;
    case 'transcribed':
      return <Badge variant="secondary">Transcribed</Badge>;
    case 'processing':
      return <Badge variant="secondary" className="animate-pulse">Processing</Badge>;
    case 'completed':
      return <Badge>Completed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

function SessionManager() {
  const { user } = useAuth();
  const [_, params] = useParams();
  const sessionId = params?.id ? parseInt(params.id) : null;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentTab, setCurrentTab] = useState('info');
  
  // Get session list query
  const sessionsQuery = useQuery({
    queryKey: ['/api/sessions'],
    queryFn: getQueryFn(),
    enabled: !!user
  });
  
  // Get specific session query
  const sessionQuery = useQuery({
    queryKey: ['/api/sessions', sessionId?.toString()],
    queryFn: getQueryFn(),
    enabled: !!user && !!sessionId
  });
  
  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest('POST', '/api/sessions', data);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      navigate(`/notes/${data.id}`);
      toast({
        title: 'Session created',
        description: 'New patient session has been created.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create session',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<FormValues> }) => {
      const response = await apiRequest('PATCH', `/api/sessions/${id}`, data);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', data.id] });
      toast({
        title: 'Session updated',
        description: 'Patient information has been updated.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update session',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Transcript update mutation
  const updateTranscriptMutation = useMutation({
    mutationFn: async ({ id, transcript }: { id: number, transcript: string }) => {
      const response = await apiRequest('PATCH', `/api/sessions/${id}`, { transcript });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', data.id] });
      toast({
        title: 'Transcript updated',
        description: 'Session transcript has been updated.'
      });
    }
  });
  
  // Generate SOAP note mutation
  const generateSoapNoteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('POST', `/api/sessions/${id}/generate-soap-note`);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', data.session.id] });
      setCurrentTab('soapNote');
      toast({
        title: 'SOAP note generated',
        description: 'Your SOAP note has been created successfully.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to generate SOAP note',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Save to clinical notes
  const saveToClinicalNotesMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const session = await queryClient.getQueryData<PatientSession>(['/api/sessions', sessionId]);
      if (!session || !session.soapNote) {
        throw new Error('No SOAP note available');
      }
      
      const noteData = {
        patientName: `${session.firstName} ${session.lastName}`,
        patientId: `P-${sessionId}`,
        dateOfBirth: session.dob || '',
        dateOfVisit: new Date().toISOString().split('T')[0],
        subjective: session.soapNote.subjective || '',
        objective: session.soapNote.objective || '',
        assessment: session.soapNote.assessment || '',
        plan: session.soapNote.plan || '',
        visibility: 'private',
        bodyPart: session.bodyPart
      };
      
      const response = await apiRequest('POST', '/api/notes', noteData);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-notes'] });
      toast({
        title: 'Saved to clinical notes',
        description: 'SOAP note has been saved to your clinical notes.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to save to clinical notes',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  const handleCreateSession = (data: FormValues) => {
    createSessionMutation.mutate(data);
  };
  
  const handleUpdateSession = (data: FormValues) => {
    if (!sessionId) return;
    updateSessionMutation.mutate({ id: sessionId, data });
  };
  
  const handleRecordingComplete = (audioId: number) => {
    // After successful recording, switch to transcript tab
    if (sessionId) {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId] });
      // Wait a bit to ensure the server has processed the recording
      setTimeout(() => {
        setCurrentTab('transcript');
      }, 500);
    }
  };
  
  const handleTranscriptUpdate = (updatedTranscript: string) => {
    if (!sessionId) return;
    updateTranscriptMutation.mutate({ id: sessionId, transcript: updatedTranscript });
  };
  
  const handleGenerateSoapNote = () => {
    if (!sessionId) return;
    generateSoapNoteMutation.mutate(sessionId);
  };
  
  const handleSaveToNotes = () => {
    if (!sessionId) return;
    saveToClinicalNotesMutation.mutate(sessionId);
  };
  
  const handleDownloadPdf = () => {
    // Placeholder for PDF download functionality
    toast({
      title: 'Download started',
      description: 'Your SOAP note PDF is being prepared for download.'
    });
  };
  
  // If viewing a specific session, render the session manager
  if (sessionId) {
    const session = sessionQuery.data;
    const isLoading = sessionQuery.isLoading;
    
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-[600px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    if (!session) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[600px]">
          <p className="text-muted-foreground mb-4">Session not found or you don't have access.</p>
          <Button onClick={() => navigate('/notes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sessions
          </Button>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={() => navigate('/notes')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sessions
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Label>Status:</Label>
            {getStatusBadge(session.status)}
          </div>
        </div>
        
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="info">Patient Info</TabsTrigger>
            <TabsTrigger value="record">Record Audio</TabsTrigger>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="soapNote">SOAP Note</TabsTrigger>
          </TabsList>
          
          <TabsContent value="info" className="pt-4">
            <PatientInfoForm
              defaultValues={{
                firstName: session.firstName,
                lastName: session.lastName,
                dob: session.dob || undefined,
                gender: session.gender || undefined,
                pastMedicalHistory: session.pastMedicalHistory || undefined,
                pastSurgicalHistory: session.pastSurgicalHistory || undefined,
                chiefComplaint: session.chiefComplaint,
                bodyPart: session.bodyPart
              }}
              onSubmit={handleUpdateSession}
              isLoading={updateSessionMutation.isPending}
            />
          </TabsContent>
          
          <TabsContent value="record" className="pt-4">
            <AudioRecorder
              sessionId={session.id}
              onRecordingComplete={handleRecordingComplete}
            />
          </TabsContent>
          
          <TabsContent value="transcript" className="pt-4">
            <TranscriptView
              transcript={session.transcriptUrl ? "Transcript loaded from server. Click 'Generate SOAP Note' to proceed." : ""}
              isLoading={false}
              isGeneratingSoapNote={generateSoapNoteMutation.isPending}
              onGenerateSoapNote={handleGenerateSoapNote}
              onEditTranscript={handleTranscriptUpdate}
            />
          </TabsContent>
          
          <TabsContent value="soapNote" className="pt-4">
            <SoapNoteView
              soapNote={session.soapNote}
              patientName={`${session.firstName} ${session.lastName}`}
              date={new Date(session.updatedAt).toLocaleDateString()}
              isLoading={generateSoapNoteMutation.isPending}
              onSaveToNotes={handleSaveToNotes}
              onDownload={handleDownloadPdf}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  }
  
  // If no session ID, show the session list or create new session form
  const sessions = sessionsQuery.data || [];
  const isLoading = sessionsQuery.isLoading;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Patient Sessions</h2>
        <Button onClick={() => navigate('/notes/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Session
        </Button>
      </div>
      
      {params?.id === 'new' ? (
        <div className="mt-4">
          <Button variant="ghost" onClick={() => navigate('/notes')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sessions
          </Button>
          <PatientInfoForm
            onSubmit={handleCreateSession}
            isLoading={createSessionMutation.isPending}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No sessions found</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                Create a new patient session to start recording and generating SOAP notes.
              </p>
              <Button onClick={() => navigate('/notes/new')}>
                <Plus className="h-4 w-4 mr-2" />
                New Session
              </Button>
            </div>
          ) : (
            sessions.map((session: PatientSession) => (
              <Card key={session.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle>{session.firstName} {session.lastName}</CardTitle>
                    {getStatusBadge(session.status)}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {new Date(session.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Body Part:</span> {session.bodyPart}
                    </p>
                    <p className="text-sm line-clamp-2">
                      <span className="font-medium">Complaint:</span> {session.chiefComplaint}
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => navigate(`/notes/${session.id}`)}
                      className="w-full mt-2"
                    >
                      View Session
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// Helper for query function with authentication handling
const getQueryFn = (options: { on401?: 'returnNull' } = {}) => {
  return async ({ queryKey }: { queryKey: (string | number | undefined)[] }) => {
    // Filter out undefined values and join the path
    const path = queryKey.filter(Boolean).join('/').replace(/\/+/g, '/');
    const response = await fetch(path);
    
    if (response.status === 401) {
      if (options.on401 === 'returnNull') {
        return null;
      }
      throw new Error('Not authenticated');
    }
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to fetch data');
    }
    
    return await response.json();
  };
};

export default SessionManager;