import { type InsertResearchArticle } from "@shared/schema";

export const sampleResearchArticles: InsertResearchArticle[] = [
  {
    title: "Effectiveness of Manual Therapy versus Exercise Therapy in Chronic Shoulder Impingement Syndrome: A Randomized Controlled Trial",
    authors: "Smith, J.A., Johnson, M.B., Williams, C.D., Brown, K.L., Davis, R.M.",
    journal: "Journal of Orthopaedic & Sports Physical Therapy",
    publicationDate: new Date("2024-03-15"),
    doi: "10.2519/jospt.2024.11234",
    abstract: "Background: Shoulder impingement syndrome is a common musculoskeletal condition affecting overhead athletes and manual workers. The optimal treatment approach remains debated. Objective: To compare the effectiveness of manual therapy versus exercise therapy in patients with chronic shoulder impingement syndrome. Design: Randomized controlled trial. Methods: 120 participants with chronic shoulder impingement syndrome were randomly allocated to manual therapy (n=60) or exercise therapy (n=60) groups. Primary outcome was pain reduction measured by Visual Analog Scale at 6 weeks. Secondary outcomes included range of motion, functional disability, and quality of life measures. Results: Both groups showed significant improvement in pain scores (manual therapy: 6.8 to 2.1, exercise therapy: 6.9 to 3.2, p<0.001). Manual therapy showed superior outcomes for pain reduction (p=0.04) and external rotation ROM (p=0.02). No significant differences were found in functional outcomes. Conclusion: Manual therapy provides superior short-term pain relief compared to exercise therapy in chronic shoulder impingement syndrome.",
    url: "https://www.jospt.org/doi/10.2519/jospt.2024.11234",
    bodyPart: "shoulder",
    keyFindings: "Manual therapy superior for pain relief and external rotation ROM; no difference in functional outcomes",
    clinicalRelevance: "High - provides direct treatment guidance for shoulder impingement management",
    methodology: "RCT with adequate sample size, appropriate randomization, and validated outcome measures",
    aiAnalysisStatus: "completed",
    qualityScore: 85,
    identifiedGaps: {
      methodology: ["No long-term follow-up beyond 6 weeks", "Single-blinded design only"],
      statistical: ["No power calculation reported", "Missing intention-to-treat analysis"],
      clinical: ["Limited to chronic cases only", "No cost-effectiveness analysis"],
      bias: ["Potential performance bias due to inability to blind therapists"]
    },
    generatedQuestions: {
      critical: [
        "What are the long-term effects beyond 6 weeks?",
        "Would a combination approach be more effective than either treatment alone?"
      ],
      moderate: [
        "How do results compare in acute versus chronic presentations?",
        "What is the minimal clinically important difference for these outcomes?"
      ],
      minor: [
        "Were there any adverse events reported?",
        "How do results vary by patient demographics?"
      ]
    },
    biasAssessment: {
      selectionBias: { score: 8, notes: "Adequate randomization and allocation concealment described" },
      performanceBias: { score: 6, notes: "Participants blinded but therapists could not be blinded" },
      detectionBias: { score: 7, notes: "Outcome assessors blinded for most measures" },
      attritionBias: { score: 8, notes: "Low dropout rate (5%) with reasons provided" },
      reportingBias: { score: 7, notes: "All pre-specified outcomes reported but no protocol registered" }
    },
    methodologyAssessment: {
      sampleSizeAdequacy: { score: 8, notes: "Adequate sample size for primary outcome" },
      studyDesign: { score: 9, notes: "Well-designed RCT with appropriate control group" },
      outcomeValidation: { score: 8, notes: "Validated outcome measures used" },
      followUpDuration: { score: 6, notes: "Short follow-up period limits long-term conclusions" },
      statisticalMethods: { score: 7, notes: "Appropriate statistical tests but missing some analyses" }
    },
    aiAnalyzedAt: new Date("2024-01-15T10:30:00Z")
  },
  {
    title: "Efficacy of High-Velocity Low-Amplitude Thrust Manipulation for Chronic Low Back Pain: A Systematic Review and Meta-Analysis",
    authors: "Thompson, A.R., Garcia, L.M., Wilson, P.K., Anderson, S.J.",
    journal: "Spine",
    publicationDate: new Date("2024-01-20"),
    doi: "10.1097/BRS.0000000000004567",
    abstract: "Study Design: Systematic review and meta-analysis. Objective: To evaluate the efficacy of high-velocity low-amplitude (HVLA) thrust manipulation for chronic low back pain. Summary of Background Data: HVLA manipulation is commonly used for low back pain, but evidence of its effectiveness remains inconsistent. Methods: We searched MEDLINE, Embase, CENTRAL, and PEDro databases from inception to December 2023. Randomized controlled trials comparing HVLA manipulation to control interventions in adults with chronic low back pain were included. Two reviewers independently screened studies, extracted data, and assessed risk of bias using the Cochrane Risk of Bias tool. Results: Twelve studies (n=1,456) met inclusion criteria. HVLA manipulation showed small but significant improvements in pain intensity (SMD -0.42, 95% CI -0.67 to -0.17, p=0.001) and functional disability (SMD -0.35, 95% CI -0.58 to -0.12, p=0.003) compared to controls. Heterogeneity was moderate (I²=58% for pain, I²=45% for function). Subgroup analysis revealed greater effects when combined with exercise therapy. Conclusion: HVLA manipulation provides small but clinically meaningful improvements in pain and function for chronic low back pain, particularly when combined with exercise.",
    url: "https://journals.lww.com/spinejournal/Abstract/2024/01200/spine.456789.aspx",
    bodyPart: "back",
    keyFindings: "Small but significant improvements in pain and function; greater effects when combined with exercise",
    clinicalRelevance: "High - meta-analysis provides strongest level of evidence for clinical decision-making",
    methodology: "Systematic review and meta-analysis following PRISMA guidelines with comprehensive search strategy",
    aiAnalysisStatus: "completed",
    qualityScore: 92,
    identifiedGaps: {
      methodology: ["Limited to English language studies", "Publication bias not adequately assessed"],
      statistical: ["Moderate heterogeneity not fully explained", "Individual patient data not available"],
      clinical: ["Limited long-term follow-up data", "Optimal treatment frequency not determined"],
      bias: ["Potential publication bias favoring positive results"]
    },
    generatedQuestions: {
      critical: [
        "What is the optimal frequency and duration of HVLA treatment?",
        "How do results compare to other manual therapy techniques?"
      ],
      moderate: [
        "What patient characteristics predict better outcomes?",
        "Are there any serious adverse events associated with HVLA?"
      ],
      minor: [
        "How do results vary across different healthcare settings?",
        "What is the cost-effectiveness compared to other interventions?"
      ]
    },
    biasAssessment: {
      selectionBias: { score: 9, notes: "Comprehensive search strategy with multiple databases" },
      performanceBias: { score: 7, notes: "Most included studies had adequate blinding procedures" },
      detectionBias: { score: 8, notes: "Outcome assessors blinded in majority of studies" },
      attritionBias: { score: 7, notes: "Some studies had high dropout rates affecting results" },
      reportingBias: { score: 6, notes: "Publication bias testing limited, potential for selective reporting" }
    },
    methodologyAssessment: {
      sampleSizeAdequacy: { score: 9, notes: "Large combined sample size from multiple studies" },
      studyDesign: { score: 9, notes: "Well-conducted systematic review following best practices" },
      outcomeValidation: { score: 8, notes: "Most studies used validated outcome measures" },
      followUpDuration: { score: 6, notes: "Limited long-term follow-up in included studies" },
      statisticalMethods: { score: 8, notes: "Appropriate meta-analytic methods with sensitivity analyses" }
    },
    aiAnalyzedAt: new Date("2024-01-16T14:20:00Z")
  },
  {
    title: "Comparison of Dry Needling and Trigger Point Therapy for Myofascial Pain in the Upper Trapezius: A Pilot Study",
    authors: "Martinez, C.P., Lee, H.S., Kumar, R.V.",
    journal: "Journal of Bodywork and Movement Therapies",
    publicationDate: new Date("2023-11-10"),
    doi: "10.1016/j.jbmt.2023.104821",
    abstract: "Background: Myofascial pain in the upper trapezius is common in office workers and can be treated with various manual techniques. Objective: To compare the immediate effects of dry needling versus manual trigger point therapy for upper trapezius myofascial pain. Methods: Thirty participants with upper trapezius trigger points were randomly assigned to dry needling (n=15) or manual trigger point therapy (n=15). Pain intensity, pressure pain threshold, and cervical range of motion were measured before and immediately after treatment. Results: Both groups showed significant improvements in all outcome measures (p<0.05). Dry needling demonstrated greater improvement in pressure pain threshold (p=0.02) while manual therapy showed superior cervical rotation ROM (p=0.03). No significant differences were found for pain intensity. Two participants in the dry needling group reported minor bruising. Conclusion: Both interventions are effective for immediate relief of upper trapezius myofascial pain, with specific advantages for each technique.",
    url: "https://www.sciencedirect.com/science/article/pii/S1360859223012345",
    bodyPart: "neck",
    keyFindings: "Both treatments effective; dry needling better for pressure pain threshold, manual therapy better for ROM",
    clinicalRelevance: "Moderate - limited by small sample and immediate outcomes only",
    methodology: "Small pilot RCT with immediate outcome assessment only",
    aiAnalysisStatus: "completed",
    qualityScore: 68,
    identifiedGaps: {
      methodology: ["Very small sample size", "No follow-up beyond immediate assessment", "Single-center study"],
      statistical: ["Underpowered for detecting meaningful differences", "No adjustment for multiple comparisons"],
      clinical: ["Limited generalizability to chronic conditions", "No functional outcome measures"],
      bias: ["High risk of bias due to inability to blind participants and providers"]
    },
    generatedQuestions: {
      critical: [
        "What are the effects beyond immediate post-treatment?",
        "Would a larger sample size change the conclusions?"
      ],
      moderate: [
        "How do these techniques compare in chronic versus acute presentations?",
        "What is the optimal treatment frequency for sustained effects?"
      ],
      minor: [
        "Are there predictors of response to each treatment?",
        "How do patient preferences influence outcomes?"
      ]
    },
    biasAssessment: {
      selectionBias: { score: 6, notes: "Randomization method not clearly described" },
      performanceBias: { score: 4, notes: "Impossible to blind participants and therapists to intervention" },
      detectionBias: { score: 5, notes: "Outcome assessor blinding not mentioned" },
      attritionBias: { score: 8, notes: "No dropouts reported" },
      reportingBias: { score: 7, notes: "All outcomes reported but limited outcome set" }
    },
    methodologyAssessment: {
      sampleSizeAdequacy: { score: 4, notes: "Very small sample size for reliable conclusions" },
      studyDesign: { score: 6, notes: "Pilot study design appropriate but limited scope" },
      outcomeValidation: { score: 7, notes: "Standard outcome measures used" },
      followUpDuration: { score: 3, notes: "No follow-up assessment conducted" },
      statisticalMethods: { score: 6, notes: "Basic statistical tests appropriate for sample size" }
    },
    aiAnalyzedAt: new Date("2024-01-17T09:15:00Z")
  },
  {
    title: "Exercise Therapy versus Corticosteroid Injection for Lateral Epicondylitis: A 12-Month Randomized Controlled Trial",
    authors: "Peterson, M.J., Chang, W.L., Roberts, D.A., Miller, K.R., Hassan, N.M.",
    journal: "American Journal of Sports Medicine",
    publicationDate: new Date("2024-02-28"),
    doi: "10.1177/03635465241234567",
    abstract: "Purpose: To compare the long-term effectiveness of exercise therapy versus corticosteroid injection for lateral epicondylitis (tennis elbow). Study Design: Randomized controlled trial. Methods: 156 patients with lateral epicondylitis were randomized to progressive exercise therapy (n=78) or corticosteroid injection (n=78). Primary outcome was Patient-Rated Tennis Elbow Evaluation (PRTEE) score at 12 months. Secondary outcomes included pain intensity, grip strength, and return to activities. Assessments were conducted at 6 weeks, 3, 6, and 12 months. Results: At 12 months, exercise therapy showed superior outcomes in PRTEE scores (mean difference -12.3 points, 95% CI -18.7 to -5.9, p<0.001), pain reduction, and functional improvement. Corticosteroid injection provided faster initial relief at 6 weeks but lost effectiveness by 3 months. Exercise therapy group had significantly better grip strength recovery (p=0.02) and lower recurrence rates (15% vs 35%, p=0.006). No serious adverse events occurred in either group. Conclusion: Exercise therapy provides superior long-term outcomes compared to corticosteroid injection for lateral epicondylitis, despite slower initial improvement.",
    url: "https://journals.sagepub.com/doi/10.1177/03635465241234567",
    bodyPart: "elbow",
    keyFindings: "Exercise therapy superior long-term despite slower initial improvement; lower recurrence rates",
    clinicalRelevance: "Very High - addresses common condition with clear treatment recommendations",
    methodology: "Well-designed RCT with adequate sample size and long-term follow-up",
    aiAnalysisStatus: "completed",
    qualityScore: 89,
    identifiedGaps: {
      methodology: ["Single-blinded design only", "Limited to primary lateral epicondylitis"],
      statistical: ["No adjustment for baseline differences", "Per-protocol analysis not reported"],
      clinical: ["Exercise protocol standardization questions", "No economic evaluation"],
      bias: ["Potential bias from exercise compliance variations"]
    },
    generatedQuestions: {
      critical: [
        "What specific exercise parameters provide optimal outcomes?",
        "How do results compare in occupational versus sports-related cases?"
      ],
      moderate: [
        "What factors predict treatment response?",
        "Is there an optimal timing for intervention?"
      ],
      minor: [
        "How do patient preferences affect compliance and outcomes?",
        "What is the learning curve for exercise progression?"
      ]
    },
    biasAssessment: {
      selectionBias: { score: 8, notes: "Computer-generated randomization with concealed allocation" },
      performanceBias: { score: 6, notes: "Participants blinded but therapists aware of treatment" },
      detectionBias: { score: 8, notes: "Outcome assessors blinded to group allocation" },
      attritionBias: { score: 7, notes: "Moderate dropout rate (12%) with complete reporting" },
      reportingBias: { score: 8, notes: "Trial registered with all outcomes reported" }
    },
    methodologyAssessment: {
      sampleSizeAdequacy: { score: 8, notes: "Sample size calculation provided and achieved" },
      studyDesign: { score: 9, notes: "Well-designed RCT with appropriate control" },
      outcomeValidation: { score: 9, notes: "Validated, condition-specific outcome measures" },
      followUpDuration: { score: 9, notes: "Excellent 12-month follow-up for chronic condition" },
      statisticalMethods: { score: 8, notes: "Appropriate statistical methods with missing data handling" }
    },
    aiAnalyzedAt: new Date("2024-01-18T16:45:00Z")
  },
  {
    title: "Effectiveness of Neuromuscular Electrical Stimulation Combined with Exercise for Knee Osteoarthritis: A Feasibility Study",
    authors: "Zhou, L.Q., Singh, P.R., O'Brien, T.M.",
    journal: "Physiotherapy Research International",
    publicationDate: new Date("2023-09-15"),
    doi: "10.1002/pri.1987",
    abstract: "Background: Knee osteoarthritis affects millions worldwide, with exercise being a cornerstone of treatment. Neuromuscular electrical stimulation (NMES) may enhance exercise benefits. Objective: To assess the feasibility and preliminary effectiveness of NMES combined with exercise for knee osteoarthritis. Design: Single-group feasibility study. Methods: Twenty-five participants with mild to moderate knee osteoarthritis received 8 weeks of supervised exercise combined with NMES (3 sessions/week). Outcome measures included WOMAC scores, 6-minute walk test, quadriceps strength, and participant feedback. Results: Completion rate was 88% (22/25). Significant improvements were observed in WOMAC pain (p=0.03), function (p=0.02), and 6-minute walk distance (p=0.01). Quadriceps strength improved by 23% (p<0.001). Participants reported high satisfaction (8.2/10) and willingness to continue treatment. Minor skin irritation occurred in 3 participants. Conclusion: NMES combined with exercise appears feasible and promising for knee osteoarthritis, warranting larger controlled trials.",
    url: "https://onlinelibrary.wiley.com/doi/10.1002/pri.1987",
    bodyPart: "knee",
    keyFindings: "High completion rate with significant improvements in pain, function, and strength",
    clinicalRelevance: "Moderate - feasibility study provides preliminary evidence but needs larger trials",
    methodology: "Single-group feasibility study without control group",
    aiAnalysisStatus: "completed",
    qualityScore: 58,
    identifiedGaps: {
      methodology: ["No control group", "Small sample size", "Single-group design limits conclusions"],
      statistical: ["No comparison group for statistical inference", "Potential for regression to mean"],
      clinical: ["Limited to mild-moderate OA", "Short follow-up period", "No long-term safety data"],
      bias: ["High risk of bias due to lack of control group and blinding"]
    },
    generatedQuestions: {
      critical: [
        "How do results compare to exercise alone?",
        "What would a randomized controlled trial show?"
      ],
      moderate: [
        "What is the optimal NMES protocol?",
        "Are benefits sustained beyond treatment period?"
      ],
      minor: [
        "How do costs compare to standard care?",
        "What are patient preferences regarding NMES use?"
      ]
    },
    biasAssessment: {
      selectionBias: { score: 5, notes: "Convenience sampling without randomization" },
      performanceBias: { score: 3, notes: "No blinding possible in single-group design" },
      detectionBias: { score: 4, notes: "Outcome assessor blinding not described" },
      attritionBias: { score: 7, notes: "Good completion rate with reasons for withdrawal provided" },
      reportingBias: { score: 6, notes: "All stated outcomes reported but limited scope" }
    },
    methodologyAssessment: {
      sampleSizeAdequacy: { score: 4, notes: "Small sample appropriate for feasibility but not effectiveness" },
      studyDesign: { score: 4, notes: "Feasibility design limits evidence level" },
      outcomeValidation: { score: 8, notes: "Well-validated outcome measures used" },
      followUpDuration: { score: 5, notes: "Short follow-up adequate for feasibility goals" },
      statisticalMethods: { score: 5, notes: "Basic analysis appropriate for single-group design" }
    },
    aiAnalyzedAt: new Date("2024-01-19T11:30:00Z")
  },
  {
    title: "Manual Therapy Techniques for Plantar Fasciitis: A Network Meta-Analysis of Randomized Controlled Trials",
    authors: "Campbell, R.D., Foster, J.L., Murray, A.K., Stewart, P.W., Phillips, M.C.",
    journal: "Physical Therapy",
    publicationDate: new Date("2024-01-05"),
    doi: "10.1093/ptj/pzad145",
    abstract: "Background: Plantar fasciitis is a common cause of heel pain with various manual therapy treatments available. Network meta-analysis allows simultaneous comparison of multiple interventions. Objective: To compare the effectiveness of different manual therapy techniques for plantar fasciitis through network meta-analysis. Data Sources: MEDLINE, Embase, CENTRAL, PEDro, and CINAHL from inception to October 2023. Study Selection: RCTs comparing manual therapy techniques for plantar fasciitis in adults. Data Extraction: Two reviewers independently extracted data on study characteristics, interventions, and outcomes. Data Synthesis: Network meta-analysis using random-effects model. Primary outcome was pain reduction at 4-8 weeks. Results: 18 RCTs (n=1,247) were included, comparing 8 interventions. Myofascial release ranked highest for pain reduction (SUCRA=0.89), followed by joint mobilization (SUCRA=0.73) and soft tissue massage (SUCRA=0.65). Trigger point therapy and stretching showed moderate effectiveness. Ultrasound therapy ranked lowest. Quality of evidence was moderate for most comparisons. Conclusion: Myofascial release appears most effective for short-term pain relief in plantar fasciitis, though quality of evidence limits definitive recommendations.",
    url: "https://academic.oup.com/ptj/article/104/1/pzad145/7234567",
    bodyPart: "foot",
    keyFindings: "Myofascial release most effective, followed by joint mobilization; ultrasound least effective",
    clinicalRelevance: "High - provides treatment hierarchy for clinical decision-making",
    methodology: "Network meta-analysis with comprehensive search and appropriate statistical methods",
    aiAnalysisStatus: "completed",
    qualityScore: 87,
    identifiedGaps: {
      methodology: ["Limited to short-term outcomes", "Heterogeneity in intervention protocols"],
      statistical: ["Some comparisons based on limited direct evidence", "Publication bias not fully assessed"],
      clinical: ["Long-term effectiveness unknown", "Optimal treatment duration unclear"],
      bias: ["Potential for small-study effects in network estimates"]
    },
    generatedQuestions: {
      critical: [
        "What are the long-term comparative effects of these interventions?",
        "How do results vary by patient characteristics and severity?"
      ],
      moderate: [
        "What is the optimal duration and frequency for each technique?",
        "Are combination approaches more effective than single interventions?"
      ],
      minor: [
        "How do costs compare across different manual therapy approaches?",
        "What are clinician preferences and training requirements?"
      ]
    },
    biasAssessment: {
      selectionBias: { score: 8, notes: "Comprehensive search with multiple databases" },
      performanceBias: { score: 6, notes: "Variable blinding across included studies" },
      detectionBias: { score: 7, notes: "Most studies had adequate outcome assessment" },
      attritionBias: { score: 7, notes: "Generally low dropout rates in included studies" },
      reportingBias: { score: 6, notes: "Funnel plot asymmetry suggests possible publication bias" }
    },
    methodologyAssessment: {
      sampleSizeAdequacy: { score: 8, notes: "Good total sample size across network" },
      studyDesign: { score: 9, notes: "High-quality network meta-analysis methodology" },
      outcomeValidation: { score: 7, notes: "Mix of validated and non-validated outcome measures" },
      followUpDuration: { score: 6, notes: "Most studies limited to short-term follow-up" },
      statisticalMethods: { score: 9, notes: "Appropriate network meta-analysis techniques with sensitivity analyses" }
    },
    aiAnalyzedAt: new Date("2024-01-20T13:20:00Z")
  },

  // Additional Shoulder Research
  {
    title: "Effectiveness of Scapular Stabilization Exercises in Overhead Athletes with Shoulder Impingement: A Systematic Review",
    authors: "Peterson, M.K., Chang, L.W., Roberts, S.A., Miller, D.J.",
    journal: "Sports Medicine",
    publicationDate: new Date("2024-02-15"),
    doi: "10.1007/s40279-024-01987-3",
    abstract: "Background: Scapular dysfunction contributes to shoulder impingement in overhead athletes. Objective: To systematically review the effectiveness of scapular stabilization exercises in overhead athletes with shoulder impingement. Methods: Databases were searched for RCTs comparing scapular stabilization exercises to control interventions in overhead athletes. Results: Eight studies (n=342) were included. Scapular stabilization exercises significantly improved pain (SMD -1.2, 95% CI -1.8 to -0.6) and scapular kinematics compared to controls. Return to sport rates were 15% higher in the exercise group. Conclusion: Scapular stabilization exercises are highly effective for shoulder impingement in overhead athletes.",
    url: "https://link.springer.com/article/10.1007/s40279-024-01987-3",
    bodyPart: "shoulder",
    keyFindings: "Scapular exercises significantly improve pain, function, and return to sport in overhead athletes",
    clinicalRelevance: "Very High - specific to athletic population with clear treatment protocol",
    methodology: "Systematic review of RCTs with sport-specific outcome measures",
    aiAnalysisStatus: "completed",
    qualityScore: 88
  },

  {
    title: "Glenohumeral Internal Rotation Deficit and Its Association with Shoulder Injuries in Baseball Pitchers",
    authors: "Rodriguez, A.M., Kim, J.H., Brown, T.L., Davis, P.K.",
    journal: "American Journal of Sports Medicine",
    publicationDate: new Date("2024-01-28"),
    doi: "10.1177/03635465240123456",
    abstract: "Purpose: To investigate the relationship between glenohumeral internal rotation deficit (GIRD) and shoulder injury risk in professional baseball pitchers. Methods: Prospective cohort study of 156 professional pitchers followed for 2 seasons. GIRD was measured preseason using standardized goniometry. Results: Pitchers with GIRD >20° had 3.2 times higher injury risk (95% CI 1.8-5.7). GIRD was the strongest predictor of shoulder injury (OR 3.2, p<0.001). Conclusion: GIRD >20° significantly increases shoulder injury risk in baseball pitchers.",
    url: "https://journals.sagepub.com/doi/10.1177/03635465240123456",
    bodyPart: "shoulder",
    keyFindings: "GIRD >20° increases shoulder injury risk 3.2-fold in professional pitchers",
    clinicalRelevance: "High - provides specific screening thresholds for injury prevention",
    methodology: "Large prospective cohort with validated injury tracking",
    aiAnalysisStatus: "completed",
    qualityScore: 86
  },

  // Back/Spine Research
  {
    title: "Motor Control Exercise versus General Exercise for Chronic Low Back Pain: A Network Meta-Analysis",
    authors: "Wang, S.L., O'Sullivan, P.B., Beales, D.J., Macedo, L.G.",
    journal: "Physical Therapy",
    publicationDate: new Date("2024-03-01"),
    doi: "10.1093/ptj/pzad456",
    abstract: "Background: Multiple exercise approaches exist for chronic low back pain with unclear comparative effectiveness. Objective: To compare motor control exercise, general exercise, and other interventions using network meta-analysis. Methods: 45 RCTs (n=4,567) were included comparing motor control exercise, general exercise, manual therapy, and usual care. Results: Motor control exercise ranked highest for disability reduction (SUCRA 0.82) and second for pain (SUCRA 0.74). Effect sizes were moderate for both disability (SMD -0.65) and pain (SMD -0.52) versus usual care. Conclusion: Motor control exercise appears most effective for functional improvement in chronic low back pain.",
    url: "https://academic.oup.com/ptj/article/doi/10.1093/ptj/pzad456",
    bodyPart: "back",
    keyFindings: "Motor control exercise most effective for disability reduction in chronic low back pain",
    clinicalRelevance: "Very High - provides treatment hierarchy for clinical decision-making",
    methodology: "Large network meta-analysis with comprehensive treatment comparisons",
    aiAnalysisStatus: "completed",
    qualityScore: 91
  },

  {
    title: "Lumbar Spine Segmental Motion During Activities of Daily Living: A Systematic Review",
    authors: "Taylor, N.F., Evans, O.M., Mitchell, K.L., Thompson, R.J.",
    journal: "Clinical Biomechanics",
    publicationDate: new Date("2024-02-20"),
    doi: "10.1016/j.clinbiomech.2024.106078",
    abstract: "Background: Understanding normal lumbar segmental motion is crucial for assessment and treatment planning. Objective: To systematically review lumbar segmental motion patterns during activities of daily living. Methods: Studies using validated motion analysis systems during functional activities were included. Results: 24 studies met criteria. L4-L5 and L5-S1 showed greatest motion during lifting (mean 8.2° and 9.1° flexion respectively). Segmental coupling patterns varied significantly between pain-free and chronic low back pain populations. Conclusion: Distinct segmental motion patterns exist during functional activities with clear differences in chronic pain populations.",
    url: "https://www.sciencedirect.com/science/article/pii/S0268003324001234",
    bodyPart: "back",
    keyFindings: "L4-L5 and L5-S1 show greatest motion during lifting; coupling patterns differ in chronic pain",
    clinicalRelevance: "High - provides normative data for movement assessment",
    methodology: "Systematic review of biomechanical studies with standardized motion analysis",
    aiAnalysisStatus: "completed",
    qualityScore: 83
  },

  // Knee Research
  {
    title: "Neuromuscular Training Programs for ACL Injury Prevention: A Meta-Analysis of Biomechanical Outcomes",
    authors: "Johnson, K.R., Liu, H.M., Anderson, C.P., Williams, J.T.",
    journal: "Sports Medicine",
    publicationDate: new Date("2024-01-15"),
    doi: "10.1007/s40279-024-01923-1",
    abstract: "Objective: To evaluate the effectiveness of neuromuscular training programs on biomechanical risk factors for ACL injury. Methods: Meta-analysis of RCTs examining knee valgus, ground reaction forces, and muscle activation patterns. Results: 18 studies (n=1,456) included. Neuromuscular training significantly reduced knee valgus angle by 4.2° (95% CI 2.8-5.6°, p<0.001) and increased hip flexion by 6.8° (95% CI 4.1-9.5°). Hamstring activation increased by 23% during landing tasks. Conclusion: Neuromuscular training effectively modifies biomechanical risk factors associated with ACL injury.",
    url: "https://link.springer.com/article/10.1007/s40279-024-01923-1",
    bodyPart: "knee",
    keyFindings: "Neuromuscular training reduces knee valgus by 4.2° and increases hamstring activation by 23%",
    clinicalRelevance: "Very High - provides specific biomechanical targets for injury prevention",
    methodology: "Meta-analysis with objective biomechanical outcome measures",
    aiAnalysisStatus: "completed",
    qualityScore: 89
  },

  {
    title: "Patellofemoral Pain in Adolescent Athletes: Risk Factors and Evidence-Based Management",
    authors: "Chen, M.Y., Roberts, L.K., Thompson, A.D., Wilson, S.M.",
    journal: "British Journal of Sports Medicine",
    publicationDate: new Date("2024-02-10"),
    doi: "10.1136/bjsports-2024-107890",
    abstract: "Objective: To identify risk factors and evaluate management strategies for patellofemoral pain in adolescent athletes. Methods: Systematic review and meta-analysis of studies in athletes aged 12-18 years. Results: 22 studies identified hip weakness (OR 2.4, 95% CI 1.6-3.7) and poor landing mechanics (OR 3.1, 95% CI 2.1-4.6) as primary risk factors. Hip strengthening combined with movement retraining showed largest effect sizes (SMD -1.3 for pain, -1.1 for function). Conclusion: Hip strengthening with movement training is most effective for adolescent patellofemoral pain.",
    url: "https://bjsm.bmj.com/content/early/2024/02/10/bjsports-2024-107890",
    bodyPart: "knee",
    keyFindings: "Hip weakness and poor landing mechanics are primary risk factors; combined training most effective",
    clinicalRelevance: "Very High - age-specific evidence for common adolescent condition",
    methodology: "Age-specific systematic review with meta-analysis",
    aiAnalysisStatus: "completed",
    qualityScore: 87
  },

  // Hip Research
  {
    title: "Effectiveness of Exercise Therapy for Greater Trochanteric Pain Syndrome: A Systematic Review",
    authors: "Murphy, S.L., Jackson, R.P., Lee, K.J., Brown, M.A.",
    journal: "Journal of Hip Preservation Surgery",
    publicationDate: new Date("2024-01-30"),
    doi: "10.1093/jhps/hnae012",
    abstract: "Background: Greater trochanteric pain syndrome (GTPS) is a common cause of lateral hip pain. Objective: To evaluate exercise therapy effectiveness for GTPS. Methods: Systematic review of RCTs comparing exercise to control interventions. Results: 12 studies (n=892) included. Exercise therapy showed significant improvements in pain (SMD -0.8, 95% CI -1.2 to -0.4) and function (SMD -0.7, 95% CI -1.1 to -0.3). Hip abductor strengthening was the most effective component. Wait-and-see approach showed minimal improvement. Conclusion: Exercise therapy, particularly hip abductor strengthening, is effective for GTPS.",
    url: "https://academic.oup.com/jhps/article/doi/10.1093/jhps/hnae012",
    bodyPart: "hip",
    keyFindings: "Hip abductor strengthening most effective component for GTPS management",
    clinicalRelevance: "High - provides specific exercise prescription guidance",
    methodology: "Systematic review focused on exercise interventions",
    aiAnalysisStatus: "completed",
    qualityScore: 84
  },

  {
    title: "Femoroacetabular Impingement and Hip Labral Tears: Clinical Assessment and Conservative Management",
    authors: "Grimaldi, A., Mellor, R., Nicolson, P., Hodges, P., Bennell, K.",
    journal: "Physical Therapy in Sport",
    publicationDate: new Date("2024-03-05"),
    doi: "10.1016/j.ptsp.2024.03.007",
    abstract: "Background: Femoroacetabular impingement (FAI) and labral tears are increasingly recognized hip conditions. Objective: To evaluate clinical assessment methods and conservative management outcomes. Methods: Narrative review of recent evidence on FAI assessment and treatment. Results: Clinical tests show limited diagnostic accuracy (sensitivity 50-75%). Hip strengthening and movement modification show moderate evidence for pain and function improvement. Intra-articular injection can guide treatment decisions. Surgery outcomes superior for structural abnormalities. Conclusion: Conservative management should be first-line treatment with structured exercise and movement modification.",
    url: "https://www.sciencedirect.com/science/article/pii/S1466853X24000707",
    bodyPart: "hip",
    keyFindings: "Conservative management with hip strengthening should be first-line; clinical tests have limited accuracy",
    clinicalRelevance: "Very High - provides clinical decision-making framework for common hip condition",
    methodology: "Expert narrative review with evidence synthesis",
    aiAnalysisStatus: "completed",
    qualityScore: 82
  },

  // Ankle Research
  {
    title: "Balance Training versus Strength Training for Chronic Ankle Instability: A Randomized Controlled Trial",
    authors: "Freeman, M.A., Thompson, K.L., Davis, J.P., Wilson, R.S.",
    journal: "American Journal of Sports Medicine",
    publicationDate: new Date("2024-02-25"),
    doi: "10.1177/03635465240156789",
    abstract: "Purpose: To compare balance training versus strength training for chronic ankle instability (CAI). Methods: 90 participants with CAI randomized to balance training (n=30), strength training (n=30), or control (n=30) for 6 weeks. Primary outcomes were Cumberland Ankle Instability Tool (CAIT) and single-limb balance time. Results: Both interventions improved CAIT scores and balance compared to control. Balance training showed superior improvements in dynamic balance (p=0.02) while strength training was better for muscle strength (p<0.001). Combined approach may be optimal. Conclusion: Both balance and strength training are effective for CAI with specific advantages.",
    url: "https://journals.sagepub.com/doi/10.1177/03635465240156789",
    bodyPart: "ankle",
    keyFindings: "Both balance and strength training effective; combined approach may be optimal for CAI",
    clinicalRelevance: "High - provides treatment comparison for common ankle condition",
    methodology: "Well-designed RCT with validated outcome measures",
    aiAnalysisStatus: "completed",
    qualityScore: 85
  },

  // Wrist/Hand Research
  {
    title: "Conservative Management of De Quervain's Tenosynovitis: A Systematic Review and Meta-Analysis",
    authors: "Singh, P.K., Martinez, L.R., Johnson, A.T., Lee, S.W.",
    journal: "Journal of Hand Surgery (European Volume)",
    publicationDate: new Date("2024-01-20"),
    doi: "10.1177/17531934240123456",
    abstract: "Background: De Quervain's tenosynovitis commonly affects the radial wrist. Objective: To evaluate conservative management effectiveness. Methods: Systematic review of RCTs and cohort studies examining splinting, exercises, injections, and manual therapy. Results: 15 studies (n=678) included. Corticosteroid injection most effective short-term (success rate 83% vs 14% control). Thumb spica splinting effective when combined with exercises (success rate 68%). Manual therapy showed moderate benefits. Conclusion: Corticosteroid injection most effective short-term; splinting with exercises effective conservative option.",
    url: "https://journals.sagepub.com/doi/10.1177/17531934240123456",
    bodyPart: "wrist",
    keyFindings: "Corticosteroid injection most effective short-term; splinting with exercises good conservative option",
    clinicalRelevance: "High - provides treatment hierarchy for common wrist condition",
    methodology: "Systematic review with multiple treatment comparisons",
    aiAnalysisStatus: "completed",
    qualityScore: 81
  },

  // Neck Research  
  {
    title: "Effectiveness of Manual Therapy for Cervicogenic Headache: A Systematic Review and Meta-Analysis",
    authors: "Clark, R.J., Evans, M.P., Taylor, S.K., Wilson, D.L.",
    journal: "Cephalalgia",
    publicationDate: new Date("2024-02-15"),
    doi: "10.1177/03331024240987654",
    abstract: "Background: Cervicogenic headache accounts for 15-20% of chronic headaches. Objective: To evaluate manual therapy effectiveness for cervicogenic headache. Methods: Meta-analysis of RCTs comparing manual therapy to control interventions. Results: 11 studies (n=564) included. Manual therapy significantly reduced headache frequency (SMD -0.9, 95% CI -1.4 to -0.4) and intensity (SMD -1.1, 95% CI -1.6 to -0.6) compared to controls. Upper cervical mobilization most effective technique. Effects maintained at 3-month follow-up. Conclusion: Manual therapy, particularly upper cervical mobilization, is effective for cervicogenic headache.",
    url: "https://journals.sagepub.com/doi/10.1177/03331024240987654",
    bodyPart: "neck",
    keyFindings: "Upper cervical mobilization most effective; effects maintained at 3 months",
    clinicalRelevance: "High - provides specific technique recommendation for headache management",
    methodology: "Meta-analysis with technique-specific subgroup analysis",
    aiAnalysisStatus: "completed",
    qualityScore: 86
  },

  // Elbow Research
  {
    title: "Lateral Epicondylalgia Treatment: Comparing Exercise Therapy to Corticosteroid Injection - Long-term Outcomes",
    authors: "Bisset, L.M., Coombes, B.K., Vicenzino, B.T., Connell, D.A.",
    journal: "British Medical Journal",
    publicationDate: new Date("2024-01-10"),
    doi: "10.1136/bmj-2024-078901",
    abstract: "Objective: To compare long-term outcomes of exercise therapy versus corticosteroid injection for lateral epicondylalgia. Methods: 12-month follow-up of RCT comparing eccentric exercise program to corticosteroid injection. Results: 165 participants completed follow-up. Exercise group showed superior outcomes at 12 months for pain (VAS 2.1 vs 4.7, p<0.001) and function (PRTEE 15.2 vs 28.9, p<0.001). Injection group had higher recurrence rates (42% vs 8%, p<0.001). Exercise therapy was more cost-effective. Conclusion: Exercise therapy provides superior long-term outcomes compared to corticosteroid injection for lateral epicondylalgia.",
    url: "https://www.bmj.com/content/378/bmj-2024-078901",
    bodyPart: "elbow",
    keyFindings: "Exercise therapy superior long-term outcomes; lower recurrence rates and more cost-effective",
    clinicalRelevance: "Very High - challenges common practice of injection as first-line treatment",
    methodology: "Long-term RCT follow-up with economic evaluation",
    aiAnalysisStatus: "completed",
    qualityScore: 92
  },

  // Foot Research
  {
    title: "Plantar Fasciitis Treatment: Systematic Review of Exercise Interventions",
    authors: "Rodriguez, C.M., Thompson, B.K., Lee, J.H., Martinez, A.P.",
    journal: "Sports Medicine",
    publicationDate: new Date("2024-03-10"),
    doi: "10.1007/s40279-024-01945-7",
    abstract: "Background: Plantar fasciitis is the most common cause of heel pain. Objective: To systematically review exercise interventions for plantar fasciitis. Methods: RCTs comparing exercise to control interventions were included. Results: 16 studies (n=1,023) analyzed. Plantar fascia stretching most effective (SMD -1.2 for pain). Calf stretching and strengthening showed moderate benefits. High-load strength training emerging as effective intervention. Eccentric exercises superior to concentric. Conclusion: Plantar fascia-specific stretching most effective; high-load strength training shows promise.",
    url: "https://link.springer.com/article/10.1007/s40279-024-01945-7",
    bodyPart: "foot",
    keyFindings: "Plantar fascia stretching most effective; high-load strength training emerging intervention",
    clinicalRelevance: "High - provides exercise prescription hierarchy for common foot condition",
    methodology: "Systematic review with exercise-specific analysis",
    aiAnalysisStatus: "completed",
    qualityScore: 84
  }
];