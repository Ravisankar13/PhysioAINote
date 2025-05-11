import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Mic } from 'lucide-react';
import VoiceRecorder from './VoiceRecorder';
import { useToast } from '@/hooks/use-toast';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface VoiceRecordingDrawerProps {
  onRecordingComplete: (audioBlob: Blob, transcriptData: any) => void;
}

export default function VoiceRecordingDrawer({ onRecordingComplete }: VoiceRecordingDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleRecordingComplete = (audioBlob: Blob, transcriptData: any) => {
    onRecordingComplete(audioBlob, transcriptData);
    setIsOpen(false);
    toast({
      title: "Voice Recording Added",
      description: "The recording has been transcribed and added to your notes.",
    });
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button 
          type="button"
          variant="outline"
          className="flex items-center gap-1 bg-primary-50 text-primary-600 border-primary-200 hover:bg-primary-100 hover:text-primary-700 hover:border-primary-300"
        >
          <Mic className="h-4 w-4" />
          <span>Record Voice</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader>
            <DrawerTitle>Voice Recording</DrawerTitle>
            <DrawerDescription>
              Record your clinical session and the AI will transcribe and analyze it
              to extract key clinical information.
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="p-4">
            <VoiceRecorder onRecordingComplete={handleRecordingComplete} />
          </div>
          
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}