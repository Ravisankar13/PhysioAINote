import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Textarea } from '@/components/ui/textarea';
import { 
  Badge 
} from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import DiscussionForm from '@/components/peerExchange/DiscussionForm';
import CommentDisplay from '@/components/peerExchange/CommentDisplay';
import { FileAttachment } from '@/components/peerExchange/FileUploader';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  ThumbsUp, 
  Eye, 
  MessageSquare, 
  Tag, 
  Calendar, 
  ArrowLeft, 
  Edit, 
  Share, 
  TrashIcon, 
  Reply
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from '@/lib/queryClient';

// Types
interface SharedCase {
  id: number;
  userId: number;
  title: string;
  description: string;
  bodyPart: string;
  patientAgeRange: string;
  patientGender: string;
  condition: string;
  presentingComplaints: string;
  clinicalHistory?: string;
  examinationFindings?: string;
  investigationResults?: string;
  initialDiagnosis?: string;
  treatmentApproach?: string;
  outcome?: string;
  learningPoints?: string;
  expertiseLevel: string;
  complexityLevel: string;
  keywords?: string[];
  views: number;
  upvotes: number;
  createdAt: string;
  updatedAt: string;
  user?: {
    username: string;
    profileImage?: string;
  };
}

interface CaseDiscussion {
  id: number;
  caseId: number;
  userId: number;
  parentId: number | null;
  content: string;
  upvotes: number;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    username: string;
    profileImage?: string;
  };
}

const BODY_PARTS = [
  { value: 'shoulder', label: 'Shoulder' },
  { value: 'neck', label: 'Neck' },
  { value: 'back', label: 'Back' },
  { value: 'elbow', label: 'Elbow' },
  { value: 'wrist', label: 'Wrist' },
  { value: 'hand', label: 'Hand' },
  { value: 'hip', label: 'Hip' },
  { value: 'knee', label: 'Knee' },
  { value: 'ankle', label: 'Ankle' },
  { value: 'foot', label: 'Foot' },
  { value: 'general', label: 'General' },
  { value: 'other', label: 'Other' },
];

const EXPERTISE_LEVELS = [
  { value: 'student', label: 'Student' },
  { value: 'novice', label: 'Novice' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
];

const COMPLEXITY_LEVELS = [
  { value: 'simple', label: 'Simple' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'complex', label: 'Complex' },
  { value: 'multifactorial', label: 'Multifactorial' },
];

export default function SharedCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const caseId = parseInt(id);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [comment, setComment] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [replyTo, setReplyTo] = useState<CaseDiscussion | null>(null);
  
  // Queries
  const { 
    data: caseData, 
    isLoading: isLoadingCase 
  } = useQuery<SharedCase>({ 
    queryKey: ['/api/shared-cases', caseId],
    queryFn: () => fetch(`/api/shared-cases/${caseId}`).then(res => res.json()),
    refetchOnWindowFocus: false
  });

  const { 
    data: discussions, 
    isLoading: isLoadingDiscussions 
  } = useQuery<CaseDiscussion[]>({ 
    queryKey: ['/api/shared-cases', caseId, 'discussions'],
    queryFn: () => fetch(`/api/shared-cases/${caseId}/discussions`).then(res => res.json()),
    refetchOnWindowFocus: false
  });

  // Mutations
  const upvoteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/shared-cases/${caseId}/upvote`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shared-cases', caseId] });
      toast({
        title: "Case upvoted",
        description: "Thank you for your feedback",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upvote. Please try again.",
        variant: "destructive",
      });
    }
  });

  const removeUpvoteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', `/api/shared-cases/${caseId}/upvote`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shared-cases', caseId] });
      toast({
        title: "Upvote removed",
        description: "Your upvote has been removed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove upvote. Please try again.",
        variant: "destructive",
      });
    }
  });

  const deleteCaseMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/shared-cases/${caseId}`);
    },
    onSuccess: () => {
      toast({
        title: "Case deleted",
        description: "Your case has been deleted successfully",
      });
      navigate('/shared-cases');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete case. Please try again.",
        variant: "destructive",
      });
    }
  });

  const addCommentMutation = useMutation({
    mutationFn: async (data: { 
      content: string, 
      parentId?: number,
      attachmentUrls?: { url: string; name: string; type: string; size: number; }[]
    }) => {
      const res = await apiRequest('POST', `/api/shared-cases/${caseId}/discussions`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shared-cases', caseId, 'discussions'] });
      setComment('');
      setReplyTo(null);
      toast({
        title: "Comment added",
        description: "Your comment has been added to the discussion",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment. Please try again.",
        variant: "destructive",
      });
    }
  });

  const upvoteDiscussionMutation = useMutation({
    mutationFn: async (discussionId: number) => {
      const res = await apiRequest('POST', `/api/case-discussions/${discussionId}/upvote`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shared-cases', caseId, 'discussions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upvote comment. Please try again.",
        variant: "destructive",
      });
    }
  });

  const removeUpvoteDiscussionMutation = useMutation({
    mutationFn: async (discussionId: number) => {
      const res = await apiRequest('DELETE', `/api/case-discussions/${discussionId}/upvote`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shared-cases', caseId, 'discussions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove upvote. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Find the display names for the enum values
  const bodyPartLabel = caseData ? BODY_PARTS.find(part => part.value === caseData.bodyPart)?.label || caseData.bodyPart : '';
  const expertiseLabel = caseData ? EXPERTISE_LEVELS.find(level => level.value === caseData.expertiseLevel)?.label || caseData.expertiseLevel : '';
  const complexityLabel = caseData ? COMPLEXITY_LEVELS.find(level => level.value === caseData.complexityLevel)?.label || caseData.complexityLevel : '';

  // Format dates
  const createdDate = caseData ? new Date(caseData.createdAt).toLocaleDateString() : '';
  const isOwner = user && caseData && user.id === caseData.userId;

  const handleSubmitComment = (content: string, fileAttachments: FileAttachment[]) => {
    if (!content.trim()) return;
    
    addCommentMutation.mutate({
      content,
      attachmentUrls: fileAttachments.length > 0 ? fileAttachments : undefined,
      ...(replyTo ? { parentId: replyTo.id } : {})
    });
    
    // Reset attachments
    setAttachments([]);
  };

  if (isLoadingCase) {
    return (
      <div className="container py-12 flex justify-center items-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="container py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Case not found</h2>
        <p className="text-muted-foreground mb-6">The case you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => navigate('/shared-cases')}>
          Back to Cases
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Button 
        variant="ghost" 
        className="mb-4" 
        onClick={() => navigate('/shared-cases')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Cases
      </Button>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-2xl mb-2">{caseData.title}</CardTitle>
                  <CardDescription className="flex items-center flex-wrap gap-2">
                    <span className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {createdDate}
                    </span>
                    <span>•</span>
                    <span>{bodyPartLabel}</span>
                    <span>•</span>
                    <span>Age: {caseData.patientAgeRange}</span>
                    {caseData.patientGender && (
                      <>
                        <span>•</span>
                        <span>Gender: {caseData.patientGender}</span>
                      </>
                    )}
                  </CardDescription>
                </div>
                
                {isOwner && (
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/shared-cases/${caseId}/edit`)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <TrashIcon className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete Case</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete this case? This action cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="ghost" onClick={() => {}}>Cancel</Button>
                          <Button 
                            variant="destructive"
                            onClick={() => deleteCaseMutation.mutate()}
                            disabled={deleteCaseMutation.isPending}
                          >
                            {deleteCaseMutation.isPending && (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            Delete
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="bg-primary/5">
                  {complexityLabel} Case
                </Badge>
                <Badge variant="outline" className="bg-primary/5">
                  For {expertiseLabel}s
                </Badge>
                <Badge variant="outline" className="bg-primary/5">
                  {caseData.condition}
                </Badge>
                {caseData.keywords && caseData.keywords.length > 0 && caseData.keywords.map((keyword, i) => (
                  <Badge key={i} variant="secondary">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            
            <CardContent>
              <Tabs defaultValue="overview">
                <TabsList className="mb-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="details">Clinical Details</TabsTrigger>
                  {(caseData.outcome || caseData.learningPoints) && (
                    <TabsTrigger value="outcomes">Outcomes & Learning</TabsTrigger>
                  )}
                </TabsList>
                
                <TabsContent value="overview">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium">Description</h3>
                      <p className="mt-2 text-muted-foreground whitespace-pre-line">{caseData.description}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium">Presenting Complaints</h3>
                      <p className="mt-2 text-muted-foreground whitespace-pre-line">{caseData.presentingComplaints}</p>
                    </div>
                    
                    {caseData.initialDiagnosis && (
                      <div>
                        <h3 className="text-lg font-medium">Initial Diagnosis</h3>
                        <p className="mt-2 text-muted-foreground whitespace-pre-line">{caseData.initialDiagnosis}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="details">
                  <div className="space-y-4">
                    {caseData.clinicalHistory && (
                      <div>
                        <h3 className="text-lg font-medium">Clinical History</h3>
                        <p className="mt-2 text-muted-foreground whitespace-pre-line">{caseData.clinicalHistory}</p>
                      </div>
                    )}
                    
                    {caseData.examinationFindings && (
                      <div>
                        <h3 className="text-lg font-medium">Examination Findings</h3>
                        <p className="mt-2 text-muted-foreground whitespace-pre-line">{caseData.examinationFindings}</p>
                      </div>
                    )}
                    
                    {caseData.investigationResults && (
                      <div>
                        <h3 className="text-lg font-medium">Investigation Results</h3>
                        <p className="mt-2 text-muted-foreground whitespace-pre-line">{caseData.investigationResults}</p>
                      </div>
                    )}
                    
                    {caseData.treatmentApproach && (
                      <div>
                        <h3 className="text-lg font-medium">Treatment Approach</h3>
                        <p className="mt-2 text-muted-foreground whitespace-pre-line">{caseData.treatmentApproach}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="outcomes">
                  <div className="space-y-4">
                    {caseData.outcome && (
                      <div>
                        <h3 className="text-lg font-medium">Outcome</h3>
                        <p className="mt-2 text-muted-foreground whitespace-pre-line">{caseData.outcome}</p>
                      </div>
                    )}
                    
                    {caseData.learningPoints && (
                      <div>
                        <h3 className="text-lg font-medium">Learning Points</h3>
                        <p className="mt-2 text-muted-foreground whitespace-pre-line">{caseData.learningPoints}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            
            <CardFooter className="flex justify-between pt-0">
              <div className="flex space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => upvoteMutation.mutate()}
                  disabled={upvoteMutation.isPending || !user}
                  className="flex items-center"
                >
                  <ThumbsUp className="mr-1 h-4 w-4" />
                  {caseData.upvotes} Upvotes
                </Button>
                
                <div className="flex items-center text-sm text-muted-foreground">
                  <Eye className="mr-1 h-4 w-4" />
                  {caseData.views} Views
                </div>
              </div>
              
              <Button variant="outline" size="sm" asChild>
                <a href="#discussions">
                  <MessageSquare className="mr-1 h-4 w-4" />
                  Join Discussion
                </a>
              </Button>
            </CardFooter>
          </Card>
          
          <div id="discussions">
            <h2 className="text-2xl font-bold mb-4">Discussion</h2>
            
            {user ? (
              <>
                {replyTo && (
                  <div className="mb-2 p-2 border rounded-md bg-muted/30 flex justify-between items-center">
                    <div>
                      <span className="text-sm font-medium">Replying to:</span>
                      <span className="text-sm ml-2">{replyTo.content.substring(0, 100)}{replyTo.content.length > 100 ? '...' : ''}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyTo(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
                
                <DiscussionForm
                  placeholder={replyTo ? "Write your reply..." : "Add to the discussion..."}
                  buttonText={replyTo ? 'Post Reply' : 'Post Comment'}
                  onSubmit={handleSubmitComment}
                  isSubmitting={addCommentMutation.isPending}
                  showCancel={!!replyTo}
                  onCancel={() => setReplyTo(null)}
                  user={user}
                />
              </>
            ) : (
              <div className="mb-6 p-4 border rounded-md bg-muted/30 text-center">
                <p className="mb-2">Sign in to join the discussion</p>
                <Button onClick={() => navigate('/auth')}>Sign In</Button>
              </div>
            )}
            
            {isLoadingDiscussions ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : discussions && discussions.length > 0 ? (
              <div className="space-y-6">
                {discussions.map((discussion) => (
                  <CommentCard 
                    key={discussion.id}
                    discussion={discussion}
                    onReply={() => setReplyTo(discussion)}
                    onUpvote={() => upvoteDiscussionMutation.mutate(discussion.id)}
                    onRemoveUpvote={() => removeUpvoteDiscussionMutation.mutate(discussion.id)}
                    currentUser={user}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border rounded-md">
                <p className="text-muted-foreground">No comments yet. Be the first to start the discussion!</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Case Author</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3">
                <Avatar>
                  {caseData.user?.profileImage ? (
                    <AvatarImage src={caseData.user.profileImage} />
                  ) : (
                    <AvatarFallback>
                      {caseData.user?.username ? caseData.user.username.substring(0, 2).toUpperCase() : 'PT'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="font-medium">{caseData.user?.username || 'Anonymous'}</p>
                  <p className="text-sm text-muted-foreground">Physiotherapist</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Related Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href={`/research?bodyPart=${caseData.bodyPart}`}>
                    <Tag className="mr-2 h-4 w-4" />
                    Find Research: {bodyPartLabel}
                  </a>
                </Button>
                
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href={`/exercises?bodyPart=${caseData.bodyPart}`}>
                    <Tag className="mr-2 h-4 w-4" />
                    Exercises: {bodyPartLabel}
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

interface CommentCardProps {
  discussion: CaseDiscussion;
  onReply: () => void;
  onUpvote: () => void;
  onRemoveUpvote: () => void;
  currentUser: any;
}

function CommentCard({ discussion, onReply, onUpvote, onRemoveUpvote, currentUser }: CommentCardProps) {
  const createdDate = new Date(discussion.createdAt).toLocaleDateString();
  const [showReplies, setShowReplies] = useState(false);
  const { toast } = useToast();
  
  const { data: replies = [] } = useQuery<CaseDiscussion[]>({
    queryKey: ['/api/case-discussions', discussion.id, 'replies'],
    queryFn: () => fetch(`/api/case-discussions/${discussion.id}/replies`).then(res => res.json()),
    enabled: showReplies,
    refetchOnWindowFocus: false
  });
  
  return (
    <div className="border rounded-md p-4">
      <div className="flex gap-4">
        <Avatar className="h-10 w-10">
          {discussion.user?.profileImage ? (
            <AvatarImage src={discussion.user.profileImage} />
          ) : (
            <AvatarFallback>
              {discussion.user?.username ? discussion.user.username.substring(0, 2).toUpperCase() : 'PT'}
            </AvatarFallback>
          )}
        </Avatar>
        
        <div className="flex-1">
          <div className="flex justify-between">
            <div>
              <span className="font-medium">{discussion.user?.username || 'Anonymous'}</span>
              <span className="text-sm text-muted-foreground ml-2">{createdDate}</span>
              {discussion.isEdited && (
                <span className="text-xs text-muted-foreground ml-2">(edited)</span>
              )}
            </div>
          </div>
          
          <div className="mt-2 whitespace-pre-line">
            {discussion.content}
          </div>
          
          <div className="mt-3 flex space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => currentUser ? onUpvote() : toast({
                title: "Authentication required",
                description: "Please sign in to upvote comments",
              })}
              className="flex items-center"
            >
              <ThumbsUp className="mr-1 h-4 w-4" />
              {discussion.upvotes || 0}
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => currentUser ? onReply() : toast({
                title: "Authentication required",
                description: "Please sign in to reply to comments",
              })}
              className="flex items-center"
            >
              <Reply className="mr-1 h-4 w-4" />
              Reply
            </Button>
            
            {replies.length > 0 || showReplies ? (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowReplies(!showReplies)}
                className="flex items-center"
              >
                {showReplies ? 'Hide Replies' : `Show Replies (${replies.length})`}
              </Button>
            ) : null}
          </div>
          
          {showReplies && replies.length > 0 && (
            <div className="mt-4 pl-4 border-l space-y-4">
              {replies.map((reply) => (
                <div key={reply.id} className="pt-4">
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      {reply.user?.profileImage ? (
                        <AvatarImage src={reply.user.profileImage} />
                      ) : (
                        <AvatarFallback>
                          {reply.user?.username ? reply.user.username.substring(0, 2).toUpperCase() : 'PT'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    
                    <div className="flex-1">
                      <div>
                        <span className="font-medium">{reply.user?.username || 'Anonymous'}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {new Date(reply.createdAt).toLocaleDateString()}
                        </span>
                        {reply.isEdited && (
                          <span className="text-xs text-muted-foreground ml-2">(edited)</span>
                        )}
                      </div>
                      
                      <div className="mt-1 whitespace-pre-line">
                        {reply.content}
                      </div>
                      
                      <div className="mt-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => currentUser ? onUpvote() : toast({
                            title: "Authentication required",
                            description: "Please sign in to upvote replies",
                          })}
                          className="flex items-center"
                        >
                          <ThumbsUp className="mr-1 h-4 w-4" />
                          {reply.upvotes || 0}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}