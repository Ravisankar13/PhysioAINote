import { AICaseStudy } from "./aiCaseStudyGenerator";

export const additionalKneeCases: Omit<AICaseStudy, 'id' | 'createdAt'>[] = [
  {
    userId: 1,
    title: "Young Soccer Player with Anterior Knee Pain",
    patientDescription: "A 17-year-old female soccer player presents with gradual onset anterior knee pain that worsens during running and jumping activities.",
    history: "Pain began 6 weeks ago during pre-season training. Initially mild, now limiting performance. No specific injury mechanism. Pain worse with squatting, jumping, and running downhill.",
    presentingSymptoms: "Diffuse anterior knee pain around the patella, rated 6/10 during activity, 2/10 at rest. Occasional 'giving way' sensation during pivoting movements.",
    vitalSigns: "BP: 115/70, HR: 65, Temp: 36.5°C, RR: 14",
    bodyPart: "knee",
    complexity: "intermediate",
    hiddenFindings: {
      strength: "Quadriceps strength 4/5 with pain at end range. VMO appears weaker than VL. Hip abductors 4/5.",
      palpation: "Tenderness along lateral patellar facet and retinaculum. No effusion. Mild tenderness over patellar tendon insertion.",
      specialTests: "Positive patellar apprehension test. Positive Clarke's sign. Positive lateral patellar glide test. Negative Lachman, anterior drawer, McMurray.",
      rangeOfMotion: "Full ROM with pain at end range flexion. Patella appears to track laterally during flexion.",
      additionalObservations: "Q-angle measures 18 degrees. Pes planus foot posture bilaterally. Hip internal rotation during single-leg squat."
    },
    correctDiagnosis: "Patellofemoral Pain Syndrome with Lateral Patellar Maltracking",
    differentialDiagnoses: ["Patellar Tendinopathy", "Chondromalacia Patellae", "ITB Syndrome", "Plica Syndrome"],
    correctAssessmentApproach: [
      "Comprehensive lower limb biomechanical assessment",
      "Patellar tracking assessment during functional movements",
      "Hip strength and control assessment",
      "Foot posture evaluation",
      "Q-angle measurement",
      "Special tests for patellofemoral dysfunction"
    ],
    correctTreatmentApproach: "Focus on hip strengthening, particularly gluteus medius and maximus. VMO strengthening and retraining. Patellar taping or bracing for symptom relief. Activity modification to avoid aggravating movements. Progressive return to sport with emphasis on landing mechanics and cutting technique. Consider foot orthoses if excessive pronation is contributing.",
    researchBasis: [
      "Powers, C.M. (2003). The influence of altered lower-extremity kinematics on patellofemoral joint dysfunction. Journal of Orthopaedic & Sports Physical Therapy, 33(11), 639-646.",
      "Earl, J.E., & Vetter, C.S. (2007). Patellofemoral pain. Physical Medicine and Rehabilitation Clinics of North America, 18(3), 439-458."
    ],
    expertSources: ["Christopher Powers", "Jenny McConnell", "Kay Crossley"]
  },
  {
    userId: 1,
    title: "Middle-aged Runner with Medial Knee Pain",
    patientDescription: "A 42-year-old recreational runner presents with medial knee pain that developed gradually over the past month during increased training.",
    history: "Training for first marathon, increased mileage from 20 to 40 miles per week over 4 weeks. Pain initially only after runs, now present during runs and walking downstairs.",
    presentingSymptoms: "Medial knee pain, particularly at the joint line. Pain 7/10 during running, 4/10 with walking. Stiffness in the morning that improves with movement.",
    vitalSigns: "BP: 128/82, HR: 58, Temp: 36.7°C, RR: 16",
    bodyPart: "knee",
    complexity: "advanced",
    hiddenFindings: {
      strength: "Quadriceps 4+/5, hamstrings 4/5. Hip abductors 3+/5 with substitution patterns.",
      palpation: "Point tenderness over medial joint line and medial meniscus. Mild effusion present. Tenderness over pes anserine insertion.",
      specialTests: "Positive McMurray test for medial meniscus. Positive Apley's compression test. Thessaly test positive. Negative Lachman and pivot shift.",
      rangeOfMotion: "Full extension with mild discomfort. Flexion to 135° with pain and mechanical block sensation at end range.",
      additionalObservations: "Valgus collapse during single-leg squat. Overpronation during gait analysis. Tight hip flexors and ITB."
    },
    correctDiagnosis: "Medial Meniscus Tear (Degenerative) with Secondary Pes Anserine Bursitis",
    differentialDiagnoses: ["MCL Sprain", "Medial Compartment Osteoarthritis", "Saphenous Neuritis", "Stress Fracture"],
    correctAssessmentApproach: [
      "Detailed running history and training load analysis",
      "Comprehensive meniscal testing battery",
      "Ligamentous stability testing",
      "Running gait analysis",
      "Hip and ankle mobility assessment",
      "Consider MRI if conservative treatment fails"
    ],
    correctTreatmentApproach: "Initial relative rest and activity modification. Anti-inflammatory measures if appropriate. Gradual return to running with focus on training load management. Hip strengthening program emphasizing gluteus medius and maximus. Address biomechanical factors including foot pronation. Consider gait retraining. If symptoms persist beyond 6-8 weeks, consider imaging and potential referral for arthroscopic evaluation.",
    researchBasis: [
      "Englund, M., Guermazi, A., Gale, D., et al. (2008). Incidental meniscal findings on knee MRI in middle-aged and elderly persons. New England Journal of Medicine, 359(11), 1108-1115.",
      "Mordecai, S.C., Al-Hadithy, N., Ware, H.E., & Gupte, C.M. (2014). Treatment of meniscal tears: An evidence based approach. World Journal of Orthopedics, 5(3), 233-241."
    ],
    expertSources: ["Tim Tyler", "Bill Vicenzino", "Adam Culvenor"]
  },
  {
    userId: 1,
    title: "Adolescent Basketball Player with Anterior Knee Pain",
    patientDescription: "A 15-year-old male basketball player presents with activity-related anterior knee pain below the kneecap that has persisted for 3 months.",
    history: "Pain began during basketball season with increased jumping and training. Initially only after practice, now painful during games. No specific injury recalled.",
    presentingSymptoms: "Sharp pain directly over the patellar tendon, especially with jumping and squatting. Pain 8/10 during basketball, 3/10 with daily activities.",
    vitalSigns: "BP: 110/65, HR: 70, Temp: 36.4°C, RR: 16",
    bodyPart: "knee",
    complexity: "intermediate",
    hiddenFindings: {
      strength: "Quadriceps strength 4/5 with pain during testing. Hamstrings 5/5. Hip flexors tight bilaterally.",
      palpation: "Exquisite point tenderness over inferior pole of patella and proximal patellar tendon. Tendon feels thickened. No effusion.",
      specialTests: "Positive single-leg decline squat test. Positive patellar tendon loading tests. Negative meniscal and ligament tests.",
      rangeOfMotion: "Full ROM with pain at end range flexion when stretching patellar tendon.",
      additionalObservations: "Growth spurt noted in past year (grown 4 inches). Tight quadriceps and hip flexors. Poor landing mechanics observed."
    },
    correctDiagnosis: "Patellar Tendinopathy (Jumper's Knee)",
    differentialDiagnoses: ["Osgood-Schlatter Disease", "Sinding-Larsen-Johansson Syndrome", "Patellofemoral Pain Syndrome", "Fat Pad Impingement"],
    correctAssessmentApproach: [
      "Detailed sports participation and training load history",
      "Patellar tendon loading tests",
      "Jump and landing assessment",
      "Flexibility assessment of quadriceps and hip flexors",
      "Strength testing of entire kinetic chain",
      "Consider ultrasound imaging for tendon structure"
    ],
    correctTreatmentApproach: "Activity modification to reduce tendon loading while maintaining fitness. Eccentric strengthening program for patellar tendon. Address kinetic chain deficits including hip strength and flexibility. Progressive return to jumping activities with focus on landing mechanics. Education on load management and pain monitoring. Consider taping or bracing for symptom relief during return to sport.",
    researchBasis: [
      "Malliaras, P., Barton, C.J., Reeves, N.D., & Langberg, H. (2013). Achilles and patellar tendinopathy loading programmes. Sports Medicine, 43(4), 267-286.",
      "van der Worp, H., van Ark, M., Roerink, S., Pepping, G.J., van den Akker-Scheek, I., & Zwerver, J. (2011). Risk factors for patellar tendinopathy: a systematic review of the literature. British Journal of Sports Medicine, 45(5), 446-452."
    ],
    expertSources: ["Jill Cook", "Peter Malliaras", "Ebonie Rio"]
  },
  {
    userId: 1,
    title: "Elderly Woman with Gradual Knee Stiffness and Pain",
    patientDescription: "A 68-year-old woman presents with bilateral knee pain and stiffness that has progressively worsened over 2 years, affecting her daily activities.",
    history: "Gradual onset of knee pain and stiffness, worse in the morning and after periods of inactivity. Pain increases with walking, especially on stairs. Previous history of meniscus injury 20 years ago.",
    presentingSymptoms: "Bilateral knee pain (right > left), described as deep aching. Morning stiffness lasting 30-45 minutes. Pain 6/10 with walking, 8/10 with stairs.",
    vitalSigns: "BP: 135/85, HR: 78, Temp: 36.6°C, RR: 16",
    bodyPart: "knee",
    complexity: "advanced",
    hiddenFindings: {
      strength: "Quadriceps 3+/5 bilaterally with atrophy noted. Hip abductors 3/5. Ankle dorsiflexion limited to 5 degrees.",
      palpation: "Bony enlargement and tenderness along joint lines bilaterally. Mild effusion present. Crepitus with movement.",
      specialTests: "Negative ligament tests. Limited meniscal testing due to pain and stiffness. Positive Clarke's sign.",
      rangeOfMotion: "Right knee: 5-110 degrees. Left knee: 0-120 degrees. Both with bony end-feel and crepitus.",
      additionalObservations: "Antalgic gait pattern. Decreased ankle mobility. Mild genu varus deformity. BMI 32."
    },
    correctDiagnosis: "Bilateral Knee Osteoarthritis with Functional Disability",
    differentialDiagnoses: ["Rheumatoid Arthritis", "Meniscal Pathology", "Patellofemoral Arthritis", "Crystal Arthropathy"],
    correctAssessmentApproach: [
      "Comprehensive musculoskeletal examination",
      "Functional movement assessment",
      "Pain and disability questionnaires (WOMAC, KOOS)",
      "Gait analysis",
      "X-ray imaging for structural changes",
      "Consider blood work to rule out inflammatory conditions"
    ],
    correctTreatmentApproach: "Multimodal approach including exercise therapy focusing on quadriceps strengthening and range of motion. Weight management counseling and support. Pain education and self-management strategies. Consider aquatic therapy for low-impact exercise. Manual therapy for joint mobility. Assistive devices as needed. Intra-articular injections may be considered if conservative management insufficient.",
    researchBasis: [
      "Fransen, M., McConnell, S., Harmer, A.R., Van der Esch, M., Simic, M., & Bennell, K.L. (2015). Exercise for osteoarthritis of the knee. Cochrane Database of Systematic Reviews, (1).",
      "Bennell, K.L., & Hinman, R.S. (2011). A review of the clinical evidence for exercise in osteoarthritis of the hip and knee. Journal of Science and Medicine in Sport, 14(1), 4-9."
    ],
    expertSources: ["Kim Bennell", "Rana Hinman", "Martin van der Esch"]
  }
];

/**
 * Adds additional knee case studies to the database
 */
export async function addAdditionalKneeCases(storage: any): Promise<void> {
  console.log(`Adding ${additionalKneeCases.length} additional knee case studies...`);
  
  for (const caseStudy of additionalKneeCases) {
    try {
      const existingCases = await storage.getAICaseStudies();
      const exists = existingCases.caseStudies.some((c: any) => 
        c.title === caseStudy.title && c.bodyPart === caseStudy.bodyPart
      );
      
      if (!exists) {
        await storage.createAICaseStudy(caseStudy);
        console.log(`Added knee case study: ${caseStudy.title}`);
      } else {
        console.log(`Knee case study already exists: ${caseStudy.title}`);
      }
    } catch (error) {
      console.error(`Error adding knee case study ${caseStudy.title}:`, error);
    }
  }
  
  console.log("Additional knee case studies added successfully!");
}