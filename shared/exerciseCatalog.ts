export type SlingId = 'posterior_oblique' | 'anterior_oblique' | 'lateral' | 'deep_longitudinal' | 'scapular_shoulder';

export interface CatalogExercise {
  id: string;
  name: string;
  category: 'strengthening' | 'stretching' | 'mobility' | 'neuromuscular' | 'functional' | 'stabilization' | 'manual';
  bodyParts: string[];
  baseSets: number;
  baseReps: string;
  baseHold?: number;
  equipment: string[];
  targetSling?: SlingId;
  targetStructure?: string;
  mobilisationGrade?: string;
}

export const EXERCISE_CATALOG: CatalogExercise[] = [
  // ── SHOULDER ──
  { id: 'sh021', name: 'Scapular Wall Slides', category: 'strengthening', bodyParts: ['shoulder'], baseSets: 3, baseReps: '10-15', equipment: ['Wall'] },
  { id: 'sh024', name: 'Prone Y-Raises', category: 'strengthening', bodyParts: ['shoulder'], baseSets: 3, baseReps: '12-15', equipment: ['Light weights'] },
  { id: 'sh023', name: "Prone T's", category: 'strengthening', bodyParts: ['shoulder'], baseSets: 3, baseReps: '12-15', equipment: ['Light weights'] },
  { id: 'sh029', name: 'Push-up Plus', category: 'strengthening', bodyParts: ['shoulder'], baseSets: 3, baseReps: '10-12', equipment: [] },
  { id: 'sh027', name: 'Serratus Punch', category: 'strengthening', bodyParts: ['shoulder'], baseSets: 3, baseReps: '15', equipment: ['Resistance band'] },
  { id: 'sh011', name: 'External Rotation - 0° Abduction', category: 'strengthening', bodyParts: ['shoulder'], baseSets: 3, baseReps: '12-15', equipment: ['Resistance band'] },
  { id: 'sh043', name: 'Doorway Chest Stretch', category: 'stretching', bodyParts: ['shoulder', 'thoracic'], baseSets: 3, baseReps: '3', baseHold: 30, equipment: ['Doorway'] },
  { id: 'sh046', name: 'Upper Trapezius Stretch', category: 'stretching', bodyParts: ['cervical', 'shoulder'], baseSets: 3, baseReps: '3', baseHold: 30, equipment: [] },
  { id: 'sh041', name: 'Sleeper Stretch', category: 'stretching', bodyParts: ['shoulder'], baseSets: 3, baseReps: '3', baseHold: 30, equipment: [] },
  { id: 'sh001', name: 'Pendulum Circles', category: 'mobility', bodyParts: ['shoulder'], baseSets: 3, baseReps: '10-15', equipment: [] },
  { id: 'sh_ir_90', name: 'Internal Rotation - 90° Abduction', category: 'strengthening', bodyParts: ['shoulder'], baseSets: 3, baseReps: '12-15', equipment: ['Resistance band'] },
  { id: 'sh_full_can', name: 'Full Can Raises (Supraspinatus)', category: 'strengthening', bodyParts: ['shoulder'], baseSets: 3, baseReps: '10-12', equipment: ['Light weights'] },
  { id: 'sh_low_trap', name: 'Prone Lower Trapezius Raise', category: 'strengthening', bodyParts: ['shoulder', 'thoracic'], baseSets: 3, baseReps: '10-12', equipment: [] },
  { id: 'sh_cross_body', name: 'Cross-Body Posterior Capsule Stretch', category: 'stretching', bodyParts: ['shoulder'], baseSets: 3, baseReps: '3', baseHold: 30, equipment: [] },
  { id: 'sh_pec_minor', name: 'Pectoralis Minor Stretch (Corner)', category: 'stretching', bodyParts: ['shoulder', 'thoracic'], baseSets: 3, baseReps: '3', baseHold: 30, equipment: ['Wall corner'] },
  { id: 'sh_lat_stretch', name: 'Latissimus Dorsi Wall Stretch', category: 'stretching', bodyParts: ['shoulder', 'thoracic'], baseSets: 3, baseReps: '3', baseHold: 30, equipment: ['Wall'] },

  // ── NECK / CERVICAL ──
  { id: 'nk008', name: 'Chin Tucks', category: 'strengthening', bodyParts: ['cervical', 'neck'], baseSets: 3, baseReps: '10-15', baseHold: 5, equipment: [] },
  { id: 'nk017', name: 'Deep Neck Flexor Training', category: 'strengthening', bodyParts: ['cervical', 'neck'], baseSets: 3, baseReps: '10', baseHold: 10, equipment: [] },
  { id: 'nk011', name: 'Isometric Neck Flexion', category: 'strengthening', bodyParts: ['cervical', 'neck'], baseSets: 3, baseReps: '10', baseHold: 5, equipment: [] },
  { id: 'nk_iso_ext', name: 'Isometric Neck Extension', category: 'strengthening', bodyParts: ['cervical', 'neck'], baseSets: 3, baseReps: '10', baseHold: 5, equipment: [] },
  { id: 'nk_iso_lat', name: 'Isometric Neck Lateral Flexion', category: 'strengthening', bodyParts: ['cervical', 'neck'], baseSets: 3, baseReps: '10 each side', baseHold: 5, equipment: [] },
  { id: 'nk_scm_stretch', name: 'SCM Stretch', category: 'stretching', bodyParts: ['cervical', 'neck'], baseSets: 3, baseReps: '3', baseHold: 30, equipment: [] },
  { id: 'nk_levator_stretch', name: 'Levator Scapulae Stretch', category: 'stretching', bodyParts: ['cervical', 'shoulder'], baseSets: 3, baseReps: '3', baseHold: 30, equipment: [] },

  // ── HIP ──
  { id: 'hp011', name: 'Glute Bridges', category: 'strengthening', bodyParts: ['hip', 'lumbar'], baseSets: 3, baseReps: '15-20', baseHold: 5, equipment: [] },
  { id: 'hp012', name: 'Single Leg Glute Bridge', category: 'strengthening', bodyParts: ['hip', 'lumbar'], baseSets: 3, baseReps: '10-12', equipment: [] },
  { id: 'hp015', name: 'Clamshells', category: 'strengthening', bodyParts: ['hip'], baseSets: 3, baseReps: '15-20', equipment: [] },
  { id: 'hp019', name: 'Monster Walks', category: 'strengthening', bodyParts: ['hip', 'knee'], baseSets: 3, baseReps: '15 steps', equipment: ['Resistance band'] },
  { id: 'hp013', name: 'Hip Thrusts', category: 'strengthening', bodyParts: ['hip'], baseSets: 3, baseReps: '12-15', equipment: ['Bench'] },
  { id: 'hp020', name: 'Lateral Band Walks', category: 'strengthening', bodyParts: ['hip'], baseSets: 3, baseReps: '15 steps', equipment: ['Resistance band'] },
  { id: 'hp_piriformis_stretch', name: 'Piriformis Stretch (Supine Figure-4)', category: 'stretching', bodyParts: ['hip'], baseSets: 3, baseReps: '3', baseHold: 30, equipment: [] },
  { id: 'hp_90_90_stretch', name: '90/90 Hip Stretch', category: 'stretching', bodyParts: ['hip'], baseSets: 3, baseReps: '3 each side', baseHold: 30, equipment: [] },
  { id: 'hp_adductor_stretch', name: 'Adductor Stretch (Side-Lying)', category: 'stretching', bodyParts: ['hip'], baseSets: 3, baseReps: '3', baseHold: 30, equipment: [] },
  { id: 'hp_copenhagen', name: 'Copenhagen Adductor Exercise', category: 'strengthening', bodyParts: ['hip'], baseSets: 3, baseReps: '8-10 each side', equipment: ['Bench'] },
  { id: 'hp_fire_hydrant', name: 'Fire Hydrants', category: 'strengthening', bodyParts: ['hip'], baseSets: 3, baseReps: '12-15 each side', equipment: [] },
  { id: 'hp_side_lying_abd', name: 'Side-Lying Hip Abduction', category: 'strengthening', bodyParts: ['hip'], baseSets: 3, baseReps: '15-20', equipment: [] },

  // ── CORE / LUMBAR ──
  { id: 'cb001', name: 'Dead Bug', category: 'stabilization', bodyParts: ['lumbar', 'core'], baseSets: 3, baseReps: '10 each side', equipment: [] },
  { id: 'cb002', name: 'Bird Dog', category: 'stabilization', bodyParts: ['lumbar', 'core'], baseSets: 3, baseReps: '10 each side', equipment: [] },
  { id: 'cb003', name: 'Plank', category: 'stabilization', bodyParts: ['lumbar', 'core'], baseSets: 3, baseReps: '30s', baseHold: 30, equipment: [] },
  { id: 'cb004', name: 'Side Plank', category: 'stabilization', bodyParts: ['lumbar', 'core', 'hip'], baseSets: 3, baseReps: '30s', baseHold: 30, equipment: [] },
  { id: 'cb006', name: 'Pallof Press', category: 'stabilization', bodyParts: ['lumbar', 'core'], baseSets: 3, baseReps: '12-15', equipment: ['Resistance band'] },
  { id: 'cb021', name: 'Cat-Cow Stretch', category: 'mobility', bodyParts: ['thoracic', 'lumbar'], baseSets: 3, baseReps: '10-12', equipment: [] },
  { id: 'cb023', name: 'Prone Press-Up (McKenzie)', category: 'mobility', bodyParts: ['lumbar'], baseSets: 3, baseReps: '10-15', equipment: [] },
  { id: 'cb_mcgill_curl', name: 'McGill Curl-Up', category: 'stabilization', bodyParts: ['lumbar', 'core'], baseSets: 3, baseReps: '8-10', baseHold: 8, equipment: [] },
  { id: 'cb_stir_pot', name: 'Stir the Pot (Swiss Ball)', category: 'stabilization', bodyParts: ['lumbar', 'core'], baseSets: 3, baseReps: '8 each direction', equipment: ['Swiss ball'] },
  { id: 'cb_suitcase_carry', name: 'Suitcase Carry', category: 'functional', bodyParts: ['lumbar', 'core', 'hip'], baseSets: 3, baseReps: '30m each side', equipment: ['Dumbbell/Kettlebell'] },
  { id: 'cb_child_pose', name: 'Child\'s Pose', category: 'stretching', bodyParts: ['lumbar', 'thoracic'], baseSets: 3, baseReps: '3', baseHold: 30, equipment: [] },

  // ── KNEE ──
  { id: 'kn001', name: 'Quadriceps Sets', category: 'strengthening', bodyParts: ['knee'], baseSets: 3, baseReps: '10-15', baseHold: 5, equipment: [] },
  { id: 'kn007', name: 'Terminal Knee Extension', category: 'strengthening', bodyParts: ['knee'], baseSets: 3, baseReps: '15-20', equipment: ['Resistance band'] },
  { id: 'kn009', name: 'Wall Squats', category: 'strengthening', bodyParts: ['knee', 'hip'], baseSets: 3, baseReps: '10-15', equipment: ['Wall'] },
  { id: 'kn011', name: 'Full Squats', category: 'strengthening', bodyParts: ['knee', 'hip'], baseSets: 3, baseReps: '12-15', equipment: [] },
  { id: 'kn024', name: 'Nordic Curls', category: 'strengthening', bodyParts: ['knee'], baseSets: 3, baseReps: '6-8', equipment: [] },
  { id: 'kn015', name: 'Bulgarian Split Squats', category: 'strengthening', bodyParts: ['knee', 'hip'], baseSets: 3, baseReps: '10-12', equipment: ['Bench'] },
  { id: 'kn_hamstring_stretch', name: 'Hamstring Stretch (Long Sitting)', category: 'stretching', bodyParts: ['knee', 'hip'], baseSets: 3, baseReps: '3', baseHold: 30, equipment: [] },
  { id: 'kn_standing_hamstring', name: 'Standing Hamstring Stretch', category: 'stretching', bodyParts: ['knee', 'hip'], baseSets: 3, baseReps: '3', baseHold: 30, equipment: [] },
  { id: 'kn_quad_stretch', name: 'Standing Quadriceps Stretch', category: 'stretching', bodyParts: ['knee', 'hip'], baseSets: 3, baseReps: '3', baseHold: 30, equipment: [] },
  { id: 'kn_step_ups', name: 'Step Ups', category: 'functional', bodyParts: ['knee', 'hip'], baseSets: 3, baseReps: '10-12 each leg', equipment: ['Step/box'] },
  { id: 'kn_spanish_squat', name: 'Spanish Squat', category: 'strengthening', bodyParts: ['knee'], baseSets: 3, baseReps: '10-12', baseHold: 5, equipment: ['Resistance band', 'Pole'] },
  { id: 'kn_straight_leg_raise', name: 'Straight Leg Raise', category: 'strengthening', bodyParts: ['knee', 'hip'], baseSets: 3, baseReps: '10-15', equipment: [] },

  // ── ANKLE ──
  { id: 'an005', name: 'Heel Raises - Double', category: 'strengthening', bodyParts: ['ankle'], baseSets: 3, baseReps: '15-20', equipment: [] },
  { id: 'an006', name: 'Heel Raises - Single', category: 'strengthening', bodyParts: ['ankle'], baseSets: 3, baseReps: '12-15', equipment: [] },
  { id: 'an010', name: 'Ankle Dorsiflexion with Band', category: 'strengthening', bodyParts: ['ankle'], baseSets: 3, baseReps: '15-20', equipment: ['Resistance band'] },
  { id: 'an001', name: 'Ankle Pumps', category: 'mobility', bodyParts: ['ankle'], baseSets: 3, baseReps: '20-30', equipment: [] },
  { id: 'an_gastroc_stretch', name: 'Gastrocnemius Stretch (Wall)', category: 'stretching', bodyParts: ['ankle'], baseSets: 3, baseReps: '3', baseHold: 30, equipment: ['Wall'] },
  { id: 'an_soleus_stretch', name: 'Soleus Stretch (Bent Knee Wall)', category: 'stretching', bodyParts: ['ankle'], baseSets: 3, baseReps: '3', baseHold: 30, equipment: ['Wall'] },
  { id: 'an_baps_board', name: 'BAPS Board Circles', category: 'functional', bodyParts: ['ankle'], baseSets: 3, baseReps: '10 each direction', equipment: ['BAPS board'] },
  { id: 'an_eversion_band', name: 'Ankle Eversion with Band', category: 'strengthening', bodyParts: ['ankle'], baseSets: 3, baseReps: '15-20', equipment: ['Resistance band'] },
  { id: 'an_inversion_band', name: 'Ankle Inversion with Band', category: 'strengthening', bodyParts: ['ankle'], baseSets: 3, baseReps: '15-20', equipment: ['Resistance band'] },

  // ── ELBOW / WRIST ──
  { id: 'ew001', name: 'Elbow Flexion', category: 'strengthening', bodyParts: ['elbow'], baseSets: 3, baseReps: '12-15', equipment: ['Dumbbell'] },
  { id: 'ew_wrist_ext_stretch', name: 'Wrist Extensor Stretch', category: 'stretching', bodyParts: ['elbow', 'wrist'], baseSets: 3, baseReps: '3', baseHold: 30, equipment: [] },
  { id: 'ew_wrist_flex_stretch', name: 'Wrist Flexor Stretch', category: 'stretching', bodyParts: ['elbow', 'wrist'], baseSets: 3, baseReps: '3', baseHold: 30, equipment: [] },
  { id: 'ew_eccentric_wrist_ext', name: 'Eccentric Wrist Extension (Tyler Twist)', category: 'strengthening', bodyParts: ['elbow', 'wrist'], baseSets: 3, baseReps: '15', equipment: ['FlexBar'] },
  { id: 'ew_eccentric_wrist_flex', name: 'Eccentric Wrist Flexion (Reverse Tyler)', category: 'strengthening', bodyParts: ['elbow', 'wrist'], baseSets: 3, baseReps: '15', equipment: ['FlexBar'] },
  { id: 'ew_supination_pronation', name: 'Forearm Supination/Pronation', category: 'strengthening', bodyParts: ['elbow', 'wrist'], baseSets: 3, baseReps: '15 each', equipment: ['Hammer/Dumbbell'] },

  // ── THORACIC ──
  { id: 'th_foam_ext', name: 'Thoracic Foam Roll Extension', category: 'mobility', bodyParts: ['thoracic'], baseSets: 2, baseReps: '10-15', equipment: ['Foam roller'] },
  { id: 'th_open_book', name: 'Open Book Rotation', category: 'mobility', bodyParts: ['thoracic'], baseSets: 3, baseReps: '10 each side', equipment: [] },
  { id: 'th_thread_needle', name: 'Thread the Needle', category: 'mobility', bodyParts: ['thoracic'], baseSets: 3, baseReps: '10 each side', equipment: [] },
  { id: 'th_cat_rotation', name: 'Quadruped Thoracic Rotation', category: 'mobility', bodyParts: ['thoracic'], baseSets: 3, baseReps: '10 each side', equipment: [] },

  // ── EXISTING CUSTOM / FUNCTIONAL ──
  { id: 'custom_hip_flexor_stretch', name: 'Half-Kneeling Hip Flexor Stretch', category: 'stretching', bodyParts: ['hip', 'lumbar'], baseSets: 3, baseReps: '3', baseHold: 30, equipment: [] },
  { id: 'custom_foam_roll_thoracic', name: 'Thoracic Foam Roll Extension', category: 'mobility', bodyParts: ['thoracic'], baseSets: 2, baseReps: '10-15', equipment: ['Foam roller'] },
  { id: 'custom_single_leg_balance', name: 'Single Leg Balance', category: 'functional', bodyParts: ['ankle', 'knee', 'hip'], baseSets: 3, baseReps: '30s', baseHold: 30, equipment: [] },
  { id: 'custom_isometric_shoulder_er', name: 'Isometric Shoulder External Rotation', category: 'strengthening', bodyParts: ['shoulder'], baseSets: 3, baseReps: '10', baseHold: 10, equipment: ['Wall/towel'] },
  { id: 'custom_eccentric_heel_drop', name: 'Eccentric Heel Drop (Alfredson)', category: 'strengthening', bodyParts: ['ankle'], baseSets: 3, baseReps: '15', equipment: ['Step'] },
  { id: 'custom_neural_slider_median', name: 'Median Nerve Slider', category: 'neuromuscular', bodyParts: ['cervical', 'shoulder', 'elbow'], baseSets: 3, baseReps: '10-15', equipment: [] },
  { id: 'custom_neural_slider_sciatic', name: 'Sciatic Nerve Slider', category: 'neuromuscular', bodyParts: ['lumbar', 'hip', 'knee'], baseSets: 3, baseReps: '10-15', equipment: [] },
  { id: 'fn_single_leg_rdl', name: 'Single-Leg Romanian Deadlift', category: 'functional', bodyParts: ['hip', 'knee', 'ankle'], baseSets: 3, baseReps: '8-10 each leg', equipment: ['Dumbbell'] },
  { id: 'fn_farmers_walk', name: 'Farmer\'s Walk', category: 'functional', bodyParts: ['lumbar', 'core', 'hip', 'shoulder'], baseSets: 3, baseReps: '30m', equipment: ['Dumbbells/Kettlebells'] },
  { id: 'fn_lunge_walk', name: 'Walking Lunges', category: 'functional', bodyParts: ['hip', 'knee'], baseSets: 3, baseReps: '10 each leg', equipment: [] },
  { id: 'fn_single_leg_squat', name: 'Single-Leg Squat to Box', category: 'functional', bodyParts: ['knee', 'hip'], baseSets: 3, baseReps: '8-10 each leg', equipment: ['Box/chair'] },

  // ══════════════════════════════════════════════════════════
  // MANUAL THERAPY — Spinal Mobilisations
  // ══════════════════════════════════════════════════════════
  { id: 'mt_pa_cervical', name: 'Central PA Mobilisation — Cervical', category: 'manual', bodyParts: ['cervical'], baseSets: 3, baseReps: '30 oscillations', baseHold: 30, equipment: [], targetStructure: 'cervical spinous process', mobilisationGrade: 'Grade III' },
  { id: 'mt_pa_thoracic', name: 'Central PA Mobilisation — Thoracic', category: 'manual', bodyParts: ['thoracic'], baseSets: 3, baseReps: '30 oscillations', baseHold: 30, equipment: [], targetStructure: 'thoracic spinous process', mobilisationGrade: 'Grade III' },
  { id: 'mt_pa_lumbar', name: 'Central PA Mobilisation — Lumbar', category: 'manual', bodyParts: ['lumbar'], baseSets: 3, baseReps: '30 oscillations', baseHold: 30, equipment: [], targetStructure: 'lumbar spinous process', mobilisationGrade: 'Grade III' },
  { id: 'mt_upa_cervical', name: 'Unilateral PA Mobilisation — Cervical', category: 'manual', bodyParts: ['cervical'], baseSets: 3, baseReps: '30 oscillations', baseHold: 30, equipment: [], targetStructure: 'cervical articular pillar', mobilisationGrade: 'Grade III' },
  { id: 'mt_upa_lumbar', name: 'Unilateral PA Mobilisation — Lumbar', category: 'manual', bodyParts: ['lumbar'], baseSets: 3, baseReps: '30 oscillations', baseHold: 30, equipment: [], targetStructure: 'lumbar transverse process', mobilisationGrade: 'Grade III' },
  { id: 'mt_lat_glide_cervical', name: 'Lateral Glide — Cervical', category: 'manual', bodyParts: ['cervical'], baseSets: 3, baseReps: '30 oscillations', baseHold: 30, equipment: [], targetStructure: 'cervical segment', mobilisationGrade: 'Grade III' },
  { id: 'mt_lat_glide_lumbar', name: 'Lateral Glide — Lumbar', category: 'manual', bodyParts: ['lumbar'], baseSets: 3, baseReps: '30 oscillations', baseHold: 30, equipment: [], targetStructure: 'lumbar spinous process', mobilisationGrade: 'Grade III' },
  { id: 'mt_rotation_mob_thoracic', name: 'Rotation Mobilisation — Thoracic', category: 'manual', bodyParts: ['thoracic'], baseSets: 3, baseReps: '30 oscillations', baseHold: 30, equipment: [], targetStructure: 'thoracic segment', mobilisationGrade: 'Grade III-IV' },
  { id: 'mt_snags_cervical', name: 'Mulligan SNAG — Cervical', category: 'manual', bodyParts: ['cervical'], baseSets: 3, baseReps: '6-10', equipment: [], targetStructure: 'cervical facet', mobilisationGrade: 'Sustained' },
  { id: 'mt_snags_lumbar', name: 'Mulligan SNAG — Lumbar', category: 'manual', bodyParts: ['lumbar'], baseSets: 3, baseReps: '6-10', equipment: [], targetStructure: 'lumbar facet', mobilisationGrade: 'Sustained' },
  { id: 'mt_nags_cervical', name: 'Mulligan NAG — Cervical', category: 'manual', bodyParts: ['cervical'], baseSets: 3, baseReps: '6-10', equipment: [], targetStructure: 'cervical apophyseal joint', mobilisationGrade: 'Sustained' },

  // ── MANUAL — Peripheral Joint Mobilisations ──
  { id: 'mt_ap_glide_shoulder', name: 'AP Glide — Glenohumeral', category: 'manual', bodyParts: ['shoulder'], baseSets: 3, baseReps: '30 oscillations', baseHold: 30, equipment: [], targetStructure: 'glenohumeral joint', mobilisationGrade: 'Grade III' },
  { id: 'mt_inf_glide_shoulder', name: 'Inferior Glide — Glenohumeral', category: 'manual', bodyParts: ['shoulder'], baseSets: 3, baseReps: '30 oscillations', baseHold: 30, equipment: [], targetStructure: 'glenohumeral joint', mobilisationGrade: 'Grade III' },
  { id: 'mt_post_glide_shoulder', name: 'Posterior Glide — Glenohumeral', category: 'manual', bodyParts: ['shoulder'], baseSets: 3, baseReps: '30 oscillations', baseHold: 30, equipment: [], targetStructure: 'glenohumeral joint', mobilisationGrade: 'Grade III' },
  { id: 'mt_mwm_shoulder', name: 'Mulligan MWM — Shoulder Flexion/Abduction', category: 'manual', bodyParts: ['shoulder'], baseSets: 3, baseReps: '6-10', equipment: ['Belt'], targetStructure: 'glenohumeral joint', mobilisationGrade: 'Sustained' },
  { id: 'mt_ap_glide_hip', name: 'AP Glide — Hip', category: 'manual', bodyParts: ['hip'], baseSets: 3, baseReps: '30 oscillations', baseHold: 30, equipment: ['Belt'], targetStructure: 'hip joint', mobilisationGrade: 'Grade III' },
  { id: 'mt_lat_glide_hip', name: 'Lateral Distraction — Hip', category: 'manual', bodyParts: ['hip'], baseSets: 3, baseReps: '30 oscillations', baseHold: 30, equipment: ['Belt'], targetStructure: 'hip joint', mobilisationGrade: 'Grade III' },
  { id: 'mt_pa_glide_knee', name: 'PA Glide — Tibiofemoral', category: 'manual', bodyParts: ['knee'], baseSets: 3, baseReps: '30 oscillations', baseHold: 30, equipment: [], targetStructure: 'tibiofemoral joint', mobilisationGrade: 'Grade III' },
  { id: 'mt_patella_mob', name: 'Patellar Mobilisation (Multi-directional)', category: 'manual', bodyParts: ['knee'], baseSets: 3, baseReps: '30 oscillations', baseHold: 30, equipment: [], targetStructure: 'patellofemoral joint', mobilisationGrade: 'Grade III' },
  { id: 'mt_ap_glide_ankle', name: 'AP Talocrural Glide — Ankle', category: 'manual', bodyParts: ['ankle'], baseSets: 3, baseReps: '30 oscillations', baseHold: 30, equipment: [], targetStructure: 'talocrural joint', mobilisationGrade: 'Grade III' },
  { id: 'mt_mwm_ankle', name: 'Mulligan MWM — Ankle Dorsiflexion', category: 'manual', bodyParts: ['ankle'], baseSets: 3, baseReps: '6-10', equipment: ['Belt'], targetStructure: 'talocrural joint', mobilisationGrade: 'Sustained' },
  { id: 'mt_subtalar_mob', name: 'Subtalar Joint Mobilisation', category: 'manual', bodyParts: ['ankle'], baseSets: 3, baseReps: '30 oscillations', baseHold: 30, equipment: [], targetStructure: 'subtalar joint', mobilisationGrade: 'Grade III' },
  { id: 'mt_mwm_elbow', name: 'Mulligan MWM — Lateral Glide Elbow', category: 'manual', bodyParts: ['elbow'], baseSets: 3, baseReps: '6-10', equipment: ['Belt'], targetStructure: 'humeroradial joint', mobilisationGrade: 'Sustained' },

  // ── MANUAL — Soft Tissue ──
  { id: 'mt_str_upper_trap', name: 'Soft Tissue Release — Upper Trapezius', category: 'manual', bodyParts: ['cervical', 'shoulder'], baseSets: 3, baseReps: '60s', baseHold: 60, equipment: [], targetStructure: 'upper trapezius' },
  { id: 'mt_str_suboccipital', name: 'Suboccipital Release', category: 'manual', bodyParts: ['cervical'], baseSets: 3, baseReps: '90s', baseHold: 90, equipment: [], targetStructure: 'suboccipital muscles' },
  { id: 'mt_str_piriformis', name: 'Soft Tissue Release — Piriformis', category: 'manual', bodyParts: ['hip'], baseSets: 3, baseReps: '60s', baseHold: 60, equipment: [], targetStructure: 'piriformis' },
  { id: 'mt_str_psoas', name: 'Soft Tissue Release — Psoas', category: 'manual', bodyParts: ['hip', 'lumbar'], baseSets: 3, baseReps: '60s', baseHold: 60, equipment: [], targetStructure: 'psoas major' },
  { id: 'mt_str_tfl_itb', name: 'Soft Tissue Release — TFL/ITB', category: 'manual', bodyParts: ['hip', 'knee'], baseSets: 3, baseReps: '90s', baseHold: 90, equipment: ['Foam roller'], targetStructure: 'tensor fasciae latae / ITB' },
  { id: 'mt_str_gastroc', name: 'Soft Tissue Release — Gastrocnemius', category: 'manual', bodyParts: ['ankle'], baseSets: 3, baseReps: '60s', baseHold: 60, equipment: [], targetStructure: 'gastrocnemius' },
  { id: 'mt_str_pec_minor', name: 'Soft Tissue Release — Pectoralis Minor', category: 'manual', bodyParts: ['shoulder', 'thoracic'], baseSets: 3, baseReps: '60s', baseHold: 60, equipment: [], targetStructure: 'pectoralis minor' },
  { id: 'mt_str_scm', name: 'Soft Tissue Release — SCM', category: 'manual', bodyParts: ['cervical', 'neck'], baseSets: 3, baseReps: '60s', baseHold: 60, equipment: [], targetStructure: 'sternocleidomastoid' },
  { id: 'mt_trigger_point', name: 'Trigger Point Release (Ischemic Compression)', category: 'manual', bodyParts: ['cervical', 'shoulder', 'lumbar', 'hip'], baseSets: 3, baseReps: '60-90s per point', baseHold: 90, equipment: [], targetStructure: 'myofascial trigger point' },
  { id: 'mt_dry_needling', name: 'Dry Needling — Trigger Point', category: 'manual', bodyParts: ['cervical', 'shoulder', 'lumbar', 'hip', 'knee'], baseSets: 1, baseReps: '3-5 per point', equipment: ['Acupuncture needles'], targetStructure: 'myofascial trigger point' },
  { id: 'mt_str_thoracolumbar', name: 'Soft Tissue Release — Thoracolumbar Fascia', category: 'manual', bodyParts: ['lumbar', 'thoracic'], baseSets: 3, baseReps: '60s', baseHold: 60, equipment: [], targetStructure: 'thoracolumbar fascia' },
  { id: 'mt_str_quadratus', name: 'Soft Tissue Release — Quadratus Lumborum', category: 'manual', bodyParts: ['lumbar'], baseSets: 3, baseReps: '60s', baseHold: 60, equipment: [], targetStructure: 'quadratus lumborum' },

  // ── MANUAL — Neural Mobilisation ──
  { id: 'mt_ulnar_slider', name: 'Ulnar Nerve Slider', category: 'neuromuscular', bodyParts: ['cervical', 'shoulder', 'elbow', 'wrist'], baseSets: 3, baseReps: '10-15', equipment: [] },
  { id: 'mt_radial_slider', name: 'Radial Nerve Slider', category: 'neuromuscular', bodyParts: ['cervical', 'shoulder', 'elbow'], baseSets: 3, baseReps: '10-15', equipment: [] },
  { id: 'mt_femoral_slider', name: 'Femoral Nerve Slider', category: 'neuromuscular', bodyParts: ['lumbar', 'hip', 'knee'], baseSets: 3, baseReps: '10-15', equipment: [] },
  { id: 'mt_slump_mob', name: 'Slump Mobilisation', category: 'neuromuscular', bodyParts: ['lumbar', 'hip', 'knee'], baseSets: 3, baseReps: '10-15', equipment: [] },

  // ══════════════════════════════════════════════════════════
  // SLING-SPECIFIC EXERCISES
  // ══════════════════════════════════════════════════════════

  // ── Posterior Oblique Sling (lat dorsi → thoracolumbar fascia → contralateral glute max) ──
  { id: 'sl_pos_bird_dog', name: 'Contralateral Bird Dog', category: 'stabilization', bodyParts: ['lumbar', 'core', 'hip', 'shoulder'], baseSets: 3, baseReps: '10 each side', baseHold: 5, equipment: [], targetSling: 'posterior_oblique' },
  { id: 'sl_pos_cable_chop', name: 'Half-Kneeling Cable Wood Chop (High-to-Low)', category: 'functional', bodyParts: ['lumbar', 'core', 'hip', 'shoulder'], baseSets: 3, baseReps: '10-12 each side', equipment: ['Cable/Resistance band'], targetSling: 'posterior_oblique' },
  { id: 'sl_pos_single_arm_row', name: 'Single-Arm Bent-Over Row', category: 'strengthening', bodyParts: ['shoulder', 'lumbar', 'hip'], baseSets: 3, baseReps: '10-12 each side', equipment: ['Dumbbell'], targetSling: 'posterior_oblique' },
  { id: 'sl_pos_contralat_step_up', name: 'Contralateral Loaded Step-Up', category: 'functional', bodyParts: ['hip', 'knee', 'lumbar'], baseSets: 3, baseReps: '8-10 each side', equipment: ['Dumbbell', 'Step/box'], targetSling: 'posterior_oblique' },
  { id: 'sl_pos_hip_ext_row', name: 'Standing Hip Extension with Contralateral Row', category: 'functional', bodyParts: ['hip', 'shoulder', 'lumbar'], baseSets: 3, baseReps: '8-10 each side', equipment: ['Cable/Resistance band'], targetSling: 'posterior_oblique' },

  // ── Anterior Oblique Sling (external oblique → contralateral internal oblique → contralateral adductors) ──
  { id: 'sl_ant_pallof_rot', name: 'Pallof Press with Rotation', category: 'stabilization', bodyParts: ['lumbar', 'core', 'hip'], baseSets: 3, baseReps: '10-12 each side', equipment: ['Resistance band'], targetSling: 'anterior_oblique' },
  { id: 'sl_ant_cable_lift', name: 'Half-Kneeling Cable Lift (Low-to-High)', category: 'functional', bodyParts: ['lumbar', 'core', 'hip', 'shoulder'], baseSets: 3, baseReps: '10-12 each side', equipment: ['Cable/Resistance band'], targetSling: 'anterior_oblique' },
  { id: 'sl_ant_copenhagen_plank', name: 'Copenhagen Plank (with Rotation)', category: 'stabilization', bodyParts: ['hip', 'core'], baseSets: 3, baseReps: '8-10 each side', equipment: ['Bench'], targetSling: 'anterior_oblique' },
  { id: 'sl_ant_lunge_press', name: 'Forward Lunge with Contralateral Press', category: 'functional', bodyParts: ['hip', 'knee', 'shoulder', 'core'], baseSets: 3, baseReps: '8-10 each side', equipment: ['Dumbbell'], targetSling: 'anterior_oblique' },

  // ── Lateral Sling (glute med → TFL → contralateral adductors → ipsilateral QL) ──
  { id: 'sl_lat_side_plank_abd', name: 'Side Plank with Hip Abduction', category: 'stabilization', bodyParts: ['hip', 'core', 'lumbar'], baseSets: 3, baseReps: '8-10 each side', baseHold: 3, equipment: [], targetSling: 'lateral' },
  { id: 'sl_lat_single_leg_stance', name: 'Single-Leg Stance with Pelvic Drop Control', category: 'functional', bodyParts: ['hip', 'ankle'], baseSets: 3, baseReps: '10 each side', baseHold: 10, equipment: [], targetSling: 'lateral' },
  { id: 'sl_lat_band_sidestep', name: 'Lateral Band Side-Stepping', category: 'strengthening', bodyParts: ['hip'], baseSets: 3, baseReps: '15 steps each direction', equipment: ['Resistance band'], targetSling: 'lateral' },
  { id: 'sl_lat_curtsy_lunge', name: 'Curtsy Lunge', category: 'functional', bodyParts: ['hip', 'knee'], baseSets: 3, baseReps: '10 each side', equipment: [], targetSling: 'lateral' },
  { id: 'sl_lat_lateral_step_down', name: 'Lateral Step Down', category: 'functional', bodyParts: ['hip', 'knee'], baseSets: 3, baseReps: '8-10 each side', equipment: ['Step/box'], targetSling: 'lateral' },

  // ── Deep Longitudinal Sling (erector spinae → sacrotuberous lig → biceps femoris → peroneus longus → tibialis anterior) ──
  { id: 'sl_deep_single_rdl', name: 'Single-Leg Romanian Deadlift', category: 'functional', bodyParts: ['hip', 'knee', 'ankle', 'lumbar'], baseSets: 3, baseReps: '8-10 each leg', equipment: ['Dumbbell'], targetSling: 'deep_longitudinal' },
  { id: 'sl_deep_prone_hip_ext', name: 'Prone Hip Extension with Knee Bent', category: 'strengthening', bodyParts: ['hip', 'lumbar'], baseSets: 3, baseReps: '12-15 each side', equipment: [], targetSling: 'deep_longitudinal' },
  { id: 'sl_deep_bridge_march', name: 'Glute Bridge March', category: 'stabilization', bodyParts: ['hip', 'lumbar', 'core'], baseSets: 3, baseReps: '10 each side', equipment: [], targetSling: 'deep_longitudinal' },
  { id: 'sl_deep_deadlift', name: 'Conventional Deadlift', category: 'strengthening', bodyParts: ['hip', 'lumbar', 'knee'], baseSets: 3, baseReps: '8-10', equipment: ['Barbell'], targetSling: 'deep_longitudinal' },

  // ── Scapular / Shoulder Sling (serratus anterior → rhomboids → lower trap → rotator cuff) ──
  { id: 'sl_scap_push_up_plus', name: 'Push-Up Plus (Scapular Protraction)', category: 'strengthening', bodyParts: ['shoulder', 'thoracic'], baseSets: 3, baseReps: '10-12', equipment: [], targetSling: 'scapular_shoulder' },
  { id: 'sl_scap_wall_slide_foam', name: 'Wall Slide with Foam Roller', category: 'strengthening', bodyParts: ['shoulder', 'thoracic'], baseSets: 3, baseReps: '10-12', equipment: ['Foam roller'], targetSling: 'scapular_shoulder' },
  { id: 'sl_scap_prone_w', name: 'Prone W-Raises', category: 'strengthening', bodyParts: ['shoulder', 'thoracic'], baseSets: 3, baseReps: '10-12', equipment: [], targetSling: 'scapular_shoulder' },
  { id: 'sl_scap_band_pull_apart', name: 'Band Pull-Apart', category: 'strengthening', bodyParts: ['shoulder', 'thoracic'], baseSets: 3, baseReps: '15-20', equipment: ['Resistance band'], targetSling: 'scapular_shoulder' },
  { id: 'sl_scap_ys_on_ball', name: 'Y\'s and T\'s on Swiss Ball', category: 'strengthening', bodyParts: ['shoulder', 'thoracic'], baseSets: 3, baseReps: '10-12', equipment: ['Swiss ball'], targetSling: 'scapular_shoulder' },
];

export function findExercisesByBodyPart(bodyPart: string): CatalogExercise[] {
  const lower = bodyPart.toLowerCase();
  return EXERCISE_CATALOG.filter(ex =>
    ex.bodyParts.some(bp => bp.includes(lower) || lower.includes(bp))
  );
}

export function findExerciseById(id: string): CatalogExercise | undefined {
  return EXERCISE_CATALOG.find(ex => ex.id === id);
}

export function findExercisesBySling(sling: SlingId): CatalogExercise[] {
  return EXERCISE_CATALOG.filter(ex => ex.targetSling === sling);
}

export function findManualTherapyByBodyPart(bodyPart: string): CatalogExercise[] {
  const lower = bodyPart.toLowerCase();
  return EXERCISE_CATALOG.filter(ex =>
    ex.category === 'manual' &&
    ex.bodyParts.some(bp => bp.includes(lower) || lower.includes(bp))
  );
}

export const INTERVENTION_EXERCISE_MAP: Record<string, string[]> = {
  isometric_loading: ['custom_isometric_shoulder_er', 'kn001', 'hp011', 'nk_iso_ext', 'nk_iso_lat'],
  eccentric_programme: ['custom_eccentric_heel_drop', 'ew_eccentric_wrist_ext', 'ew_eccentric_wrist_flex', 'kn024'],
  progressive_strengthening: ['kn009', 'hp011', 'hp012', 'hp019', 'an005', 'kn_step_ups', 'hp_copenhagen', 'sh_full_can'],
  motor_control_retraining: ['cb001', 'cb002', 'nk008', 'cb006', 'cb_mcgill_curl', 'cb_stir_pot'],
  stretching_programme: ['custom_hip_flexor_stretch', 'sh043', 'sh046', 'kn_hamstring_stretch', 'hp_piriformis_stretch', 'an_gastroc_stretch', 'an_soleus_stretch', 'kn_quad_stretch', 'hp_adductor_stretch', 'nk_levator_stretch', 'cb_child_pose'],
  graded_exposure: ['cb021', 'kn009', 'custom_single_leg_balance', 'fn_lunge_walk', 'kn_step_ups'],
  proprioceptive_training: ['custom_single_leg_balance', 'hp015', 'hp019', 'an_baps_board', 'sl_lat_single_leg_stance'],
  neural_mobilisation: ['custom_neural_slider_median', 'custom_neural_slider_sciatic', 'mt_ulnar_slider', 'mt_radial_slider', 'mt_femoral_slider', 'mt_slump_mob'],
  joint_mobilisation: ['mt_pa_cervical', 'mt_pa_thoracic', 'mt_pa_lumbar', 'mt_upa_cervical', 'mt_upa_lumbar', 'mt_lat_glide_cervical', 'mt_lat_glide_lumbar', 'mt_rotation_mob_thoracic', 'mt_snags_cervical', 'mt_snags_lumbar', 'mt_ap_glide_shoulder', 'mt_inf_glide_shoulder', 'mt_post_glide_shoulder', 'mt_mwm_shoulder', 'mt_ap_glide_hip', 'mt_lat_glide_hip', 'mt_pa_glide_knee', 'mt_patella_mob', 'mt_ap_glide_ankle', 'mt_mwm_ankle', 'mt_subtalar_mob', 'mt_mwm_elbow'],
  soft_tissue_mobilisation: ['mt_str_upper_trap', 'mt_str_suboccipital', 'mt_str_piriformis', 'mt_str_psoas', 'mt_str_tfl_itb', 'mt_str_gastroc', 'mt_str_pec_minor', 'mt_str_scm', 'mt_trigger_point', 'mt_str_thoracolumbar', 'mt_str_quadratus'],
  sling_rehabilitation: ['sl_pos_bird_dog', 'sl_pos_cable_chop', 'sl_pos_single_arm_row', 'sl_ant_pallof_rot', 'sl_ant_cable_lift', 'sl_ant_copenhagen_plank', 'sl_lat_side_plank_abd', 'sl_lat_band_sidestep', 'sl_lat_single_leg_stance', 'sl_deep_single_rdl', 'sl_deep_bridge_march', 'sl_scap_push_up_plus', 'sl_scap_band_pull_apart'],
  thoracic_mobility: ['th_open_book', 'th_thread_needle', 'th_cat_rotation', 'th_foam_ext', 'cb021'],
  functional_training: ['fn_single_leg_rdl', 'fn_farmers_walk', 'fn_lunge_walk', 'fn_single_leg_squat', 'cb_suitcase_carry'],
};

export const SLING_EXERCISE_MAP: Record<SlingId, string[]> = {
  posterior_oblique: ['sl_pos_bird_dog', 'sl_pos_cable_chop', 'sl_pos_single_arm_row', 'sl_pos_contralat_step_up', 'sl_pos_hip_ext_row'],
  anterior_oblique: ['sl_ant_pallof_rot', 'sl_ant_cable_lift', 'sl_ant_copenhagen_plank', 'sl_ant_lunge_press'],
  lateral: ['sl_lat_side_plank_abd', 'sl_lat_single_leg_stance', 'sl_lat_band_sidestep', 'sl_lat_curtsy_lunge', 'sl_lat_lateral_step_down'],
  deep_longitudinal: ['sl_deep_single_rdl', 'sl_deep_prone_hip_ext', 'sl_deep_bridge_march', 'sl_deep_deadlift'],
  scapular_shoulder: ['sl_scap_push_up_plus', 'sl_scap_wall_slide_foam', 'sl_scap_prone_w', 'sl_scap_band_pull_apart', 'sl_scap_ys_on_ball'],
};

export const SLING_LABELS: Record<SlingId, string> = {
  posterior_oblique: 'Posterior Oblique Sling',
  anterior_oblique: 'Anterior Oblique Sling',
  lateral: 'Lateral Sling',
  deep_longitudinal: 'Deep Longitudinal Sling',
  scapular_shoulder: 'Scapular/Shoulder Sling',
};
