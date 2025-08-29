import { storage } from "./storage";
import type { InsertExerciseImage } from "@shared/schema";

// Sample exercise images data for common physiotherapy exercises
const exerciseImagesData: InsertExerciseImage[] = [
  // Lower Back Exercises
  {
    exerciseName: "Cat-Cow Stretch",
    category: "mobility",
    bodyPart: "back",
    primaryImageUrl: "/api/exercise-images/cat-cow.jpg",
    startPositionUrl: "/api/exercise-images/cat-cow-start.jpg",
    endPositionUrl: "/api/exercise-images/cat-cow-end.jpg",
    instructions: [
      "Start on your hands and knees in a tabletop position",
      "Slowly arch your back, pushing your belly toward the floor (Cow pose)",
      "Then round your spine toward the ceiling like a cat stretching",
      "Move slowly between these two positions",
      "Breathe deeply throughout the movement"
    ],
    tips: [
      "Move slowly and controlled",
      "Keep your arms straight",
      "Focus on moving each vertebra"
    ],
    contraindications: [
      "Recent spinal surgery",
      "Severe osteoporosis",
      "Acute disc herniation"
    ],
    musclesWorked: ["Erector spinae", "Multifidus", "Abdominals"],
    equipment: "None (bodyweight)",
    difficulty: "beginner",
    alternativeNames: ["Cat-Camel Stretch", "Spinal Flexion-Extension"],
    tags: ["back pain", "mobility", "warm-up", "spine"],
    isActive: true
  },
  {
    exerciseName: "Bird Dog",
    category: "strengthening",
    bodyPart: "back",
    primaryImageUrl: "/api/exercise-images/bird-dog.jpg",
    startPositionUrl: "/api/exercise-images/bird-dog-start.jpg",
    endPositionUrl: "/api/exercise-images/bird-dog-end.jpg",
    instructions: [
      "Start on hands and knees in tabletop position",
      "Extend your right arm forward and left leg back simultaneously",
      "Keep your hips level and spine neutral",
      "Hold for 5-10 seconds",
      "Return to start and switch sides"
    ],
    tips: [
      "Keep your core engaged",
      "Don't let your back arch",
      "Move slowly and controlled"
    ],
    contraindications: ["Acute back pain", "Shoulder injury"],
    musclesWorked: ["Core", "Glutes", "Back extensors", "Shoulders"],
    equipment: "None (bodyweight)",
    difficulty: "intermediate",
    alternativeNames: ["Quadruped Arm/Leg Raise"],
    tags: ["core stability", "back strengthening", "balance"],
    isActive: true
  },
  {
    exerciseName: "Pelvic Tilt",
    category: "strengthening",
    bodyPart: "back",
    primaryImageUrl: "/api/exercise-images/pelvic-tilt.jpg",
    startPositionUrl: "/api/exercise-images/pelvic-tilt-start.jpg",
    endPositionUrl: "/api/exercise-images/pelvic-tilt-end.jpg",
    instructions: [
      "Lie on your back with knees bent and feet flat on floor",
      "Tighten your abdominal muscles",
      "Flatten your lower back against the floor",
      "Hold for 5-10 seconds",
      "Release and repeat"
    ],
    tips: [
      "Breathe normally during the hold",
      "Keep upper body relaxed",
      "Focus on using abdominal muscles"
    ],
    contraindications: ["Pregnancy (after first trimester)"],
    musclesWorked: ["Transverse abdominis", "Pelvic floor"],
    equipment: "None (bodyweight)",
    difficulty: "beginner",
    alternativeNames: ["Posterior Pelvic Tilt"],
    tags: ["core", "lower back", "beginner friendly"],
    isActive: true
  },

  // Shoulder Exercises
  {
    exerciseName: "Pendulum Exercise",
    category: "mobility",
    bodyPart: "shoulder",
    primaryImageUrl: "/api/exercise-images/pendulum.jpg",
    startPositionUrl: "/api/exercise-images/pendulum-start.jpg",
    instructions: [
      "Lean forward supporting yourself with your good arm on a table",
      "Let your affected arm hang down",
      "Gently swing your arm in small circles",
      "Gradually increase the size of the circles",
      "Switch directions after 10 circles"
    ],
    tips: [
      "Let gravity do the work",
      "Keep movements gentle",
      "Don't force the movement"
    ],
    contraindications: ["Acute shoulder dislocation", "Fracture"],
    musclesWorked: ["Rotator cuff", "Deltoids"],
    equipment: "Table or chair for support",
    difficulty: "beginner",
    alternativeNames: ["Codman's Exercise"],
    tags: ["shoulder rehabilitation", "post-surgery", "gentle"],
    isActive: true
  },
  {
    exerciseName: "External Rotation with Band",
    category: "strengthening",
    bodyPart: "shoulder",
    primaryImageUrl: "/api/exercise-images/external-rotation.jpg",
    startPositionUrl: "/api/exercise-images/external-rotation-start.jpg",
    endPositionUrl: "/api/exercise-images/external-rotation-end.jpg",
    instructions: [
      "Attach resistance band at elbow height",
      "Stand with affected side away from anchor",
      "Keep elbow at 90 degrees and tucked to your side",
      "Rotate forearm away from body",
      "Slowly return to start position"
    ],
    tips: [
      "Keep elbow against your side",
      "Control the return movement",
      "Don't shrug your shoulder"
    ],
    contraindications: ["Acute rotator cuff tear", "Recent shoulder surgery"],
    musclesWorked: ["Infraspinatus", "Teres minor", "Posterior deltoid"],
    equipment: "Resistance band",
    difficulty: "intermediate",
    alternativeNames: ["Shoulder ER with Band"],
    tags: ["rotator cuff", "strengthening", "rehabilitation"],
    isActive: true
  },

  // Knee Exercises
  {
    exerciseName: "Straight Leg Raise",
    category: "strengthening",
    bodyPart: "knee",
    primaryImageUrl: "/api/exercise-images/straight-leg-raise.jpg",
    startPositionUrl: "/api/exercise-images/slr-start.jpg",
    endPositionUrl: "/api/exercise-images/slr-end.jpg",
    instructions: [
      "Lie on your back with one knee bent",
      "Keep other leg straight",
      "Tighten thigh muscles of straight leg",
      "Lift leg to height of bent knee",
      "Hold for 5 seconds then lower slowly"
    ],
    tips: [
      "Keep knee straight throughout",
      "Don't arch your back",
      "Engage your core"
    ],
    contraindications: ["Hip flexor strain", "Recent hip surgery"],
    musclesWorked: ["Quadriceps", "Hip flexors"],
    equipment: "None (bodyweight)",
    difficulty: "beginner",
    alternativeNames: ["SLR"],
    tags: ["knee rehabilitation", "quad strengthening", "ACL recovery"],
    isActive: true
  },
  {
    exerciseName: "Wall Sit",
    category: "strengthening",
    bodyPart: "knee",
    primaryImageUrl: "/api/exercise-images/wall-sit.jpg",
    startPositionUrl: "/api/exercise-images/wall-sit-position.jpg",
    instructions: [
      "Stand with back against wall",
      "Slide down until knees are at 90 degrees",
      "Keep feet shoulder-width apart",
      "Hold position for 30-60 seconds",
      "Slide back up to standing"
    ],
    tips: [
      "Keep knees behind toes",
      "Press back firmly against wall",
      "Breathe normally"
    ],
    contraindications: ["Patellofemoral pain syndrome", "Acute knee injury"],
    musclesWorked: ["Quadriceps", "Glutes", "Calves"],
    equipment: "Wall",
    difficulty: "intermediate",
    alternativeNames: ["Wall Squat Hold"],
    tags: ["quad strengthening", "isometric", "endurance"],
    isActive: true
  },

  // Hip Exercises
  {
    exerciseName: "Clamshell",
    category: "strengthening",
    bodyPart: "hip",
    primaryImageUrl: "/api/exercise-images/clamshell.jpg",
    startPositionUrl: "/api/exercise-images/clamshell-start.jpg",
    endPositionUrl: "/api/exercise-images/clamshell-end.jpg",
    instructions: [
      "Lie on your side with knees bent at 90 degrees",
      "Keep feet together",
      "Lift top knee while keeping feet touching",
      "Lower knee back down slowly",
      "Keep hips stacked and don't roll backward"
    ],
    tips: [
      "Keep core engaged",
      "Don't let hips roll back",
      "Add resistance band for progression"
    ],
    contraindications: ["Hip impingement", "Recent hip surgery"],
    musclesWorked: ["Gluteus medius", "Gluteus minimus", "Hip external rotators"],
    equipment: "Optional: resistance band",
    difficulty: "beginner",
    alternativeNames: ["Hip Abduction in Side Lying"],
    tags: ["hip strengthening", "glute activation", "IT band"],
    isActive: true
  },
  {
    exerciseName: "Hip Bridge",
    category: "strengthening",
    bodyPart: "hip",
    primaryImageUrl: "/api/exercise-images/hip-bridge.jpg",
    startPositionUrl: "/api/exercise-images/bridge-start.jpg",
    endPositionUrl: "/api/exercise-images/bridge-end.jpg",
    instructions: [
      "Lie on back with knees bent and feet flat",
      "Squeeze glutes and lift hips off floor",
      "Create straight line from knees to shoulders",
      "Hold for 2-3 seconds",
      "Lower slowly back to start"
    ],
    tips: [
      "Don't arch your back",
      "Keep weight evenly distributed",
      "Squeeze glutes at the top"
    ],
    contraindications: ["Acute lower back pain"],
    musclesWorked: ["Glutes", "Hamstrings", "Core"],
    equipment: "None (bodyweight)",
    difficulty: "beginner",
    alternativeNames: ["Glute Bridge", "Pelvic Bridge"],
    tags: ["glute strengthening", "core stability", "back pain"],
    isActive: true
  },

  // Neck Exercises
  {
    exerciseName: "Chin Tuck",
    category: "strengthening",
    bodyPart: "neck",
    primaryImageUrl: "/api/exercise-images/chin-tuck.jpg",
    startPositionUrl: "/api/exercise-images/chin-tuck-start.jpg",
    endPositionUrl: "/api/exercise-images/chin-tuck-end.jpg",
    instructions: [
      "Sit or stand with good posture",
      "Pull chin straight back (not down)",
      "Feel stretch at base of skull",
      "Hold for 5 seconds",
      "Return to neutral position"
    ],
    tips: [
      "Keep eyes level",
      "Don't tilt head up or down",
      "Think 'double chin' position"
    ],
    contraindications: ["Acute neck injury", "Cervical instability"],
    musclesWorked: ["Deep neck flexors", "Suboccipital muscles"],
    equipment: "None",
    difficulty: "beginner",
    alternativeNames: ["Cervical Retraction"],
    tags: ["neck pain", "posture", "headache relief"],
    isActive: true
  }
];

export async function seedExerciseImages() {
  try {
    console.log("Seeding exercise images...");
    
    for (const exerciseImage of exerciseImagesData) {
      // Check if exercise already exists
      const existing = await storage.getExerciseImageByName(exerciseImage.exerciseName);
      
      if (!existing) {
        await storage.createExerciseImage(exerciseImage);
        console.log(`Created exercise image: ${exerciseImage.exerciseName}`);
      } else {
        console.log(`Exercise image already exists: ${exerciseImage.exerciseName}`);
      }
    }
    
    console.log("Exercise images seeding complete!");
  } catch (error) {
    console.error("Error seeding exercise images:", error);
    throw error;
  }
}

// Run if called directly  
seedExerciseImages()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });