import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThumbsUp, Reply } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import AttachmentDisplay from './AttachmentDisplay';
import { FileAttachment } from './FileUploader';

interface CommentDisplayProps {
  comment: {
    id: number;
    content: string;
    upvotes: number;
    userId: number;
    createdAt: string;
    updatedAt: string;
    isEdited: boolean;
    attachmentUrls?: FileAttachment[];
    user?: {
      username: string;
      profileImage?: string;
    };
  };
  onReply: () => void;
  onUpvote: () => void;
  onRemoveUpvote: () => void;
  isCurrentUserUpvoted?: boolean;
  isCurrentUserComment?: boolean;
}

const CommentDisplay = ({
  comment,
  onReply,
  onUpvote,
  onRemoveUpvote,
  isCurrentUserUpvoted = false,
  isCurrentUserComment = false
}: CommentDisplayProps) => {
  const [expanded, setExpanded] = useState(false);
  const { content, user, createdAt, isEdited, upvotes } = comment;
  // Handle potential undefined attachmentUrls
  const attachments = comment.attachmentUrls || [];
  
  // For long comments, only show first 300 characters with "See more" button
  const isLongContent = content.length > 300;
  const displayContent = expanded || !isLongContent ? content : content.substring(0, 300) + '...';
  
  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true });
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="flex gap-3 p-4 border rounded-md bg-card">
      <Avatar className="h-9 w-9">
        {user?.profileImage ? (
          <AvatarImage src={user.profileImage} alt={user.username} />
        ) : (
          <AvatarFallback>{user ? getInitials(user.username) : 'U'}</AvatarFallback>
        )}
      </Avatar>
      
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium">{user?.username || 'Anonymous'}</span>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
          {isEdited && <span className="text-xs text-muted-foreground">(edited)</span>}
        </div>
        
        <div className="space-y-3">
          <p className="whitespace-pre-line">{displayContent}</p>
          
          {isLongContent && !expanded && (
            <Button 
              variant="link" 
              className="p-0 h-auto text-xs font-normal text-muted-foreground"
              onClick={() => setExpanded(true)}
            >
              See more
            </Button>
          )}
          
          {attachments.length > 0 && (
            <AttachmentDisplay attachments={attachments} />
          )}
          
          <div className="flex items-center gap-3 mt-2">
            <Button
              variant={isCurrentUserUpvoted ? "secondary" : "ghost"}
              size="sm"
              onClick={isCurrentUserUpvoted ? onRemoveUpvote : onUpvote}
              className="h-8 px-2"
            >
              <ThumbsUp className="h-4 w-4 mr-1" />
              {upvotes > 0 && upvotes}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onReply}
              className="h-8 px-2"
            >
              <Reply className="h-4 w-4 mr-1" />
              Reply
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentDisplay;