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

// These are fallback placeholders when real images aren't available
export const placeholderImages: Record<string, string> = {
  shoulder: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Shoulder_joint.svg/800px-Shoulder_joint.svg.png',
  knee: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Knee_diagram.svg/800px-Knee_diagram.svg.png',
  back: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Spinal_column_curvature-en.svg/800px-Spinal_column_curvature-en.svg.png',
  neck: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Gray_111_-_Vertebral_column-coloured.png/800px-Gray_111_-_Vertebral_column-coloured.png',
  elbow: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Elbow_joint_skeletal_anatomy_anterior_view.gif/800px-Elbow_joint_skeletal_anatomy_anterior_view.gif',
  wrist: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Wrist_and_hand_deeper_palmar_dissection-en.svg/800px-Wrist_and_hand_deeper_palmar_dissection-en.svg.png',
  hand: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Hand_anatomy_bones.jpg/800px-Hand_anatomy_bones.jpg',
  hip: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Hip_joint_colored.svg/800px-Hip_joint_colored.svg.png',
  ankle: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Ankle.PNG/800px-Ankle.PNG',
  foot: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Skeletal_anatomy_of_human_foot.svg/800px-Skeletal_anatomy_of_human_foot.svg.png',
  other: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Human_anatomy_chart.svg/800px-Human_anatomy_chart.svg.png',
  general: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Human_anatomy_chart.svg/800px-Human_anatomy_chart.svg.png',
};

// Get a placeholder image for a given body part
export function getPlaceholderImage(bodyPart: string): string {
  const normalizedBodyPart = bodyPart.toLowerCase();
  return placeholderImages[normalizedBodyPart] || placeholderImages.general;
}