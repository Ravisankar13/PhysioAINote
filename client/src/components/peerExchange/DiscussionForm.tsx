import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, X } from 'lucide-react';
import FileUploader, { FileAttachment } from './FileUploader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface DiscussionFormProps {
  placeholder?: string;
  buttonText?: string;
  onSubmit: (content: string, attachments: FileAttachment[]) => void;
  isSubmitting: boolean;
  onCancel?: () => void;
  showCancel?: boolean;
  user?: {
    username: string;
    profileImage?: string;
  };
}

const DiscussionForm = ({
  placeholder = 'Share your thoughts...',
  buttonText = 'Post Comment',
  onSubmit,
  isSubmitting,
  onCancel,
  showCancel = false,
  user
}: DiscussionFormProps) => {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSubmit(content, attachments);
  };

  const handleCancel = () => {
    setContent('');
    setAttachments([]);
    if (onCancel) onCancel();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="p-4 rounded-md border bg-card">
      <div className="flex gap-3">
        {user && (
          <Avatar className="h-9 w-9">
            {user.profileImage ? (
              <AvatarImage src={user.profileImage} alt={user.username} />
            ) : (
              <AvatarFallback>{getInitials(user.username)}</AvatarFallback>
            )}
          </Avatar>
        )}
        <div className="flex-1 space-y-3">
          <Textarea
            placeholder={placeholder}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px]"
          />
          
          <FileUploader
            onFilesUploaded={setAttachments}
            maxFiles={5}
          />

          <div className="flex justify-end gap-2">
            {showCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!content.trim() || isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {buttonText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscussionForm;