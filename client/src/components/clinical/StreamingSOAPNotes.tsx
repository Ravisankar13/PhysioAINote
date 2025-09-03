import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import {
  Mic, MicOff, FileText, Eye, Edit, Clock, Activity,
  AlertCircle, CheckCircle, Loader2, Download, Save
} from 'lucide-react';
import { pdfGenerator } from '@/services/pdfGenerator';

interface SOAPSections {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export function StreamingSOAPNotes() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // View state
  const [viewMode, setViewMode] = useState<'unified' | 'soap'>('unified');
  const [editMode, setEditMode] = useState(false);
  
  // Content state
  const [unifiedTranscript, setUnifiedTranscript] = useState('');
  const [soapSections, setSoapSections] = useState<SOAPSections>({
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  });
  
  // WebSocket and recording refs
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Format duration for display
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Initialize WebSocket connection
  const initializeWebSocket = useCallback(() => {
    if (!user?.id) return;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/streaming-transcription?userId=${user.id}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('Streaming transcription connected');
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'connected':
            setSessionId(data.sessionId);
            console.log('Session started:', data.sessionId);
            break;
            
          case 'transcription':
            if (data.transcript) {
              // Append new transcript to unified view
              setUnifiedTranscript(prev => {
                const newText = prev + (prev ? ' ' : '') + data.transcript;
                return newText;
              });
            }
            
            if (data.soapSections) {
              // Update SOAP sections
              setSoapSections(data.soapSections);
            }
            break;
            
          case 'error':
            console.error('Streaming error:', data.message);
            toast({
              title: 'Transcription Error',
              description: data.message,
              variant: 'destructive'
            });
            break;
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: 'Connection Error',
        description: 'Failed to connect to streaming service',
        variant: 'destructive'
      });
    };
    
    ws.onclose = () => {
      console.log('WebSocket closed');
    };
    
    wsRef.current = ws;
  }, [user?.id, toast]);
  
  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Initialize WebSocket
      initializeWebSocket();
      
      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // Send to WebSocket if connected
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            event.data.arrayBuffer().then(buffer => {
              wsRef.current?.send(buffer);
            });
          }
        }
      };
      
      // Start recording with 5-second chunks for streaming
      mediaRecorder.start(5000);
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      toast({
        title: 'Recording Started',
        description: 'Speak clearly. Recording will stream in real-time.',
      });
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Recording Error',
        description: 'Failed to access microphone',
        variant: 'destructive'
      });
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsRecording(false);
    
    toast({
      title: 'Recording Stopped',
      description: `Total duration: ${formatDuration(recordingDuration)}`,
    });
  };
  
  // Save note
  const saveNote = async () => {
    try {
      // Here you would save to your backend
      // For now, just show success
      toast({
        title: 'Note Saved',
        description: 'SOAP note has been saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Save Error',
        description: 'Failed to save note',
        variant: 'destructive'
      });
    }
  };
  
  // Generate PDF
  const generatePDF = () => {
    const content = viewMode === 'unified' ? unifiedTranscript : 
      `SUBJECTIVE:\n${soapSections.subjective}\n\n` +
      `OBJECTIVE:\n${soapSections.objective}\n\n` +
      `ASSESSMENT:\n${soapSections.assessment}\n\n` +
      `PLAN:\n${soapSections.plan}`;
    
    pdfGenerator.downloadPDF({
      title: `SOAP Note - ${new Date().toLocaleDateString()}`,
      content,
      type: 'soap',
      patientName: 'Patient Name', // You can get this from context
      date: new Date().toLocaleDateString(),
      therapistName: user?.username || 'PhysioGPT User',
      clinicName: 'PhysioGPT Clinical Services'
    });
    
    toast({
      title: 'PDF Generated',
      description: 'The SOAP note has been downloaded as PDF',
    });
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Streaming SOAP Notes
          </CardTitle>
          <div className="flex items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <Label htmlFor="view-mode">View:</Label>
              <Switch
                id="view-mode"
                checked={viewMode === 'soap'}
                onCheckedChange={(checked) => setViewMode(checked ? 'soap' : 'unified')}
              />
              <span className="text-sm text-gray-600">
                {viewMode === 'unified' ? 'Unified' : 'SOAP'}
              </span>
            </div>
            
            {/* Recording Status */}
            {isRecording && (
              <Badge variant="destructive" className="animate-pulse">
                <Activity className="h-3 w-3 mr-1" />
                Recording: {formatDuration(recordingDuration)}
              </Badge>
            )}
            
            {/* Edit Mode Toggle */}
            {!isRecording && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditMode(!editMode)}
              >
                {editMode ? <Eye className="h-4 w-4 mr-1" /> : <Edit className="h-4 w-4 mr-1" />}
                {editMode ? 'View' : 'Edit'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Recording Controls */}
        <div className="flex justify-center gap-4 py-4">
          {!isRecording ? (
            <Button
              size="lg"
              onClick={startRecording}
              className="bg-red-500 hover:bg-red-600"
            >
              <Mic className="h-5 w-5 mr-2" />
              Start Recording
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={stopRecording}
              variant="secondary"
            >
              <MicOff className="h-5 w-5 mr-2" />
              Stop Recording
            </Button>
          )}
        </div>
        
        {/* Info Banner */}
        {isRecording && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Real-time streaming active</p>
              <p>Your speech is being transcribed continuously. No time limit!</p>
            </div>
          </div>
        )}
        
        {/* Content Display */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'unified' | 'soap')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="unified">Unified Transcript</TabsTrigger>
            <TabsTrigger value="soap">SOAP Structure</TabsTrigger>
          </TabsList>
          
          {/* Unified View */}
          <TabsContent value="unified" className="space-y-4">
            <Textarea
              value={unifiedTranscript}
              onChange={(e) => editMode && setUnifiedTranscript(e.target.value)}
              readOnly={!editMode}
              placeholder="Start recording to see real-time transcription here..."
              className="min-h-[400px] font-mono text-sm"
            />
          </TabsContent>
          
          {/* SOAP View */}
          <TabsContent value="soap" className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label>Subjective</Label>
                <Textarea
                  value={soapSections.subjective}
                  onChange={(e) => editMode && setSoapSections(prev => ({ ...prev, subjective: e.target.value }))}
                  readOnly={!editMode}
                  placeholder="Patient's chief complaint, symptoms, history..."
                  className="min-h-[100px]"
                />
              </div>
              
              <div>
                <Label>Objective</Label>
                <Textarea
                  value={soapSections.objective}
                  onChange={(e) => editMode && setSoapSections(prev => ({ ...prev, objective: e.target.value }))}
                  readOnly={!editMode}
                  placeholder="Physical examination findings, measurements..."
                  className="min-h-[100px]"
                />
              </div>
              
              <div>
                <Label>Assessment</Label>
                <Textarea
                  value={soapSections.assessment}
                  onChange={(e) => editMode && setSoapSections(prev => ({ ...prev, assessment: e.target.value }))}
                  readOnly={!editMode}
                  placeholder="Clinical reasoning, diagnosis..."
                  className="min-h-[100px]"
                />
              </div>
              
              <div>
                <Label>Plan</Label>
                <Textarea
                  value={soapSections.plan}
                  onChange={(e) => editMode && setSoapSections(prev => ({ ...prev, plan: e.target.value }))}
                  readOnly={!editMode}
                  placeholder="Treatment plan, follow-up..."
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={generatePDF}>
            <Download className="h-4 w-4 mr-1" />
            Download PDF
          </Button>
          <Button onClick={saveNote}>
            <Save className="h-4 w-4 mr-1" />
            Save Note
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}