import { InsertExercise } from "@shared/schema";

/**
 * Collection of evidence-based Reformer Pilates exercises
 * Based on approaches from experts including:
 * - Balanced Body
 * - Stott Pilates
 * - Body Control Pilates
 * - Fletcher Pilates
 * - Joseph Pilates original repertoire
 */

export function getReformerPilatesExercises(): InsertExercise[] {
  return [
    // Core/Back Reformer Pilates Exercises
    {
      title: "Reformer Footwork",
      description: "Foundational Reformer exercise that strengthens the legs while promoting spinal alignment",
      bodyPart: "back",
      targetMuscles: "Quadriceps, hamstrings, calves, intrinsic foot muscles, core stabilizers",
      difficulty: "beginner",
      instructions: "1. Lie supine on the reformer carriage with your head on the headrest\n2. Place feet on the footbar with heels together and toes apart (Pilates V)\n3. Extend legs fully, then control the return of the carriage to the starting position\n4. Repeat with parallel feet, then with heels, then with one leg at a time",
      precautions: "Maintain neutral spine throughout; avoid locking knees; modify spring tension for appropriate resistance",
      repetitions: "10-12 each position",
      sets: "1-2",
      duration: "3-5 minutes total",
      imageUrl: "https://i.pinimg.com/originals/54/8e/c9/548ec99c65886a6d2d9aeac5b865c5c9.jpg",
      aiGenerated: false
    },
    {
      title: "Reformer Hundred",
      description: "Warming exercise that develops breath coordination, core strength and endurance",
      bodyPart: "back",
      targetMuscles: "Rectus abdominis, transverse abdominis, obliques, hip flexors",
      difficulty: "intermediate",
      instructions: "1. Lie supine on the reformer with your head lifted in neck flexion\n2. Hold the straps with arms extended by your sides and slightly lifted\n3. Extend legs to a tabletop position (modified) or at a 45-degree angle (full)\n4. Pump arms up and down while breathing in for 5 counts and out for 5 counts\n5. Continue for 100 arm pumps total",
      precautions: "Maintain neck alignment; modify leg position if experiencing back strain; avoid if recovering from abdominal surgery",
      repetitions: "10 breath cycles (5 counts in, 5 counts out)",
      sets: "1",
      duration: "1-2 minutes",
      imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTZ_Hb1Uy7iZXn2UqOlHYi91WMuovEbB18ZcQ&usqp=CAU",
      aiGenerated: false
    },
    {
      title: "Long Box Back Extension",
      description: "Strengthens the back extensors to improve posture and spinal support",
      bodyPart: "back",
      targetMuscles: "Erector spinae, trapezius, rhomboids, posterior deltoids",
      difficulty: "intermediate",
      instructions: "1. Lie prone on the long box with your pelvis at the back edge and feet secured\n2. Hold the straps with arms extended forward\n3. Inhale to prepare, exhale as you lift your chest, extending the thoracic spine\n4. Keep your gaze down to maintain proper cervical alignment\n5. Inhale to lower with control",
      precautions: "Avoid excessive neck extension; contraindicated for acute disc herniations; modify range for osteoporosis",
      repetitions: "8-10",
      sets: "1-2",
      duration: "2-3 minutes",
      imageUrl: "https://i.pinimg.com/originals/b2/d9/42/b2d9429bc8e87149c1d74fd36593233c.jpg",
      aiGenerated: false
    },
    
    // Shoulder Reformer Pilates Exercises
    {
      title: "Reformer Arm Series",
      description: "Comprehensive series targeting shoulder stability, mobility and strength",
      bodyPart: "shoulder",
      targetMuscles: "Deltoids, rotator cuff, triceps, biceps, serratus anterior",
      difficulty: "beginner",
      instructions: "1. Sit upright on the reformer carriage facing the footbar\n2. Hold the straps with good shoulder alignment\n3. Perform bicep curls, tricep extensions, chest expansion, and circles\n4. Maintain stable shoulder girdle throughout all movements",
      precautions: "Avoid shoulder elevation; modify for shoulder impingement; use lighter springs for injury recovery",
      repetitions: "8-10 each exercise",
      sets: "1",
      duration: "5-7 minutes for complete series",
      imageUrl: "https://i.pinimg.com/originals/ab/0a/69/ab0a691e080958ebdf8a565d26db26a9.jpg",
      aiGenerated: false
    },
    {
      title: "Kneeling Arm Circles",
      description: "Dynamic shoulder mobility exercise to improve circumduction and rotator cuff control",
      bodyPart: "shoulder",
      targetMuscles: "Deltoids, rotator cuff, rhomboids, serratus anterior",
      difficulty: "intermediate",
      instructions: "1. Kneel on the reformer carriage facing the straps\n2. Hold the straps with arms extended at shoulder height\n3. Perform controlled circles with your arms, maintaining shoulder stability\n4. Reverse direction after completing the set repetitions",
      precautions: "Use light spring tension; avoid if experiencing acute shoulder pain; maintain neutral spine",
      repetitions: "8-10 each direction",
      sets: "1-2",
      duration: "3-4 minutes",
      imageUrl: "https://i.pinimg.com/474x/1f/5a/6f/1f5a6fb876153357974695d9b3edc311.jpg",
      aiGenerated: false
    },
    
    // Hip Reformer Pilates Exercises
    {
      title: "Reformer Frog",
      description: "Hip mobility exercise that promotes hip abduction, adduction and core control",
      bodyPart: "hip",
      targetMuscles: "Adductors, hip external rotators, core stabilizers",
      difficulty: "intermediate",
      instructions: "1. Lie supine on the carriage with your head on the headrest\n2. Place the balls of your feet in the straps, heels together in a Pilates V\n3. Extend legs upward with feet in the straps\n4. Open legs wide with control, then close back to starting position",
      precautions: "Avoid hip flexor strain by maintaining neutral pelvis; modify range for hip impingement; avoid after recent hip surgery",
      repetitions: "8-10",
      sets: "1-2",
      duration: "2-3 minutes",
      imageUrl: "https://i.pinimg.com/originals/69/b3/52/69b35242f67cdf5916d61c2e421b6e68.jpg",
      aiGenerated: false
    },
    {
      title: "Side Split",
      description: "Advanced hip abductor strengthener with eccentric control focus",
      bodyPart: "hip",
      targetMuscles: "Gluteus medius, gluteus minimus, tensor fasciae latae, adductors, core",
      difficulty: "advanced",
      instructions: "1. Stand on the reformer carriage with one foot on each side rail\n2. Place hands lightly on the shoulder rests for balance\n3. Control the carriage as it opens, working hip abductors eccentrically\n4. Use hip abductor strength to bring the carriage back together",
      precautions: "Requires significant hip stability; contraindicated for hip replacements; avoid with acute groin strains",
      repetitions: "6-8",
      sets: "1-2",
      duration: "2-3 minutes",
      imageUrl: "https://i.pinimg.com/originals/92/01/eb/9201eb0a1e341612f2d1ddf7a7c87de1.jpg",
      aiGenerated: false
    },
    
    // Knee Reformer Pilates Exercises
    {
      title: "Reformer Bridging",
      description: "Progressive knee and hip stabilization exercise with closed-chain control",
      bodyPart: "knee",
      targetMuscles: "Quadriceps, hamstrings, gluteals, core",
      difficulty: "beginner",
      instructions: "1. Lie supine on the carriage with feet on the footbar, hip-width apart\n2. Press into the footbar to lift your pelvis into a bridge\n3. Extend the carriage away slightly while maintaining the bridge\n4. Return the carriage while keeping the pelvis lifted\n5. Lower with control after completing repetitions",
      precautions: "Ensure proper knee tracking; avoid hyperextension; use appropriate spring tension for knee conditions",
      repetitions: "8-10",
      sets: "1-2",
      duration: "2-3 minutes",
      imageUrl: "https://i.pinimg.com/originals/84/90/1a/84901a01222edea728dd2503bb0ee8f3.jpg",
      aiGenerated: false
    },
    {
      title: "Single Leg Press",
      description: "Unilateral knee strengthening focused on alignment and tracking",
      bodyPart: "knee",
      targetMuscles: "Quadriceps, hamstrings, gluteals, calves, ankles",
      difficulty: "intermediate",
      instructions: "1. Lie supine on the carriage with one foot centered on the footbar\n2. The other leg can be in tabletop or extended upward\n3. Press out and control the return with the working leg\n4. Maintain pelvic stability throughout the movement",
      precautions: "Pay attention to proper knee alignment over second toe; avoid after acute knee injury; modify spring tension accordingly",
      repetitions: "8-10 each leg",
      sets: "1-2",
      duration: "3-4 minutes total",
      imageUrl: "https://i.pinimg.com/originals/38/59/e1/3859e11449aa94df33f4fe9bf2348a1e.jpg",
      aiGenerated: false
    },
    
    // Ankle/Foot Reformer Pilates Exercises
    {
      title: "Reformer Running",
      description: "Dynamic ankle mobility and intrinsic foot strength exercise",
      bodyPart: "ankle",
      targetMuscles: "Ankle dorsiflexors, plantarflexors, intrinsic foot muscles, calves",
      difficulty: "beginner",
      instructions: "1. Lie supine with the balls of your feet on the footbar\n2. Maintain a neutral spine while alternating pressing one heel down while the other lifts\n3. Create a rhythmic 'running' movement\n4. Keep the pelvis and torso stable throughout",
      precautions: "Use caution with Achilles tendinopathy; avoid with acute ankle sprains; modify spring tension as needed",
      repetitions: "20-30 alternating movements",
      sets: "1-2",
      duration: "1-2 minutes",
      imageUrl: "https://i.pinimg.com/originals/cd/f1/67/cdf1677afbbba31417a39f0065073935.jpg",
      aiGenerated: false
    },
    {
      title: "Ankle Circles in Straps",
      description: "Isolated ankle mobility exercise emphasizing control and range of motion",
      bodyPart: "ankle",
      targetMuscles: "All ankle musculature, intrinsic foot muscles",
      difficulty: "beginner",
      instructions: "1. Lie supine with feet in the loops of the straps\n2. Extend legs upward with feet above hips\n3. Draw circles with the ankles while maintaining leg stability\n4. Perform clockwise then counterclockwise motions",
      precautions: "Gentle movement for recovery from ankle injuries; avoid with acute sprains; beneficial for chronic ankle instability",
      repetitions: "8-10 each direction",
      sets: "1",
      duration: "2-3 minutes",
      imageUrl: "https://i.pinimg.com/originals/df/87/c0/df87c08c359d2eee27263ab183796233.jpg",
      aiGenerated: false
    },
    
    // General Reformer Pilates Exercises
    {
      title: "Short Box Series",
      description: "Comprehensive spinal articulation and core control series",
      bodyPart: "general",
      targetMuscles: "Core, back extensors, hip flexors, obliques",
      difficulty: "intermediate",
      instructions: "1. Sit on the short box facing the footbar with feet secured\n2. Perform round back, flat back, side-to-side, and twisting movements\n3. Maintain proper alignment throughout each variation\n4. Focus on articulating the spine segment by segment",
      precautions: "Modify for osteoporosis by avoiding extreme flexion; support lower back if needed; avoid with acute disc issues",
      repetitions: "5-8 each variation",
      sets: "1",
      duration: "5-7 minutes for complete series",
      imageUrl: "https://i.pinimg.com/736x/91/52/f2/9152f2347baa62ae8caa7c3c15bc599e.jpg",
      aiGenerated: false
    },
    {
      title: "Knee Stretches",
      description: "Progressive core stabilization exercise with focus on maintenance of neutral spine",
      bodyPart: "general",
      targetMuscles: "Deep core stabilizers, shoulders, hip flexors",
      difficulty: "intermediate",
      instructions: "1. Kneel on the carriage facing the footbar with hands on the footbar\n2. Maintain a stable plank position as you press the carriage back and control its return\n3. Progress from round back to flat back to knee-off variations as appropriate",
      precautions: "Avoid wrist loading issues; modify for shoulder instability; ensure appropriate spring tension",
      repetitions: "8-10 each variation",
      sets: "1",
      duration: "3-5 minutes for series",
      imageUrl: "https://i.pinimg.com/originals/cd/5c/00/cd5c00350a493fba5130c77d40c66551.jpg",
      aiGenerated: false
    },
    {
      title: "Long Stretch Series",
      description: "Advanced full-body integration exercise with emphasis on core control during extremity movement",
      bodyPart: "general",
      targetMuscles: "Core, shoulders, arms, legs, posterior chain",
      difficulty: "advanced",
      instructions: "1. Begin in plank position with hands on the footbar, feet on the carriage\n2. Long Stretch: Maintain plank as you press carriage back and return\n3. Down Stretch: Pike hips up as carriage moves back\n4. Up Stretch: Shift shoulders past hands as carriage moves back",
      precautions: "Requires significant core and shoulder stability; modify for wrist issues; contraindicated for some shoulder conditions",
      repetitions: "6-8 each variation",
      sets: "1",
      duration: "4-6 minutes for series",
      imageUrl: "https://i.pinimg.com/736x/6c/9a/8d/6c9a8d289ee1b5a47ac7d8ccf3d1d6dd.jpg",
      aiGenerated: false
    },
    {
      title: "Semi-Circle",
      description: "Advanced posterior chain mobility and strength exercise",
      bodyPart: "general",
      targetMuscles: "Hamstrings, gluteals, back extensors, shoulders",
      difficulty: "advanced",
      instructions: "1. Kneel on the carriage facing away from the footbar\n2. Hold the straps with arms extended forward\n3. Hinge forward from the hips with flat back, then articulate through the spine\n4. Return to upright position with control, working through the full range",
      precautions: "Avoid with lumbar disc herniations; modify for hamstring injuries; progress gradually to full movement",
      repetitions: "5-6",
      sets: "1",
      duration: "2-3 minutes",
      imageUrl: "https://i.pinimg.com/originals/00/d9/d5/00d9d56c4f19033b98b7c3a10bc0e3af.jpg",
      aiGenerated: false
    }
  ];
}