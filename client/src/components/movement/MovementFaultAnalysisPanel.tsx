import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Activity, 
  Target, 
  TrendingUp,
  Info,
  Heart,
  Brain,
  Shield,
  Lightbulb
} from 'lucide-react';
import type { FaultAnalysisResult, MovementFault, FaultType } from '@/services/movement/MovementFaultAnalyzer';

interface MovementFaultAnalysisPanelProps {
  faultAnalysis: FaultAnalysisResult | null;
  isActive: boolean;
  onDismissFault?: (faultType: FaultType) => void;
}

export function MovementFaultAnalysisPanel({
  faultAnalysis,
  isActive,
  onDismissFault
}: MovementFaultAnalysisPanelProps) {
  
  if (!isActive || !faultAnalysis) {
    return (
      <Card className="w-full opacity-60" data-testid="fault-analysis-inactive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-gray-400" />
            Movement Fault Analysis
          </CardTitle>
          <CardDescription>
            Start moving to analyze biomechanical patterns and detect potential issues
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const hasSignificantFaults = faultAnalysis.detectedFaults.some(fault => 
    fault.severity === 'moderate' || fault.severity === 'severe'
  );

  const qualityColor = faultAnalysis.overallMovementQuality >= 8 ? 'text-green-600' 
    : faultAnalysis.overallMovementQuality >= 6 ? 'text-yellow-600' 
    : 'text-red-600';

  const getSeverityColor = (severity: 'mild' | 'moderate' | 'severe') => {
    switch (severity) {
      case 'mild': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'moderate': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'severe': return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getSeverityIcon = (severity: 'mild' | 'moderate' | 'severe') => {
    switch (severity) {
      case 'mild': return <Info className="h-3 w-3" />;
      case 'moderate': return <AlertTriangle className="h-3 w-3" />;
      case 'severe': return <AlertTriangle className="h-3 w-3" />;
    }
  };

  const getFaultDisplayName = (faultType: FaultType): string => {
    return faultType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getFaultEducationalExplanation = (faultType: FaultType) => {
    const explanations = {
      knee_valgus: {
        biomechanics: "The knee collapses inward toward the midline during movement, creating a 'knock-knee' position. This occurs when the femur rotates internally and adducts while the tibia may rotate externally, disrupting the normal alignment of the hip-knee-ankle complex.",
        pathophysiology: "This misalignment increases stress on the medial knee structures (MCL, medial meniscus), alters patellofemoral joint mechanics leading to abnormal patella tracking, and creates compensatory stress patterns up the kinetic chain to the hip and lumbar spine.",
        commonCauses: [
          "Weak hip abductors (gluteus medius) failing to control femoral adduction",
          "Poor gluteal activation and hip stability",
          "Ankle mobility restrictions forcing compensation at the knee", 
          "Previous injury or surgery affecting movement patterns",
          "Muscle imbalances between hip internal and external rotators"
        ]
      },
      forward_head_posture: {
        biomechanics: "The head translates forward of the shoulders, increasing cervical lordosis in the upper segments while causing flexion in the lower cervical spine. This creates a 'chin poke' appearance and disrupts the normal cervical spine curvature.",
        pathophysiology: "Forward head posture increases the load on cervical muscles by up to 60 pounds per inch of forward translation. This leads to muscle fatigue, trigger points, cervical facet joint compression, and altered neural tension affecting the brachial plexus.",
        commonCauses: [
          "Prolonged desk work and poor ergonomics",
          "Weak deep neck flexors (longus colli, longus capitis)",
          "Tight posterior neck muscles and upper trapezius",
          "Thoracic kyphosis forcing cervical compensation",
          "Poor breathing patterns using accessory muscles"
        ]
      },
      hip_drop: {
        biomechanics: "During single-leg stance or movement, one hip drops below the level of the stance leg, indicating insufficient control of the pelvis in the frontal plane. This represents a failure of the gluteus medius and other hip abductors to maintain pelvic stability.",
        pathophysiology: "Hip drop creates compensatory lateral flexion of the lumbar spine, increased loading on the stance leg, and altered ground reaction forces. This leads to lumbar spine dysfunction, hip impingement, and potential knee valgus collapse.",
        commonCauses: [
          "Gluteus medius weakness or delayed activation",
          "Hip abductor muscle imbalances",
          "Previous hip or ankle injury affecting proprioception",
          "Core stability deficits affecting pelvic control",
          "Leg length discrepancy (functional or structural)"
        ]
      },
      ankle_collapse: {
        biomechanics: "The ankle rolls inward (pronation) excessively during weight-bearing, causing the medial longitudinal arch to flatten and the talus to adduct and plantarflex. This creates a chain reaction up the kinetic chain affecting knee and hip alignment.",
        pathophysiology: "Excessive pronation increases stress on the plantar fascia, posterior tibialis tendon, and spring ligament. It also creates internal rotation forces up the leg, contributing to knee valgus and altered hip mechanics, potentially leading to overuse injuries.",
        commonCauses: [
          "Weak intrinsic foot muscles and posterior tibialis",
          "Limited ankle dorsiflexion mobility",
          "Poor footwear or inadequate arch support",
          "Calf muscle tightness forcing compensatory pronation",
          "Previous ankle injury affecting proprioception and stability"
        ]
      },
      excessive_sway: {
        biomechanics: "The center of mass moves beyond normal limits during standing or movement, indicating poor postural control and balance responses. This represents a failure of the sensorimotor system to maintain stable equilibrium within the base of support.",
        pathophysiology: "Excessive sway indicates impaired balance control, which increases fall risk and forces compensatory muscle activation patterns. This leads to increased energy expenditure, muscle fatigue, and potential development of movement compensation strategies.",
        commonCauses: [
          "Vestibular system dysfunction or age-related changes",
          "Proprioceptive deficits from previous injury",
          "Core muscle weakness affecting postural stability",
          "Visual system impairments affecting balance",
          "Medication side effects or neurological conditions"
        ]
      },
      asymmetric_loading: {
        biomechanics: "Unequal weight distribution between limbs during bilateral activities, with one side bearing significantly more load than the other. This creates asymmetrical ground reaction forces and altered movement strategies.",
        pathophysiology: "Asymmetric loading leads to uneven muscle development, joint loading, and potential overuse on the loaded side while causing weakness and deconditioning on the unloaded side. This perpetuates movement dysfunction and injury risk.",
        commonCauses: [
          "Previous injury creating protective movement patterns",
          "Leg length discrepancy (structural or functional)",
          "Unilateral weakness or pain avoidance",
          "Neurological conditions affecting one side",
          "Habitual postural preferences or occupational demands"
        ]
      },
      forward_lean: {
        biomechanics: "The trunk leans forward excessively during movement, shifting the center of mass anterior to the base of support. This typically involves increased hip flexion and may include increased thoracic kyphosis.",
        pathophysiology: "Forward trunk lean alters the line of gravity, increasing the demand on posterior chain muscles (erector spinae, glutes, hamstrings) to prevent falling forward. This leads to muscle fatigue, compensatory movement patterns, and potential low back strain.",
        commonCauses: [
          "Weak gluteal muscles and hip extensors",
          "Tight hip flexors limiting hip extension",
          "Poor core stability and trunk control",
          "Ankle dorsiflexion restrictions forcing trunk compensation",
          "Habitual forward head posture affecting overall alignment"
        ]
      },
      knee_tracking: {
        biomechanics: "The patella moves abnormally during knee flexion/extension, typically tracking laterally due to imbalances in the quadriceps muscle or structural abnormalities. This affects the patellofemoral joint contact patterns.",
        pathophysiology: "Poor patellar tracking increases contact pressure on specific areas of the patellofemoral joint, leading to cartilage wear, pain, and potential development of patellofemoral pain syndrome or chondromalacia patella.",
        commonCauses: [
          "VMO weakness relative to lateral quadriceps",
          "Tight lateral structures (ITB, lateral retinaculum)",
          "Hip weakness allowing femoral internal rotation",
          "Foot pronation creating internal rotation forces",
          "Previous injury or surgery affecting muscle balance"
        ]
      },
      heel_rise: {
        biomechanics: "Premature or excessive heel lifting during the stance phase of gait or during squatting movements, indicating limited ankle dorsiflexion or compensation strategies to maintain balance.",
        pathophysiology: "Early heel rise reduces the effective lever arm for push-off, decreases shock absorption, and may indicate calf muscle weakness or ankle mobility restrictions. This can lead to increased forefoot pressure and potential metatarsal stress.",
        commonCauses: [
          "Limited ankle dorsiflexion from previous injury",
          "Tight gastrocnemius or soleus muscles",
          "Weak dorsiflexor muscles",
          "Footwear with excessive heel height",
          "Balance deficits requiring heel lift for stability"
        ]
      },
      step_irregularity: {
        biomechanics: "Inconsistent step length, timing, or quality during gait, indicating poor motor control or compensation for underlying impairments. This represents a breakdown in the normal rhythmic pattern of walking.",
        pathophysiology: "Step irregularity increases energy expenditure, reduces gait efficiency, and may indicate neurological involvement or significant musculoskeletal dysfunction. It increases fall risk and affects overall functional mobility.",
        commonCauses: [
          "Neurological conditions affecting motor control",
          "Pain or weakness causing protective gait patterns",
          "Previous injury affecting muscle activation timing",
          "Balance deficits requiring compensation strategies",
          "Fatigue or deconditioning affecting movement quality"
        ]
      }
    };

    return explanations[faultType] || {
      biomechanics: "This movement pattern deviates from optimal biomechanical alignment during functional activities.",
      pathophysiology: "This deviation may lead to increased stress on joints and soft tissues, potentially contributing to pain or injury risk.",
      commonCauses: ["Muscle imbalances", "Previous injury", "Poor movement patterns", "Lack of awareness"]
    };
  };

  const getFaultCorrectiveStrategies = (faultType: FaultType) => {
    const strategies = {
      knee_valgus: {
        primaryIntervention: "Strengthen hip abductors and external rotators while improving gluteal activation patterns. Focus on proximal stability to control distal movement at the knee.",
        keyExercises: [
          "Clamshells with resistance band for gluteus medius activation",
          "Side-lying hip abduction with slow eccentric control",
          "Single-leg mini squats with mirror feedback",
          "Wall sits with ball between knees to prevent collapse",
          "Step-ups with emphasis on knee alignment over toe"
        ],
        movementCues: [
          "Think about pushing your knees apart",
          "Keep your knees in line with your toes",
          "Squeeze your glutes to keep hips stable", 
          "Imagine strings pulling your kneecaps toward your pinky toes"
        ],
        evidenceBase: "Research shows that hip strengthening programs reduce knee valgus by 15-25% within 6-8 weeks (Willy & Davis, 2011). Gluteus medius strengthening is more effective than quadriceps training alone for valgus correction."
      },
      forward_head_posture: {
        primaryIntervention: "Strengthen deep neck flexors while stretching posterior cervical muscles. Address underlying thoracic kyphosis and breathing patterns.",
        keyExercises: [
          "Deep cervical flexor strengthening (chin tucks)",
          "Upper trap and levator scapulae stretching",
          "Thoracic extension mobility exercises",
          "Pectoral muscle stretching to address forward shoulders",
          "Postural awareness training with ergonomic modifications"
        ],
        movementCues: [
          "Make a double chin by pulling your head back",
          "Lengthen the back of your neck toward the ceiling",
          "Keep your ears over your shoulders",
          "Lift your chest and open your heart"
        ],
        evidenceBase: "Systematic reviews demonstrate that specific exercise therapy reduces forward head posture by 5-10° and decreases associated neck pain by 40-60% (Sheikhhoseini et al., 2018)."
      },
      hip_drop: {
        primaryIntervention: "Target gluteus medius strengthening and improve single-leg postural control. Address any underlying leg length discrepancies or muscle imbalances.",
        keyExercises: [
          "Single-leg stance progressions with perturbations",
          "Side planks with hip abduction",
          "Lateral step-downs with control",
          "Single-leg deadlifts for stability",
          "Monster walks with resistance bands"
        ],
        movementCues: [
          "Keep both hips level like a tabletop",
          "Think about lifting the non-stance hip up",
          "Engage your side glute muscles",
          "Maintain a level pelvis throughout the movement"
        ],
        evidenceBase: "Hip abductor strengthening reduces pelvic drop by 30-50% and improves single-leg balance scores by 25% (Semciw et al., 2013). Trendelenburg sign improvement correlates with pain reduction."
      },
      ankle_collapse: {
        primaryIntervention: "Strengthen intrinsic foot muscles and posterior tibialis while improving ankle mobility. Address footwear and orthotics as needed.",
        keyExercises: [
          "Calf raises with toe spread and arch lift",
          "Posterior tibialis strengthening with elastic band",
          "Single-leg balance on unstable surface",
          "Towel curls and marble picks for intrinsic foot strength",
          "Gastrocnemius and soleus stretching"
        ],
        movementCues: [
          "Lift your arches and spread your toes",
          "Think about gripping the ground with your feet",
          "Keep weight on the outer edge of your foot",
          "Create a tripod with your foot contact"
        ],
        evidenceBase: "Intrinsic foot muscle training reduces dynamic pronation by 20-30% and improves arch height by 5-8mm (McKeon et al., 2015). Combined strengthening and mobility programs show superior outcomes."
      },
      excessive_sway: {
        primaryIntervention: "Improve postural control through sensorimotor training and core strengthening. Address underlying vestibular, visual, or proprioceptive deficits.",
        keyExercises: [
          "Single-leg stance with eyes closed",
          "Balance training on foam or unstable surfaces", 
          "Core stabilization exercises (planks, dead bugs)",
          "Tai chi or balance-based movement practices",
          "Gaze stabilization exercises if vestibular involvement"
        ],
        movementCues: [
          "Feel your feet rooted to the ground",
          "Engage your core like a tree trunk",
          "Focus on a fixed point ahead",
          "Make small corrections rather than large movements"
        ],
        evidenceBase: "Balance training programs reduce postural sway by 25-40% and fall risk by 35% in older adults (Sherrington et al., 2019). Multi-sensory training is most effective."
      },
      asymmetric_loading: {
        primaryIntervention: "Address underlying causes through strength training and movement re-education. Focus on equal weight distribution awareness and bilateral strengthening.",
        keyExercises: [
          "Bilateral squats with weight distribution feedback",
          "Step-ups alternating legs with equal repetitions",
          "Single-leg strengthening for the weaker side",
          "Balance board training for proprioception",
          "Functional movement patterns with symmetry focus"
        ],
        movementCues: [
          "Feel equal pressure under both feet",
          "Distribute your weight 50-50 between legs",
          "Check that both sides are working equally",
          "Don't favor your stronger side"
        ],
        evidenceBase: "Symmetry training reduces loading asymmetries by 15-25% and decreases injury risk by 20% (Bishop et al., 2018). Real-time feedback enhances learning."
      },
      forward_lean: {
        primaryIntervention: "Strengthen posterior chain muscles and improve ankle mobility. Address hip flexor tightness and core stability deficits.",
        keyExercises: [
          "Glute bridges and hip thrusts",
          "Romanian deadlifts for posterior chain",
          "Hip flexor stretches (couch stretch, kneeling lunge)",
          "Wall slides for posture awareness",
          "Ankle dorsiflexion mobility work"
        ],
        movementCues: [
          "Think about sitting back into your hips",
          "Chest up, weight through your heels",
          "Squeeze your glutes to stand tall",
          "Keep your torso upright like a soldier"
        ],
        evidenceBase: "Posterior chain strengthening improves trunk angle by 10-15° and reduces compensatory movement patterns by 30% (Sahrmann et al., 2017)."
      },
      knee_tracking: {
        primaryIntervention: "Strengthen VMO and address hip weakness while improving patellar mobility. Focus on proper movement patterns during functional activities.",
        keyExercises: [
          "VMO strengthening with terminal knee extension",
          "Hip strengthening (clamshells, side-lying abduction)",
          "Patellar mobilization and soft tissue work",
          "Step-downs with mirror feedback",
          "Wall sits with proper knee alignment"
        ],
        movementCues: [
          "Track your kneecap over your middle toe",
          "Think about pulling your kneecap inward",
          "Keep your thigh muscles balanced",
          "Control the movement slowly and smoothly"
        ],
        evidenceBase: "VMO strengthening combined with hip exercises improves patellar tracking and reduces pain by 50-70% in patellofemoral pain syndrome (Barton et al., 2015)."
      },
      heel_rise: {
        primaryIntervention: "Improve ankle dorsiflexion mobility and strengthen dorsiflexor muscles. Address calf tightness and balance deficits.",
        keyExercises: [
          "Calf stretches (wall stretch, downward dog)",
          "Ankle dorsiflexion strengthening",
          "Balance exercises to reduce compensation",
          "Heel walking for dorsiflexor strength",
          "Soleus stretches with knee bent"
        ],
        movementCues: [
          "Keep your heels down as long as possible",
          "Think about pulling your toes up toward your shins",
          "Shift weight forward without lifting heels",
          "Keep your feet flat and grounded"
        ],
        evidenceBase: "Ankle mobility programs increase dorsiflexion range by 15-20° and improve functional movement patterns by 25% (Hoch & McKeon, 2011)."
      },
      step_irregularity: {
        primaryIntervention: "Improve motor control through gait training and strength exercises. Address underlying neurological or musculoskeletal causes.",
        keyExercises: [
          "Metronome walking for rhythm training",
          "Obstacle navigation and dual-task training",
          "Single-leg balance and strength exercises", 
          "Functional movement patterns",
          "Coordination drills and agility ladder work"
        ],
        movementCues: [
          "Take smooth, even steps",
          "Focus on consistent rhythm",
          "Feel the ground with each step",
          "Make each step purposeful and controlled"
        ],
        evidenceBase: "Gait training programs improve step regularity by 20-35% and reduce fall risk by 30% in older adults (Montero-Odasso et al., 2016)."
      }
    };

    return strategies[faultType] || {
      primaryIntervention: "Address the underlying movement dysfunction through targeted strengthening and movement re-education.",
      keyExercises: ["Strengthening exercises for weak muscles", "Mobility work for tight structures", "Movement pattern training"],
      movementCues: ["Focus on quality over quantity", "Move with control and intention", "Pay attention to your body position"],
      evidenceBase: "Evidence-based exercise therapy improves movement patterns and reduces injury risk when properly implemented."
    };
  };

  return (
    <Card className="w-full" data-testid="movement-fault-analysis-panel">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Movement Analysis
            {hasSignificantFaults && (
              <Badge variant="destructive" className="ml-2">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Issues Detected
              </Badge>
            )}
          </CardTitle>
          <div className="text-right">
            <div className={`text-2xl font-bold ${qualityColor}`}>
              {faultAnalysis.overallMovementQuality.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">Movement Quality</div>
          </div>
        </div>
        <CardDescription>
          Real-time biomechanical analysis with clinical insights
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quality Score */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Quality Score</span>
            <span className={qualityColor}>
              {faultAnalysis.overallMovementQuality.toFixed(1)}/10
            </span>
          </div>
          <Progress 
            value={faultAnalysis.overallMovementQuality * 10} 
            className="w-full"
            data-testid="movement-quality-progress"
          />
        </div>

        {/* Quick Status */}
        {faultAnalysis.detectedFaults.length === 0 ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Excellent movement quality! No significant biomechanical issues detected.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className={hasSignificantFaults ? 'border-orange-200 bg-orange-50' : 'border-yellow-200 bg-yellow-50'}>
            <AlertTriangle className={`h-4 w-4 ${hasSignificantFaults ? 'text-orange-600' : 'text-yellow-600'}`} />
            <AlertDescription className={hasSignificantFaults ? 'text-orange-800' : 'text-yellow-800'}>
              {faultAnalysis.detectedFaults.length} movement issue{faultAnalysis.detectedFaults.length > 1 ? 's' : ''} detected that may contribute to pain or injury risk.
            </AlertDescription>
          </Alert>
        )}

        {/* Detailed Analysis */}
        {faultAnalysis.detectedFaults.length > 0 && (
          <Tabs defaultValue="faults" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="faults">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Issues ({faultAnalysis.detectedFaults.length})
              </TabsTrigger>
              <TabsTrigger value="clinical">
                <Heart className="h-4 w-4 mr-1" />
                Clinical
              </TabsTrigger>
              <TabsTrigger value="recommendations">
                <Lightbulb className="h-4 w-4 mr-1" />
                Fixes
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="faults" className="space-y-3 mt-4">
              {faultAnalysis.detectedFaults.map((fault, index) => (
                <div 
                  key={`${fault.type}-${index}`} 
                  className="border rounded-lg p-3 space-y-2"
                  data-testid={`fault-${fault.type}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(fault.severity)}
                      <span className="font-medium">{getFaultDisplayName(fault.type)}</span>
                    </div>
                    <Badge className={getSeverityColor(fault.severity)}>
                      {fault.severity}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {fault.description}
                  </p>
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      Measured: {fault.measurementValue.toFixed(1)}°
                    </span>
                    <span>
                      Normal: {fault.normalRange.min}-{fault.normalRange.max}°
                    </span>
                    <span>
                      Confidence: {(fault.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {fault.affectedJoints.map(joint => (
                      <Badge key={joint} variant="outline" className="text-xs">
                        {joint.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>
            
            <TabsContent value="clinical" className="space-y-4 mt-4">
              {/* Educational Explanations */}
              {faultAnalysis.detectedFaults.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Brain className="h-4 w-4 text-indigo-500" />
                    Why These Issues Occur
                  </h4>
                  {faultAnalysis.detectedFaults.map((fault, index) => {
                    const explanation = getFaultEducationalExplanation(fault.type);
                    return (
                      <div key={`edu-${fault.type}-${index}`} className="bg-indigo-50 dark:bg-indigo-950/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                            <h5 className="font-medium text-indigo-800 dark:text-indigo-200">
                              {getFaultDisplayName(fault.type)}
                            </h5>
                          </div>
                          
                          <div className="space-y-2 text-sm text-indigo-800 dark:text-indigo-200">
                            <div>
                              <span className="font-medium">What happens:</span>
                              <p className="mt-1">{explanation.biomechanics}</p>
                            </div>
                            
                            <div>
                              <span className="font-medium">Why it causes problems:</span>
                              <p className="mt-1">{explanation.pathophysiology}</p>
                            </div>
                            
                            <div>
                              <span className="font-medium">Common causes:</span>
                              <ul className="mt-1 ml-2 space-y-0.5">
                                {explanation.commonCauses.map((cause, idx) => (
                                  <li key={idx} className="flex items-start gap-1">
                                    <span className="text-indigo-400 mt-1">•</span>
                                    <span>{cause}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <Separator />

              {/* Primary Concerns */}
              {faultAnalysis.clinicalInsights.primaryConcerns.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    Potential Symptoms
                  </h4>
                  <div className="space-y-1">
                    {faultAnalysis.clinicalInsights.primaryConcerns.map((concern, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                        {concern}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk Factors */}
              {faultAnalysis.clinicalInsights.riskFactors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4 text-orange-500" />
                    Injury Risks
                  </h4>
                  <div className="space-y-1">
                    {faultAnalysis.clinicalInsights.riskFactors.map((risk, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
                        {risk}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Compensation Patterns */}
              {faultAnalysis.clinicalInsights.compensationPatterns.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    Compensation Patterns
                  </h4>
                  <div className="space-y-1">
                    {faultAnalysis.clinicalInsights.compensationPatterns.map((pattern, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        {pattern}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {faultAnalysis.clinicalInsights.primaryConcerns.length === 0 && 
               faultAnalysis.clinicalInsights.riskFactors.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  No significant clinical concerns identified
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="recommendations" className="space-y-4 mt-4">
              {/* Evidence-Based Strategies */}
              {faultAnalysis.detectedFaults.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    Evidence-Based Corrective Strategies
                  </h4>
                  {faultAnalysis.detectedFaults.map((fault, index) => {
                    const strategies = getFaultCorrectiveStrategies(fault.type);
                    return (
                      <div key={`strategy-${fault.type}-${index}`} className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-amber-500 rounded-full" />
                            <h5 className="font-medium text-amber-800 dark:text-amber-200">
                              Correcting {getFaultDisplayName(fault.type)}
                            </h5>
                          </div>
                          
                          <div className="space-y-3 text-sm text-amber-800 dark:text-amber-200">
                            <div>
                              <span className="font-medium">Primary intervention:</span>
                              <p className="mt-1">{strategies.primaryIntervention}</p>
                            </div>
                            
                            <div>
                              <span className="font-medium">Key exercises:</span>
                              <ul className="mt-1 ml-2 space-y-0.5">
                                {strategies.keyExercises.map((exercise, idx) => (
                                  <li key={idx} className="flex items-start gap-1">
                                    <span className="text-amber-400 mt-1">•</span>
                                    <span>{exercise}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            <div>
                              <span className="font-medium">Movement cues:</span>
                              <ul className="mt-1 ml-2 space-y-0.5">
                                {strategies.movementCues.map((cue, idx) => (
                                  <li key={idx} className="flex items-start gap-1">
                                    <span className="text-amber-400 mt-1">•</span>
                                    <span>"{cue}"</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded text-xs">
                              <span className="font-medium">Evidence base:</span> {strategies.evidenceBase}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <Separator />

              {/* Immediate Corrections */}
              {faultAnalysis.recommendations.immediateCorrections.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-500" />
                    Quick Movement Fixes
                  </h4>
                  <div className="space-y-1">
                    {faultAnalysis.recommendations.immediateCorrections.map((correction, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                        {correction}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Exercise Targets */}
              {faultAnalysis.recommendations.exerciseTargets.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    Exercise Focus Areas
                  </h4>
                  <div className="space-y-1">
                    {faultAnalysis.recommendations.exerciseTargets.map((target, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        {target}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Referral Suggestions */}
              {faultAnalysis.recommendations.referralSuggestions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-500" />
                    Professional Consultation
                  </h4>
                  <div className="space-y-1">
                    {faultAnalysis.recommendations.referralSuggestions.map((suggestion, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0" />
                        {suggestion}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {faultAnalysis.recommendations.immediateCorrections.length === 0 && 
               faultAnalysis.recommendations.exerciseTargets.length === 0 && 
               faultAnalysis.recommendations.referralSuggestions.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  No specific recommendations at this time
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Educational Note */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">Clinical Note</p>
              <p>
                This analysis identifies biomechanical patterns that may contribute to symptoms or injury risk. 
                Consult with a qualified healthcare professional for comprehensive assessment and treatment planning.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}