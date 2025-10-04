/**
 * Sample multimedia content for education modules
 * This adds example 3D models, clinical images, and research summaries
 */

import { db } from './db';
import { courseModules } from '@shared/schema';
import { eq } from 'drizzle-orm';

export async function addSampleMultimediaContent() {
  try {
    // Get the first shoulder module
    const modules = await db.select().from(courseModules)
      .where(eq(courseModules.courseId, 101))
      .limit(3);
    
    if (modules.length === 0) {
      console.log('No modules found for shoulder course');
      return;
    }
    
    // Add multimedia content to "Subjective History" module
    const subjectiveModule = modules.find(m => m.title.includes('Subjective'));
    if (subjectiveModule) {
      const multimediaContent = {
        sections: [
          {
            type: 'biodigital_3d',
            title: 'Shoulder Anatomy Overview',
            biodigitalConfig: {
              modelId: 'shoulder_complete',
              viewAngle: 'anterior',
              highlightStructures: ['deltoid', 'rotator cuff'],
              labels: true
            }
          },
          {
            type: 'anatomy_images',
            title: 'Detailed Anatomical Views',
            anatomyImages: [
              {
                source: 'z_anatomy',
                imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Shoulder_joint.svg/1200px-Shoulder_joint.svg.png',
                structure: 'Shoulder Joint',
                viewType: 'anterior',
                labels: ['Acromion', 'Clavicle', 'Humerus', 'Scapula'],
                description: 'Anterior view of the shoulder joint showing major bony landmarks'
              },
              {
                source: 'z_anatomy',
                imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Gray412.png/800px-Gray412.png',
                structure: 'Rotator Cuff Muscles',
                viewType: 'posterior',
                labels: ['Supraspinatus', 'Infraspinatus', 'Teres Minor', 'Subscapularis'],
                description: 'Posterior view showing the rotator cuff muscle group'
              }
            ]
          },
          {
            type: 'clinical_images',
            title: 'Clinical Imaging Examples',
            clinicalImages: [
              {
                source: 'nih_openi',
                imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Projectional_radiography_of_the_shoulder.jpg/800px-Projectional_radiography_of_the_shoulder.jpg',
                title: 'Shoulder X-Ray AP View',
                description: 'Normal shoulder radiograph showing glenohumeral joint',
                imageType: 'xray',
                attribution: 'Medical imaging example'
              }
            ]
          },
          {
            type: 'text',
            title: 'Key Points',
            content: '<ul><li>Patient history is crucial for differential diagnosis</li><li>Identify red flags during subjective assessment</li><li>Understand pain patterns and referral areas</li></ul>',
            researchSummary: {
              articleIds: [1, 2, 3],
              bulletPoints: [
                'Subjective history accounts for 80% of diagnostic accuracy in shoulder conditions',
                'Night pain is a significant indicator for rotator cuff pathology',
                'Gradual onset suggests degenerative changes while sudden onset indicates trauma',
                'Pain location can help differentiate between AC joint, glenohumeral, and referred pain'
              ]
            }
          }
        ],
        resources: []
      };
      
      await db.update(courseModules)
        .set({ content: multimediaContent })
        .where(eq(courseModules.id, subjectiveModule.id));
      
      console.log('✅ Added multimedia content to Subjective History module');
    }
    
    // Add multimedia content to "Active ROM Testing" module
    const romModule = modules.find(m => m.title.includes('Active ROM'));
    if (romModule) {
      const multimediaContent = {
        sections: [
          {
            type: 'biodigital_3d',
            title: 'Shoulder Range of Motion',
            biodigitalConfig: {
              modelId: 'shoulder_rom',
              viewAngle: 'lateral',
              highlightStructures: ['deltoid', 'biceps', 'triceps'],
              labels: true
            }
          },
          {
            type: 'clinical_images',
            title: 'ROM Assessment Techniques',
            clinicalImages: [
              {
                source: 'manual_upload',
                imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Body_Movements_I.jpg/800px-Body_Movements_I.jpg',
                title: 'Shoulder Movement Planes',
                description: 'Demonstration of flexion, extension, abduction, and rotation',
                imageType: 'clinical_photo'
              }
            ]
          },
          {
            type: 'text',
            title: 'Assessment Protocol',
            content: '<p>Active ROM testing evaluates voluntary movement capacity and identifies painful arcs.</p>',
            researchSummary: {
              articleIds: [4, 5],
              bulletPoints: [
                'Painful arc between 60-120° suggests subacromial impingement',
                'Limited external rotation is often the first sign of adhesive capsulitis',
                'Scapular dyskinesia affects 67% of patients with shoulder pain',
                'Active ROM deficits correlate with functional disability scores'
              ]
            }
          }
        ]
      };
      
      await db.update(courseModules)
        .set({ content: multimediaContent })
        .where(eq(courseModules.id, romModule.id));
      
      console.log('✅ Added multimedia content to Active ROM Testing module');
    }
    
    console.log('✅ Sample multimedia content added successfully');
    return true;
    
  } catch (error) {
    console.error('Error adding sample multimedia content:', error);
    return false;
  }
}

