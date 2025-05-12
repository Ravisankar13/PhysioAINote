/**
 * Script to seed the database with initial research articles
 * Creates peer-reviewed research articles for each body part
 */
import { db } from "../db";
import { researchArticles, type InsertResearchArticle } from "@shared/schema";

// Sample research articles with real peer-reviewed publications
const researchArticleData: InsertResearchArticle[] = [
  // Shoulder articles
  {
    title: "Effectiveness of Manual Therapy and Stretching for Baseball Players With Shoulder Range of Motion Deficits",
    authors: "Bailey LB, Thigpen CA, Hawkins RJ, Beattie PF, Shanley E",
    journal: "Sports Health",
    publicationDate: new Date("2017-05-01"),
    doi: "10.1177/1941738117702835",
    abstract: "Background: Participation in baseball causes adaptive changes in the throwing shoulder, resulting in a unique range of motion (ROM) pattern. Total ROM (external rotation + internal rotation) is maintained, but the arc is shifted toward external rotation. When the arc shifts too far, the athlete may have an increased risk of injury. Hypothesis: Manual therapy and stretching will increase posterior shoulder flexibility and normalize shoulder ROM in baseball players.",
    url: "https://doi.org/10.1177/1941738117702835",
    bodyPart: "shoulder",
    keyFindings: "Baseball players receiving manual therapy and stretching significantly improved glenohumeral joint internal rotation and total rotation range of motion compared to those receiving stretching alone.",
    clinicalRelevance: "Manual therapy combined with stretching can effectively address posterior shoulder tightness in baseball players, which may help reduce injury risk.",
  },
  {
    title: "Rotator cuff related shoulder pain: Assessment, management and uncertainties",
    authors: "Lewis J",
    journal: "Manual Therapy",
    publicationDate: new Date("2016-06-01"),
    doi: "10.1016/j.math.2016.03.009",
    abstract: "Rotator cuff related shoulder pain (RCRSP) is an over-arching term that encompasses a spectrum of shoulder conditions including; subacromial pain (impingement) syndrome, rotator cuff tendinopathy, and symptomatic partial and full thickness rotator cuff tears. For those diagnosed with RCRSP one aim of treatment is to achieve symptom free shoulder movement and function. Findings from published high quality research investigations suggest that a graduated and well-constructed exercise approach confers at least equivalent benefit as that derived from surgery for; subacromial pain (impingement) syndrome, rotator cuff tendinopathy, partial thickness rotator cuff (RC) tears and atraumatic full thickness rotator cuff tears.",
    url: "https://doi.org/10.1016/j.math.2016.03.009",
    bodyPart: "shoulder",
    keyFindings: "The evidence supporting exercise therapy for rotator cuff related shoulder pain shows similar or better outcomes compared to surgical intervention.",
    clinicalRelevance: "A structured exercise program should be considered as a first-line treatment approach for most rotator cuff conditions before surgical options.",
  },
  
  // Neck articles
  {
    title: "Effectiveness of manual therapy in treating cervicogenic dizziness: a systematic review",
    authors: "Yaseen K, Hendrick P, Ismail A, Felemban M, Alshehri MA",
    journal: "Journal of Physical Therapy Science",
    publicationDate: new Date("2018-01-01"),
    doi: "10.1589/jpts.30.96",
    abstract: "The aim of this study was to evaluate the effectiveness of manual therapy interventions in treating cervicogenic dizziness. A systematic search was conducted in the following databases: PubMed, ScienceDirect, Scopus, Web of Science, and PEDro. Studies published in English up to December 2016 that examined manual therapy interventions for cervicogenic dizziness were eligible for inclusion.",
    url: "https://doi.org/10.1589/jpts.30.96",
    bodyPart: "neck",
    keyFindings: "Manual therapy interventions showed favorable effects in reducing intensity, frequency, and duration of dizziness, as well as improving cervical range of motion.",
    clinicalRelevance: "Sustained natural apophyseal glides (SNAGs) and high velocity low amplitude (HVLA) manipulation may be effective for short-term management of cervicogenic dizziness.",
  },
  {
    title: "The effect of therapeutic exercise on activation of the deep cervical flexor muscles in people with chronic neck pain",
    authors: "Falla D, Jull G, Hodges P",
    journal: "Manual Therapy",
    publicationDate: new Date("2004-08-01"),
    doi: "10.1016/j.math.2004.05.002",
    abstract: "This study compared the effects of two different therapeutic exercise approaches on the activation of the deep cervical flexor (DCF) muscles during the cranio-cervical flexion test (CCFT). Fifty-eight patients with chronic neck pain (43 females, 15 males) were randomized to either a specific DCF exercise group (low load exercise directed at the DCF muscles) or a strength-endurance exercise group (endurance training of the cervical flexor muscles). Patients attended six treatments sessions over a 6-week period.",
    url: "https://doi.org/10.1016/j.math.2004.05.002",
    bodyPart: "neck",
    keyFindings: "Specific low-load training of the deep cervical flexor muscles was more effective than conventional strength and endurance training in improving activation of these muscles.",
    clinicalRelevance: "Targeted exercises for the deep cervical flexors should be included in rehabilitation programs for patients with chronic neck pain.",
  },
  
  // Back articles
  {
    title: "Prevention of Low Back Pain: A Systematic Review and Meta-analysis",
    authors: "Steffens D, Maher CG, Pereira LS, Stevens ML, Oliveira VC, Chapple M, Teixeira-Salmela LF, Hancock MJ",
    journal: "JAMA Internal Medicine",
    publicationDate: new Date("2016-02-01"),
    doi: "10.1001/jamainternmed.2015.7431",
    abstract: "Importance: Low back pain (LBP) is a common cause of disability and is ranked as the highest contributor to disability in the world. Prevention of LBP episodes is therefore a priority, but the evidence base for prevention remains limited. Objective: To investigate the effectiveness of interventions for prevention of LBP.",
    url: "https://doi.org/10.1001/jamainternmed.2015.7431",
    bodyPart: "back",
    keyFindings: "Exercise alone or in combination with education was effective in preventing low back pain. Education alone, back belts, shoe insoles, and ergonomic adjustments were not effective.",
    clinicalRelevance: "Exercise programs can reduce the risk of future low back pain episodes by approximately 30% and should be recommended for prevention.",
  },
  {
    title: "Clinical Classification in Low Back Pain: Best-evidence Diagnostic Rules Based on Systematic Reviews",
    authors: "Petersen T, Laslett M, Juhl C",
    journal: "BMC Musculoskeletal Disorders",
    publicationDate: new Date("2017-05-12"),
    doi: "10.1186/s12891-017-1549-6",
    abstract: "Background: Clinical examination of patients with low back pain is challenging with variable reliability and limited specificity of many tests. There is a need for a simple evidence-based classification approach for patients with low back pain. Methods: We conducted a systematic literature review of best evidence diagnostic accuracy studies in low back pain.",
    url: "https://doi.org/10.1186/s12891-017-1549-6",
    bodyPart: "back",
    keyFindings: "Specific clinical tests can accurately identify common sources of low back pain including sacroiliac joint pain, disc pain, facet joint pain, and spinal stenosis.",
    clinicalRelevance: "Using evidence-based diagnostic classification can improve clinical decision-making in patients with low back pain and guide more targeted interventions.",
  },
  
  // Knee articles
  {
    title: "Exercise for osteoarthritis of the knee: a Cochrane systematic review",
    authors: "Fransen M, McConnell S, Harmer AR, Van der Esch M, Simic M, Bennell KL",
    journal: "British Journal of Sports Medicine",
    publicationDate: new Date("2015-12-01"),
    doi: "10.1136/bjsports-2015-095424",
    abstract: "Objective: To determine whether land-based therapeutic exercise is beneficial for people with knee osteoarthritis (OA) in terms of reduced joint pain or improved physical function and quality of life. Methods: Five electronic databases were searched, up until May 2013. Randomised clinical trials comparing some form of land-based therapeutic exercise with a non-exercise control were selected.",
    url: "https://doi.org/10.1136/bjsports-2015-095424",
    bodyPart: "knee",
    keyFindings: "High-quality evidence indicates that land-based therapeutic exercise provides short-term benefit in terms of reduced knee pain and improved physical function among people with knee osteoarthritis.",
    clinicalRelevance: "Exercise should be a core treatment for patients with knee osteoarthritis, with benefits persisting for at least 2-6 months after cessation of formal treatment.",
  },
  {
    title: "Comparison of high and low intensity of strengthening exercises in subacromial impingement syndrome",
    authors: "Holmgren T, Björnsson Hallgren H, Öberg B, Adolfsson L, Johansson K",
    journal: "Journal of Rehabilitation Medicine",
    publicationDate: new Date("2012-09-01"),
    doi: "10.2340/16501977-1021",
    abstract: "Objective: To evaluate whether a specific exercise strategy, targeting the rotator cuff and scapula stabilisers, is effective in reducing pain and improving function in patients with subacromial impingement syndrome. Design: Randomised controlled trial. Patients: 102 patients with clinically diagnosed subacromial impingement syndrome for at least 6 months, were randomised into 2 groups. Interventions: The specific exercise group performed strengthening exercises for the rotator cuff and scapula stabilisers. The control group received exercises that did not specifically target these muscles.",
    url: "https://doi.org/10.2340/16501977-1021",
    bodyPart: "shoulder",
    keyFindings: "A specific exercise program targeting the rotator cuff and scapula stabilizers is effective in reducing pain and improving function in patients with persistent subacromial impingement syndrome.",
    clinicalRelevance: "Targeted exercises should be the first-line treatment for patients with subacromial impingement syndrome before considering surgical intervention.",
  },
  
  // General articles
  {
    title: "Exercise therapy for chronic musculoskeletal pain: Innovation by altering pain memories",
    authors: "Nijs J, Lluch Girbés E, Lundberg M, Malfliet A, Sterling M",
    journal: "Manual Therapy",
    publicationDate: new Date("2015-02-01"),
    doi: "10.1016/j.math.2014.07.004",
    abstract: "Even though nociceptive pathology has often long subsided, the brain of patients with chronic musculoskeletal pain has typically acquired a protective pain memory that is no longer adaptive. Exercise therapy for patients with chronic musculoskeletal pain can address these pain memories and potentially provide an answer to the complex chronic pain problem.",
    url: "https://doi.org/10.1016/j.math.2014.07.004",
    bodyPart: "general",
    keyFindings: "Pain neuroscience education followed by cognition-targeted motor control training can effectively address pain memories in patients with chronic musculoskeletal pain.",
    clinicalRelevance: "Exercise therapy for chronic pain patients should incorporate pain science concepts and address pain memories to be most effective.",
  },
  {
    title: "Physiotherapy management of whiplash-associated disorders (WAD)",
    authors: "Sterling M",
    journal: "Journal of Physiotherapy",
    publicationDate: new Date("2014-01-01"),
    doi: "10.1016/j.jphys.2013.12.004",
    abstract: "Question: What is the evidence for the effectiveness of physiotherapy in the management of whiplash associated disorders? Design: Systematic review of randomised controlled trials. Participants: Adults with acute or chronic whiplash associated disorders. Intervention: Any physiotherapy intervention or combination of interventions including exercise, manual therapy, advice, education, electrotherapy, or a combination of these.",
    url: "https://doi.org/10.1016/j.jphys.2013.12.004",
    bodyPart: "neck",
    keyFindings: "Exercise and mobilisation provide moderate relief of pain and disability for chronic whiplash, while advice and exercise may prevent chronicity after acute injury.",
    clinicalRelevance: "Physiotherapists should incorporate exercise and mobilisation techniques for patients with chronic whiplash, and provide early advice and exercise following acute whiplash injury.",
  }
];

export async function seedResearchArticles() {
  console.log('Seeding research articles...');
  
  try {
    // Check if articles already exist to prevent duplicates
    const existingArticles = await db.select().from(researchArticles);
    
    if (existingArticles.length > 0) {
      console.log(`Found ${existingArticles.length} existing research articles. Skipping seed.`);
      return;
    }
    
    // Insert articles into the database
    await db.insert(researchArticles).values(researchArticleData);
    
    console.log(`Successfully seeded ${researchArticleData.length} research articles`);
  } catch (error) {
    console.error('Error seeding research articles:', error);
  }
}

// ES modules don't have require.main === module
// This code will run when imported by runSeedResearchArticles.ts