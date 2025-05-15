/**
 * Utility functions for generating appropriate manual therapy technique images
 */

// Base URL for realistic physiotherapy technique images
const PHYSIO_IMAGE_BASE = 'https://images.unsplash.com/';

// Map of technique keywords to specific image IDs
const techniqueImageMap: Record<string, string> = {
  // Shoulder techniques
  'glenohumeral': 'photo-1576091160399-112ba8d8a613', // Shoulder mobilization
  'scapular': 'photo-1576091160550-2173dba999ef',     // Scapular work
  'rotator cuff': 'photo-1571019613454-1cb2f99b2d8b', // Rotator cuff

  // Neck techniques
  'cervical': 'photo-1573461270090-25442e00a3ba',      // Cervical spine
  'suboccipital': 'photo-1544367567-0f2fcb009e0b',     // Neck release
  'thoracic': 'photo-1518611012118-696072aa579a',      // Upper back

  // Back techniques
  'lumbar': 'photo-1544174682-80c33e5dc0c5',           // Lower back
  'sacroiliac': 'photo-1571019613576-2b22c76fd955',    // SI joint
  'myofascial': 'photo-1576091160602-231ed5222033',    // Myofascial release

  // Elbow techniques
  'elbow': 'photo-1576091160391-b1e9300bee36',         // Elbow mobilization
  'radial': 'photo-1582056615717-c6717d5d3d8e',         // Radial head
  'ulnar': 'photo-1583454110551-21f2fa2afe61',          // Ulnar techniques

  // Wrist & Hand techniques
  'wrist': 'photo-1595078475395-3c73c9a9fbe7',          // Wrist techniques  
  'carpal': 'photo-1599064889677-bff4b800c1a0',         // Carpal mobilization
  'hand': 'photo-1612349450846-eeafe84c3832',           // Hand techniques

  // Hip techniques
  'hip': 'photo-1597347316205-34311d222e81',           // Hip mobilization
  'piriformis': 'photo-1581704906775-5f9d535e45e1',    // Piriformis/hip work
  'psoas': 'photo-1581704908483-224f772048c9',         // Psoas release

  // Knee techniques  
  'knee': 'photo-1581338669896-ce9af7709696',          // Knee mobilization
  'patella': 'photo-1571172964533-d2d13d88ce7e',       // Patellofemoral
  'tibiofemoral': 'photo-1581338669889-fa92d98ef779',  // Tibiofemoral joint

  // Ankle techniques
  'ankle': 'photo-1581338669852-5c1492c27b1b',         // Ankle mobilization
  'talocrural': 'photo-1582056613297-d154bcc6365f',    // Talocrural joint
  'subtalar': 'photo-1574680178050-55c6a6a96e0a',      // Subtalar joint

  // Foot techniques
  'foot': 'photo-1519315901367-f34ff9154487',          // Foot mobilization
  'plantar': 'photo-1508387027939-27cee6a8a5c3',       // Plantar techniques
  'tarsal': 'photo-1531930787603-cfe04268bfa2',        // Tarsal mobilization
  
  // General and neural techniques
  'neural': 'photo-1576765608622-5abf50c46a14',        // Neural mobilization
  'mobility': 'photo-1576091160399-112ba8d8a613',      // General mobilization
  'manipulation': 'photo-1576091160391-b1e9300bee36',  // Manipulation
  'soft tissue': 'photo-1576091160550-2173dba999ef',   // Soft tissue work
  'release': 'photo-1588286041266-247603a9cee5',       // Release techniques
  'massage': 'photo-1573461270102-c22a893d70b5',       // Massage-type
  'traction': 'photo-1576091160399-112ba8d8a613',      // Traction techniques
  'mulligan': 'photo-1571019613454-1cb2f99b2d8b',      // Mulligan techniques
  'mckenzie': 'photo-1581704906775-5f9d535e45e1',      // McKenzie
  'mobilization': 'photo-1571019613576-2b22c76fd955',  // General mobilization
};

/**
 * Body part specific fallback images if no keyword match is found 
 */
const bodyPartFallbacks: Record<string, string> = {
  shoulder: 'photo-1576091160399-112ba8d8a613',
  neck: 'photo-1573461270090-25442e00a3ba',
  back: 'photo-1544174682-80c33e5dc0c5',
  elbow: 'photo-1576091160391-b1e9300bee36',
  wrist: 'photo-1595078475395-3c73c9a9fbe7',
  hand: 'photo-1612349450846-eeafe84c3832',
  hip: 'photo-1597347316205-34311d222e81',
  knee: 'photo-1581338669896-ce9af7709696',
  ankle: 'photo-1581338669852-5c1492c27b1b',
  foot: 'photo-1519315901367-f34ff9154487',
  general: 'photo-1576091160550-2173dba999ef',
  other: 'photo-1571172964276-59505503bbb0',
};

/**
 * Image quality parameters for unsplash images
 */
const imageParams = 'q=80&w=600&auto=format&fit=crop';

/**
 * Generates an appropriate image URL for a manual therapy technique
 * based on its title and body part
 * 
 * @param title The technique title
 * @param bodyPart The body part the technique targets
 * @returns A URL to an appropriate image
 */
export function getTherapyTechniqueImage(title: string, bodyPart: string): string {
  const normalizedTitle = title.toLowerCase();
  
  // Try to find a match based on technique keywords
  for (const [keyword, imageId] of Object.entries(techniqueImageMap)) {
    if (normalizedTitle.includes(keyword.toLowerCase())) {
      return `${PHYSIO_IMAGE_BASE}${imageId}?${imageParams}`;
    }
  }
  
  // Use a body part specific fallback image if keyword match fails
  const fallbackImage = bodyPartFallbacks[bodyPart] || bodyPartFallbacks.other;
  return `${PHYSIO_IMAGE_BASE}${fallbackImage}?${imageParams}`;
}

/**
 * Generate a color gradient background for the technique based on body part
 * This is used as a secondary fallback if images don't load
 */
export function getBodyPartGradient(bodyPart: string): string {
  const gradients: Record<string, string> = {
    shoulder: 'from-blue-400 to-sky-500',
    neck: 'from-purple-400 to-indigo-500',
    back: 'from-green-400 to-emerald-500',
    elbow: 'from-yellow-400 to-amber-500',
    wrist: 'from-orange-400 to-red-500',
    hand: 'from-red-400 to-rose-500',
    hip: 'from-pink-400 to-rose-500',
    knee: 'from-violet-400 to-purple-500',
    ankle: 'from-indigo-400 to-blue-500',
    foot: 'from-blue-400 to-cyan-500',
    general: 'from-gray-400 to-slate-500',
    other: 'from-slate-400 to-gray-500',
  };
  
  return gradients[bodyPart] || 'from-slate-400 to-gray-500';
}