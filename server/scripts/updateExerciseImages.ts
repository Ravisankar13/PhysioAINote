import { db } from '../db.js';
import { exercises } from '../../shared/schema.js';
import { eq, isNull, or } from 'drizzle-orm';

// SVG exercise illustrations
const exerciseImages = {
  // Shoulder exercises
  'shoulder_flexion': `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="#f8f9fa"/>
    <!-- Person doing shoulder flexion -->
    <circle cx="100" cy="40" r="12" fill="#fdbcb4"/>
    <rect x="92" y="52" width="16" height="40" fill="#4dabf7"/>
    <rect x="88" y="60" width="8" height="35" fill="#fdbcb4"/>
    <rect x="104" y="25" width="8" height="35" fill="#fdbcb4"/>
    <rect x="96" y="92" width="8" height="50" fill="#495057"/>
    <rect x="90" y="142" width="6" height="25" fill="#fdbcb4"/>
    <rect x="104" y="142" width="6" height="25" fill="#fdbcb4"/>
    <!-- Arrow showing movement -->
    <path d="M115 30 L135 15" stroke="#e03131" stroke-width="3" marker-end="url(#arrowhead)"/>
    <defs>
      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="#e03131"/>
      </marker>
    </defs>
    <text x="10" y="190" font-family="Arial" font-size="12" fill="#495057">Shoulder Flexion</text>
  </svg>`,

  'shoulder_abduction': `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="#f8f9fa"/>
    <!-- Person doing shoulder abduction -->
    <circle cx="100" cy="40" r="12" fill="#fdbcb4"/>
    <rect x="92" y="52" width="16" height="40" fill="#4dabf7"/>
    <rect x="70" y="65" width="35" height="8" fill="#fdbcb4"/>
    <rect x="115" y="65" width="35" height="8" fill="#fdbcb4"/>
    <rect x="96" y="92" width="8" height="50" fill="#495057"/>
    <rect x="90" y="142" width="6" height="25" fill="#fdbcb4"/>
    <rect x="104" y="142" width="6" height="25" fill="#fdbcb4"/>
    <!-- Arrows showing movement -->
    <path d="M60 60 L45 45" stroke="#e03131" stroke-width="3" marker-end="url(#arrowhead)"/>
    <path d="M155 60 L170 45" stroke="#e03131" stroke-width="3" marker-end="url(#arrowhead)"/>
    <defs>
      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="#e03131"/>
      </marker>
    </defs>
    <text x="10" y="190" font-family="Arial" font-size="12" fill="#495057">Shoulder Abduction</text>
  </svg>`,

  // Knee exercises
  'knee_extension': `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="#f8f9fa"/>
    <!-- Person doing knee extension seated -->
    <circle cx="100" cy="30" r="12" fill="#fdbcb4"/>
    <rect x="92" y="42" width="16" height="30" fill="#4dabf7"/>
    <rect x="88" y="50" width="8" height="25" fill="#fdbcb4"/>
    <rect x="104" y="50" width="8" height="25" fill="#fdbcb4"/>
    <!-- Chair -->
    <rect x="70" y="72" width="60" height="8" fill="#8e9196"/>
    <rect x="70" y="80" width="8" height="30" fill="#8e9196"/>
    <rect x="122" y="80" width="8" height="30" fill="#8e9196"/>
    <!-- Legs -->
    <rect x="96" y="75" width="8" height="25" fill="#495057"/>
    <rect x="96" y="100" width="30" height="8" fill="#495057"/>
    <rect x="90" y="108" width="6" height="15" fill="#fdbcb4"/>
    <!-- Arrow showing movement -->
    <path d="M130 105 L145 105" stroke="#e03131" stroke-width="3" marker-end="url(#arrowhead)"/>
    <defs>
      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="#e03131"/>
      </marker>
    </defs>
    <text x="10" y="190" font-family="Arial" font-size="12" fill="#495057">Knee Extension</text>
  </svg>`,

  // Back exercises
  'cat_cow': `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="#f8f9fa"/>
    <!-- Person in quadruped position -->
    <circle cx="50" cy="80" r="10" fill="#fdbcb4"/>
    <ellipse cx="100" cy="100" rx="35" ry="15" fill="#4dabf7"/>
    <!-- Arms -->
    <rect x="45" y="90" width="6" height="20" fill="#fdbcb4"/>
    <rect x="145" y="90" width="6" height="20" fill="#fdbcb4"/>
    <!-- Legs -->
    <rect x="75" y="110" width="6" height="20" fill="#495057"/>
    <rect x="115" y="110" width="6" height="20" fill="#495057"/>
    <!-- Curved arrows showing spinal movement -->
    <path d="M70 85 Q100 70 130 85" stroke="#e03131" stroke-width="2" fill="none" marker-end="url(#arrowhead)"/>
    <path d="M70 115 Q100 130 130 115" stroke="#51cf66" stroke-width="2" fill="none" marker-end="url(#arrowhead2)"/>
    <defs>
      <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
        <polygon points="0 0, 8 3, 0 6" fill="#e03131"/>
      </marker>
      <marker id="arrowhead2" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
        <polygon points="0 0, 8 3, 0 6" fill="#51cf66"/>
      </marker>
    </defs>
    <text x="10" y="190" font-family="Arial" font-size="12" fill="#495057">Cat-Cow Stretch</text>
  </svg>`,

  // Ankle exercises
  'ankle_circles': `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="#f8f9fa"/>
    <!-- Leg and foot -->
    <rect x="60" y="80" width="80" height="12" fill="#495057"/>
    <rect x="140" y="92" width="25" height="8" fill="#fdbcb4"/>
    <!-- Circular motion arrows -->
    <circle cx="152" cy="96" r="20" stroke="#e03131" stroke-width="3" fill="none" stroke-dasharray="5,5"/>
    <path d="M172 96 L177 91" stroke="#e03131" stroke-width="3" marker-end="url(#arrowhead)"/>
    <defs>
      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="#e03131"/>
      </marker>
    </defs>
    <text x="10" y="190" font-family="Arial" font-size="12" fill="#495057">Ankle Circles</text>
  </svg>`,

  // Wrist exercises
  'wrist_flexion': `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="#f8f9fa"/>
    <!-- Arm and hand -->
    <rect x="50" y="95" width="60" height="10" fill="#fdbcb4"/>
    <rect x="110" y="85" width="20" height="30" fill="#fdbcb4"/>
    <!-- Curved arrow showing wrist flexion -->
    <path d="M130 100 Q140 115 125 125" stroke="#e03131" stroke-width="3" fill="none" marker-end="url(#arrowhead)"/>
    <defs>
      <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
        <polygon points="0 0, 8 3, 0 6" fill="#e03131"/>
      </marker>
    </defs>
    <text x="10" y="190" font-family="Arial" font-size="12" fill="#495057">Wrist Flexion</text>
  </svg>`,

  // Generic exercises
  'strengthening': `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="#f8f9fa"/>
    <!-- Person with dumbbell -->
    <circle cx="100" cy="40" r="12" fill="#fdbcb4"/>
    <rect x="92" y="52" width="16" height="40" fill="#4dabf7"/>
    <rect x="88" y="60" width="8" height="25" fill="#fdbcb4"/>
    <rect x="104" y="60" width="8" height="25" fill="#fdbcb4"/>
    <!-- Dumbbell -->
    <rect x="84" y="58" width="8" height="4" fill="#495057"/>
    <circle cx="86" r="3" cy="60" fill="#495057"/>
    <circle cx="90" r="3" cy="60" fill="#495057"/>
    <rect x="96" y="92" width="8" height="50" fill="#495057"/>
    <rect x="90" y="142" width="6" height="25" fill="#fdbcb4"/>
    <rect x="104" y="142" width="6" height="25" fill="#fdbcb4"/>
    <text x="10" y="190" font-family="Arial" font-size="12" fill="#495057">Strengthening</text>
  </svg>`,

  'mobility': `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="#f8f9fa"/>
    <!-- Person stretching -->
    <circle cx="100" cy="40" r="12" fill="#fdbcb4"/>
    <rect x="92" y="52" width="16" height="30" fill="#4dabf7"/>
    <rect x="75" y="65" width="25" height="8" fill="#fdbcb4"/>
    <rect x="120" y="65" width="25" height="8" fill="#fdbcb4"/>
    <rect x="96" y="82" width="8" height="40" fill="#495057"/>
    <rect x="85" y="122" width="30" height="8" fill="#495057"/>
    <rect x="90" y="130" width="6" height="20" fill="#fdbcb4"/>
    <rect x="104" y="130" width="6" height="20" fill="#fdbcb4"/>
    <!-- Stretch arrows -->
    <path d="M65 69 L55 69" stroke="#51cf66" stroke-width="3" marker-end="url(#arrowhead)"/>
    <path d="M155 69 L165 69" stroke="#51cf66" stroke-width="3" marker-end="url(#arrowhead)"/>
    <defs>
      <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
        <polygon points="0 0, 8 3, 0 6" fill="#51cf66"/>
      </marker>
    </defs>
    <text x="10" y="190" font-family="Arial" font-size="12" fill="#495057">Mobility/Stretch</text>
  </svg>`
};

// Function to get appropriate SVG based on exercise title and body part
function getExerciseSVG(title: string, bodyPart: string, exerciseType: string): string {
  const titleLower = title.toLowerCase();
  
  // Specific exercise mappings
  if (titleLower.includes('shoulder') && titleLower.includes('flexion')) {
    return exerciseImages.shoulder_flexion;
  }
  if (titleLower.includes('shoulder') && titleLower.includes('abduction')) {
    return exerciseImages.shoulder_abduction;
  }
  if (titleLower.includes('knee') && titleLower.includes('extension')) {
    return exerciseImages.knee_extension;
  }
  if (titleLower.includes('cat') && titleLower.includes('cow')) {
    return exerciseImages.cat_cow;
  }
  if (titleLower.includes('ankle') && titleLower.includes('circle')) {
    return exerciseImages.ankle_circles;
  }
  if (titleLower.includes('wrist') && titleLower.includes('flexion')) {
    return exerciseImages.wrist_flexion;
  }
  
  // Body part specific defaults
  if (bodyPart === 'shoulder') {
    return exerciseImages.shoulder_flexion;
  }
  if (bodyPart === 'knee') {
    return exerciseImages.knee_extension;
  }
  if (bodyPart === 'back') {
    return exerciseImages.cat_cow;
  }
  if (bodyPart === 'ankle' || bodyPart === 'foot') {
    return exerciseImages.ankle_circles;
  }
  if (bodyPart === 'wrist' || bodyPart === 'hand') {
    return exerciseImages.wrist_flexion;
  }
  
  // Exercise type defaults
  if (exerciseType === 'strength' || titleLower.includes('strengthening')) {
    return exerciseImages.strengthening;
  }
  if (exerciseType === 'mobility' || exerciseType === 'stretching' || titleLower.includes('mobility')) {
    return exerciseImages.mobility;
  }
  
  // Default fallback
  return exerciseImages.strengthening;
}

// Convert SVG to data URL
function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export async function updateExerciseImages(): Promise<void> {
  try {
    console.log('Starting exercise image update...');
    
    // Get all exercises without images
    const exercisesToUpdate = await db
      .select()
      .from(exercises)
      .where(or(isNull(exercises.imageUrl), eq(exercises.imageUrl, '')));
    
    console.log(`Found ${exercisesToUpdate.length} exercises to update`);
    
    for (const exercise of exercisesToUpdate) {
      const svg = getExerciseSVG(exercise.title, exercise.bodyPart, exercise.exerciseType || 'other');
      const imageUrl = svgToDataUrl(svg);
      
      await db
        .update(exercises)
        .set({ imageUrl })
        .where(eq(exercises.id, exercise.id));
      
      console.log(`Updated exercise ${exercise.id}: ${exercise.title}`);
    }
    
    console.log('Exercise image update completed!');
  } catch (error) {
    console.error('Error updating exercise images:', error);
    throw error;
  }
}