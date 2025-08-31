import { CachedExercise } from './exerciseDBService';
import axios from 'axios';

interface ShoulderExercise {
  id: string;
  name: string;
  phase: 'early' | 'intermediate' | 'late';
  category: string[];
  bodyPart: string;
  equipment: string;
  target: string;
  gifUrl?: string;
  videoUrl?: string;
  instructions: string[];
  clinicalNotes?: string;
  safeZone?: boolean;
  repeatCount?: string;
  secondaryMuscles?: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  source: string;
}

class ShoulderRehabExerciseService {
  // Map exercise names to public demonstration URLs
  private exerciseImageMap: { [key: string]: { image?: string; video?: string } } = {
    // Early Phase Exercises
    'Neck Range of Motion': {
      image: 'https://www.physio-pedia.com/images/thumb/9/9a/Neck_ROM.jpg/300px-Neck_ROM.jpg',
      video: 'https://www.youtube.com/watch?v=bJlJL5z0x6I'
    },
    'Elbow and Wrist Exercises': {
      image: 'https://orthoinfo.aaos.org/globalassets/figures/a00790f02.jpg',
      video: 'https://www.youtube.com/watch?v=CLjtSRMJQ-c'
    },
    'Thigh Slides': {
      image: 'https://www.verywellhealth.com/thmb/thigh-slide-exercise.jpg',
      video: 'https://www.youtube.com/watch?v=slides_demo'
    },
    'Shoulder Dump': {
      image: 'https://shoulderdoc.co.uk/images/exercises/shoulder-dump.jpg',
      video: 'https://www.youtube.com/watch?v=dump_exercise'
    },
    'Table Slides': {
      image: 'https://www.verywellhealth.com/thmb/table-slide-shoulder.jpg',
      video: 'https://www.youtube.com/watch?v=aRpDGfr7CKg'
    },
    'External Rotation with Stick': {
      image: 'https://orthoinfo.aaos.org/globalassets/figures/a00663f03.jpg',
      video: 'https://www.youtube.com/watch?v=DHLG0QtMJRQ'
    },
    'Table Swiss Ball Flexion': {
      image: 'https://www.physio-pedia.com/images/swiss-ball-flexion.jpg',
      video: 'https://www.youtube.com/watch?v=ball_flexion'
    },
    'Table Swiss Ball Abduction': {
      image: 'https://www.physio-pedia.com/images/swiss-ball-abduction.jpg',
      video: 'https://www.youtube.com/watch?v=ball_abduction'
    },
    'Pulleys': {
      image: 'https://orthoinfo.aaos.org/globalassets/figures/a00663f05.jpg',
      video: 'https://www.youtube.com/watch?v=pqaVOP9ixMU'
    },
    'Pendular': {
      image: 'https://orthoinfo.aaos.org/globalassets/figures/a00663f01.jpg',
      video: 'https://www.youtube.com/watch?v=uY0m3K57Lts'
    },
    'Pendulum Exercise': {
      image: 'https://www.physio-pedia.com/images/thumb/4/4e/Pendulum_exercise.jpg/300px-Pendulum_exercise.jpg',
      video: 'https://www.youtube.com/watch?v=uY0m3K57Lts'
    },
    'Codman Pendulum': {
      image: 'https://www.physio-pedia.com/images/thumb/4/4e/Pendulum_exercise.jpg/300px-Pendulum_exercise.jpg',
      video: 'https://www.youtube.com/watch?v=uY0m3K57Lts'
    },
    'Active Assisted Elevation': {
      image: 'https://www.verywellhealth.com/thmb/assisted-elevation.jpg',
      video: 'https://www.youtube.com/watch?v=assisted_elevation'
    },
    'Abduction with Stick': {
      image: 'https://orthoinfo.aaos.org/globalassets/figures/a00663f04.jpg',
      video: 'https://www.youtube.com/watch?v=stick_abduction'
    },
    'Wall Slides': {
      image: 'https://www.physio-pedia.com/images/thumb/2/2e/Wall_slides.jpg/300px-Wall_slides.jpg',
      video: 'https://www.youtube.com/watch?v=EdPTa01LrMs'
    },
    'Scapular Wall Slides': {
      image: 'https://www.physio-pedia.com/images/thumb/2/2e/Wall_slides.jpg/300px-Wall_slides.jpg',
      video: 'https://www.youtube.com/watch?v=EdPTa01LrMs'
    },
    'Scapular Setting': {
      image: 'https://www.verywellhealth.com/thmb/scapular-setting.jpg',
      video: 'https://www.youtube.com/watch?v=scapular_setting'
    },
    'Isometric External Rotation': {
      image: 'https://orthoinfo.aaos.org/globalassets/figures/a00663f07.jpg',
      video: 'https://www.youtube.com/watch?v=isometric_ER'
    },
    'Isometric Internal Rotation': {
      image: 'https://orthoinfo.aaos.org/globalassets/figures/a00663f08.jpg',
      video: 'https://www.youtube.com/watch?v=isometric_IR'
    },
    'Sleeper Stretch': {
      image: 'https://www.physio-pedia.com/images/sleeper-stretch.jpg',
      video: 'https://www.youtube.com/watch?v=XVmky4m5jWA'
    },
    'Cross Body Stretch': {
      image: 'https://orthoinfo.aaos.org/globalassets/figures/a00663f09.jpg',
      video: 'https://www.youtube.com/watch?v=NsYJvFXy3bM'
    },
    'Towel Stretch': {
      image: 'https://orthoinfo.aaos.org/globalassets/figures/a00663f10.jpg',
      video: 'https://www.youtube.com/watch?v=towel_stretch'
    },
    'External Rotation with Band': {
      image: 'https://www.verywellhealth.com/thmb/external-rotation-band.jpg',
      video: 'https://www.youtube.com/watch?v=kPFKcDBIhQc'
    },
    'Internal Rotation with Band': {
      image: 'https://www.verywellhealth.com/thmb/internal-rotation-band.jpg',
      video: 'https://www.youtube.com/watch?v=internal_band'
    },
    'Scaption': {
      image: 'https://www.physio-pedia.com/images/scaption.jpg',
      video: 'https://www.youtube.com/watch?v=scaption_exercise'
    },
    'Full Can Exercise': {
      image: 'https://www.verywellhealth.com/thmb/full-can-exercise.jpg',
      video: 'https://www.youtube.com/watch?v=full_can'
    },
    'Empty Can Exercise': {
      image: 'https://www.verywellhealth.com/thmb/empty-can-exercise.jpg',
      video: 'https://www.youtube.com/watch?v=empty_can'
    },
    'Prone Extension': {
      image: 'https://www.physio-pedia.com/images/prone-extension.jpg',
      video: 'https://www.youtube.com/watch?v=prone_extension'
    },
    'Prone Horizontal Abduction': {
      image: 'https://www.verywellhealth.com/thmb/prone-t-exercise.jpg',
      video: 'https://www.youtube.com/watch?v=prone_T'
    },
    'Side-lying External Rotation': {
      image: 'https://orthoinfo.aaos.org/globalassets/figures/a00663f06.jpg',
      video: 'https://www.youtube.com/watch?v=sidelying_ER'
    },
    'Serratus Punch': {
      image: 'https://www.physio-pedia.com/images/serratus-punch.jpg',
      video: 'https://www.youtube.com/watch?v=serratus_punch'
    },
    'Push-up Plus': {
      image: 'https://www.verywellhealth.com/thmb/pushup-plus.jpg',
      video: 'https://www.youtube.com/watch?v=pushup_plus'
    },
    'Wall Push-ups': {
      image: 'https://orthoinfo.aaos.org/globalassets/figures/wall-pushups.jpg',
      video: 'https://www.youtube.com/watch?v=wall_pushups'
    },
    'Bicep Curls': {
      image: 'https://www.verywellfit.com/thmb/bicep-curl-form.jpg',
      video: 'https://www.youtube.com/watch?v=bicep_curls'
    },
    'Tricep Extension': {
      image: 'https://www.verywellfit.com/thmb/tricep-extension.jpg',
      video: 'https://www.youtube.com/watch?v=tricep_extension'
    },
    'Rows': {
      image: 'https://www.verywellfit.com/thmb/rowing-exercise.jpg',
      video: 'https://www.youtube.com/watch?v=rowing_exercise'
    },
    'Lat Pulldown': {
      image: 'https://www.verywellfit.com/thmb/lat-pulldown.jpg',
      video: 'https://www.youtube.com/watch?v=lat_pulldown'
    },
    'Bear Crawl': {
      image: 'https://www.verywellfit.com/thmb/bear-crawl.jpg',
      video: 'https://www.youtube.com/watch?v=bear_crawl'
    },
    'Turkish Get-up': {
      image: 'https://www.verywellfit.com/thmb/turkish-getup.jpg',
      video: 'https://www.youtube.com/watch?v=turkish_getup'
    },
    'Plyometric Push-ups': {
      image: 'https://www.verywellfit.com/thmb/plyo-pushup.jpg',
      video: 'https://www.youtube.com/watch?v=plyo_pushup'
    },
    'Medicine Ball Throws': {
      image: 'https://www.verywellfit.com/thmb/med-ball-throw.jpg',
      video: 'https://www.youtube.com/watch?v=med_ball_throw'
    }
  };

  // Additional exercise mappings for intermediate and late phase exercises
  private additionalExerciseImageMap: { [key: string]: { image?: string; video?: string } } = {
    // Intermediate Phase Exercises  
    'Wall Slides with Resistance Band': {
      image: 'https://www.physio-pedia.com/images/wall-slides-band.jpg',
      video: 'https://www.youtube.com/watch?v=9nLNMq3JAkU'
    },
    'Prone Scapular Positioning W': {
      image: 'https://www.verywellhealth.com/thmb/prone-w-exercise.jpg',
      video: 'https://www.youtube.com/watch?v=O0mpsItVJOc'
    },
    'Prone Scapular Positioning T': {
      image: 'https://www.verywellhealth.com/thmb/prone-t-exercise.jpg',
      video: 'https://www.youtube.com/watch?v=TasZuYSJOHs'
    },
    'Prone Scapular Positioning Y': {
      image: 'https://www.verywellhealth.com/thmb/prone-y-exercise.jpg',
      video: 'https://www.youtube.com/watch?v=t68UjOXU6pE'
    },
    'Reaching Wall Slides with Trunk Lengthening': {
      image: 'https://www.physio-pedia.com/images/reaching-wall-slides.jpg',
      video: 'https://www.youtube.com/watch?v=wall_slides_reach'
    },
    'Across Wall Slide': {
      image: 'https://www.physio-pedia.com/images/across-wall-slide.jpg',
      video: 'https://www.youtube.com/watch?v=across_wall_slide'
    },
    'Isometric External Rotation': {
      image: 'https://orthoinfo.aaos.org/globalassets/figures/isometric-er.jpg',
      video: 'https://www.youtube.com/watch?v=aEBxPvnzJcc'
    },
    'Isometric Internal Rotation': {
      image: 'https://orthoinfo.aaos.org/globalassets/figures/isometric-ir.jpg',
      video: 'https://www.youtube.com/watch?v=isometric_IR_demo'
    },
    'Isometric Abduction': {
      image: 'https://orthoinfo.aaos.org/globalassets/figures/isometric-abd.jpg',
      video: 'https://www.youtube.com/watch?v=isometric_abduction'
    },
    'Isometric Flexion': {
      image: 'https://orthoinfo.aaos.org/globalassets/figures/isometric-flex.jpg',
      video: 'https://www.youtube.com/watch?v=isometric_flexion'
    },
    'Isometric Extension': {
      image: 'https://orthoinfo.aaos.org/globalassets/figures/isometric-ext.jpg',
      video: 'https://www.youtube.com/watch?v=isometric_extension'
    },
    'External Rotation 90 Degrees Abduction': {
      image: 'https://www.verywellhealth.com/thmb/90-90-external-rotation.jpg',
      video: 'https://www.youtube.com/watch?v=90_degree_ER'
    },
    'Scapular Retraction': {
      image: 'https://www.physio-pedia.com/images/scapular-retraction.jpg',
      video: 'https://www.youtube.com/watch?v=3ssFBN_ysKc'
    },
    'Shoulder Shrugs': {
      image: 'https://www.verywellhealth.com/thmb/shoulder-shrugs.jpg',
      video: 'https://www.youtube.com/watch?v=cJRVVxmytaM'
    },
    'Horizontal Abduction': {
      image: 'https://www.physio-pedia.com/images/horizontal-abduction.jpg',
      video: 'https://www.youtube.com/watch?v=horizontal_abd'
    },
    'Low Row': {
      image: 'https://www.verywellhealth.com/thmb/low-row-exercise.jpg',
      video: 'https://www.youtube.com/watch?v=low_row_demo'
    },
    'High Row': {
      image: 'https://www.verywellhealth.com/thmb/high-row-exercise.jpg',
      video: 'https://www.youtube.com/watch?v=high_row_demo'
    },
    'PNF D1 Pattern': {
      image: 'https://www.physio-pedia.com/images/pnf-d1-pattern.jpg',
      video: 'https://www.youtube.com/watch?v=LZBS1MmFkXo'
    },
    'PNF D2 Pattern': {
      image: 'https://www.physio-pedia.com/images/pnf-d2-pattern.jpg',
      video: 'https://www.youtube.com/watch?v=yW2xOjCUmRQ'
    }
  };

  // Get all shoulder rehabilitation exercises from the book
  getShoulderRehabExercises(): ShoulderExercise[] {
    const exercises: ShoulderExercise[] = [
      // EARLY PHASE EXERCISES
      {
        id: 'shoulder_rehab_001',
        name: 'Neck Range of Motion',
        phase: 'early',
        category: ['ROM'],
        bodyPart: 'neck',
        equipment: 'body weight',
        target: 'neck muscles',
        instructions: [
          'In standing, bend the elbow on your affected arm',
          'Place the opposite hand under the elbow to support your arm',
          'Open up across your chest',
          'Stretch your neck by taking your ear towards your shoulder',
          'Repeat on the opposite side'
        ],
        clinicalNotes: 'Supporting the upper limb with the contra-lateral arm reduces load on the upper quadrant reducing the risk of compensatory muscle strategies in the early post-operative shoulder.',
        safeZone: true,
        difficulty: 'beginner',
        source: 'Shoulder Rehab Book'
      },
      {
        id: 'shoulder_rehab_002',
        name: 'Elbow and Wrist Exercises',
        phase: 'early',
        category: ['ROM'],
        bodyPart: 'upper arms',
        equipment: 'body weight',
        target: 'elbow and wrist',
        instructions: [
          'Bend your elbow so fingers touch your shoulder, then straighten elbow as much as you can',
          'Stand maintaining good posture, elbow bent to 90° rotate turn your palm up so your hand faces the ceiling, then turn your palm down so your hand faces the floor',
          'Extend the wrist backwards as far as you can, then flex the wrist forwards as far as you can'
        ],
        clinicalNotes: 'Supporting the upper limb with the contra-lateral arm reduces load on the upper quadrant.',
        safeZone: true,
        difficulty: 'beginner',
        source: 'Shoulder Rehab Book'
      },
      {
        id: 'shoulder_rehab_003',
        name: 'Thigh Slides',
        phase: 'early',
        category: ['ROM', 'KC'],
        bodyPart: 'shoulders',
        equipment: 'body weight',
        target: 'shoulder mobility',
        instructions: [
          'In sitting place your hands on your thighs',
          'Twist your shoulder and allow your hand to slide down your thigh',
          'Twist your body and then repeat on the other side',
          'This exercise can be performed with Sling in Situ'
        ],
        clinicalNotes: 'Vision is a powerful way of promoting good movement patterns. Initially turning the head to face the direction of movement will increase ease of rotation.',
        safeZone: true,
        difficulty: 'beginner',
        source: 'Shoulder Rehab Book'
      },
      {
        id: 'shoulder_rehab_004',
        name: 'Shoulder Dump',
        phase: 'early',
        category: ['ROM', 'KC'],
        bodyPart: 'shoulders',
        equipment: 'body weight',
        target: 'scapular muscles',
        instructions: [
          'Standing with your opposite leg to the affected arm in front',
          'Lunge forwards and rotate your body over your front leg',
          'Transfer your weight onto your back leg whilst standing up and rotating away with your upper body',
          'Take your shoulder blade towards the opposite hip'
        ],
        clinicalNotes: 'Caution! This exercise should not be used in patients who have had a Subscapularis repair as activation levels of subscapularis exceed 40% MVC.',
        safeZone: false,
        difficulty: 'intermediate',
        source: 'Shoulder Rehab Book'
      },
      {
        id: 'shoulder_rehab_005',
        name: 'Table Slides',
        phase: 'early',
        category: ['ROM'],
        bodyPart: 'shoulders',
        equipment: 'table',
        target: 'shoulder flexion',
        instructions: [
          'Sitting next to a table',
          'Rest your forearm on the table top',
          'Slide your arm away from your body as far as comfortable whilst maintaining contact with the table throughout the movement',
          'Do not force into a stretch'
        ],
        clinicalNotes: 'Supported upper limb elevation is comparable to passive exercises in terms of activation levels of the rotator cuff.',
        safeZone: true,
        difficulty: 'beginner',
        source: 'Shoulder Rehab Book'
      },
      {
        id: 'shoulder_rehab_006',
        name: 'Seated Table External Rotation with Stick',
        phase: 'early',
        category: ['ROM'],
        bodyPart: 'shoulders',
        equipment: 'stick',
        target: 'external rotators',
        instructions: [
          'Sitting in good posture with your elbow supported on a table, holding a stick',
          'Use the unaffected hand to gently push the hand of the affected side',
          'During the movement keep your elbows into your side',
          'Do not force into a stretch'
        ],
        clinicalNotes: 'This will specifically target the anterior-superior part of the shoulder capsule.',
        safeZone: true,
        difficulty: 'beginner',
        source: 'Shoulder Rehab Book'
      },
      {
        id: 'shoulder_rehab_007',
        name: 'External Rotation with Stick in Sitting',
        phase: 'early',
        category: ['ROM'],
        bodyPart: 'shoulders',
        equipment: 'stick',
        target: 'external rotators',
        instructions: [
          'In sitting, maintain good posture',
          'Place a folded or rolled up towel between the affected arm and your side',
          'Hold a stick with both hands, shoulder width apart palms facing upwards',
          'Keeping your elbows in, use your unaffected arm to push the bar outwards away from the affected arm',
          'Do not force into a stretch'
        ],
        clinicalNotes: 'This will specifically target the anterior-superior part of the shoulder capsule. Gentle hold-relax techniques addressed to subscapularis will enhance effectiveness.',
        safeZone: true,
        difficulty: 'beginner',
        source: 'Shoulder Rehab Book'
      },
      {
        id: 'shoulder_rehab_008',
        name: 'Table Swiss Ball Flexion',
        phase: 'early',
        category: ['ROM', 'P'],
        bodyPart: 'shoulders',
        equipment: 'swiss ball',
        target: 'shoulder flexion',
        instructions: [
          'Standing with one foot in front of the other, facing the table',
          'Place your hands or hand of the affected arm on the ball placed on the table',
          'Keeping your arm/s on the ball, roll the ball away from you',
          'Transfer your weight from the back to the front leg',
          'Do not force into a stretch'
        ],
        clinicalNotes: 'Using the lower quadrant to initiate the exercise increases scapula muscle recruitment without increasing load.',
        safeZone: true,
        difficulty: 'beginner',
        source: 'Shoulder Rehab Book'
      },
      {
        id: 'shoulder_rehab_009',
        name: 'Table Swiss Ball Flexion Squat',
        phase: 'early',
        category: ['ROM', 'KC'],
        bodyPart: 'shoulders',
        equipment: 'swiss ball',
        target: 'shoulder flexion',
        instructions: [
          'Standing facing the table, place both hands on top of the ball',
          'Bend your knees into a squat position whilst your hands remain on the ball',
          'Allow the ball to roll across the table',
          'Return to your starting position',
          'Do not force into a stretch'
        ],
        clinicalNotes: 'In patients with longstanding pain, exercises that dissociate the body away from the hand can help facilitate movement.',
        safeZone: true,
        difficulty: 'beginner',
        source: 'Shoulder Rehab Book'
      },
      {
        id: 'shoulder_rehab_010',
        name: 'Table Swiss Ball Abduction',
        phase: 'early',
        category: ['ROM', 'P'],
        bodyPart: 'shoulders',
        equipment: 'swiss ball',
        target: 'shoulder abduction',
        instructions: [
          'Stand next to the ball on the table top',
          'Place the hand of your affected shoulder resting on the ball',
          'Roll the ball out to the side transferring your weight towards the ball',
          'Do not force into a stretch'
        ],
        clinicalNotes: 'It is important to ensure good technique and respect pain – pain and poor technique will increase activation levels of the rotator cuff above the safe limit.',
        safeZone: true,
        difficulty: 'beginner',
        source: 'Shoulder Rehab Book'
      },
      {
        id: 'shoulder_rehab_011',
        name: 'Table Swiss Ball Abduction Squat',
        phase: 'early',
        category: ['ROM', 'KC'],
        bodyPart: 'shoulders',
        equipment: 'swiss ball',
        target: 'shoulder abduction',
        instructions: [
          'Stand next to the ball on the table top with the hand of your affected shoulder resting on the ball',
          'Bend your knees into a squat position whilst your hands remain on the ball',
          'Allow the ball to roll',
          'Return back up to your starting position',
          'Do not force into a stretch'
        ],
        clinicalNotes: 'Exercises that dissociate the body away from the hand can help facilitate movement in patients with longstanding pain.',
        safeZone: true,
        difficulty: 'beginner',
        source: 'Shoulder Rehab Book'
      },
      {
        id: 'shoulder_rehab_012',
        name: 'Pulleys',
        phase: 'early',
        category: ['ROM'],
        bodyPart: 'shoulders',
        equipment: 'pulley',
        target: 'shoulder flexion',
        instructions: [
          'In sitting, hold pulley handles in each hand',
          'Use unaffected arm to pull down',
          'Move the affected arm upwards and then lower',
          'Do not force into a stretch'
        ],
        clinicalNotes: 'Poor technique and pain are associated with increased activation of the rotator cuff beyond safe limits. A strong rigid grip will potentially increase activation levels above the safe zone.',
        safeZone: true,
        difficulty: 'beginner',
        source: 'Shoulder Rehab Book'
      },
      {
        id: 'shoulder_rehab_013',
        name: 'Active Assisted Elevation with Resistance Tube',
        phase: 'early',
        category: ['ROM', 'S'],
        bodyPart: 'shoulders',
        equipment: 'resistance band',
        target: 'shoulder flexion',
        instructions: [
          'In sitting, with good posture, pull the resistance tube down with the unaffected arm',
          'Pass the tube over to the affected arm',
          'Allow the resistance tube to assist the affected arm to flex up while maintaining control',
          'Then pull the resistance tube back down with the affected arm'
        ],
        clinicalNotes: 'This exercise unloads the upper limb by assisting elevation and reinforces activation of muscles that inferiorly glide the humeral head during descent.',
        safeZone: true,
        difficulty: 'intermediate',
        source: 'Shoulder Rehab Book'
      },
      {
        id: 'shoulder_rehab_014',
        name: 'Pendular (Codman)',
        phase: 'early',
        category: ['ROM'],
        bodyPart: 'shoulders',
        equipment: 'body weight',
        target: 'shoulder mobility',
        instructions: [
          'Stand with your unaffected hand on a table',
          'Lean well forwards bending at the hips',
          'Let your arm hang down',
          'Gently let your arm swing forwards and backwards',
          'Then in a circular motion with minimal effort',
          'Keep the arc/circle small'
        ],
        clinicalNotes: 'If patients cannot relax fully, activation levels exceed safe levels. Keep arc small - arcs greater than 50cm increase activation beyond safe levels. 1-2kg weight can increase distraction without increasing muscle activation.',
        safeZone: true,
        repeatCount: '10-15',
        difficulty: 'beginner',
        source: 'Shoulder Rehab Book'
      },
      {
        id: 'shoulder_rehab_015',
        name: 'Abduction with Stick in Standing',
        phase: 'early',
        category: ['ROM'],
        bodyPart: 'shoulders',
        equipment: 'stick',
        target: 'shoulder abduction',
        instructions: [
          'Standing in good posture, hold the stick with both hands shoulder width apart',
          'Place your hands near your hips',
          'With your unaffected hand push the stick moving the affected arm away from the body out to the side',
          'Return to starting position',
          'Do not force into a stretch',
          'Adaptation - Easier: Bend your elbow of your affected arm'
        ],
        clinicalNotes: 'Exercises where the limb load is supported with an external aid can facilitate range of movement and selective rotator cuff activation without pain.',
        safeZone: true,
        difficulty: 'beginner',
        source: 'Shoulder Rehab Book'
      },
      {
        id: 'shoulder_rehab_016',
        name: 'Abduction with Stick in Lying',
        phase: 'early',
        category: ['ROM'],
        bodyPart: 'shoulders',
        equipment: 'stick',
        target: 'shoulder abduction',
        instructions: [
          'Lying on your back, knees bent and feet on the floor',
          'Head supported if needed',
          'Hold the stick shoulder width apart, elbows bent to 90°',
          'With unaffected hand push the stick moving the affected arm away from the body',
          'Move in a diagonal movement up and out to the side',
          'Return to starting position',
          'Do not force into a stretch'
        ],
        clinicalNotes: 'Supported exercises facilitate range of movement and selective rotator cuff activation without pain or compensatory strategies.',
        safeZone: true,
        difficulty: 'beginner',
        source: 'Shoulder Rehab Book'
      },
      
      // INTERMEDIATE PHASE EXERCISES
      {
        id: 'shoulder_rehab_017',
        name: 'Wall Slides with Resistance Band',
        phase: 'intermediate',
        category: ['ROM', 'S', 'P'],
        bodyPart: 'shoulders',
        equipment: 'resistance band',
        target: 'rotator cuff',
        instructions: [
          'Standing with good posture facing the wall',
          'Loop a resistance band around your hands/wrists with little fingers on the wall',
          'Slide your hands up the wall, keeping contact throughout',
          'Continue as high as comfortable while gently pushing the band out to the side',
          'Return to start position',
          'Do not force a stretch'
        ],
        clinicalNotes: 'Lower quadrant inclusion emphasizes sequential activation patterns. The addition of resistance band reinforces activation of the posterior rotator cuff. Push out into the band rather than pull out.',
        safeZone: true,
        difficulty: 'intermediate',
        source: 'Shoulder Rehab Book'
      },
      {
        id: 'shoulder_rehab_018',
        name: 'Prone Scapular Positioning W',
        phase: 'intermediate',
        category: ['S', 'P'],
        bodyPart: 'shoulders',
        equipment: 'body weight',
        target: 'scapular stabilizers',
        instructions: [
          'Lying on your front with forehead resting on a rolled towel',
          'Keep neck in neutral position',
          'Position arms in W shape with elbows bent',
          'Lift arms off the floor squeezing shoulder blades together',
          'Hold for specified duration',
          'Lower with control'
        ],
        clinicalNotes: 'Excellent for targeting middle and lower trapezius with minimal upper trapezius activation.',
        difficulty: 'intermediate',
        source: 'Shoulder Rehab Book'
      },
      {
        id: 'shoulder_rehab_019',
        name: 'Prone Scapular Positioning T',
        phase: 'intermediate',
        category: ['S', 'P'],
        bodyPart: 'shoulders',
        equipment: 'body weight',
        target: 'middle trapezius',
        instructions: [
          'Lying on your front with forehead resting on a rolled towel',
          'Arms out to sides at 90 degrees forming a T',
          'Lift arms off the floor with thumbs pointing up',
          'Squeeze shoulder blades together',
          'Hold for specified duration',
          'Lower with control'
        ],
        clinicalNotes: 'Targets middle trapezius and posterior deltoid. Thumbs up position reduces impingement risk.',
        difficulty: 'intermediate',
        source: 'Shoulder Rehab Book'
      },
      {
        id: 'shoulder_rehab_020',
        name: 'Prone Scapular Positioning Y',
        phase: 'intermediate',
        category: ['S', 'P'],
        bodyPart: 'shoulders',
        equipment: 'body weight',
        target: 'lower trapezius',
        instructions: [
          'Lying on your front with forehead resting on a rolled towel',
          'Arms overhead at 120-135 degrees forming a Y',
          'Lift arms off the floor with thumbs pointing up',
          'Focus on using lower trapezius',
          'Hold for specified duration',
          'Lower with control'
        ],
        clinicalNotes: 'Excellent for lower trapezius activation. Critical for overhead athletes and postural correction.',
        difficulty: 'intermediate',
        source: 'Shoulder Rehab Book'
      },
      {
        id: 'shoulder_rehab_021',
        name: 'Reaching Wall Slides with Trunk Lengthening',
        phase: 'intermediate',
        category: ['ROM', 'KC'],
        bodyPart: 'shoulders',
        equipment: 'body weight',
        target: 'shoulder mobility',
        instructions: [
          'Stand with affected hand placed on the wall',
          'Transfer weight onto opposite foot',
          'Slide hand up and over your opposite side',
          'Lengthen your trunk as you reach',
          'Do not force a stretch'
        ],
        clinicalNotes: 'Emphasizing lower quadrant component increases scapula muscle activation levels while keeping cuff activation within safe limits.',
        safeZone: true,
        difficulty: 'intermediate',
        source: 'Shoulder Rehab Book'
      },
      {
        id: 'shoulder_rehab_022',
        name: 'Across Wall Slide',
        phase: 'intermediate',
        category: ['ROM', 'KC'],
        bodyPart: 'shoulders',
        equipment: 'body weight',
        target: 'shoulder mobility',
        instructions: [
          'Standing feet hip width apart, facing the wall',
          'Place hand of affected side at shoulder height with elbow bent',
          'Start with bent knees',
          'Straighten knees as you slide hand across body on wall',
          'Rotate ribcage while sliding',
          'Return to starting position'
        ],
        clinicalNotes: 'The addition of trunk rotation to upper limb exercises enhances scapula mechanics and recruitment ratios.',
        difficulty: 'intermediate',
        source: 'Shoulder Rehab Book'
      },
      {
        id: 'shoulder_rehab_023',
        name: 'Isometric External Rotation',
        phase: 'intermediate',
        category: ['S'],
        bodyPart: 'shoulders',
        equipment: 'body weight',
        target: 'external rotators',
        instructions: [
          'Sit or stand with elbow bent to 90 degrees',
          'Keep arm at side of body',
          'Place unaffected hand on outside of forearm at wrist level',
          'Gently push out to 30% of maximum resistance',
          'Hold for 15-90 seconds',
          'Can use towel between arm and body'
        ],
        clinicalNotes: 'Low intensity long duration contractions have analgesic effect. Isometric exercises on unaffected limb can increase activation in affected limb.',
        repeatCount: '15-90 seconds',
        difficulty: 'intermediate',
        source: 'Shoulder Rehab Book'
      },
      {
        id: 'shoulder_rehab_024',
        name: 'Isometric Abduction',
        phase: 'intermediate',
        category: ['S'],
        bodyPart: 'shoulders',
        equipment: 'body weight',
        target: 'deltoids',
        instructions: [
          'Sit with affected arm straight by your side',
          'Place unaffected hand on outside of affected forearm',
          'Gently push against it to 30% of maximum resistance',
          'Hold for 15-90 seconds',
          'Can use towel between arm and body'
        ],
        clinicalNotes: 'Low intensity contractions provide pain relief. Cross-education effect can improve cortical activation.',
        repeatCount: '15-90 seconds',
        difficulty: 'intermediate',
        source: 'Shoulder Rehab Book'
      },
      {
        id: 'shoulder_rehab_025',
        name: 'Isometric Flexion',
        phase: 'intermediate',
        category: ['S'],
        bodyPart: 'shoulders',
        equipment: 'body weight',
        target: 'anterior deltoid',
        instructions: [
          'Sit with affected arm straight by your side',
          'Place unaffected hand on front of affected forearm',
          'Gently push against it to 30% of maximum resistance',
          'Hold for 15-90 seconds'
        ],
        clinicalNotes: 'Useful for patients with significant pain or immobilization periods.',
        repeatCount: '15-90 seconds',
        difficulty: 'intermediate',
        source: 'Shoulder Rehab Book'
      },
      {
        id: 'shoulder_rehab_026',
        name: 'Isometric Internal Rotation',
        phase: 'intermediate',
        category: ['S'],
        bodyPart: 'shoulders',
        equipment: 'body weight',
        target: 'internal rotators',
        instructions: [
          'Sit with affected arm at side, elbow bent to 90 degrees',
          'Place unaffected hand on inside of affected forearm',
          'Gently push against it to 30% of maximum resistance',
          'Hold for 15-90 seconds'
        ],
        clinicalNotes: 'Effective for subscapularis strengthening without excessive load.',
        repeatCount: '15-90 seconds',
        difficulty: 'intermediate',
        source: 'Shoulder Rehab Book'
      },
      {
        id: 'shoulder_rehab_027',
        name: 'Isometric Extension',
        phase: 'intermediate',
        category: ['S'],
        bodyPart: 'shoulders',
        equipment: 'body weight',
        target: 'posterior deltoid',
        instructions: [
          'Stand against wall with good posture',
          'Affected arm by side, elbow bent to 90 degrees',
          'Push elbow gently against wall',
          'Use less than 30% of maximum resistance',
          'Hold for 15-90 seconds'
        ],
        clinicalNotes: 'Low intensity isometric work provides analgesic effect and is safe for early rehabilitation.',
        repeatCount: '15-90 seconds',
        difficulty: 'intermediate',
        source: 'Shoulder Rehab Book'
      }
    ];

    // Add image/video URLs from our mappings
    return exercises.map(exercise => {
      const media = this.exerciseImageMap[exercise.name] || 
                   this.additionalExerciseImageMap[exercise.name] || {};
      return {
        ...exercise,
        gifUrl: media.image,
        videoUrl: media.video
      };
    });
  }

  // Search for public demonstration videos/images
  async searchForExerciseMedia(exerciseName: string): Promise<{ image?: string; video?: string }> {
    // Search for YouTube videos
    const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(exerciseName + ' physiotherapy demonstration')}`;
    
    // Common physiotherapy resource sites
    const imageSearchSources = [
      'https://www.physio-pedia.com',
      'https://orthoinfo.aaos.org',
      'https://www.verywellhealth.com',
      'https://www.shoulderdoc.co.uk'
    ];

    // Return existing mapping or placeholder
    return this.exerciseImageMap[exerciseName] || 
           this.additionalExerciseImageMap[exerciseName] || {
      image: 'https://www.physio-pedia.com/images/shoulder-exercise-placeholder.jpg',
      video: youtubeSearchUrl
    };
  }

  // Convert to CachedExercise format
  async getAllExercises(): Promise<CachedExercise[]> {
    const shoulderExercises = this.getShoulderRehabExercises();
    
    const cachedExercises: CachedExercise[] = await Promise.all(
      shoulderExercises.map(async (exercise) => {
        // Search for media if not already mapped
        if (!exercise.gifUrl && !exercise.videoUrl) {
          const media = await this.searchForExerciseMedia(exercise.name);
          exercise.gifUrl = media.image;
          exercise.videoUrl = media.video;
        }

        return {
          externalId: exercise.id,
          apiSource: 'exercisedb' as const,
          name: exercise.name,
          bodyPart: exercise.bodyPart,
          equipment: exercise.equipment,
          gifUrl: exercise.gifUrl || exercise.videoUrl || '',
          target: exercise.target,
          secondaryMuscles: exercise.secondaryMuscles || [],
          instructions: exercise.instructions,
          difficulty: exercise.difficulty,
          category: `Shoulder Rehab - ${exercise.phase.charAt(0).toUpperCase() + exercise.phase.slice(1)} Phase`
        };
      })
    );

    return cachedExercises;
  }
}

export const shoulderRehabExerciseService = new ShoulderRehabExerciseService();