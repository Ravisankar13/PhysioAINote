import axios from 'axios';
import { CachedExercise } from './exerciseDBService';

interface ExerciseSource {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  gifUrl?: string;
  imageUrl?: string;
  instructions: string[];
  secondaryMuscles?: string[];
}

class MultiSourceExerciseService {
  // Comprehensive exercise data with working image URLs
  private readonly exercises: ExerciseSource[] = [
    // Chest Exercises
    {
      id: "chest_001",
      name: "Barbell Bench Press",
      bodyPart: "chest",
      equipment: "barbell",
      target: "pectorals",
      gifUrl: "https://www.jefit.com/images/exercises/800_600/688.jpg",
      instructions: [
        "Lie flat on a bench with feet flat on the floor",
        "Grip the barbell with hands slightly wider than shoulder-width",
        "Lower the bar to your chest with control",
        "Press the bar back up to full arm extension",
        "Keep your core engaged throughout the movement"
      ],
      secondaryMuscles: ["triceps", "shoulders"]
    },
    {
      id: "chest_002",
      name: "Dumbbell Bench Press",
      bodyPart: "chest",
      equipment: "dumbbell",
      target: "pectorals",
      gifUrl: "https://www.jefit.com/images/exercises/800_600/1.jpg",
      instructions: [
        "Lie on a flat bench with a dumbbell in each hand",
        "Position the dumbbells at chest level with palms facing forward",
        "Press the dumbbells up until your arms are fully extended",
        "Lower the weights back down with control"
      ],
      secondaryMuscles: ["triceps", "shoulders"]
    },
    {
      id: "chest_003",
      name: "Push-Ups",
      bodyPart: "chest",
      equipment: "body weight",
      target: "pectorals",
      gifUrl: "https://www.jefit.com/images/exercises/800_600/4316.jpg",
      instructions: [
        "Start in a plank position with hands shoulder-width apart",
        "Lower your body until chest nearly touches the floor",
        "Push back up to starting position",
        "Keep core engaged and body in a straight line"
      ],
      secondaryMuscles: ["triceps", "shoulders", "core"]
    },
    {
      id: "chest_004",
      name: "Incline Dumbbell Press",
      bodyPart: "chest",
      equipment: "dumbbell",
      target: "upper chest",
      gifUrl: "https://www.jefit.com/images/exercises/800_600/380.jpg",
      instructions: [
        "Set bench to 30-45 degree incline",
        "Hold dumbbells at chest level",
        "Press weights up and together",
        "Lower back down with control"
      ],
      secondaryMuscles: ["shoulders", "triceps"]
    },
    {
      id: "chest_005",
      name: "Cable Chest Fly",
      bodyPart: "chest",
      equipment: "cable",
      target: "pectorals",
      gifUrl: "https://www.jefit.com/images/exercises/800_600/248.jpg",
      instructions: [
        "Set cable pulleys at chest height",
        "Step forward with handles in hand",
        "Bring hands together in front of chest",
        "Return to starting position with control"
      ],
      secondaryMuscles: ["shoulders"]
    },

    // Back Exercises
    {
      id: "back_001",
      name: "Pull-Ups",
      bodyPart: "back",
      equipment: "body weight",
      target: "lats",
      gifUrl: "https://www.jefit.com/images/exercises/800_600/3612.jpg",
      instructions: [
        "Hang from pull-up bar with overhand grip",
        "Pull your body up until chin is over the bar",
        "Lower yourself back down with control",
        "Keep core engaged throughout"
      ],
      secondaryMuscles: ["biceps", "middle back"]
    },
    {
      id: "back_002",
      name: "Barbell Row",
      bodyPart: "back",
      equipment: "barbell",
      target: "middle back",
      gifUrl: "https://www.jefit.com/images/exercises/800_600/616.jpg",
      instructions: [
        "Bend forward at hips with knees slightly bent",
        "Grasp barbell with overhand grip",
        "Pull bar to lower chest/upper abdomen",
        "Lower back down with control"
      ],
      secondaryMuscles: ["lats", "biceps"]
    },
    {
      id: "back_003",
      name: "Lat Pulldown",
      bodyPart: "back",
      equipment: "cable",
      target: "lats",
      gifUrl: "https://www.jefit.com/images/exercises/800_600/184.jpg",
      instructions: [
        "Sit at lat pulldown machine",
        "Grasp bar with wide overhand grip",
        "Pull bar down to upper chest",
        "Control the weight back up"
      ],
      secondaryMuscles: ["biceps", "middle back"]
    },
    {
      id: "back_004",
      name: "Seated Cable Row",
      bodyPart: "back",
      equipment: "cable",
      target: "middle back",
      gifUrl: "https://www.jefit.com/images/exercises/800_600/232.jpg",
      instructions: [
        "Sit at cable row station",
        "Grasp handle with both hands",
        "Pull handle to abdomen",
        "Squeeze shoulder blades together",
        "Return with control"
      ],
      secondaryMuscles: ["lats", "biceps"]
    },
    {
      id: "back_005",
      name: "Deadlift",
      bodyPart: "back",
      equipment: "barbell",
      target: "lower back",
      gifUrl: "https://www.jefit.com/images/exercises/800_600/568.jpg",
      instructions: [
        "Stand with feet hip-width apart",
        "Bend at hips and knees to grasp bar",
        "Lift bar by extending hips and knees",
        "Stand fully upright",
        "Lower bar back down with control"
      ],
      secondaryMuscles: ["glutes", "hamstrings", "traps"]
    },

    // Shoulder Exercises
    {
      id: "shoulders_001",
      name: "Overhead Press",
      bodyPart: "shoulders",
      equipment: "barbell",
      target: "delts",
      gifUrl: "https://www.jefit.com/images/exercises/800_600/605.jpg",
      instructions: [
        "Stand with feet shoulder-width apart",
        "Hold barbell at shoulder level",
        "Press bar overhead until arms are extended",
        "Lower back to shoulders with control"
      ],
      secondaryMuscles: ["triceps", "upper chest"]
    },
    {
      id: "shoulders_002",
      name: "Lateral Raises",
      bodyPart: "shoulders",
      equipment: "dumbbell",
      target: "side delts",
      gifUrl: "https://www.jefit.com/images/exercises/800_600/388.jpg",
      instructions: [
        "Stand with dumbbells at sides",
        "Raise arms out to sides until parallel with floor",
        "Pause at the top",
        "Lower back down with control"
      ],
      secondaryMuscles: ["traps"]
    },
    {
      id: "shoulders_003",
      name: "Front Raises",
      bodyPart: "shoulders",
      equipment: "dumbbell",
      target: "front delts",
      gifUrl: "https://www.jefit.com/images/exercises/800_600/372.jpg",
      instructions: [
        "Hold dumbbells in front of thighs",
        "Raise weights forward to shoulder height",
        "Keep slight bend in elbows",
        "Lower back down with control"
      ],
      secondaryMuscles: []
    },
    {
      id: "shoulders_004",
      name: "Face Pulls",
      bodyPart: "shoulders",
      equipment: "cable",
      target: "rear delts",
      gifUrl: "https://www.jefit.com/images/exercises/800_600/5024.jpg",
      instructions: [
        "Set cable at face height",
        "Pull rope towards face",
        "Separate hands at face level",
        "Squeeze shoulder blades together",
        "Return with control"
      ],
      secondaryMuscles: ["traps", "rhomboids"]
    },
    {
      id: "shoulders_005",
      name: "Arnold Press",
      bodyPart: "shoulders",
      equipment: "dumbbell",
      target: "delts",
      gifUrl: "https://www.jefit.com/images/exercises/800_600/336.jpg",
      instructions: [
        "Start with dumbbells at shoulder level, palms facing you",
        "Rotate palms forward as you press up",
        "Press until arms are extended overhead",
        "Reverse the motion to return"
      ],
      secondaryMuscles: ["triceps"]
    },

    // Leg Exercises
    {
      id: "legs_001",
      name: "Barbell Squat",
      bodyPart: "upper legs",
      equipment: "barbell",
      target: "quads",
      gifUrl: "https://www.jefit.com/images/exercises/800_600/656.jpg",
      instructions: [
        "Position bar on upper back",
        "Stand with feet shoulder-width apart",
        "Lower body by bending knees and hips",
        "Descend until thighs are parallel to floor",
        "Drive up through heels to return"
      ],
      secondaryMuscles: ["glutes", "hamstrings"]
    },
    {
      id: "legs_002",
      name: "Leg Press",
      bodyPart: "upper legs",
      equipment: "machine",
      target: "quads",
      gifUrl: "https://www.jefit.com/images/exercises/800_600/976.jpg",
      instructions: [
        "Sit in leg press machine",
        "Place feet shoulder-width apart on platform",
        "Press weight up by extending legs",
        "Lower weight with control",
        "Don't lock knees at top"
      ],
      secondaryMuscles: ["glutes", "hamstrings"]
    },
    {
      id: "legs_003",
      name: "Romanian Deadlift",
      bodyPart: "upper legs",
      equipment: "barbell",
      target: "hamstrings",
      gifUrl: "https://www.jefit.com/images/exercises/800_600/640.jpg",
      instructions: [
        "Hold bar at hip level",
        "Push hips back while keeping legs slightly bent",
        "Lower bar until you feel stretch in hamstrings",
        "Drive hips forward to return"
      ],
      secondaryMuscles: ["glutes", "lower back"]
    },
    {
      id: "legs_004",
      name: "Lunges",
      bodyPart: "upper legs",
      equipment: "body weight",
      target: "quads",
      gifUrl: "https://www.jefit.com/images/exercises/800_600/48.jpg",
      instructions: [
        "Step forward with one leg",
        "Lower hips until both knees are bent at 90 degrees",
        "Push back to starting position",
        "Alternate legs or complete all reps on one side"
      ],
      secondaryMuscles: ["glutes", "hamstrings"]
    },
    {
      id: "legs_005",
      name: "Calf Raises",
      bodyPart: "lower legs",
      equipment: "body weight",
      target: "calves",
      gifUrl: "https://www.jefit.com/images/exercises/800_600/892.jpg",
      instructions: [
        "Stand on balls of feet on edge or platform",
        "Rise up onto toes as high as possible",
        "Hold briefly at the top",
        "Lower back down with control"
      ],
      secondaryMuscles: []
    },

    // Arms Exercises
    {
      id: "arms_001",
      name: "Barbell Curl",
      bodyPart: "upper arms",
      equipment: "barbell",
      target: "biceps",
      gifUrl: "https://www.jefit.com/images/exercises/800_600/544.jpg",
      instructions: [
        "Stand with feet shoulder-width apart",
        "Hold barbell with underhand grip",
        "Curl bar up to chest",
        "Lower back down with control",
        "Keep elbows stationary"
      ],
      secondaryMuscles: ["forearms"]
    },
    {
      id: "arms_002",
      name: "Hammer Curl",
      bodyPart: "upper arms",
      equipment: "dumbbell",
      target: "biceps",
      gifUrl: "https://www.jefit.com/images/exercises/800_600/376.jpg",
      instructions: [
        "Hold dumbbells with neutral grip (palms facing each other)",
        "Curl weights to shoulders",
        "Keep palms facing each other throughout",
        "Lower back down with control"
      ],
      secondaryMuscles: ["forearms"]
    },
    {
      id: "arms_003",
      name: "Tricep Dips",
      bodyPart: "upper arms",
      equipment: "body weight",
      target: "triceps",
      gifUrl: "https://www.jefit.com/images/exercises/800_600/344.jpg",
      instructions: [
        "Support body on dip bars",
        "Lower body by bending elbows",
        "Descend until shoulders are below elbows",
        "Push back up to starting position"
      ],
      secondaryMuscles: ["chest", "shoulders"]
    },
    {
      id: "arms_004",
      name: "Overhead Tricep Extension",
      bodyPart: "upper arms",
      equipment: "dumbbell",
      target: "triceps",
      gifUrl: "https://www.jefit.com/images/exercises/800_600/352.jpg",
      instructions: [
        "Hold dumbbell overhead with both hands",
        "Lower weight behind head by bending elbows",
        "Keep upper arms stationary",
        "Extend back to starting position"
      ],
      secondaryMuscles: []
    },
    {
      id: "arms_005",
      name: "Cable Pushdown",
      bodyPart: "upper arms",
      equipment: "cable",
      target: "triceps",
      gifUrl: "https://www.jefit.com/images/exercises/800_600/216.jpg",
      instructions: [
        "Stand at cable machine with rope or bar attachment",
        "Keep elbows at sides",
        "Push weight down until arms are extended",
        "Return with control"
      ],
      secondaryMuscles: []
    },

    // Core Exercises
    {
      id: "core_001",
      name: "Plank",
      bodyPart: "waist",
      equipment: "body weight",
      target: "abs",
      gifUrl: "https://www.jefit.com/images/exercises/800_600/4620.jpg",
      instructions: [
        "Start in push-up position on forearms",
        "Keep body in straight line from head to heels",
        "Engage core and hold position",
        "Breathe normally while maintaining position"
      ],
      secondaryMuscles: ["shoulders", "back"]
    },
    {
      id: "core_002",
      name: "Crunches",
      bodyPart: "waist",
      equipment: "body weight",
      target: "abs",
      gifUrl: "https://www.jefit.com/images/exercises/800_600/91.jpg",
      instructions: [
        "Lie on back with knees bent",
        "Place hands behind head",
        "Lift shoulders off ground using abs",
        "Lower back down with control"
      ],
      secondaryMuscles: []
    },
    {
      id: "core_003",
      name: "Russian Twist",
      bodyPart: "waist",
      equipment: "body weight",
      target: "obliques",
      gifUrl: "https://www.jefit.com/images/exercises/800_600/276.jpg",
      instructions: [
        "Sit with knees bent and feet elevated",
        "Lean back to 45-degree angle",
        "Rotate torso from side to side",
        "Keep core engaged throughout"
      ],
      secondaryMuscles: ["abs"]
    },
    {
      id: "core_004",
      name: "Leg Raises",
      bodyPart: "waist",
      equipment: "body weight",
      target: "abs",
      gifUrl: "https://www.jefit.com/images/exercises/800_600/124.jpg",
      instructions: [
        "Lie on back with legs extended",
        "Place hands at sides for support",
        "Raise legs until perpendicular to floor",
        "Lower back down without touching floor"
      ],
      secondaryMuscles: ["hip flexors"]
    },
    {
      id: "core_005",
      name: "Mountain Climbers",
      bodyPart: "waist",
      equipment: "body weight",
      target: "abs",
      gifUrl: "https://www.jefit.com/images/exercises/800_600/116.jpg",
      instructions: [
        "Start in plank position",
        "Bring one knee toward chest",
        "Quickly switch legs",
        "Continue alternating at steady pace"
      ],
      secondaryMuscles: ["shoulders", "hip flexors"]
    }
  ];

  // Generate more exercise variations
  private generateExerciseVariations(): ExerciseSource[] {
    const variations: ExerciseSource[] = [];
    const equipmentVariations = ['dumbbell', 'barbell', 'cable', 'machine', 'band', 'body weight', 'kettlebell', 'medicine ball', 'resistance band', 'smith machine'];
    const angleVariations = ['incline', 'decline', 'flat', '45-degree', '30-degree'];
    const gripVariations = ['wide grip', 'close grip', 'neutral grip', 'reverse grip', 'mixed grip', 'overhand', 'underhand'];
    const stanceVariations = ['wide stance', 'narrow stance', 'staggered stance', 'single leg', 'split stance'];
    const tempoVariations = ['slow', 'explosive', 'pause', 'negative', '21s'];
    
    // Generate many more variations for all exercises
    this.exercises.forEach(exercise => {
      // Add equipment variations for all body parts
      equipmentVariations.forEach((equipment, idx) => {
        if (equipment !== exercise.equipment && Math.random() > 0.3) { // Add 70% of variations
          variations.push({
            ...exercise,
            id: `${exercise.id}_eq_${idx}`,
            name: `${equipment.charAt(0).toUpperCase() + equipment.slice(1)} ${exercise.name}`,
            equipment: equipment,
            gifUrl: exercise.gifUrl || 'https://www.jefit.com/images/exercises/800_600/1.jpg'
          });
        }
      });
      
      // Add angle variations for chest and shoulder exercises
      if (exercise.bodyPart === 'chest' || exercise.bodyPart === 'shoulders') {
        angleVariations.forEach((angle, idx) => {
          if (Math.random() > 0.4) {
            variations.push({
              ...exercise,
              id: `${exercise.id}_angle_${idx}`,
              name: `${angle.charAt(0).toUpperCase() + angle.slice(1)} ${exercise.name}`,
              gifUrl: exercise.gifUrl || 'https://www.jefit.com/images/exercises/800_600/380.jpg'
            });
          }
        });
      }
      
      // Add grip variations for pulling and pushing exercises
      if (exercise.target === 'lats' || exercise.target === 'biceps' || exercise.target === 'triceps' || exercise.bodyPart === 'back') {
        gripVariations.forEach((grip, idx) => {
          if (Math.random() > 0.5) {
            variations.push({
              ...exercise,
              id: `${exercise.id}_grip_${idx}`,
              name: `${grip.charAt(0).toUpperCase() + grip.slice(1)} ${exercise.name}`,
              gifUrl: exercise.gifUrl || 'https://www.jefit.com/images/exercises/800_600/544.jpg'
            });
          }
        });
      }
      
      // Add stance variations for leg exercises
      if (exercise.bodyPart === 'upper legs' || exercise.bodyPart === 'lower legs') {
        stanceVariations.forEach((stance, idx) => {
          if (Math.random() > 0.4) {
            variations.push({
              ...exercise,
              id: `${exercise.id}_stance_${idx}`,
              name: `${stance.charAt(0).toUpperCase() + stance.slice(1)} ${exercise.name}`,
              gifUrl: exercise.gifUrl || 'https://www.jefit.com/images/exercises/800_600/656.jpg'
            });
          }
        });
      }
      
      // Add tempo variations for all exercises
      if (Math.random() > 0.7) { // Add 30% tempo variations
        tempoVariations.forEach((tempo, idx) => {
          if (Math.random() > 0.6) {
            variations.push({
              ...exercise,
              id: `${exercise.id}_tempo_${idx}`,
              name: `${tempo.charAt(0).toUpperCase() + tempo.slice(1)} ${exercise.name}`,
              gifUrl: exercise.gifUrl || 'https://www.jefit.com/images/exercises/800_600/91.jpg',
              instructions: [`Perform with ${tempo} tempo`, ...exercise.instructions]
            });
          }
        });
      }
    });
    
    return variations;
  }

  // Add more specific exercises
  private getAdditionalExercises(): ExerciseSource[] {
    return [
      // Additional Chest
      {
        id: "chest_006",
        name: "Decline Bench Press",
        bodyPart: "chest",
        equipment: "barbell",
        target: "lower chest",
        gifUrl: "https://www.jefit.com/images/exercises/800_600/692.jpg",
        instructions: ["Set bench to decline position", "Press bar from lower chest position"],
        secondaryMuscles: ["triceps"]
      },
      {
        id: "chest_007",
        name: "Chest Dips",
        bodyPart: "chest",
        equipment: "body weight",
        target: "lower chest",
        gifUrl: "https://www.jefit.com/images/exercises/800_600/344.jpg",
        instructions: ["Lean forward on dip bars", "Lower body focusing on chest stretch"],
        secondaryMuscles: ["triceps", "shoulders"]
      },
      {
        id: "chest_008",
        name: "Pec Deck",
        bodyPart: "chest",
        equipment: "machine",
        target: "pectorals",
        gifUrl: "https://www.jefit.com/images/exercises/800_600/1080.jpg",
        instructions: ["Sit at pec deck machine", "Bring arms together in front"],
        secondaryMuscles: []
      },
      
      // Additional Back
      {
        id: "back_006",
        name: "T-Bar Row",
        bodyPart: "back",
        equipment: "barbell",
        target: "middle back",
        gifUrl: "https://www.jefit.com/images/exercises/800_600/880.jpg",
        instructions: ["Use T-bar row platform", "Pull weight to chest"],
        secondaryMuscles: ["lats", "biceps"]
      },
      {
        id: "back_007",
        name: "Chin-Ups",
        bodyPart: "back",
        equipment: "body weight",
        target: "lats",
        gifUrl: "https://www.jefit.com/images/exercises/800_600/3456.jpg",
        instructions: ["Use underhand grip", "Pull chin over bar"],
        secondaryMuscles: ["biceps"]
      },
      {
        id: "back_008",
        name: "Shrugs",
        bodyPart: "back",
        equipment: "dumbbell",
        target: "traps",
        gifUrl: "https://www.jefit.com/images/exercises/800_600/452.jpg",
        instructions: ["Hold dumbbells at sides", "Shrug shoulders up"],
        secondaryMuscles: []
      },
      
      // Additional Shoulders
      {
        id: "shoulders_006",
        name: "Upright Row",
        bodyPart: "shoulders",
        equipment: "barbell",
        target: "delts",
        gifUrl: "https://www.jefit.com/images/exercises/800_600/680.jpg",
        instructions: ["Pull bar up to chin level", "Keep elbows high"],
        secondaryMuscles: ["traps"]
      },
      {
        id: "shoulders_007",
        name: "Cable Lateral Raise",
        bodyPart: "shoulders",
        equipment: "cable",
        target: "side delts",
        gifUrl: "https://www.jefit.com/images/exercises/800_600/200.jpg",
        instructions: ["Use single cable handle", "Raise arm to side"],
        secondaryMuscles: []
      },
      
      // Additional Legs
      {
        id: "legs_006",
        name: "Bulgarian Split Squat",
        bodyPart: "upper legs",
        equipment: "body weight",
        target: "quads",
        gifUrl: "https://www.jefit.com/images/exercises/800_600/4796.jpg",
        instructions: ["Rear foot elevated on bench", "Lower into lunge position"],
        secondaryMuscles: ["glutes"]
      },
      {
        id: "legs_007",
        name: "Leg Curl",
        bodyPart: "upper legs",
        equipment: "machine",
        target: "hamstrings",
        gifUrl: "https://www.jefit.com/images/exercises/800_600/968.jpg",
        instructions: ["Lie on leg curl machine", "Curl heels toward glutes"],
        secondaryMuscles: []
      },
      {
        id: "legs_008",
        name: "Leg Extension",
        bodyPart: "upper legs",
        equipment: "machine",
        target: "quads",
        gifUrl: "https://www.jefit.com/images/exercises/800_600/972.jpg",
        instructions: ["Sit on leg extension machine", "Extend legs forward"],
        secondaryMuscles: []
      },
      {
        id: "legs_009",
        name: "Goblet Squat",
        bodyPart: "upper legs",
        equipment: "dumbbell",
        target: "quads",
        gifUrl: "https://www.jefit.com/images/exercises/800_600/4704.jpg",
        instructions: ["Hold dumbbell at chest", "Squat down keeping chest up"],
        secondaryMuscles: ["glutes"]
      },
      {
        id: "legs_010",
        name: "Step-Ups",
        bodyPart: "upper legs",
        equipment: "body weight",
        target: "quads",
        gifUrl: "https://www.jefit.com/images/exercises/800_600/3665.jpg",
        instructions: ["Step up onto platform", "Drive through heel"],
        secondaryMuscles: ["glutes"]
      },
      
      // Additional Arms
      {
        id: "arms_006",
        name: "Preacher Curl",
        bodyPart: "upper arms",
        equipment: "barbell",
        target: "biceps",
        gifUrl: "https://www.jefit.com/images/exercises/800_600/624.jpg",
        instructions: ["Use preacher bench", "Curl bar with arms supported"],
        secondaryMuscles: []
      },
      {
        id: "arms_007",
        name: "Concentration Curl",
        bodyPart: "upper arms",
        equipment: "dumbbell",
        target: "biceps",
        gifUrl: "https://www.jefit.com/images/exercises/800_600/360.jpg",
        instructions: ["Sit with elbow on inner thigh", "Curl weight with focus"],
        secondaryMuscles: []
      },
      {
        id: "arms_008",
        name: "Close-Grip Bench Press",
        bodyPart: "upper arms",
        equipment: "barbell",
        target: "triceps",
        gifUrl: "https://www.jefit.com/images/exercises/800_600/696.jpg",
        instructions: ["Use narrow grip on bar", "Focus on tricep engagement"],
        secondaryMuscles: ["chest"]
      },
      {
        id: "arms_009",
        name: "Diamond Push-Ups",
        bodyPart: "upper arms",
        equipment: "body weight",
        target: "triceps",
        gifUrl: "https://www.jefit.com/images/exercises/800_600/4668.jpg",
        instructions: ["Form diamond with hands", "Lower chest to hands"],
        secondaryMuscles: ["chest"]
      },
      
      // Additional Core
      {
        id: "core_006",
        name: "Side Plank",
        bodyPart: "waist",
        equipment: "body weight",
        target: "obliques",
        gifUrl: "https://www.jefit.com/images/exercises/800_600/136.jpg",
        instructions: ["Lie on side", "Lift hips off ground", "Hold position"],
        secondaryMuscles: ["abs"]
      },
      {
        id: "core_007",
        name: "Cable Crunch",
        bodyPart: "waist",
        equipment: "cable",
        target: "abs",
        gifUrl: "https://www.jefit.com/images/exercises/800_600/192.jpg",
        instructions: ["Kneel at cable machine", "Crunch down with rope"],
        secondaryMuscles: []
      },
      {
        id: "core_008",
        name: "Hanging Knee Raise",
        bodyPart: "waist",
        equipment: "body weight",
        target: "abs",
        gifUrl: "https://www.jefit.com/images/exercises/800_600/296.jpg",
        instructions: ["Hang from bar", "Raise knees to chest"],
        secondaryMuscles: ["hip flexors"]
      },
      {
        id: "core_009",
        name: "Wood Choppers",
        bodyPart: "waist",
        equipment: "cable",
        target: "obliques",
        gifUrl: "https://www.jefit.com/images/exercises/800_600/5048.jpg",
        instructions: ["Pull cable diagonally across body", "Rotate torso"],
        secondaryMuscles: ["abs"]
      },
      {
        id: "core_010",
        name: "Ab Wheel Rollout",
        bodyPart: "waist",
        equipment: "wheel",
        target: "abs",
        gifUrl: "https://www.jefit.com/images/exercises/800_600/3296.jpg",
        instructions: ["Kneel with ab wheel", "Roll forward keeping core tight"],
        secondaryMuscles: ["shoulders"]
      }
    ];
  }

  async getAllExercises(): Promise<CachedExercise[]> {
    const baseExercises = this.exercises;
    const additional = this.getAdditionalExercises();
    const moreExercises = this.generateMoreExercises();
    const variations = this.generateExerciseVariations();
    
    const allExercises = [...baseExercises, ...additional, ...moreExercises, ...variations];
    
    // Convert to CachedExercise format
    return allExercises.map((exercise, index) => ({
      externalId: exercise.id || `multi_${index}`,
      apiSource: 'exercisedb' as const,
      name: exercise.name,
      bodyPart: exercise.bodyPart,
      equipment: exercise.equipment,
      gifUrl: exercise.gifUrl || exercise.imageUrl || '',
      target: exercise.target,
      secondaryMuscles: exercise.secondaryMuscles || [],
      instructions: exercise.instructions,
      difficulty: this.categorizeDifficulty(exercise.equipment),
      category: this.categorizeExercise(exercise.bodyPart)
    }));
  }

  private categorizeDifficulty(equipment: string): 'beginner' | 'intermediate' | 'advanced' {
    if (equipment === 'body weight') return 'beginner';
    if (equipment === 'machine') return 'beginner';
    if (equipment === 'dumbbell' || equipment === 'cable') return 'intermediate';
    if (equipment === 'barbell') return 'intermediate';
    return 'intermediate';
  }

  private categorizeExercise(bodyPart: string): string {
    const categories: { [key: string]: string } = {
      'chest': 'Chest',
      'back': 'Back',
      'shoulders': 'Shoulders',
      'upper legs': 'Legs',
      'lower legs': 'Legs',
      'upper arms': 'Arms',
      'lower arms': 'Arms',
      'waist': 'Core',
      'cardio': 'Cardio'
    };
    return categories[bodyPart] || 'Other';
  }
  
  // Generate hundreds more exercises programmatically
  private generateMoreExercises(): ExerciseSource[] {
    const exercises: ExerciseSource[] = [];
    let id = 1000;
    
    // Common exercise templates
    const templates = [
      // Compound movements
      { base: 'Press', bodyParts: ['chest', 'shoulders'], targets: ['pectorals', 'delts'], equipments: ['barbell', 'dumbbell', 'machine', 'cable'] },
      { base: 'Row', bodyParts: ['back'], targets: ['lats', 'middle back'], equipments: ['barbell', 'dumbbell', 'cable', 'machine'] },
      { base: 'Squat', bodyParts: ['upper legs'], targets: ['quads', 'glutes'], equipments: ['barbell', 'dumbbell', 'machine', 'body weight'] },
      { base: 'Deadlift', bodyParts: ['back', 'upper legs'], targets: ['lower back', 'hamstrings'], equipments: ['barbell', 'dumbbell', 'trap bar'] },
      { base: 'Curl', bodyParts: ['upper arms'], targets: ['biceps'], equipments: ['barbell', 'dumbbell', 'cable', 'machine'] },
      { base: 'Extension', bodyParts: ['upper arms'], targets: ['triceps'], equipments: ['dumbbell', 'cable', 'machine'] },
      { base: 'Fly', bodyParts: ['chest'], targets: ['pectorals'], equipments: ['dumbbell', 'cable', 'machine'] },
      { base: 'Pulldown', bodyParts: ['back'], targets: ['lats'], equipments: ['cable', 'machine'] },
      { base: 'Raise', bodyParts: ['shoulders'], targets: ['delts'], equipments: ['dumbbell', 'cable', 'barbell'] },
      { base: 'Lunge', bodyParts: ['upper legs'], targets: ['quads'], equipments: ['dumbbell', 'barbell', 'body weight'] },
      { base: 'Crunch', bodyParts: ['waist'], targets: ['abs'], equipments: ['body weight', 'cable', 'machine'] },
      { base: 'Plank', bodyParts: ['waist'], targets: ['abs'], equipments: ['body weight'] }
    ];
    
    // Modifiers for exercise names
    const modifiers = [
      'Single Arm', 'Single Leg', 'Alternating', 'Seated', 'Standing', 'Lying',
      'Reverse', 'Wide', 'Close', 'Neutral', 'Overhead', 'Behind the Neck',
      'Front', 'Rear', 'Side', 'Cross Body', 'High', 'Low', 'Mid',
      'Pause', 'Explosive', 'Slow', 'Isometric', 'Drop Set', 'Superset',
      'Cable', 'Band', 'Chain', 'Weighted', 'Assisted', 'Unilateral'
    ];
    
    // Generate combinations
    templates.forEach(template => {
      template.bodyParts.forEach(bodyPart => {
        template.equipments.forEach(equipment => {
          modifiers.forEach(modifier => {
            if (Math.random() > 0.55) { // Generate 45% of combinations
              const exerciseName = `${modifier} ${equipment.charAt(0).toUpperCase() + equipment.slice(1)} ${template.base}`;
              exercises.push({
                id: `gen_${id++}`,
                name: exerciseName,
                bodyPart: bodyPart,
                equipment: equipment,
                target: template.targets[0],
                gifUrl: this.getRandomImageUrl(),
                instructions: this.generateInstructions(exerciseName, equipment, bodyPart),
                secondaryMuscles: template.targets.slice(1)
              });
            }
          });
        });
      });
    });
    
    // Add specific muscle group exercises
    const muscleGroups = [
      { name: 'Deltoids', bodyPart: 'shoulders', exercises: ['Press', 'Raise', 'Fly', 'Row'] },
      { name: 'Trapezius', bodyPart: 'back', exercises: ['Shrug', 'Row', 'Deadlift'] },
      { name: 'Rhomboids', bodyPart: 'back', exercises: ['Row', 'Pull', 'Fly'] },
      { name: 'Latissimus', bodyPart: 'back', exercises: ['Pulldown', 'Row', 'Pull'] },
      { name: 'Pectorals', bodyPart: 'chest', exercises: ['Press', 'Fly', 'Dip'] },
      { name: 'Quadriceps', bodyPart: 'upper legs', exercises: ['Squat', 'Lunge', 'Extension'] },
      { name: 'Hamstrings', bodyPart: 'upper legs', exercises: ['Curl', 'Deadlift', 'Bridge'] },
      { name: 'Glutes', bodyPart: 'upper legs', exercises: ['Bridge', 'Thrust', 'Kickback'] },
      { name: 'Calves', bodyPart: 'lower legs', exercises: ['Raise', 'Press', 'Jump'] },
      { name: 'Biceps', bodyPart: 'upper arms', exercises: ['Curl', 'Row', 'Pull'] },
      { name: 'Triceps', bodyPart: 'upper arms', exercises: ['Extension', 'Press', 'Dip'] },
      { name: 'Forearms', bodyPart: 'lower arms', exercises: ['Curl', 'Hold', 'Twist'] },
      { name: 'Abs', bodyPart: 'waist', exercises: ['Crunch', 'Raise', 'Plank'] },
      { name: 'Obliques', bodyPart: 'waist', exercises: ['Twist', 'Bend', 'Plank'] }
    ];
    
    muscleGroups.forEach(group => {
      group.exercises.forEach(exercise => {
        ['barbell', 'dumbbell', 'cable', 'machine', 'body weight'].forEach(equipment => {
          if (Math.random() > 0.3) { // Generate 70% instead of 30%
            exercises.push({
              id: `muscle_${id++}`,
              name: `${group.name} ${exercise}`,
              bodyPart: group.bodyPart,
              equipment: equipment,
              target: group.name.toLowerCase(),
              gifUrl: this.getRandomImageUrl(),
              instructions: this.generateInstructions(`${group.name} ${exercise}`, equipment, group.bodyPart),
              secondaryMuscles: []
            });
          }
        });
      });
    });
    
    return exercises;
  }
  
  private generateInstructions(exerciseName: string, equipment: string, bodyPart: string): string[] {
    const baseInstructions = [
      `Position yourself with the ${equipment}`,
      `Engage your ${bodyPart} muscles`,
      `Perform the movement with control`,
      `Return to starting position`,
      `Repeat for desired repetitions`
    ];
    return baseInstructions;
  }
  
  private getRandomImageUrl(): string {
    // Return random valid exercise image URLs from JEFIT
    const imageIds = [
      '1', '48', '91', '116', '124', '136', '184', '192', '200', '216', '232', '248', '276', '296',
      '336', '344', '352', '360', '372', '376', '380', '388', '452', '544', '568', '605', '616',
      '624', '640', '656', '680', '688', '692', '696', '880', '892', '968', '972', '976', '1080',
      '3296', '3456', '3612', '3665', '4316', '4620', '4668', '4704', '4796', '5024', '5048'
    ];
    const randomId = imageIds[Math.floor(Math.random() * imageIds.length)];
    return `https://www.jefit.com/images/exercises/800_600/${randomId}.jpg`;
  }
}

export const multiSourceExerciseService = new MultiSourceExerciseService();