export interface ChainLink {
  jointId: string;
  label: string;
  region: string;
  role: 'primary' | 'secondary';
  muscles: string[];
  forceContribution: string;
}

export interface KineticChainDefinition {
  id: string;
  label: string;
  category: 'myofascial' | 'biomechanical' | 'functional';
  color: string;
  description: string;
  clinicalRelevance: string;
  links: ChainLink[];
  commonDysfunctions: string[];
  assessmentTests: string[];
}

export const KINETIC_CHAINS: KineticChainDefinition[] = [
  // 1. Posterior Chain (Superficial Back Line - Thomas Myers)
  {
    id: 'posterior_chain',
    label: 'Posterior Chain',
    category: 'myofascial',
    color: '#3b82f6',
    description: 'The superficial back line runs from the plantar fascia over the calcaneus, up the gastrocnemius/soleus, hamstrings, sacrotuberous ligament, erector spinae, to the galea aponeurotica. It maintains upright posture and prevents forward flexion collapse.',
    clinicalRelevance: 'Dysfunction in any link can propagate. Tight hamstrings can cause posterior pelvic tilt and lumbar flexion. Forward head posture often starts from tight calves limiting ankle dorsiflexion, forcing knee hyperextension and anterior weight shift.',
    links: [
      { jointId: 'plantar_fascia', label: 'Plantar Fascia', region: 'foot', role: 'primary', muscles: ['Plantar aponeurosis', 'Short toe flexors'], forceContribution: 'Ground reaction force transmission' },
      { jointId: 'calcaneus', label: 'Calcaneal Attachment', region: 'ankle', role: 'primary', muscles: ['Achilles tendon insertion'], forceContribution: 'Posterior tension line origin' },
      { jointId: 'gastrocnemius', label: 'Gastrocnemius/Soleus', region: 'calf', role: 'primary', muscles: ['Gastrocnemius', 'Soleus'], forceContribution: 'Ankle plantarflexion force, knee flexion moment' },
      { jointId: 'knee_posterior', label: 'Posterior Knee', region: 'knee', role: 'primary', muscles: ['Popliteus', 'Posterior capsule'], forceContribution: 'Knee extension control' },
      { jointId: 'hamstrings', label: 'Hamstrings', region: 'thigh', role: 'primary', muscles: ['Biceps femoris', 'Semimembranosus', 'Semitendinosus'], forceContribution: 'Hip extension and knee flexion torque' },
      { jointId: 'sacrotuberous', label: 'Sacrotuberous Ligament', region: 'pelvis', role: 'secondary', muscles: ['Sacrotuberous ligament'], forceContribution: 'Pelvic-sacral force transfer' },
      { jointId: 'erector_spinae', label: 'Erector Spinae', region: 'spine', role: 'primary', muscles: ['Iliocostalis', 'Longissimus', 'Spinalis'], forceContribution: 'Spinal extension and anti-flexion force' },
      { jointId: 'suboccipitals', label: 'Suboccipital Muscles', region: 'cervical', role: 'primary', muscles: ['Rectus capitis posterior', 'Obliquus capitis'], forceContribution: 'Cranial extension and head positioning' },
      { jointId: 'galea', label: 'Galea Aponeurotica', region: 'head', role: 'secondary', muscles: ['Epicranial aponeurosis'], forceContribution: 'Terminal fascial anchor' },
    ],
    commonDysfunctions: [
      'Plantarflexor tightness limiting ankle dorsiflexion → compensatory knee hyperextension',
      'Hamstring shortening → posterior pelvic tilt → flattened lumbar lordosis',
      'Erector spinae hypertonicity → increased lumbar extension → facet compression',
      'Forward head posture from suboccipital shortening → upper cervical compression',
      'Sacrotuberous ligament tension → SI joint dysfunction',
    ],
    assessmentTests: ['Sit-and-reach test', 'Toe touch assessment', 'Schober test', 'Active straight leg raise', 'Ankle dorsiflexion lunge test'],
  },

  // 2. Anterior Chain (Superficial Front Line)
  {
    id: 'anterior_chain',
    label: 'Anterior Chain',
    category: 'myofascial',
    color: '#ef4444',
    description: 'The superficial front line runs from the dorsum of the toes, up the anterior tibialis, quadriceps, rectus abdominis, sternalis/sternochondral fascia, to the SCM and scalp fascia. It balances the posterior chain and controls extension.',
    clinicalRelevance: 'Shortening of the anterior chain causes anterior pelvic tilt (hip flexor dominance), rib flare, and forward head posture. Common in desk workers. Lengthened anterior chain seen in extension-based postures.',
    links: [
      { jointId: 'toe_extensors', label: 'Toe Extensors/Anterior Compartment', region: 'foot', role: 'primary', muscles: ['Extensor digitorum longus', 'Extensor hallucis longus'], forceContribution: 'Anterior ankle stability' },
      { jointId: 'tibialis_anterior', label: 'Tibialis Anterior', region: 'shin', role: 'primary', muscles: ['Tibialis anterior'], forceContribution: 'Dorsiflexion control and eccentric braking' },
      { jointId: 'quadriceps', label: 'Quadriceps', region: 'thigh', role: 'primary', muscles: ['Rectus femoris', 'Vastus lateralis', 'Vastus medialis', 'Vastus intermedius'], forceContribution: 'Knee extension force, hip flexion (rectus femoris)' },
      { jointId: 'hip_flexors', label: 'Hip Flexors', region: 'hip', role: 'primary', muscles: ['Iliopsoas', 'Tensor fasciae latae', 'Sartorius'], forceContribution: 'Hip flexion torque, anterior pelvic tilt force' },
      { jointId: 'rectus_abdominis', label: 'Rectus Abdominis', region: 'abdomen', role: 'primary', muscles: ['Rectus abdominis'], forceContribution: 'Trunk flexion, rib depression' },
      { jointId: 'sternochondral', label: 'Sternochondral Fascia', region: 'chest', role: 'secondary', muscles: ['Sternal fascia', 'Pectoralis major sternal head'], forceContribution: 'Anterior thoracic tension' },
      { jointId: 'scm', label: 'Sternocleidomastoid', region: 'neck', role: 'primary', muscles: ['Sternocleidomastoid', 'Scalenes'], forceContribution: 'Cervical flexion, forward head positioning' },
    ],
    commonDysfunctions: [
      'Hip flexor shortening → anterior pelvic tilt → increased lumbar lordosis',
      'Rectus femoris tightness → patellofemoral compression during knee flexion',
      'SCM overactivity → forward head posture → upper cervical extension',
      'Tibialis anterior weakness → foot slap gait, ankle instability',
      'Abdominal weakness → poor trunk stability → increased spinal loading',
    ],
    assessmentTests: ['Thomas test', 'Modified Thomas test', 'Ely test', 'Active knee extension test', 'Chin tuck assessment'],
  },

  // 3. Lateral Chain (Lateral Line)
  {
    id: 'lateral_chain',
    label: 'Lateral Chain',
    category: 'myofascial',
    color: '#eab308',
    description: 'The lateral line runs from the peroneal muscles, up the IT band and TFL, lateral abdominals (obliques), intercostals, to the SCM and splenii. It provides lateral stability and mediates side-bending and rotation.',
    clinicalRelevance: 'Lateral chain dysfunction manifests as lateral pelvic tilt, Trendelenburg gait, scoliotic patterns, and compensatory trunk lean. IT band syndrome and lateral hip pain often involve this chain.',
    links: [
      { jointId: 'peroneals', label: 'Peroneal Muscles', region: 'lateral_ankle', role: 'primary', muscles: ['Peroneus longus', 'Peroneus brevis'], forceContribution: 'Ankle eversion control, lateral stability' },
      { jointId: 'it_band', label: 'Iliotibial Band', region: 'lateral_thigh', role: 'primary', muscles: ['IT band', 'Vastus lateralis (partial)'], forceContribution: 'Lateral knee stability, lateral tension transmission' },
      { jointId: 'tfl_glut_med', label: 'TFL / Gluteus Medius', region: 'lateral_hip', role: 'primary', muscles: ['Tensor fasciae latae', 'Gluteus medius', 'Gluteus minimus'], forceContribution: 'Pelvic stability in single-leg stance, hip abduction' },
      { jointId: 'lateral_abdominals', label: 'Lateral Abdominals', region: 'lateral_trunk', role: 'primary', muscles: ['External oblique', 'Internal oblique', 'Quadratus lumborum'], forceContribution: 'Lateral trunk stability, anti-lateral flexion' },
      { jointId: 'intercostals', label: 'Intercostals', region: 'thorax', role: 'secondary', muscles: ['External intercostals', 'Internal intercostals'], forceContribution: 'Rib cage lateral stability' },
      { jointId: 'lateral_neck', label: 'Lateral Neck', region: 'cervical', role: 'primary', muscles: ['Scalenes', 'SCM (lateral component)', 'Splenius capitis'], forceContribution: 'Lateral cervical stability and head positioning' },
    ],
    commonDysfunctions: [
      'Gluteus medius weakness → Trendelenburg sign → pelvic drop on swing phase',
      'IT band tightness → lateral knee pain, patellofemoral tracking issues',
      'Quadratus lumborum hypertonicity → functional leg length discrepancy',
      'Peroneal weakness → lateral ankle instability → recurrent sprains',
      'Scoliotic compensation → asymmetric lateral chain loading',
    ],
    assessmentTests: ['Trendelenburg test', 'Ober test (IT band)', 'Side-lying hip abduction strength', 'Single leg stance balance', 'Lateral trunk endurance (side plank)'],
  },

  // 4. Spiral Chain (Spiral Line)
  {
    id: 'spiral_chain',
    label: 'Spiral/Oblique Chain',
    category: 'myofascial',
    color: '#8b5cf6',
    description: 'The spiral line wraps around the body in a double helix pattern: splenius capitis → contralateral rhomboids → serratus anterior → external oblique → contralateral internal oblique → TFL/IT band → tibialis anterior → peroneus longus → biceps femoris → sacrotuberous ligament → back to erector spinae. It creates and mediates rotational movements.',
    clinicalRelevance: 'Critical for gait, throwing, and any rotational sport. Dysfunction causes compensatory rotation patterns, asymmetric trunk rotation, and rotational instabilities. Often involved in complex multi-joint problems.',
    links: [
      { jointId: 'splenius', label: 'Splenius Capitis/Cervicis', region: 'posterior_neck', role: 'primary', muscles: ['Splenius capitis', 'Splenius cervicis'], forceContribution: 'Cervical rotation and extension' },
      { jointId: 'rhomboids_contra', label: 'Contralateral Rhomboids', region: 'scapular', role: 'primary', muscles: ['Rhomboid major', 'Rhomboid minor'], forceContribution: 'Scapular retraction, rotational anchor' },
      { jointId: 'serratus_anterior', label: 'Serratus Anterior', region: 'lateral_thorax', role: 'primary', muscles: ['Serratus anterior'], forceContribution: 'Scapular protraction, rotational force transfer' },
      { jointId: 'external_oblique', label: 'External Oblique', region: 'anterolateral_trunk', role: 'primary', muscles: ['External oblique'], forceContribution: 'Contralateral trunk rotation' },
      { jointId: 'internal_oblique_contra', label: 'Contralateral Internal Oblique', region: 'anterolateral_trunk', role: 'primary', muscles: ['Internal oblique (contralateral)'], forceContribution: 'Ipsilateral trunk rotation' },
      { jointId: 'tfl_it_band', label: 'TFL / IT Band', region: 'lateral_hip', role: 'primary', muscles: ['Tensor fasciae latae', 'IT band'], forceContribution: 'Lateral stability and rotational control' },
      { jointId: 'tibialis_ant', label: 'Tibialis Anterior', region: 'anterior_shin', role: 'primary', muscles: ['Tibialis anterior'], forceContribution: 'Foot supination, ankle dorsiflexion' },
      { jointId: 'peroneus_longus', label: 'Peroneus Longus', region: 'lateral_shin', role: 'primary', muscles: ['Peroneus longus'], forceContribution: 'Foot pronation, arch support' },
      { jointId: 'biceps_femoris', label: 'Biceps Femoris', region: 'posterior_thigh', role: 'primary', muscles: ['Biceps femoris (long head)'], forceContribution: 'External tibial rotation, knee flexion' },
    ],
    commonDysfunctions: [
      'Asymmetric trunk rotation → altered gait pattern and compensatory loading',
      'Serratus anterior weakness → scapular winging → impaired overhead function',
      'Oblique sling dysfunction → poor force transfer in throwing/kicking',
      'Excessive foot pronation → ascending rotational forces through knee and hip',
      'Tibialis anterior/peroneus longus imbalance → altered foot mechanics',
    ],
    assessmentTests: ['Trunk rotation assessment', 'Seated trunk rotation ROM', 'Single leg stance with rotation', 'Scapular winging assessment', 'Gait rotational analysis'],
  },

  // 5. Deep Longitudinal Chain (Deep Front Line)
  {
    id: 'deep_longitudinal',
    label: 'Deep Longitudinal Chain',
    category: 'myofascial',
    color: '#10b981',
    description: 'The deep front line runs from the tibialis posterior through the popliteus, adductors, pelvic floor, psoas/diaphragm, mediastinum, to the deep cervical flexors and hyoid. It provides core stability, breathing support, and deep postural control.',
    clinicalRelevance: 'The "core" of the myofascial system. Dysfunction here manifests as core instability, breathing pattern disorders, pelvic floor dysfunction, and deep postural collapse. Often the root cause of chronic pain presentations.',
    links: [
      { jointId: 'tibialis_post', label: 'Tibialis Posterior', region: 'deep_calf', role: 'primary', muscles: ['Tibialis posterior'], forceContribution: 'Foot arch support, inversion control' },
      { jointId: 'popliteus', label: 'Popliteus', region: 'posterior_knee', role: 'secondary', muscles: ['Popliteus'], forceContribution: 'Knee unlocking, rotational control' },
      { jointId: 'adductors', label: 'Adductor Group', region: 'medial_thigh', role: 'primary', muscles: ['Adductor longus', 'Adductor brevis', 'Adductor magnus', 'Gracilis'], forceContribution: 'Medial stability, hip adduction force' },
      { jointId: 'pelvic_floor', label: 'Pelvic Floor', region: 'pelvis', role: 'primary', muscles: ['Levator ani', 'Coccygeus'], forceContribution: 'Intra-abdominal pressure regulation, pelvic organ support' },
      { jointId: 'psoas_diaphragm', label: 'Psoas / Diaphragm', region: 'deep_core', role: 'primary', muscles: ['Psoas major', 'Diaphragm'], forceContribution: 'Deep spinal stabilization, breathing mechanics' },
      { jointId: 'transversus', label: 'Transversus Abdominis', region: 'deep_abdomen', role: 'primary', muscles: ['Transversus abdominis'], forceContribution: 'Intra-abdominal pressure, spinal stabilization' },
      { jointId: 'multifidus', label: 'Multifidus', region: 'deep_spine', role: 'primary', muscles: ['Multifidus'], forceContribution: 'Segmental spinal stability' },
      { jointId: 'deep_neck_flex', label: 'Deep Cervical Flexors', region: 'deep_neck', role: 'primary', muscles: ['Longus colli', 'Longus capitis'], forceContribution: 'Cervical segmental stability, chin tuck' },
    ],
    commonDysfunctions: [
      'Diaphragm-psoas dysfunction → breathing pattern disorder → increased accessory muscle use',
      'Pelvic floor weakness → core instability → increased spinal loading',
      'Multifidus atrophy → segmental instability → recurrent low back pain',
      'Deep neck flexor weakness → forward head posture → upper cervical compression',
      'Tibialis posterior dysfunction → flat foot → ascending chain dysfunction',
      'Transversus abdominis timing delay → poor anticipatory core activation',
    ],
    assessmentTests: ['Diaphragmatic breathing assessment', 'Transversus abdominis activation (draw-in)', 'Cranio-cervical flexion test', 'Navicular drop test', 'Single leg squat (deep stability)'],
  },

  // 6. Posterior Oblique Sling
  {
    id: 'posterior_oblique_sling',
    label: 'Posterior Oblique Sling',
    category: 'functional',
    color: '#f97316',
    description: 'Connects the latissimus dorsi on one side through the thoracolumbar fascia to the contralateral gluteus maximus. Essential for gait, running, and any contra-lateral limb movement pattern.',
    clinicalRelevance: 'Primary force transfer system during walking and running. Dysfunction causes poor force transfer between upper and lower body, reduced gait efficiency, and compensatory spinal rotation. Common in runners with low back pain.',
    links: [
      { jointId: 'lat_dorsi', label: 'Latissimus Dorsi', region: 'posterior_trunk', role: 'primary', muscles: ['Latissimus dorsi'], forceContribution: 'Shoulder extension, trunk rotation, force transfer to thoracolumbar fascia' },
      { jointId: 'thoracolumbar_fascia', label: 'Thoracolumbar Fascia', region: 'lumbar', role: 'primary', muscles: ['Thoracolumbar fascia'], forceContribution: 'Cross-body force transmission, spinal stabilization' },
      { jointId: 'contra_glut_max', label: 'Contralateral Gluteus Maximus', region: 'hip', role: 'primary', muscles: ['Gluteus maximus'], forceContribution: 'Hip extension, propulsion force' },
    ],
    commonDysfunctions: [
      'Gluteus maximus weakness → poor contralateral arm-leg force transfer during gait',
      'Thoracolumbar fascia dysfunction → reduced posterior tension → increased spinal flexion loading',
      'Latissimus dorsi tightness → restricted overhead mobility → compensatory lumbar extension',
    ],
    assessmentTests: ['Contralateral arm-leg raise (bird-dog)', 'Single leg bridge with contralateral arm reach', 'Gait analysis for arm swing symmetry'],
  },

  // 7. Anterior Oblique Sling
  {
    id: 'anterior_oblique_sling',
    label: 'Anterior Oblique Sling',
    category: 'functional',
    color: '#ec4899',
    description: 'Connects the external oblique on one side through the anterior abdominal fascia to the contralateral internal oblique and adductors. Critical for rotational sports, kicking, and trunk rotation during gait.',
    clinicalRelevance: 'Key system for rotational power generation and deceleration. Dysfunction causes groin pain, sports hernia/athletic pubalgia, and rotational instability. Common in soccer players and rotational athletes.',
    links: [
      { jointId: 'ext_oblique', label: 'External Oblique', region: 'anterolateral_trunk', role: 'primary', muscles: ['External oblique'], forceContribution: 'Contralateral rotation, trunk flexion' },
      { jointId: 'anterior_abd_fascia', label: 'Anterior Abdominal Fascia', region: 'anterior_trunk', role: 'secondary', muscles: ['Linea alba', 'Rectus sheath'], forceContribution: 'Midline force transmission' },
      { jointId: 'contra_int_oblique', label: 'Contralateral Internal Oblique', region: 'anterolateral_trunk', role: 'primary', muscles: ['Internal oblique'], forceContribution: 'Ipsilateral rotation' },
      { jointId: 'contra_adductors', label: 'Contralateral Adductors', region: 'medial_hip', role: 'primary', muscles: ['Adductor longus', 'Adductor brevis'], forceContribution: 'Hip adduction, pelvic stabilization during kicking' },
    ],
    commonDysfunctions: [
      'Adductor-oblique imbalance → sports hernia / athletic pubalgia',
      'Weak oblique sling → poor rotational deceleration → increased injury risk in cutting sports',
      'Adductor overload → groin strain, chronic groin pain',
    ],
    assessmentTests: ['Resisted trunk rotation test', 'Squeeze test (adductors)', 'Sit-up with rotation', 'Single leg stance with contralateral reach'],
  },

  // 8. Lateral Subsystem
  {
    id: 'lateral_subsystem',
    label: 'Lateral Subsystem',
    category: 'functional',
    color: '#06b6d4',
    description: 'Connects the gluteus medius/minimus, TFL/IT band, ipsilateral adductors, and contralateral quadratus lumborum. Provides frontal plane stability during single-leg stance phases of gait.',
    clinicalRelevance: 'Primary frontal plane stabilization system. Weakness causes Trendelenburg gait, lateral trunk lean, and excessive frontal plane motion at the knee (dynamic valgus). Critical for ACL injury prevention.',
    links: [
      { jointId: 'glut_med_min', label: 'Gluteus Medius/Minimus', region: 'lateral_hip', role: 'primary', muscles: ['Gluteus medius', 'Gluteus minimus'], forceContribution: 'Hip abduction, pelvic level maintenance' },
      { jointId: 'tfl_itb', label: 'TFL / IT Band', region: 'lateral_thigh', role: 'primary', muscles: ['Tensor fasciae latae', 'IT band'], forceContribution: 'Lateral thigh tension, knee lateral stability' },
      { jointId: 'ipsi_adductors', label: 'Ipsilateral Adductors', region: 'medial_thigh', role: 'primary', muscles: ['Adductor longus', 'Adductor magnus'], forceContribution: 'Counter-balance to abductors, medial stability' },
      { jointId: 'contra_ql', label: 'Contralateral Quadratus Lumborum', region: 'lateral_lumbar', role: 'primary', muscles: ['Quadratus lumborum'], forceContribution: 'Lateral trunk stability, pelvic hiking' },
    ],
    commonDysfunctions: [
      'Gluteus medius weakness → Trendelenburg gait → pelvic drop → knee valgus',
      'Adductor-abductor imbalance → groin pain or IT band overload',
      'Quadratus lumborum spasm → functional leg length discrepancy → asymmetric gait',
      'Dynamic knee valgus from lateral subsystem failure → ACL injury risk',
    ],
    assessmentTests: ['Trendelenburg test', 'Single leg squat (frontal plane)', 'Hip abduction strength testing', 'Single leg bridge with monitoring'],
  },

  // 9. Upper Extremity Functional Chain
  {
    id: 'upper_extremity_chain',
    label: 'Upper Extremity Chain',
    category: 'biomechanical',
    color: '#a855f7',
    description: 'The upper extremity kinetic chain connects the trunk core through scapulothoracic articulation, glenohumeral joint, elbow, wrist, and hand. Force generation for upper limb activities starts from the legs/trunk and transfers through this chain.',
    clinicalRelevance: 'Overhead athletes generate up to 70% of throwing force from the legs and trunk. Dysfunction at any link reduces performance and increases injury risk distally. Scapular dyskinesis is the most common chain disruption.',
    links: [
      { jointId: 'core_trunk', label: 'Core/Trunk', region: 'trunk', role: 'primary', muscles: ['Transversus abdominis', 'Obliques', 'Erector spinae'], forceContribution: 'Proximal stability for distal mobility' },
      { jointId: 'scapulothoracic', label: 'Scapulothoracic', region: 'scapular', role: 'primary', muscles: ['Serratus anterior', 'Trapezius', 'Rhomboids', 'Levator scapulae'], forceContribution: 'Scapular positioning, force transfer to arm' },
      { jointId: 'glenohumeral', label: 'Glenohumeral Joint', region: 'shoulder', role: 'primary', muscles: ['Rotator cuff', 'Deltoid', 'Pectoralis major'], forceContribution: 'Shoulder rotation and elevation force' },
      { jointId: 'elbow_forearm', label: 'Elbow/Forearm', region: 'elbow', role: 'primary', muscles: ['Biceps', 'Triceps', 'Pronator teres', 'Supinator'], forceContribution: 'Elbow flexion/extension, pronation/supination' },
      { jointId: 'wrist_hand', label: 'Wrist/Hand', region: 'wrist', role: 'primary', muscles: ['Wrist flexors', 'Wrist extensors', 'Intrinsic hand muscles'], forceContribution: 'Grip strength, fine motor control' },
    ],
    commonDysfunctions: [
      'Scapular dyskinesis → reduced subacromial space → rotator cuff impingement',
      'Weak serratus anterior → scapular winging → poor overhead force transfer',
      'Core weakness → reduced proximal stability → shoulder overload',
      'Medial epicondylalgia from poor proximal chain mechanics',
    ],
    assessmentTests: ['Scapular dyskinesis assessment', 'Closed kinetic chain upper extremity stability test', 'Y-balance test upper quarter', 'Wall push-up plus', 'Shoulder external rotation strength'],
  },

  // 10. Lower Extremity Functional Chain
  {
    id: 'lower_extremity_chain',
    label: 'Lower Extremity Chain',
    category: 'biomechanical',
    color: '#14b8a6',
    description: 'The lower extremity kinetic chain runs from foot/ankle through knee, hip, to pelvis/lumbar spine. It transmits ground reaction forces during weight-bearing activities and is critical for locomotion, jumping, and landing.',
    clinicalRelevance: 'Ground reaction forces during running reach 2-3x body weight and must be efficiently transmitted up the chain. Weak links cause compensatory strategies: ankle dorsiflexion restriction → knee valgus → hip internal rotation → contralateral pelvic drop → lumbar lateral flexion.',
    links: [
      { jointId: 'foot_ankle', label: 'Foot/Ankle Complex', region: 'foot', role: 'primary', muscles: ['Tibialis posterior', 'Peroneals', 'Intrinsic foot muscles', 'Gastrocnemius/Soleus'], forceContribution: 'Ground reaction force absorption, propulsion' },
      { jointId: 'knee_complex', label: 'Knee Complex', region: 'knee', role: 'primary', muscles: ['Quadriceps', 'Hamstrings', 'Popliteus'], forceContribution: 'Shock absorption, extension force, rotational control' },
      { jointId: 'hip_complex', label: 'Hip Complex', region: 'hip', role: 'primary', muscles: ['Gluteals', 'Hip flexors', 'Hip rotators', 'Adductors'], forceContribution: 'Multi-planar stability, propulsion, pelvic control' },
      { jointId: 'lumbopelvic', label: 'Lumbopelvic Region', region: 'pelvis_lumbar', role: 'primary', muscles: ['Core stabilizers', 'Hip flexors/extensors', 'Pelvic floor'], forceContribution: 'Force transfer between lower and upper body' },
    ],
    commonDysfunctions: [
      'Ankle dorsiflexion deficit → compensatory knee valgus → increased ACL risk',
      'Hip external rotation weakness → dynamic knee valgus during landing',
      'Gluteus maximus weakness → poor shock absorption → increased ground reaction force transmission to spine',
      'Femoral anteversion → increased internal rotation → patellofemoral maltracking',
    ],
    assessmentTests: ['Overhead deep squat', 'Single leg squat', 'Y-balance test', 'Star excursion balance test', 'Drop jump landing assessment'],
  },
];

export function getChainById(id: string): KineticChainDefinition | undefined {
  return KINETIC_CHAINS.find(c => c.id === id);
}

export function getChainsForRegion(region: string): KineticChainDefinition[] {
  return KINETIC_CHAINS.filter(chain => 
    chain.links.some(link => link.region.includes(region) || region.includes(link.region))
  );
}

export function getChainsForMuscle(muscleId: string): KineticChainDefinition[] {
  const lowerMuscle = muscleId.toLowerCase().replace(/^[lr]_/, '');
  return KINETIC_CHAINS.filter(chain =>
    chain.links.some(link => 
      link.muscles.some(m => m.toLowerCase().includes(lowerMuscle) || lowerMuscle.includes(m.toLowerCase().replace(/ /g, '_')))
    )
  );
}

export function getChainColors(): Record<string, string> {
  const colors: Record<string, string> = {};
  for (const chain of KINETIC_CHAINS) {
    colors[chain.id] = chain.color;
  }
  return colors;
}
