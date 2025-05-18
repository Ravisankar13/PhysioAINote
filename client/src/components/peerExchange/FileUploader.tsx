import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, FileText, FileImage, Video, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface FileAttachment {
  url: string;
  name: string;
  type: 'image' | 'pdf' | 'video' | 'unknown';
  size: number;
}

interface FileUploaderProps {
  onFilesUploaded: (files: FileAttachment[]) => void;
  maxFiles?: number;
}

const FileUploader = ({ onFilesUploaded, maxFiles = 5 }: FileUploaderProps) => {
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <FileImage className="h-4 w-4" />;
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    if (files.length + e.target.files.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `You can only upload a maximum of ${maxFiles} files`,
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    Array.from(e.target.files).forEach(file => {
      formData.append("files", file);
    });

    setIsUploading(true);
    
    try {
      const response = await fetch('/api/peer-exchange/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload files');
      }
      
      const uploadedFiles: FileAttachment[] = await response.json();
      setFiles(prev => [...prev, ...uploadedFiles]);
      onFilesUploaded([...files, ...uploadedFiles]);
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFilesUploaded(newFiles);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          multiple
          accept="image/jpeg,image/png,image/gif,application/pdf,video/mp4,video/webm,video/quicktime"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || files.length >= maxFiles}
          className="text-xs"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Paperclip className="h-3 w-3 mr-1" />
              Add Attachment
            </>
          )}
        </Button>
        {files.length > 0 && (
          <span className="ml-2 text-xs text-muted-foreground">
            {files.length} of {maxFiles} files
          </span>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 rounded-md border text-sm bg-muted/30"
            >
              <div className="flex items-center space-x-2 truncate">
                {getFileIcon(file.type)}
                <span className="truncate max-w-[200px]">{file.name}</span>
                <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveFile(index)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove</span>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploader;