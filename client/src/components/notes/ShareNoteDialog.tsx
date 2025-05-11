import { useState } from "react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Share2, Shield, Users, Info } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

interface ShareNoteDialogProps {
  noteId: number;
  currentVisibility: string;
}

export function ShareNoteDialog({ noteId, currentVisibility }: ShareNoteDialogProps) {
  const [open, setOpen] = useState(false);
  const [visibility, setVisibility] = useState(currentVisibility);
  const [bodyPart, setBodyPart] = useState("other");
  const [condition, setCondition] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState(false);
  
  const queryClient = useQueryClient();
  
  // Mutation for updating note visibility
  const shareNoteMutation = useMutation({
    mutationFn: async (data: { 
      visibility: string,
      condition?: string 
    }) => {
      const response = await apiRequest(
        "PATCH", 
        `/api/notes/${noteId}/visibility`, 
        data
      );
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notes", noteId] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-notes"] });
      
      // Show success message
      toast({
        title: "Note shared successfully",
        description: visibility === "private" 
          ? "Your note is now private" 
          : "Your note has been shared with other users",
      });
      
      // Close the dialog
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error sharing note",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: any = { visibility };
    
    // If condition is provided, include it
    if (additionalInfo && condition.trim()) {
      data.condition = condition;
    }
    
    // Submit the data
    shareNoteMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Clinical Note</DialogTitle>
          <DialogDescription>
            Choose how you want to share this clinical note with other physiotherapists.
            All patient personal information will be automatically de-identified when shared.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <RadioGroup 
              value={visibility} 
              onValueChange={setVisibility}
              className="grid grid-cols-1 gap-4"
            >
              <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                <RadioGroupItem value="private" id="private" />
                <div className="space-y-1">
                  <Label htmlFor="private" className="font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    Private
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Only you can access this note. The note will not be visible to other users.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                <RadioGroupItem value="shared" id="shared" />
                <div className="space-y-1">
                  <Label htmlFor="shared" className="font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Shared with Colleagues
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    All registered physiotherapists can view a de-identified version of this note.
                    Patient's personal information will be removed.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                <RadioGroupItem value="public" id="public" />
                <div className="space-y-1">
                  <Label htmlFor="public" className="font-medium flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-muted-foreground" />
                    Public
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Anyone visiting the platform can view a de-identified version of this note.
                    Patient's personal information will be removed.
                  </p>
                </div>
              </div>
            </RadioGroup>
            
            {(visibility === "shared" || visibility === "public") && (
              <div className="border rounded-md p-4 space-y-4">
                <div className="flex items-center space-x-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  <h4 className="text-sm font-medium">De-identification Information</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Patient name, ID, date of birth, and any other personal identifiers will be automatically removed.
                  Age will be shown as a range (e.g., "40-49").
                </p>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="additional-info" 
                      checked={additionalInfo}
                      onChange={(e) => setAdditionalInfo(e.target.checked)}
                      className="rounded border-gray-300 text-primary"
                    />
                    <Label htmlFor="additional-info" className="text-sm font-medium">
                      Add a custom condition description
                    </Label>
                  </div>
                  
                  {additionalInfo && (
                    <div className="space-y-2">
                      <Label htmlFor="condition" className="text-sm">
                        Condition Description (no patient identifiers)
                      </Label>
                      <Input
                        id="condition"
                        value={condition}
                        onChange={(e) => setCondition(e.target.value)}
                        placeholder="E.g., 'Chronic lower back pain with limited range of motion'"
                      />
                      <p className="text-xs text-muted-foreground">
                        This description will appear on the shared note. Keep it concise and ensure it
                        does not contain any identifiable patient information.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex space-x-2 justify-end">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              type="submit" 
              disabled={shareNoteMutation.isPending}
            >
              {shareNoteMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}