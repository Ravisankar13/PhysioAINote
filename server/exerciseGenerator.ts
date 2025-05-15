import OpenAI from "openai";
import { InsertExercise, bodyPartEnum, difficultyEnum } from "@shared/schema";
import { config } from 'dotenv';
config();

// Initialize OpenAI with API key from environment variables
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ExerciseGenerationRequest {
  bodyPart: typeof bodyPartEnum.enumValues[number];
  difficulty: typeof difficultyEnum.enumValues[number];
  count: number;
}

export async function generateExercises(request: ExerciseGenerationRequest): Promise<InsertExercise[]> {
  try {
    console.log(`Generating ${request.count} ${request.difficulty} exercises for ${request.bodyPart}...`);
    
    // Only generate up to 10 exercises at a time to avoid potential API issues
    const count = Math.min(request.count, 10);
    
    const prompt = `
      Generate ${count} unique physiotherapy exercises for the ${request.bodyPart} at a ${request.difficulty} difficulty level.
      
      For each exercise, include:
      - A descriptive title
      - A brief overview of the exercise
      - Target muscles worked
      - Detailed step-by-step instructions
      - Precautions or contraindications
      - Recommended repetitions, sets, or duration
      
      Format the output as a valid JSON array of objects, with each object having these properties:
      - title (string): The name of the exercise
      - description (string): A brief overview
      - bodyPart (string): "${request.bodyPart}"
      - targetMuscles (string): Primary and secondary muscles worked
      - difficulty (string): "${request.difficulty}"
      - instructions (string): Detailed step-by-step guide
      - precautions (string): Safety considerations
      - repetitions (string): Suggested reps (e.g., "3 sets of 12" or "Hold for 30 seconds")
      - sets (string): Number of sets if applicable
      - duration (string): How long to perform the exercise if applicable
    `;
    
    // Query OpenAI API using the gpt-4o model (the newest model)
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "system", content: "You are a physiotherapy expert who creates evidence-based exercise prescriptions." }, 
                { role: "user", content: prompt }],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });
    
    // Parse the response
    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error("No content returned from OpenAI");
    }
    
    try {
      const parsedResponse = JSON.parse(content);
      
      // Ensure the response contains an array of exercises
      if (!Array.isArray(parsedResponse.exercises)) {
        throw new Error("Invalid response format: exercises array not found");
      }
      
      // Map the exercises to the expected format
      // Validate and map the exercise data
      const exercises: InsertExercise[] = parsedResponse.exercises.map((exercise: any) => {
        // Ensure bodyPart is one of the valid enum values
        const bodyPart = bodyPartEnum.enumValues.includes(request.bodyPart) 
          ? request.bodyPart 
          : "general";
          
        // Ensure difficulty is one of the valid enum values
        const difficulty = difficultyEnum.enumValues.includes(request.difficulty)
          ? request.difficulty
          : "beginner";
          
        return {
          title: exercise.title,
          description: exercise.description,
          bodyPart: bodyPart,
          targetMuscles: exercise.targetMuscles,
          difficulty: difficulty,
          instructions: exercise.instructions,
          precautions: exercise.precautions || null,
          repetitions: exercise.repetitions || null,
          sets: exercise.sets || null,
          duration: exercise.duration || null,
          imageUrl: null, // We'll set these to null initially
          videoUrl: null, // We could integrate with an image generation API later
          aiGenerated: true
        };
      });
      
      return exercises;
    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError);
      throw new Error("Failed to parse exercise data from OpenAI response");
    }
  } catch (error) {
    console.error("Error generating exercises:", error);
    throw error;
  }
}

// Fallback function to generate exercises when OpenAI is unavailable
export function generateFallbackExercises(request: ExerciseGenerationRequest): InsertExercise[] {
  console.log(`Generating fallback exercises for ${request.bodyPart}...`);
  
  // Validate body part and difficulty against enum values
  const bodyPart = bodyPartEnum.enumValues.includes(request.bodyPart) 
    ? request.bodyPart 
    : "general";
    
  const difficulty = difficultyEnum.enumValues.includes(request.difficulty)
    ? request.difficulty
    : "beginner";
  
  // Basic template exercises for each body part
  const templates: Partial<Record<typeof bodyPartEnum.enumValues[number], Partial<InsertExercise>[]>> = {
    "shoulder": [
      {
        title: "Shoulder External Rotation",
        description: "Strengthens the rotator cuff muscles",
        targetMuscles: "Infraspinatus, Teres Minor",
        instructions: "Stand with elbow bent at 90 degrees, upper arm parallel to the floor. Rotate the forearm outward, keeping the elbow stationary.",
        precautions: "Avoid if you have acute shoulder pain or recent injury",
        repetitions: "10-12",
        sets: "3"
      },
      {
        title: "Wall Slides",
        description: "Improves shoulder mobility and scapular control",
        targetMuscles: "Serratus Anterior, Lower Trapezius",
        instructions: "Stand with back against wall, arms in 'W' position. Slide arms up the wall while maintaining contact.",
        precautions: "Perform pain-free range only",
        repetitions: "8-10",
        sets: "3"
      }
    ],
    "knee": [
      {
        title: "Straight Leg Raises",
        description: "Strengthens quadriceps while minimizing knee joint stress",
        targetMuscles: "Quadriceps",
        instructions: "Lie on back with one leg straight and one bent. Raise straight leg to height of opposite knee.",
        precautions: "Keep back flat against floor",
        repetitions: "10-15",
        sets: "3"
      },
      {
        title: "Wall Squats",
        description: "Builds quadriceps and gluteal strength with controlled knee loading",
        targetMuscles: "Quadriceps, Gluteals",
        instructions: "Stand with back against wall, feet shoulder-width apart. Slide down wall until knees are at 45-degree angle.",
        precautions: "Ensure knees don't extend past toes",
        repetitions: "Hold for 30-60 seconds",
        sets: "3"
      }
    ]
  };
  
  // If we have templates for the requested body part, use them
  // Otherwise use a generic template
  const exerciseTemplates = templates[bodyPart as keyof typeof templates] || [
    {
      title: `${bodyPart.charAt(0).toUpperCase() + bodyPart.slice(1)} Strengthening Exercise`,
      description: `Basic strengthening exercise for the ${bodyPart}`,
      targetMuscles: `Primary muscles in the ${bodyPart} region`,
      instructions: `Perform controlled movements targeting the ${bodyPart} area`,
      precautions: "Stop if you experience pain beyond mild discomfort",
      repetitions: "10-12",
      sets: "3"
    },
    {
      title: `${bodyPart.charAt(0).toUpperCase() + bodyPart.slice(1)} Mobility Exercise`,
      description: `Improves range of motion in the ${bodyPart}`,
      targetMuscles: `Muscles and joint structures of the ${bodyPart}`,
      instructions: `Slowly move through available range of motion for the ${bodyPart}`,
      precautions: "Stay within pain-free range of motion",
      repetitions: "8-10",
      sets: "2-3"
    }
  ];
  
  // Select the number of exercises requested (up to what's available)
  const count = Math.min(request.count, exerciseTemplates.length);
  const selectedTemplates = exerciseTemplates.slice(0, count);
  
  // Map templates to full exercise objects
  return selectedTemplates.map(template => ({
    title: template.title || `Exercise for ${bodyPart}`,
    description: template.description || `A ${difficulty} exercise for the ${bodyPart}`,
    bodyPart: bodyPart,
    targetMuscles: template.targetMuscles || `Muscles of the ${bodyPart}`,
    difficulty: difficulty,
    instructions: template.instructions || `Perform the exercise with proper form`,
    precautions: template.precautions || "Stop if you experience pain",
    repetitions: template.repetitions || "10-12",
    sets: template.sets || "3",
    duration: template.duration || null,
    imageUrl: null,
    videoUrl: null,
    aiGenerated: true
  }));
}