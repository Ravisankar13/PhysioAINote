/**
 * Script to update all manual therapy technique image URLs
 * This script will generate appropriate technique-specific images for all techniques
 */

import { db } from '../db';
import { manualTherapyTechniques } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Utility function to generate appropriate image URLs
// This mimics the client-side utility but for server use
const PHYSIO_IMAGE_BASE = 'https://images.unsplash.com/';
const imageParams = 'q=80&w=600&auto=format&fit=crop';

// Same mapping as client-side
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

function getTherapyTechniqueImage(title: string, bodyPart: string): string {
  const normalizedTitle = title.toLowerCase();
  
  // Try to find a match based on technique keywords
  for (const [keyword, imageId] of Object.entries(techniqueImageMap)) {
    if (normalizedTitle.includes(keyword.toLowerCase())) {
      return `${PHYSIO_IMAGE_BASE}${imageId}?${imageParams}`;
    }
  }
  
  // Use a body part specific fallback image if keyword match fails
  const fallbackImage = bodyPartFallbacks[bodyPart as keyof typeof bodyPartFallbacks] || bodyPartFallbacks.other;
  return `${PHYSIO_IMAGE_BASE}${fallbackImage}?${imageParams}`;
}

// Main function to update all technique images in the database
async function updateTechniqueImages() {
  console.log('Starting to update manual therapy technique images...');
  
  try {
    // Get all techniques from database
    const techniques = await db.select().from(manualTherapyTechniques);
    console.log(`Found ${techniques.length} techniques to update`);
    
    // Update each technique
    let updateCount = 0;
    
    for (const technique of techniques) {
      // Generate an appropriate image URL based on title and body part
      const imageUrl = getTherapyTechniqueImage(technique.title, technique.body_part);
      
      // Update the technique in the database
      await db.update(manualTherapyTechniques)
        .set({ 
          image_url: imageUrl,
          updated_at: new Date()
        })
        .where(eq(manualTherapyTechniques.id, technique.id));
      
      updateCount++;
      console.log(`Updated technique #${technique.id}: ${technique.title}`);
    }
    
    console.log(`Successfully updated ${updateCount} of ${techniques.length} techniques`);
  } catch (error) {
    console.error('Error updating technique images:', error);
    throw error;
  }
}

// Execute the update function
updateTechniqueImages()
  .then(() => {
    console.log('Technique image update completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });