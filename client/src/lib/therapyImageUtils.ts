/**
 * Utility functions for generating appropriate manual therapy technique images
 */

// Direct URLs to physiotherapy technique images for maximum reliability
// Using high-quality medical/physiotherapy-specific stock imagery
const techniqueImageMap: Record<string, string> = {
  // Shoulder techniques
  'glenohumeral': 'https://plus.unsplash.com/premium_photo-1681487868191-8ad3e79cc540?q=80&w=1170&auto=format&fit=crop',
  'scapular': 'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?q=80&w=1170&auto=format&fit=crop',
  'rotator cuff': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=1170&auto=format&fit=crop',

  // Neck techniques
  'cervical': 'https://images.unsplash.com/photo-1573461270090-25442e00a3ba?q=80&w=1170&auto=format&fit=crop',
  'suboccipital': 'https://images.unsplash.com/photo-1579126038374-6064e9370f0f?q=80&w=1170&auto=format&fit=crop',
  'thoracic': 'https://images.unsplash.com/photo-1614771637369-ed94441a651a?q=80&w=1074&auto=format&fit=crop',

  // Back techniques
  'lumbar': 'https://images.unsplash.com/photo-1600334468151-28f516de0fd4?q=80&w=1170&auto=format&fit=crop',
  'sacroiliac': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=1170&auto=format&fit=crop',
  'myofascial': 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?q=80&w=1064&auto=format&fit=crop',

  // Elbow techniques
  'elbow': 'https://images.unsplash.com/photo-1595547136583-411d9da3e18a?q=80&w=1174&auto=format&fit=crop',
  'radial': 'https://images.unsplash.com/photo-1682621077894-7a56e6001181?q=80&w=1170&auto=format&fit=crop',
  'ulnar': 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=1170&auto=format&fit=crop',

  // Wrist & Hand techniques
  'wrist': 'https://images.unsplash.com/photo-1507398941619-24c7353ae249?q=80&w=1073&auto=format&fit=crop',
  'carpal': 'https://images.unsplash.com/photo-1551909290-0e5b4f4c93d7?q=80&w=1169&auto=format&fit=crop',
  'hand': 'https://images.unsplash.com/photo-1612349450846-eeafe84c3832?q=80&w=1170&auto=format&fit=crop',

  // Hip techniques
  'hip': 'https://images.unsplash.com/photo-1616279969862-e71e63dc397c?q=80&w=1170&auto=format&fit=crop',
  'piriformis': 'https://images.unsplash.com/photo-1581704906775-5f9d535e45e1?q=80&w=1170&auto=format&fit=crop',
  'psoas': 'https://images.unsplash.com/photo-1581704908483-224f772048c9?q=80&w=1170&auto=format&fit=crop',

  // Knee techniques  
  'knee': 'https://images.unsplash.com/photo-1581902417665-ecc8ff7f10bb?q=80&w=1170&auto=format&fit=crop',
  'patella': 'https://images.unsplash.com/photo-1571172964533-d2d13d88ce7e?q=80&w=1170&auto=format&fit=crop',
  'tibiofemoral': 'https://images.unsplash.com/photo-1588348420460-adc7b5211210?q=80&w=1170&auto=format&fit=crop',

  // Ankle techniques
  'ankle': 'https://images.unsplash.com/photo-1568380193080-80858d743562?q=80&w=1170&auto=format&fit=crop',
  'talocrural': 'https://images.unsplash.com/photo-1514750105567-ef30995c7030?q=80&w=1170&auto=format&fit=crop',
  'subtalar': 'https://images.unsplash.com/photo-1562613304-9635f1a97534?q=80&w=1170&auto=format&fit=crop',

  // Foot techniques
  'foot': 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?q=80&w=1170&auto=format&fit=crop',
  'plantar': 'https://images.unsplash.com/photo-1508387027939-27cee6a8a5c3?q=80&w=1170&auto=format&fit=crop',
  'tarsal': 'https://images.unsplash.com/photo-1531930787603-cfe04268bfa2?q=80&w=1170&auto=format&fit=crop',
  
  // General and neural techniques
  'neural': 'https://images.unsplash.com/photo-1576765608622-5abf50c46a14?q=80&w=1170&auto=format&fit=crop',
  'mobility': 'https://images.unsplash.com/photo-1582056613312-bcf06807bcbe?q=80&w=1170&auto=format&fit=crop',
  'manipulation': 'https://images.unsplash.com/photo-1588286042485-e15a7fa24eb5?q=80&w=1170&auto=format&fit=crop',
  'soft tissue': 'https://images.unsplash.com/photo-1600334089639-33debef4fae3?q=80&w=1170&auto=format&fit=crop',
  'release': 'https://images.unsplash.com/photo-1588286041266-247603a9cee5?q=80&w=1170&auto=format&fit=crop',
  'massage': 'https://images.unsplash.com/photo-1573461270102-c22a893d70b5?q=80&w=1170&auto=format&fit=crop',
  'traction': 'https://images.unsplash.com/photo-1588286042478-082ef28ac0ba?q=80&w=1170&auto=format&fit=crop',
  'mulligan': 'https://images.unsplash.com/photo-1552196563-5def4a41bca6?q=80&w=1226&auto=format&fit=crop',
  'mckenzie': 'https://images.unsplash.com/photo-1581704906775-5f9d535e45e1?q=80&w=1170&auto=format&fit=crop',
  'mobilization': 'https://images.unsplash.com/photo-1571019613576-2b22c76fd955?q=80&w=1170&auto=format&fit=crop',
};

/**
 * Body part specific fallback images if no keyword match is found 
 */
const bodyPartFallbacks: Record<string, string> = {
  shoulder: 'https://images.unsplash.com/photo-1582056615717-c6717d5d3d8e?q=80&w=1170&auto=format&fit=crop',
  neck: 'https://images.unsplash.com/photo-1573461270090-25442e00a3ba?q=80&w=1170&auto=format&fit=crop',
  back: 'https://images.unsplash.com/photo-1600334089958-33d4705fef7d?q=80&w=1170&auto=format&fit=crop',
  elbow: 'https://images.unsplash.com/photo-1576091160391-b1e9300bee36?q=80&w=1170&auto=format&fit=crop',
  wrist: 'https://images.unsplash.com/photo-1507398941619-24c7353ae249?q=80&w=1073&auto=format&fit=crop',
  hand: 'https://images.unsplash.com/photo-1612349450846-eeafe84c3832?q=80&w=1170&auto=format&fit=crop',
  hip: 'https://images.unsplash.com/photo-1616279969862-e71e63dc397c?q=80&w=1170&auto=format&fit=crop',
  knee: 'https://images.unsplash.com/photo-1581902417665-ecc8ff7f10bb?q=80&w=1170&auto=format&fit=crop',
  ankle: 'https://images.unsplash.com/photo-1568380193080-80858d743562?q=80&w=1170&auto=format&fit=crop',
  foot: 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?q=80&w=1170&auto=format&fit=crop',
  general: 'https://images.unsplash.com/photo-1588286042485-e15a7fa24eb5?q=80&w=1170&auto=format&fit=crop',
  other: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?q=80&w=1064&auto=format&fit=crop',
};

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
  for (const [keyword, imageUrl] of Object.entries(techniqueImageMap)) {
    if (normalizedTitle.includes(keyword.toLowerCase())) {
      return imageUrl;
    }
  }
  
  // Use a body part specific fallback image if keyword match fails
  // Make sure bodyPart exists in our fallbacks, otherwise use 'other'
  return bodyPartFallbacks[bodyPart as keyof typeof bodyPartFallbacks] || bodyPartFallbacks.other;
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