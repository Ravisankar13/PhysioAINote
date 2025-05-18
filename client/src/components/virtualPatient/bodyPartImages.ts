export interface BodyPartImage {
  bodyPart: string;
  imageUrl: string;
  description?: string;
}

// Function to get the appropriate image URL for a body part
export function getBodyPartImageUrl(bodyPart: string): string {
  const defaultImage = '/placeholder-anatomy.png';
  
  // Using URLs that would work in the app
  switch (bodyPart.toLowerCase()) {
    case 'shoulder':
      return '/images/anatomy/shoulder.png';
    case 'knee':
      return '/images/anatomy/knee.png';
    case 'back':
      return '/images/anatomy/back.png';
    case 'neck':
      return '/images/anatomy/neck.png';
    case 'elbow':
      return '/images/anatomy/elbow.png';
    case 'wrist':
      return '/images/anatomy/wrist.png';
    case 'hand':
      return '/images/anatomy/hand.png';
    case 'hip':
      return '/images/anatomy/hip.png';
    case 'ankle':
      return '/images/anatomy/ankle.png';
    case 'foot':
      return '/images/anatomy/foot.png';
    default:
      return defaultImage;
  }
}

// These are working image URLs for anatomy visualization
export const placeholderImages: Record<string, string> = {
  shoulder: 'https://images.unsplash.com/photo-1616279969856-759f14f2f8a7?q=80&w=800&auto=format&fit=crop',
  knee: 'https://images.unsplash.com/photo-1594009598067-84b0b2280377?q=80&w=800&auto=format&fit=crop',
  back: 'https://images.unsplash.com/photo-1554344056-d7be7227d7bd?q=80&w=800&auto=format&fit=crop',
  neck: 'https://images.unsplash.com/photo-1600443272877-847cf8e4ba73?q=80&w=800&auto=format&fit=crop',
  elbow: 'https://images.unsplash.com/photo-1617636135946-ef19d0c738de?q=80&w=800&auto=format&fit=crop',
  wrist: 'https://images.unsplash.com/photo-1581963820761-b917a5b0c949?q=80&w=800&auto=format&fit=crop',
  hand: 'https://images.unsplash.com/photo-1595626269047-deca916c4105?q=80&w=800&auto=format&fit=crop',
  hip: 'https://images.unsplash.com/photo-1600443272877-847cf8e4ba73?q=80&w=800&auto=format&fit=crop',
  ankle: 'https://images.unsplash.com/photo-1604005940262-01853f290555?q=80&w=800&auto=format&fit=crop',
  foot: 'https://images.unsplash.com/photo-1596825205266-79e5ec04a939?q=80&w=800&auto=format&fit=crop',
  other: 'https://images.unsplash.com/photo-1628087236614-4896e21cbc19?q=80&w=800&auto=format&fit=crop',
  general: 'https://images.unsplash.com/photo-1564711976302-b26583b66bbb?q=80&w=800&auto=format&fit=crop',
};

// Get a placeholder image for a given body part
export function getPlaceholderImage(bodyPart: string): string {
  const normalizedBodyPart = bodyPart.toLowerCase();
  return placeholderImages[normalizedBodyPart] || placeholderImages.general;
}