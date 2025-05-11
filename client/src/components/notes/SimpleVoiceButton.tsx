import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Mic } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Define a simpler version of VoiceRecorder component focused on just the button
export default function SimpleVoiceButton({ onClick }: { onClick: () => void }) {
  return (
    <Button 
      type="button"
      variant="outline"
      className="flex items-center gap-1 bg-primary-50 text-primary-600 border-primary-200 hover:bg-primary-100 hover:text-primary-700 hover:border-primary-300"
      onClick={onClick}
    >
      <Mic className="h-4 w-4" />
      <span>Record Voice</span>
    </Button>
  );
}