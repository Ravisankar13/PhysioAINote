import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Download, Share2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface SoapNoteViewProps {
  soapNote: SoapNote | null;
  patientName?: string;
  date?: string;
  isLoading?: boolean;
  onSaveToNotes?: () => void;
  onDownload?: () => void;
}

const SoapNoteView: React.FC<SoapNoteViewProps> = ({
  soapNote,
  patientName = 'Patient',
  date = new Date().toLocaleDateString(),
  isLoading = false,
  onSaveToNotes,
  onDownload,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SOAP Note</CardTitle>
        </CardHeader>
        <CardContent className="min-h-[400px] flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Generating SOAP note...</p>
        </CardContent>
      </Card>
    );
  }

  if (!soapNote) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SOAP Note</CardTitle>
        </CardHeader>
        <CardContent className="min-h-[400px] flex flex-col items-center justify-center text-center">
          <p className="text-muted-foreground max-w-md">
            No SOAP note has been generated yet. 
            Please generate a transcript first, then create a SOAP note.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col space-y-1.5">
          <CardTitle>SOAP Note</CardTitle>
          <div className="text-sm text-muted-foreground">
            Patient: {patientName} | Date: {date}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid grid-cols-5 mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="subjective">S</TabsTrigger>
            <TabsTrigger value="objective">O</TabsTrigger>
            <TabsTrigger value="assessment">A</TabsTrigger>
            <TabsTrigger value="plan">P</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Subjective</h3>
              <div className="whitespace-pre-wrap">{soapNote.subjective}</div>
            </div>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold mb-2">Objective</h3>
              <div className="whitespace-pre-wrap">{soapNote.objective}</div>
            </div>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold mb-2">Assessment</h3>
              <div className="whitespace-pre-wrap">{soapNote.assessment}</div>
            </div>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold mb-2">Plan</h3>
              <div className="whitespace-pre-wrap">{soapNote.plan}</div>
            </div>
          </TabsContent>
          
          <TabsContent value="subjective">
            <h3 className="text-lg font-semibold mb-2">Subjective</h3>
            <div className="whitespace-pre-wrap">{soapNote.subjective}</div>
          </TabsContent>
          
          <TabsContent value="objective">
            <h3 className="text-lg font-semibold mb-2">Objective</h3>
            <div className="whitespace-pre-wrap">{soapNote.objective}</div>
          </TabsContent>
          
          <TabsContent value="assessment">
            <h3 className="text-lg font-semibold mb-2">Assessment</h3>
            <div className="whitespace-pre-wrap">{soapNote.assessment}</div>
          </TabsContent>
          
          <TabsContent value="plan">
            <h3 className="text-lg font-semibold mb-2">Plan</h3>
            <div className="whitespace-pre-wrap">{soapNote.plan}</div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        {onSaveToNotes && (
          <Button variant="outline" onClick={onSaveToNotes}>
            <Share2 className="h-4 w-4 mr-2" />
            Save to Clinical Notes
          </Button>
        )}
        {onDownload && (
          <Button variant="secondary" onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default SoapNoteView;