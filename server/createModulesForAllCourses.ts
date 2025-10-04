/**
 * Create modules for all courses that don't have them yet
 * This ensures every course has appropriate modules based on its difficulty and body part
 */

import { db } from './db';
import { courses, courseModules } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Module templates based on difficulty level
const MODULE_TEMPLATES = {
  beginner: [
    { title: 'Introduction & Overview', orderIndex: 0 },
    { title: 'Basic Anatomy & Physiology', orderIndex: 1 },
    { title: 'Fundamental Assessment Techniques', orderIndex: 2 },
    { title: 'Common Conditions', orderIndex: 3 },
    { title: 'Basic Treatment Principles', orderIndex: 4 }
  ],
  intermediate: [
    { title: 'Clinical Anatomy Review', orderIndex: 0 },
    { title: 'Comprehensive Assessment', orderIndex: 1 },
    { title: 'Differential Diagnosis', orderIndex: 2 },
    { title: 'Evidence-Based Treatment', orderIndex: 3 },
    { title: 'Exercise Prescription', orderIndex: 4 },
    { title: 'Manual Therapy Techniques', orderIndex: 5 }
  ],
  advanced: [
    { title: 'Advanced Clinical Anatomy', orderIndex: 0 },
    { title: 'Specialized Assessment Techniques', orderIndex: 1 },
    { title: 'Complex Case Analysis', orderIndex: 2 },
    { title: 'Advanced Manual Therapy', orderIndex: 3 },
    { title: 'Research & Clinical Integration', orderIndex: 4 },
    { title: 'Treatment Progressions & Outcomes', orderIndex: 5 },
    { title: 'Special Populations', orderIndex: 6 }
  ],
  expert: [
    { title: 'Expert Clinical Reasoning', orderIndex: 0 },
    { title: 'Cutting-Edge Research Review', orderIndex: 1 },
    { title: 'Advanced Imaging Interpretation', orderIndex: 2 },
    { title: 'Surgical Considerations', orderIndex: 3 },
    { title: 'Complex Case Management', orderIndex: 4 },
    { title: 'Interdisciplinary Collaboration', orderIndex: 5 },
    { title: 'Clinical Leadership & Education', orderIndex: 6 },
    { title: 'Outcome Metrics & Quality Improvement', orderIndex: 7 }
  ]
};

// Generate module description based on course and module title
function generateModuleDescription(courseTitle: string, moduleTitle: string, bodyPart: string): string {
  const descriptions = {
    'Introduction & Overview': `Comprehensive introduction to ${bodyPart} assessment and management principles covered in this course.`,
    'Basic Anatomy & Physiology': `Essential anatomical structures and physiological principles of the ${bodyPart} region.`,
    'Fundamental Assessment Techniques': `Core assessment skills and examination techniques for ${bodyPart} conditions.`,
    'Common Conditions': `Overview of frequently encountered ${bodyPart} pathologies and their presentations.`,
    'Basic Treatment Principles': `Foundational treatment approaches and interventions for ${bodyPart} disorders.`,
    'Clinical Anatomy Review': `In-depth review of ${bodyPart} anatomy with clinical correlations and palpation techniques.`,
    'Comprehensive Assessment': `Advanced assessment strategies including special tests, movement analysis, and functional screening.`,
    'Differential Diagnosis': `Systematic approach to differential diagnosis of ${bodyPart} conditions with clinical reasoning frameworks.`,
    'Evidence-Based Treatment': `Current best evidence for treating ${bodyPart} conditions with systematic review findings.`,
    'Exercise Prescription': `Progressive exercise programs and therapeutic activities for ${bodyPart} rehabilitation.`,
    'Manual Therapy Techniques': `Hands-on treatment techniques including mobilization, manipulation, and soft tissue techniques.`,
    'Advanced Clinical Anatomy': `Detailed anatomical relationships, variations, and clinical implications for ${bodyPart} practice.`,
    'Specialized Assessment Techniques': `Advanced diagnostic procedures and specialized testing for complex ${bodyPart} presentations.`,
    'Complex Case Analysis': `Multi-factorial case studies and clinical problem-solving for challenging ${bodyPart} conditions.`,
    'Advanced Manual Therapy': `Expert-level manual therapy techniques and clinical application strategies.`,
    'Research & Clinical Integration': `Translation of current research into clinical practice for ${bodyPart} management.`,
    'Treatment Progressions & Outcomes': `Systematic treatment progression protocols and outcome measurement strategies.`,
    'Special Populations': `Considerations for pediatric, geriatric, athletic, and other special populations.`,
    'Expert Clinical Reasoning': `Advanced clinical reasoning models and decision-making frameworks for complex cases.`,
    'Cutting-Edge Research Review': `Latest research findings and emerging treatments in ${bodyPart} physiotherapy.`,
    'Advanced Imaging Interpretation': `Interpretation of MRI, CT, ultrasound, and other imaging modalities.`,
    'Surgical Considerations': `Pre and post-operative management strategies and surgical procedure understanding.`,
    'Interdisciplinary Collaboration': `Working with surgeons, physicians, and other healthcare professionals.`,
    'Clinical Leadership & Education': `Teaching, mentoring, and leadership in clinical practice.`,
    'Outcome Metrics & Quality Improvement': `Measuring and improving clinical outcomes and service quality.`
  };
  
  return descriptions[moduleTitle] || `Comprehensive module covering ${moduleTitle} for ${bodyPart} practice.`;
}

// Generate learning objectives based on module
function generateLearningObjectives(moduleTitle: string, difficulty: string): string[] {
  const baseObjectives = {
    beginner: [
      'Identify key anatomical structures',
      'Demonstrate basic assessment techniques',
      'Recognize common clinical presentations',
      'Apply fundamental treatment principles'
    ],
    intermediate: [
      'Perform comprehensive clinical assessments',
      'Develop differential diagnosis lists',
      'Apply evidence-based treatment protocols',
      'Design progressive exercise programs',
      'Execute appropriate manual therapy techniques'
    ],
    advanced: [
      'Analyze complex clinical presentations',
      'Integrate research evidence into practice',
      'Demonstrate advanced manual therapy skills',
      'Manage multi-factorial conditions',
      'Optimize treatment outcomes through systematic progression'
    ],
    expert: [
      'Lead interdisciplinary care teams',
      'Interpret advanced imaging studies',
      'Manage surgical and non-surgical cases',
      'Conduct clinical research and quality improvement',
      'Mentor and educate other practitioners'
    ]
  };
  
  return baseObjectives[difficulty] || baseObjectives.intermediate;
}

export async function createModulesForAllCourses() {
  try {
    console.log('Creating modules for courses without modules...');
    
    // Get all courses
    const allCourses = await db.select().from(courses);
    console.log(`Found ${allCourses.length} total courses`);
    
    let coursesWithNewModules = 0;
    let totalModulesCreated = 0;
    
    for (const course of allCourses) {
      // Check if course already has modules
      const existingModules = await db.select()
        .from(courseModules)
        .where(eq(courseModules.courseId, course.id));
      
      if (existingModules.length > 0) {
        console.log(`Course ${course.id}: ${course.title} already has ${existingModules.length} modules`);
        continue;
      }
      
      // Get appropriate module template based on difficulty
      const difficulty = course.difficulty || 'intermediate';
      const moduleTemplate = MODULE_TEMPLATES[difficulty] || MODULE_TEMPLATES.intermediate;
      
      console.log(`Creating ${moduleTemplate.length} modules for course ${course.id}: ${course.title}`);
      
      // Create modules for this course
      for (const template of moduleTemplate) {
        const module = {
          courseId: course.id,
          title: template.title,
          description: generateModuleDescription(course.title, template.title, course.bodyPart || 'General'),
          orderIndex: template.orderIndex,
          estimatedMinutes: difficulty === 'beginner' ? 30 : 
                           difficulty === 'intermediate' ? 45 : 
                           difficulty === 'advanced' ? 60 : 75,
          learningObjectives: generateLearningObjectives(template.title, difficulty),
          content: JSON.stringify({
            sections: [],
            moduleTitle: template.title,
            courseTitle: course.title,
            isEmpty: true // Flag to indicate it needs content
          }),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await db.insert(courseModules).values(module);
        totalModulesCreated++;
      }
      
      coursesWithNewModules++;
    }
    
    console.log(`✅ Created ${totalModulesCreated} modules for ${coursesWithNewModules} courses`);
    
    // Now populate content for all newly created modules
    console.log('Populating content for newly created modules...');
    const { populateAllCoursesContent } = await import('./populateAllCoursesContent');
    const result = await populateAllCoursesContent();
    
    // Populate detailed elbow course content
    console.log('Populating detailed elbow rehabilitation content...');
    const { populateElbowCourse } = await import('./populateElbowCourse');
    const elbowResult = await populateElbowCourse();
    
    return {
      success: true,
      coursesWithNewModules,
      totalModulesCreated,
      contentPopulated: result,
      elbowCourseUpdated: elbowResult
    };
    
  } catch (error) {
    console.error('Error creating modules:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export function for use in other modules
// If you want to run this directly, use: npx tsx server/createModulesForAllCourses.ts