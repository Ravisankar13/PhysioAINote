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
                imageUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3324297/bin/11999_2012_2063_Fig1_HTML.jpg',
                structure: 'Shoulder Joint',
                viewType: 'anterior',
                labels: ['Acromion', 'Clavicle', 'Humerus', 'Scapula'],
                description: 'Anterior view of the shoulder joint showing major bony landmarks'
              },
              {
                source: 'z_anatomy',
                imageUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4151406/bin/WJO-5-597-g001.jpg',
                structure: 'Rotator Cuff Muscles',
                viewType: 'posterior',
                labels: ['Supraspinatus', 'Infraspinatus', 'Teres Minor', 'Subscapularis'],
                description: 'MRI showing the rotator cuff muscle group'
              }
            ]
          },
          {
            type: 'clinical_images',
            title: 'Clinical Imaging Examples',
            clinicalImages: [
              {
                source: 'nih_openi',
                imageUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3445147/bin/1749-799X-7-25-1.jpg',
                title: 'Shoulder X-Ray AP View',
                description: 'Anteroposterior radiograph of normal shoulder joint',
                imageType: 'xray',
                attribution: 'NIH/NLM PMC3445147'
              },
              {
                source: 'nih_openi',
                imageUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2684151/bin/11999_2009_754_Fig1_HTML.jpg',
                title: 'Shoulder Impingement',
                description: 'Clinical illustration of subacromial impingement',
                imageType: 'diagram',
                attribution: 'NIH/NLM PMC2684151'
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
                source: 'nih_openi',
                imageUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3863781/bin/12891_2013_1866_Fig1_HTML.jpg',
                title: 'Shoulder Movement Planes',
                description: 'Demonstration of shoulder flexion and abduction movements',
                imageType: 'clinical_photo',
                attribution: 'NIH/NLM PMC3863781'
              },
              {
                source: 'nih_openi',
                imageUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3445147/bin/1749-799X-7-25-2.jpg',
                title: 'Range of Motion Assessment',
                description: 'Clinical assessment of shoulder ROM',
                imageType: 'clinical_photo',
                attribution: 'NIH/NLM PMC3445147'
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

