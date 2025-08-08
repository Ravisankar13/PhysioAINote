import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Users, Shield, Eye, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ForumShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  soapData: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  soapNoteId?: number;
  virtualPatientId?: number;
}

export function ForumShareDialog({
  isOpen,
  onClose,
  soapData,
  soapNoteId,
  virtualPatientId
}: ForumShareDialogProps) {
  const [questions, setQuestions] = useState<string[]>(['']);
  const [shareVirtualPatient, setShareVirtualPatient] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isSanitizing, setIsSanitizing] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [sanitizedPost, setSanitizedPost] = useState<any>(null);
  const [preview, setPreview] = useState<string>('');
  const [activeTab, setActiveTab] = useState('setup');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleAddQuestion = () => {
    setQuestions([...questions, '']);
  };

  const handleQuestionChange = (index: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[index] = value;
    setQuestions(newQuestions);
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSanitize = async () => {
    setIsSanitizing(true);
    setError(null);
    
    try {
      const response = await fetch('/api/forum/sanitize-soap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          soapData,
          specificQuestions: questions.filter(q => q.trim())
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to sanitize');
      }
      
      const data = await response.json();
      
      setSanitizedPost(data.sanitizedPost);
      setPreview(data.preview);
      setActiveTab('preview');
      
      if (!data.isCompliant) {
        setError('Some privacy concerns were detected. Please review the sanitized content carefully.');
      }
    } catch (err) {
      setError('Failed to sanitize SOAP note for forum sharing');
      console.error(err);
    } finally {
      setIsSanitizing(false);
    }
  };

  const handlePost = async () => {
    if (!sanitizedPost) return;
    
    setIsPosting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          sanitizedPost,
          soapNoteId,
          virtualPatientId: shareVirtualPatient ? virtualPatientId : null,
          shareVirtualPatient,
          isAnonymous
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to post');
      }
      
      setSuccess(true);
      setTimeout(() => {
        onClose();
        // Reset state
        setSanitizedPost(null);
        setPreview('');
        setQuestions(['']);
        setActiveTab('setup');
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError('Failed to post to forum');
      console.error(err);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Share Case with Community
          </DialogTitle>
          <DialogDescription>
            Get feedback from fellow practitioners on this clinical case
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Successfully Posted!</h3>
            <p className="text-muted-foreground">
              Your case has been shared with the community
            </p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="setup">Setup</TabsTrigger>
              <TabsTrigger value="preview" disabled={!sanitizedPost}>
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="setup" className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Your case will be automatically de-identified to protect patient privacy.
                  All personal information will be removed or generalized.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold mb-2 block">
                    What questions do you have for the community?
                  </Label>
                  {questions.map((question, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Textarea
                        placeholder="e.g., What treatment approaches would you recommend?"
                        value={question}
                        onChange={(e) => handleQuestionChange(index, e.target.value)}
                        className="flex-1"
                        rows={2}
                      />
                      {questions.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveQuestion(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddQuestion}
                  >
                    Add Another Question
                  </Button>
                </div>

                <div className="space-y-3">
                  {virtualPatientId && (
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="share-vp">Share 3D Virtual Patient Model</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow others to view the associated 3D model
                        </p>
                      </div>
                      <Switch
                        id="share-vp"
                        checked={shareVirtualPatient}
                        onCheckedChange={setShareVirtualPatient}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="anonymous">Post Anonymously</Label>
                      <p className="text-sm text-muted-foreground">
                        Hide your username from the post
                      </p>
                    </div>
                    <Switch
                      id="anonymous"
                      checked={isAnonymous}
                      onCheckedChange={setIsAnonymous}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <Alert>
                <Eye className="h-4 w-4" />
                <AlertDescription>
                  Review the sanitized version of your case below. All patient-identifying
                  information has been removed.
                </AlertDescription>
              </Alert>

              <ScrollArea className="h-[400px] border rounded-lg p-4">
                <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                  {preview}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          {!success && (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              {activeTab === 'setup' ? (
                <Button onClick={handleSanitize} disabled={isSanitizing}>
                  {isSanitizing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sanitizing...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Sanitize & Preview
                    </>
                  )}
                </Button>
              ) : (
                <Button onClick={handlePost} disabled={isPosting}>
                  {isPosting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Post to Forum
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}