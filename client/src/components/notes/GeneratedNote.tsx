import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { saveClinicalNote } from "@/lib/openai";
import { exportToPdf, exportToText } from "@/lib/exportPdf";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Edit, Download, Save } from "@/components/ui/icon";

interface GeneratedNoteProps {
  noteData: {
    patientName: string;
    patientId: string;
    dateOfBirth: string;
    dateOfVisit: string;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    fullNote: any;
  };
  onEdit: () => void;
}

const GeneratedNote = ({ noteData, onEdit }: GeneratedNoteProps) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const saveNoteMutation = useMutation({
    mutationFn: saveClinicalNote,
    onSuccess: () => {
      setIsSaving(false);
      toast({
        title: "Note Saved",
        description: "Your clinical note has been successfully saved.",
      });
    },
    onError: (error) => {
      setIsSaving(false);
      console.error("Error saving note:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save the clinical note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    setIsSaving(true);
    saveNoteMutation.mutate(noteData);
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const success = await exportToPdf(noteData);
      if (success) {
        toast({
          title: "PDF Exported",
          description: "Your clinical note has been exported as PDF.",
        });
      } else {
        throw new Error("PDF export failed");
      }
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export as PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportText = async () => {
    setIsExporting(true);
    try {
      const success = await exportToText(noteData);
      if (success) {
        toast({
          title: "Text File Exported",
          description: "Your clinical note has been exported as a text file.",
        });
      } else {
        throw new Error("Text export failed");
      }
    } catch (error) {
      console.error("Text export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export as text. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Format date strings for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };

  return (
    <Card className="bg-white mt-8">
      <CardContent className="p-6 sm:p-10">
        <div className="pb-5 border-b border-primary/10 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-primary">Generated SOAP Note</h3>
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onEdit}
              className="border-primary/20 hover:bg-primary/5 text-primary"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSave} 
              disabled={isSaving}
              className="border-secondary/20 hover:bg-secondary/5 text-secondary"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                  disabled={isExporting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? "Exporting..." : "Export"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPdf}>
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportText}>
                  Export as Text
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-6 text-foreground border border-primary/10 rounded-lg p-6 bg-primary/5">
          {/* Patient Info */}
          <div className="mb-6 pb-4 border-b border-primary/10">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-primary/60">Patient Name</p>
                <p className="font-medium text-foreground">{noteData.patientName}</p>
              </div>
              <div>
                <p className="text-sm text-primary/60">Patient ID</p>
                <p className="font-medium text-foreground">{noteData.patientId}</p>
              </div>
              <div>
                <p className="text-sm text-primary/60">Date of Birth</p>
                <p className="font-medium text-foreground">{formatDate(noteData.dateOfBirth)}</p>
              </div>
              <div>
                <p className="text-sm text-primary/60">Date of Visit</p>
                <p className="font-medium text-foreground">{formatDate(noteData.dateOfVisit)}</p>
              </div>
            </div>
          </div>

          {/* SOAP Content */}
          <div className="space-y-6">
            {/* Subjective */}
            <div>
              <h4 className="font-medium text-primary">Subjective</h4>
              <p className="mt-2 text-sm whitespace-pre-line text-foreground">{noteData.subjective}</p>
            </div>

            {/* Objective */}
            <div>
              <h4 className="font-medium text-primary">Objective</h4>
              <p className="mt-2 text-sm whitespace-pre-line text-foreground">{noteData.objective}</p>
            </div>

            {/* Assessment */}
            <div>
              <h4 className="font-medium text-primary">Assessment</h4>
              <p className="mt-2 text-sm whitespace-pre-line text-foreground">{noteData.assessment}</p>
            </div>

            {/* Plan */}
            <div>
              <h4 className="font-medium text-primary">Plan</h4>
              <p className="mt-2 text-sm whitespace-pre-line text-foreground">{noteData.plan}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GeneratedNote;
