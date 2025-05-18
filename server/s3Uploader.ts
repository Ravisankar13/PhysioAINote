import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import multer from "multer";
import multerS3 from "multer-s3";
import path from "path";
import { Request } from "express";

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Configure allowed MIME types
const ALLOWED_FILE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov'
};

// Helper to check if file type is allowed
export const isAllowedFileType = (mimeType: string): boolean => {
  return Object.keys(ALLOWED_FILE_TYPES).includes(mimeType);
};

// Configure multer for S3 uploads
export const uploadToS3 = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_S3_BUCKET!,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req: Request, file: Express.Multer.File, cb: any) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req: Request, file: Express.Multer.File, cb: any) {
      // Generate paths based on the upload context
      const uploadContext = req.params.context || "attachments";
      const fileExt = ALLOWED_FILE_TYPES[file.mimetype as keyof typeof ALLOWED_FILE_TYPES] || 
                     path.extname(file.originalname).substring(1);
      const fileName = `${uploadContext}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      cb(null, fileName);
    },
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: any) => {
    if (isAllowedFileType(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Unsupported file type. Allowed types: ${Object.keys(ALLOWED_FILE_TYPES).join(
            ", "
          )}`
        ),
        false
      );
    }
  },
});

// Function to get file type from file mime type
export function getFileType(mimeType: string): 'image' | 'pdf' | 'video' | 'unknown' {
  if (mimeType.startsWith('image/')) {
    return 'image';
  } else if (mimeType === 'application/pdf') {
    return 'pdf';
  } else if (mimeType.startsWith('video/')) {
    return 'video';
  } else {
    return 'unknown';
  }
}

// Function to upload a single file from a buffer (for programmatic uploads)
export async function uploadBufferToS3(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folder: string = "attachments"
): Promise<string> {
  try {
    const fileExt = ALLOWED_FILE_TYPES[mimeType as keyof typeof ALLOWED_FILE_TYPES] || 
                   path.extname(fileName).substring(1);
    const key = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ACL: "public-read",
      },
    });

    await upload.done();
    return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw error;
  }
}