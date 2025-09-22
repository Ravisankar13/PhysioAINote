import { Assessment, AssessmentAttempt, InsertAssessment, InsertAssessmentAttempt } from "@shared/schema";

interface AssessmentQuestion {
  id: string;
  question: string;
  type: "multiple_choice" | "true_false" | "short_answer" | "essay";
  options?: string[];
  correctAnswer?: string | string[];
  points: number;
}

interface AssessmentFeedback {
  aiAnalysis?: string;
  strengthsIdentified?: string[];
  areasForImprovement?: string[];
  recommendedStudy?: string[];
  clinicalInsights?: string[];
}

/**
 * Calculate assessment score based on correct answers
 */
export function calculateAssessmentScore(
  questions: AssessmentQuestion[],
  answers: Record<string, any>
): number {
  let totalPoints = 0;
  let earnedPoints = 0;

  questions.forEach(question => {
    totalPoints += question.points;
    
    const userAnswer = answers[question.id];
    if (!userAnswer || userAnswer === "") {
      // No answer provided
      return;
    }

    // For subjective questions without correct answers, award full points
    if (!question.correctAnswer) {
      earnedPoints += question.points;
      return;
    }

    // Check if answer is correct
    let isCorrect = false;
    if (Array.isArray(question.correctAnswer)) {
      isCorrect = question.correctAnswer.includes(userAnswer);
    } else {
      isCorrect = userAnswer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
    }

    if (isCorrect) {
      earnedPoints += question.points;
    }
  });

  return totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
}

/**
 * Generate AI-powered feedback for assessment attempt
 */
export async function generateAssessmentFeedback(
  assessment: Assessment,
  attempt: AssessmentAttempt,
  courseContext?: {
    courseTitle: string;
    moduleTitle: string;
    bodyPart: string;
  }
): Promise<AssessmentFeedback> {
  try {
    // Analyze answers and identify patterns
    const correctAnswers: string[] = [];
    const incorrectAnswers: Array<{ question: string; userAnswer: string; correctAnswer: string }> = [];
    const subjectiveAnswers: Array<{ question: string; answer: string }> = [];

    if (!assessment.questions || !attempt.answers) {
      return {
        aiAnalysis: "Assessment analysis unavailable due to missing data.",
        strengthsIdentified: ["Completed the assessment"],
        areasForImprovement: ["Review course materials"],
        recommendedStudy: ["Continue studying the course content"],
        clinicalInsights: ["Apply knowledge in clinical practice"]
      };
    }

    assessment.questions.forEach(question => {
      const userAnswer = attempt.answers?.[question.id];
      
      if (!userAnswer || userAnswer === "") {
        incorrectAnswers.push({
          question: question.question,
          userAnswer: "No answer provided",
          correctAnswer: question.correctAnswer?.toString() || "N/A"
        });
        return;
      }

      if (!question.correctAnswer) {
        // Subjective question
        subjectiveAnswers.push({
          question: question.question,
          answer: userAnswer
        });
        return;
      }

      // Check if correct
      let isCorrect = false;
      if (Array.isArray(question.correctAnswer)) {
        isCorrect = question.correctAnswer.includes(userAnswer);
      } else {
        isCorrect = userAnswer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
      }

      if (isCorrect) {
        correctAnswers.push(question.question);
      } else {
        incorrectAnswers.push({
          question: question.question,
          userAnswer: userAnswer,
          correctAnswer: question.correctAnswer.toString()
        });
      }
    });

    // Create AI prompt for feedback generation
    const prompt = `
As a physiotherapy education expert, analyze this student's assessment performance and provide personalized feedback:

**Assessment Context:**
- Course: ${courseContext?.courseTitle || "Physiotherapy Course"}
- Module: ${courseContext?.moduleTitle || "Assessment Module"}  
- Body Part Focus: ${courseContext?.bodyPart || "General"}
- Assessment: ${assessment.title}
- Type: ${assessment.type}
- Score: ${attempt.score}% (${attempt.passed ? 'PASSED' : 'FAILED'} - ${assessment.passingScore}% needed)
- Time Spent: ${attempt.timeSpent} minutes

**Performance Analysis:**
Correct Answers (${correctAnswers.length}):
${correctAnswers.map(q => `- ${q}`).join('\n')}

Incorrect Answers (${incorrectAnswers.length}):
${incorrectAnswers.map(item => `- Q: ${item.question}\n  Student: ${item.userAnswer}\n  Correct: ${item.correctAnswer}`).join('\n\n')}

Subjective Responses (${subjectiveAnswers.length}):
${subjectiveAnswers.map(item => `- Q: ${item.question}\n  Response: ${item.answer}`).join('\n\n')}

Please provide:
1. Overall performance analysis (2-3 sentences)
2. Key strengths demonstrated (3-5 bullet points)
3. Areas needing improvement (3-5 bullet points)  
4. Specific study recommendations (3-5 bullet points)
5. Clinical insights for real-world application (2-3 bullet points)

Format as JSON with keys: aiAnalysis, strengthsIdentified, areasForImprovement, recommendedStudy, clinicalInsights
`;

    // For now, return structured feedback without AI generation
    // TODO: Integrate with actual PhysioGPT service when function is available
    const aiResponse = `{
      "aiAnalysis": "Assessment completed with ${attempt.score}% score. ${attempt.passed ? 'Excellent work demonstrating competency!' : 'Keep studying to reach the ' + assessment.passingScore + '% passing threshold.'}",
      "strengthsIdentified": ${JSON.stringify(correctAnswers.length > 0 ? 
        [`Strong understanding demonstrated in ${correctAnswers.length} areas`, "Good engagement with course material"] :
        ["Completed the assessment", "Commitment to learning demonstrated"]
      )},
      "areasForImprovement": ${JSON.stringify(incorrectAnswers.length > 0 ?
        [`Review concepts from ${incorrectAnswers.length} missed questions`, "Focus on areas needing reinforcement"] :
        ["Continue building knowledge base", "Practice application of concepts"]
      )},
      "recommendedStudy": ${JSON.stringify([
        `Review ${assessment.title} materials`,
        `Study ${courseContext?.bodyPart || 'course'} content thoroughly`,
        "Practice with additional questions",
        "Engage with interactive learning tools"
      ])},
      "clinicalInsights": ${JSON.stringify([
        "Apply theoretical knowledge to patient care",
        "Focus on evidence-based practice",
        "Develop clinical reasoning skills"
      ])}
    }`;

    // Parse AI response as JSON
    try {
      const feedback = JSON.parse(aiResponse);
      return {
        aiAnalysis: feedback.aiAnalysis || `Performance analysis: ${attempt.score}% demonstrates ${attempt.passed ? 'competent understanding' : 'areas for growth'} in ${assessment.title}.`,
        strengthsIdentified: Array.isArray(feedback.strengthsIdentified) ? feedback.strengthsIdentified : 
          correctAnswers.length > 0 ? [`Correctly identified key concepts in ${correctAnswers.length} questions`] : [],
        areasForImprovement: Array.isArray(feedback.areasForImprovement) ? feedback.areasForImprovement :
          incorrectAnswers.length > 0 ? [`Review concepts related to ${incorrectAnswers.length} missed questions`] : [],
        recommendedStudy: Array.isArray(feedback.recommendedStudy) ? feedback.recommendedStudy : 
          [`Review course material for ${assessment.title}`, `Practice additional questions on ${courseContext?.bodyPart || 'core concepts'}`],
        clinicalInsights: Array.isArray(feedback.clinicalInsights) ? feedback.clinicalInsights : 
          [`Apply learned concepts in clinical practice`, `Focus on evidence-based decision making`]
      };
    } catch (parseError) {
      // Fallback if JSON parsing fails
      return {
        aiAnalysis: aiResponse.substring(0, 500) + "...",
        strengthsIdentified: correctAnswers.length > 0 ? 
          [`Demonstrated understanding in ${correctAnswers.length} areas`, `Strong knowledge of key concepts`] : 
          [`Completed the assessment`, `Engaged with the learning material`],
        areasForImprovement: incorrectAnswers.length > 0 ? 
          [`Review concepts from ${incorrectAnswers.length} missed questions`, `Focus on areas where answers were incorrect`] : 
          [`Continue building knowledge base`, `Practice application of concepts`],
        recommendedStudy: [
          `Review course materials for ${assessment.title}`,
          `Practice additional questions on ${courseContext?.bodyPart || 'the topic'}`,
          `Study evidence-based approaches`,
          `Engage with interactive course content`
        ],
        clinicalInsights: [
          `Apply theoretical knowledge to clinical scenarios`,
          `Focus on patient-centered care approaches`,
          `Continue developing clinical reasoning skills`
        ]
      };
    }

  } catch (error) {
    console.error('Error generating assessment feedback:', error);
    
    // Return basic feedback if AI generation fails
    return {
      aiAnalysis: `Assessment completed with ${attempt.score}% score. ${attempt.passed ? 'Congratulations on passing!' : `You need ${assessment.passingScore}% to pass - keep studying!`}`,
      strengthsIdentified: [
        `Completed ${assessment.title} assessment`,
        `Demonstrated engagement with course material`,
        `Showed commitment to learning`
      ],
      areasForImprovement: attempt.passed ? [
        `Continue building on your strong foundation`,
        `Explore advanced topics in the field`,
        `Apply knowledge to clinical scenarios`
      ] : [
        `Review course materials thoroughly`,
        `Practice with additional questions`,
        `Focus on areas where points were missed`,
        `Seek additional study resources`
      ],
      recommendedStudy: [
        `Review ${assessment.title} content`,
        `Study course materials on ${courseContext?.bodyPart || 'the topic'}`,
        `Practice with similar assessments`,
        `Engage with interactive learning tools`
      ],
      clinicalInsights: [
        `Connect theoretical knowledge to patient care`,
        `Focus on evidence-based practice`,
        `Develop clinical reasoning skills`
      ]
    };
  }
}

/**
 * Create sample assessments for course modules
 */
export function createSampleAssessments(): Omit<InsertAssessment, 'id'>[] {
  return [
    {
      moduleId: 1, // Introduction to Shoulder Anatomy
      title: "Shoulder Anatomy Fundamentals Quiz",
      description: "Test your understanding of basic shoulder anatomy and biomechanics",
      type: "quiz",
      questions: [
        {
          id: "q1",
          question: "Which of the following muscles is part of the rotator cuff?",
          type: "multiple_choice",
          options: [
            "Supraspinatus",
            "Deltoid", 
            "Biceps brachii",
            "Pectoralis major"
          ],
          correctAnswer: "Supraspinatus",
          points: 5
        },
        {
          id: "q2", 
          question: "The glenohumeral joint is a ball-and-socket joint.",
          type: "true_false",
          correctAnswer: "true",
          points: 3
        },
        {
          id: "q3",
          question: "Explain the primary function of the rotator cuff muscles in shoulder stability.",
          type: "short_answer",
          points: 10
        },
        {
          id: "q4",
          question: "Describe how you would assess shoulder range of motion in a clinical setting, including the key movements you would test and what normal ranges you would expect.",
          type: "essay",
          points: 15
        }
      ],
      maxAttempts: 3,
      passingScore: 75,
      timeLimit: 30
    },
    {
      moduleId: 2, // Clinical Assessment Techniques
      title: "Shoulder Assessment Mastery",
      description: "Demonstrate your clinical assessment skills through case-based scenarios",
      type: "case_analysis",
      questions: [
        {
          id: "q1",
          question: "A 45-year-old tennis player presents with anterior shoulder pain during overhead activities. Which special test would be most appropriate to assess for impingement?",
          type: "multiple_choice",
          options: [
            "Hawkins-Kennedy test",
            "Apprehension test",
            "Speed's test", 
            "Sulcus sign"
          ],
          correctAnswer: "Hawkins-Kennedy test",
          points: 8
        },
        {
          id: "q2",
          question: "During a shoulder assessment, you observe scapular winging. This typically indicates weakness of which muscle?",
          type: "multiple_choice",
          options: [
            "Serratus anterior",
            "Rhomboids",
            "Trapezius",
            "Levator scapulae"
          ],
          correctAnswer: "Serratus anterior", 
          points: 8
        },
        {
          id: "q3",
          question: "Analyze this case: A 30-year-old swimmer complains of shoulder pain during the catch phase of their stroke. They have positive impingement signs and demonstrate poor scapular control. Outline your assessment priorities and expected findings.",
          type: "essay",
          points: 20
        }
      ],
      maxAttempts: 2,
      passingScore: 80,
      timeLimit: 45
    }
  ];
}