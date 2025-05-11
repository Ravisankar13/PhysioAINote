import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  userId: number;
  noteId: number;
  parentId: number | null;
  user?: {
    username: string;
  };
}

interface CommentSectionProps {
  noteId: number;
}

export function CommentSection({ noteId }: CommentSectionProps) {
  const [commentText, setCommentText] = useState("");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch comments for this note
  const {
    data: comments = [],
    isLoading,
    error,
  } = useQuery<Comment[]>({
    queryKey: ["/api/notes", noteId, "comments"],
    queryFn: async () => {
      const res = await fetch(`/api/notes/${noteId}/comments`);
      if (!res.ok) throw new Error("Failed to fetch comments");
      return res.json();
    },
  });

  // Mutation for adding a new comment
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/notes/${noteId}/comments`, {
        content,
        noteId,
      });
      return response.json();
    },
    onSuccess: () => {
      // Clear the input field
      setCommentText("");
      
      // Invalidate and refetch comments
      queryClient.invalidateQueries({ queryKey: ["/api/notes", noteId, "comments"] });
      
      toast({
        title: "Comment added",
        description: "Your comment has been added to the note.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add comment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    addCommentMutation.mutate(commentText);
  };

  // Helper function to get initials from username
  const getInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        Failed to load comments. Please try again later.
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Comment list */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No comments yet. Be the first to start a discussion!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {getInitials(comment.user?.username || "User")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center text-sm">
                  <span className="font-medium">{comment.user?.username || "User"}</span>
                  <span className="text-muted-foreground ml-2">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm">{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add comment form */}
      {user ? (
        <form onSubmit={handleSubmitComment} className="space-y-3">
          <Textarea
            placeholder="Add your professional insight or ask a question..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!commentText.trim() || addCommentMutation.isPending}
              size="sm"
            >
              {addCommentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                "Post Comment"
              )}
            </Button>
          </div>
        </form>
      ) : (
        <div className="text-center p-4 border rounded-md bg-gray-50 dark:bg-gray-900">
          <p className="text-sm text-muted-foreground">
            Please sign in to participate in the discussion.
          </p>
        </div>
      )}
    </div>
  );
}