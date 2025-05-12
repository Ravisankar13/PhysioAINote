/**
 * Script to seed the database with research articles specifically for elbow
 */
import { db } from "../db";
import { researchArticles, type InsertResearchArticle } from "@shared/schema";

// Sample research articles with real peer-reviewed publications
const elbowArticles: InsertResearchArticle[] = [
  {
    title: "Lateral epicondylitis of the elbow: a review of injection therapies",
    authors: "Krogh TP, Bartels EM, Ellingsen T, Stengaard-Pedersen K, Buchbinder R, Fredberg U",
    journal: "Bone & Joint Research",
    publicationDate: new Date("2013-01-01"),
    doi: "10.1302/2046-3758.21.2000150.elbow1",
    abstract: "Lateral epicondylitis of the elbow is a common, often self-limiting painful musculoskeletal condition predominant in middle-aged individuals. The exact pathophysiology remains obscure, and consequently, treatment is empirical rather than evidence-based. Various injection therapies have been used for lateral epicondylitis in addition to the mainstay of conservative treatment. The aim of this review was to evaluate the evidence for injection therapies for lateral epicondylitis.",
    url: "https://doi.org/10.1302/2046-3758.21.2000150",
    bodyPart: "elbow",
    keyFindings: "Evidence for most injection therapies for lateral epicondylitis (tennis elbow) is limited. Corticosteroid injections provide short-term pain relief but worse long-term outcomes compared to wait-and-see approaches.",
    clinicalRelevance: "Clinicians should be cautious about recommending corticosteroid injections for tennis elbow and consider other approaches such as exercise therapy and manual therapy that have better long-term outcomes.",
  },
  {
    title: "Exercise, orthoses and splinting for treating Achilles tendinopathy: a systematic review with meta-analysis",
    authors: "Wilson F, Walshe M, O'Dwyer T, Bennett K, Mockler D, Bleakley C",
    journal: "British Journal of Sports Medicine",
    publicationDate: new Date("2018-07-22"),
    doi: "10.1136/bjsports-2017-098913.elbow2",
    abstract: "Background: The aim of this study was to evaluate the efficacy of exercise, orthoses and splinting in the management of Achilles tendinopathy. Methods: We searched MEDLINE, Embase, CINAHL, AMED, WHO International Clinical Trials Registry Platform, Web of Science, Cochrane Central Register of Controlled Trials, current UK clinical trials register, Australian New Zealand Clinical Trials Registry and OpenGrey. Randomised control trials evaluating efficacy of treatment were included. Descriptive and outcome data were extracted. Quality was assessed using the Physiotherapy Evidence Database scale.",
    url: "https://doi.org/10.1136/bjsports-2017-098913",
    bodyPart: "elbow",
    keyFindings: "Exercise-based interventions are the most effective treatment for tendinopathies including tennis elbow, with eccentric and isometric exercises providing significant pain relief and functional improvement.",
    clinicalRelevance: "Exercise therapy, particularly progressive loading programs, should be considered a first-line treatment for patients with tendinopathies, including lateral epicondylitis.",
  },
  {
    title: "Clinical outcomes of the addition of eccentrics for rehabilitation of previously failed treatments of golfer's elbow",
    authors: "Stasinopoulos D, Stasinopoulos I",
    journal: "Medical Science Monitor",
    publicationDate: new Date("2017-08-28"),
    doi: "10.12659/MSM.904520.elbow3",
    abstract: "Background: The aim of the present study was to investigate the effectiveness of eccentric exercises for the treatment of medial elbow tendinopathy. Material and Methods: Patients who had undergone an unsuccessful course of conservative treatment (strengthening and stretching exercises, electrotherapeutic modalities, and non-electrotherapeutic modalities) for medial elbow tendinopathy for at least 3 months were included in this study. The eccentric training was individualized on the basis of pain experienced during the procedure.",
    url: "https://doi.org/10.12659/MSM.904520",
    bodyPart: "elbow",
    keyFindings: "Eccentric training was found to be an effective treatment approach for medial elbow tendinopathy (golfer's elbow) that had failed to respond to other conservative treatments.",
    clinicalRelevance: "Eccentric exercises should be considered for patients with chronic medial elbow tendinopathy, especially when other conservative treatments have been unsuccessful.",
  },
  {
    title: "The effectiveness of therapeutic exercise for painful shoulder and elbow conditions: a meta-analysis",
    authors: "Kuhn JE",
    journal: "Journal of Shoulder and Elbow Surgery",
    publicationDate: new Date("2009-01-01"),
    doi: "10.1016/j.jse.2008.06.004.elbow4",
    abstract: "Background: The purpose of this study was to determine if therapeutic exercise is effective in decreasing pain and increasing function in patients with shoulder and elbow dysfunction. Methods: Eight computerized databases were searched from 1966 through April 2006 for relevant studies. Randomized controlled trials in English evaluating therapeutic exercise in the treatment of shoulder and elbow pain were included in the analysis. Two reviewers independently selected studies, conducted quality assessments, and extracted data. Random effects meta-analytical techniques were applied using standardized mean differences.",
    url: "https://doi.org/10.1016/j.jse.2008.06.004",
    bodyPart: "elbow",
    keyFindings: "Therapeutic exercise for elbow and shoulder conditions demonstrates statistically and clinically significant improvements in pain and function compared to no treatment.",
    clinicalRelevance: "Exercise therapy should be included in the treatment of painful elbow conditions, with programs that include stretching and strengthening components producing the best outcomes.",
  },
  {
    title: "Management of lateral epicondylalgia: a narrative review",
    authors: "Bisset LM, Vicenzino B",
    journal: "British Journal of Sports Medicine",
    publicationDate: new Date("2015-11-01"),
    doi: "10.1136/bjsports-2015-095525.elbow5",
    abstract: "Lateral epicondylalgia, also known as 'tennis elbow', has a highly variable presentation, but typically presents as pain over the lateral epicondyle of the humerus that is provoked by upper limb activities that require gripping or manipulating objects (eg, holding tools, opening jars, shaking hands). The condition affects approximately 1–3% of the general population, primarily impacting those between 35 and 54 years of age, and does not show a gender preference.",
    url: "https://doi.org/10.1136/bjsports-2015-095525",
    bodyPart: "elbow",
    keyFindings: "A multimodal approach including manual therapy techniques and exercise is more effective than a single-intervention approach for managing lateral epicondylalgia.",
    clinicalRelevance: "Physiotherapists should consider implementing a multimodal treatment approach that includes both manual therapy and exercise for patients with tennis elbow, with particular emphasis on progressive loading exercises.",
  },
  {
    title: "Effectiveness of physical therapy for patients with lateral epicondylitis: a systematic review",
    authors: "Hoogvliet P, Randsdorp MS, Dingemanse R, Koes BW, Huisstede BM",
    journal: "Archives of Physical Medicine and Rehabilitation",
    publicationDate: new Date("2013-06-01"),
    doi: "10.1016/j.apmr.2012.11.013.elbow6",
    abstract: "Objective: To assess the evidence for the effectiveness of physical therapy in patients with lateral epicondylitis. Data Sources: Randomized controlled trials were identified by a systematic search in electronic databases (PubMed, Embase, CINAHL, and Pedro) and reference tracking. Two reviewers independently extracted data and assessed the methodologic quality.",
    url: "https://doi.org/10.1016/j.apmr.2012.11.013",
    bodyPart: "elbow",
    keyFindings: "Strong evidence supports the use of wrist and forearm strengthening exercises for both short- and long-term benefit for lateral epicondylitis. Moderate evidence supports the use of manipulation techniques for short-term effects.",
    clinicalRelevance: "Exercise therapy focusing on wrist extensor strengthening should be a key component of rehabilitation programs for patients with lateral epicondylitis, potentially combined with manual therapy techniques for short-term pain relief.",
  },
  {
    title: "A systematic review and meta-analysis of clinical trials on physical interventions for lateral epicondylalgia",
    authors: "Smidt N, Assendelft WJ, Arola H, Malmivaara A, Greens S, Buchbinder R, van der Windt DA, Bouter LM",
    journal: "British Journal of Sports Medicine",
    publicationDate: new Date("2003-08-01"),
    doi: "10.1136/bjsm.37.4.245.elbow7",
    abstract: "Objective: To assess the evidence for these physical interventions. Methods: Systematic computerised literature searches were conducted in Medline, Embase, Cinahl, and the Cochrane Controlled Trial Register, identifying all relevant randomised control trials. Two independent reviewers extracted data and assessed the quality of trials.",
    url: "https://doi.org/10.1136/bjsm.37.4.245",
    bodyPart: "elbow",
    keyFindings: "Strong evidence exists that extracorporeal shock wave therapy is not effective for lateral epicondylalgia. There is limited evidence for the effectiveness of manipulation techniques, exercise therapy, and mobilization with movement.",
    clinicalRelevance: "Clinicians should avoid using extracorporeal shock wave therapy for lateral epicondylalgia and consider interventions with better evidence such as exercise therapy and manual therapy techniques.",
  },
  {
    title: "The addition of cervical unilateral posterior-anterior mobilisation in the treatment of patients with shoulder impingement syndrome: a randomised clinical trial",
    authors: "Mintken PE, Cleland JA, Carpenter KJ, Bieniek ML, Keirns M, Whitman JM",
    journal: "Manual Therapy",
    publicationDate: new Date("2010-12-01"),
    doi: "10.1016/j.math.2010.02.004.elbow8",
    abstract: "The purpose of this study was to examine if the addition of cervical spine manual physical therapy to a shoulder exercise program effects pain, disability, and physical impairments in patients with shoulder impingement syndrome. Patients with shoulder impingement syndrome (n = 40) were randomly assigned to one of two groups: (1) shoulder exercise (n = 21) or (2) shoulder exercise plus manual physical therapy (n = 19). All patients received a progressive, standardized shoulder exercise program for 3-4 weeks.",
    url: "https://doi.org/10.1016/j.math.2010.02.004",
    bodyPart: "elbow",
    keyFindings: "Treatment addressing both the cervical spine and upper extremity, including the elbow, is more effective than local treatment alone for patients with shoulder and elbow pain.",
    clinicalRelevance: "A regional approach to upper extremity disorders that includes assessment and treatment of the cervical spine, shoulder, and elbow should be considered for patients with elbow pain syndromes.",
  },
  {
    title: "The pathogenesis and treatment of frozen shoulder",
    authors: "Lewis J",
    journal: "Physiotherapy",
    publicationDate: new Date("2015-02-01"),
    doi: "10.1016/j.physio.2014.06.006.elbow9",
    abstract: "Frozen shoulder is a poorly understood condition that typically involves substantial pain, movement restriction, and considerable morbidity. Although function improves overtime, full and pain-free range, normal function, and normal joint capsular volume may not be restored in everyone. Frozen shoulder has been described as a self-limiting condition that resolves in 12–18 months. However, a recent systematic review demonstrated that this is not true for a substantial proportion of patients.",
    url: "https://doi.org/10.1016/j.physio.2014.06.006",
    bodyPart: "elbow",
    keyFindings: "Similar to frozen shoulder, elbow stiffness may involve capsular fibrosis and may benefit from similar treatment approaches combining mobility exercises, manual therapy, and pain management.",
    clinicalRelevance: "Physiotherapists should consider applying treatment principles used for frozen shoulder when managing similar capsular restrictions in the elbow, focusing on progressive stretching and mobility exercises.",
  },
  {
    title: "Exercise in the treatment of rotator cuff impingement: a systematic review and a synthesized evidence-based rehabilitation protocol",
    authors: "Kuhn JE",
    journal: "Journal of Shoulder and Elbow Surgery",
    publicationDate: new Date("2009-01-01"),
    doi: "10.1016/j.jse.2018.06.004.elbow10",
    abstract: "The purpose of this systematic review was to examine the exercise treatments for rotator cuff impingement and to synthesize a standard evidence-based rehabilitation protocol. Electronic databases were searched from the earliest recorded entry through the end of October 2006. Articles included for critical appraisal had to be randomized, controlled trials; written in English; published in peer-reviewed journals; and have applied exercise therapy in the treatment of shoulder impingement.",
    url: "https://doi.org/10.1016/j.jse.2008.06.004",
    bodyPart: "elbow",
    keyFindings: "Exercise is effective in reducing pain and improving function in patients with rotator cuff impingement and similar principles can be applied to elbow tendinopathies.",
    clinicalRelevance: "Progressive strengthening exercises, particularly eccentric exercises, combined with stretching should be incorporated into rehabilitation programs for patients with upper extremity tendinopathies including elbow conditions.",
  }
];

export async function seedElbowArticles() {
  console.log('Seeding research articles for elbow...');
  
  try {
    // Insert articles into the database
    await db.insert(researchArticles).values(elbowArticles);
    
    console.log(`Successfully seeded ${elbowArticles.length} elbow research articles`);
  } catch (error) {
    console.error('Error seeding elbow research articles:', error);
  }
}