import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Mic } from 'lucide-react';
import VoiceRecorder from './VoiceRecorder';
import { useToast } from '@/hooks/use-toast';

interface VoiceRecordingButtonProps {
  onRecordingComplete: (audioBlob: Blob, transcriptData: any) => void;
}

export default function VoiceRecordingButton({ onRecordingComplete }: VoiceRecordingButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleRecordingComplete = (audioBlob: Blob, transcriptData: any) => {
    onRecordingComplete(audioBlob, transcriptData);
    setIsDialogOpen(false);
    toast({
      title: "Voice Recording Added",
      description: "The recording has been transcribed and added to your notes.",
    });
  };

  return (
    <>
      <Button 
        type="button"
        variant="outline"
        className="flex items-center gap-1 bg-primary-50 text-primary-600 border-primary-200 hover:bg-primary-100 hover:text-primary-700 hover:border-primary-300"
        onClick={() => setIsDialogOpen(true)}
      >
        <Mic className="h-4 w-4" />
        <span>Record Voice</span>
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Voice Recording</DialogTitle>
            <DialogDescription>
              Record your clinical session and the AI will transcribe and analyze it
              to extract key clinical information.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <VoiceRecorder onRecordingComplete={handleRecordingComplete} />
          </div>
          
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}