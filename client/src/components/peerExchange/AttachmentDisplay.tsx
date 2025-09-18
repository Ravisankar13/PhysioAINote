import { FileImage, FileText, Video, ExternalLink } from 'lucide-react';
import { FileAttachment } from './FileUploader';

interface AttachmentDisplayProps {
  attachments: FileAttachment[];
}

const AttachmentDisplay = ({ attachments }: AttachmentDisplayProps) => {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  const renderAttachment = (attachment: FileAttachment) => {
    switch (attachment.type) {
      case 'image':
        return (
          <div className="relative group">
            <img 
              src={attachment.url} 
              alt={attachment.name} 
              className="max-h-48 max-w-full object-contain rounded-md border border-gray-200" 
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-md">
              <a 
                href={attachment.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="p-2 bg-white rounded-full"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        );
      case 'video':
        return (
          <div className="border border-gray-200 rounded-md p-2 bg-muted/20">
            <div className="flex items-center space-x-2 mb-2">
              <Video className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium truncate">{attachment.name}</span>
            </div>
            <video 
              controls 
              className="max-h-48 max-w-full" 
              src={attachment.url}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        );
      case 'pdf':
        return (
          <a 
            href={attachment.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center gap-2 p-3 border border-gray-200 rounded-md hover:bg-muted/20 transition-colors"
          >
            <FileText className="h-5 w-5 text-red-500" />
            <div>
              <span className="text-sm font-medium">{attachment.name}</span>
              <p className="text-xs text-muted-foreground">View PDF</p>
            </div>
            <ExternalLink className="h-4 w-4 ml-auto" />
          </a>
        );
      default:
        return (
          <a 
            href={attachment.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center gap-2 p-3 border border-gray-200 rounded-md hover:bg-muted/20 transition-colors"
          >
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <span className="text-sm font-medium">{attachment.name}</span>
              <p className="text-xs text-muted-foreground">Download file</p>
            </div>
            <ExternalLink className="h-4 w-4 ml-auto" />
          </a>
        );
    }
  };

  return (
    <div className="space-y-3 mt-3">
      <h4 className="text-sm font-medium text-muted-foreground">Attachments</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {attachments.map((attachment, index) => (
          <div key={index} className="overflow-hidden">
            {renderAttachment(attachment)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttachmentDisplay;