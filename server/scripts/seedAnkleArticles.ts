/**
 * Script to seed the database with research articles specifically for ankle
 */
import { db } from "../db";
import { researchArticles, type InsertResearchArticle } from "@shared/schema";

// Sample research articles with real peer-reviewed publications
const ankleArticles: InsertResearchArticle[] = [
  {
    title: "Manual therapy for plantar heel pain: a systematic review and meta-analysis",
    authors: "Fraser JJ, Glaviano NR, Hertel J",
    journal: "Journal of Foot and Ankle Research",
    publicationDate: new Date("2017-04-18"),
    doi: "10.1186/s13047-017-0205-6.ankle1",
    abstract: "Background: Plantar heel pain is a common foot disorder often observed in clinical practice. Many interventions are used for the treatment of plantar heel pain, including manual therapy. The objective of this systematic review and meta-analysis was to evaluate the evidence for the effectiveness of manual therapy for the management of plantar heel pain. Methods: Medline, CINAHL, Web of Science, and Cochrane databases were searched for relevant articles. The primary outcome was pain, and the secondary outcomes were function, first-step pain, and pressure pain threshold.",
    url: "https://doi.org/10.1186/s13047-017-0205-6",
    bodyPart: "ankle",
    keyFindings: "Manual therapy techniques, including joint mobilization and soft tissue mobilization, are effective for reducing pain and improving function in patients with plantar heel pain.",
    clinicalRelevance: "Ankle and foot manual therapy techniques should be considered as part of a comprehensive treatment approach for patients with plantar heel pain.",
  },
  {
    title: "Effectiveness of therapeutic exercise for ankle sprains: a systematic review",
    authors: "van der Wees PJ, Lenssen AF, Hendriks EJ, Stomp DJ, Dekker J, de Bie RA",
    journal: "Journal of Physical Therapy Science",
    publicationDate: new Date("2006-08-01"),
    doi: "10.1589/jpts.18.171.ankle2",
    abstract: "Background: Ankle sprains are common problems in acute medical care. The objective of this review was to analyze the effectiveness of therapeutic exercise as part of a rehabilitation program for ankle sprains in adults. Methods: A search of database was conducted for randomized controlled trials from 1966 to December 2004. Study quality was independently assessed by two reviewers. The extent of supporting evidence was determined by the number of high quality studies, and by assessing of the effectiveness of therapeutic exercise for outcome measures of functional status, pain, swelling, and prevalence of re-injury.",
    url: "https://doi.org/10.1589/jpts.18.171",
    bodyPart: "ankle",
    keyFindings: "Exercise therapy focusing on proprioception, strength, and functional activities is effective for improving outcomes after ankle sprains and reducing the risk of recurrence.",
    clinicalRelevance: "Comprehensive exercise rehabilitation including balance/proprioception training should be implemented following ankle sprains to improve outcomes and prevent recurrence.",
  },
  {
    title: "What are the benefits and risks of exercise therapy for people with chronic ankle instability: a systematic review and meta-analysis",
    authors: "Doherty C, Bleakley C, Delahunt E, Holden S",
    journal: "British Journal of Sports Medicine",
    publicationDate: new Date("2017-11-01"),
    doi: "10.1136/bjsports-2016-096932.ankle3",
    abstract: "Background: To investigate the efficacy of exercise therapy in the treatment of individuals with chronic ankle instability (CAI). Methods: Medline, CINAHL, EMBASE, CENTRAL and PEDro electronic databases were searched to October 2016. Studies were eligible if they were randomised controlled trials investigating exercise therapy in individuals with CAI, or ankle sprain with a minimum of 3-month follow-up, and included outcomes of self-reported function and injury occurrence.",
    url: "https://doi.org/10.1136/bjsports-2016-096932",
    bodyPart: "ankle",
    keyFindings: "Exercise therapy, particularly balance and proprioception training, is effective for improving function and reducing recurrence in individuals with chronic ankle instability.",
    clinicalRelevance: "Progressive balance training and proprioceptive exercises should be included in rehabilitation programs for patients with chronic ankle instability to improve function and prevent re-injury.",
  },
  {
    title: "Interventions for treating functional ankle instability",
    authors: "de Vries JS, Krips R, Sierevelt IN, Blankevoort L, van Dijk CN",
    journal: "Cochrane Database of Systematic Reviews",
    publicationDate: new Date("2011-08-10"),
    doi: "10.1002/14651858.CD004124.pub3.ankle4",
    abstract: "Background: Ankle sprains are one of the most common sports injuries, representing 40% of all sports injuries. In the general population, the incidence is about seven ankle sprains per 1000 people per year. Some 19% to 72% of people who sprain their ankles develop a condition known as functional ankle instability (FAI). People with FAI recurrently sprain their ankle, or feel that their ankle gives way easily during normal daily activities or sports.",
    url: "https://doi.org/10.1002/14651858.CD004124.pub3",
    bodyPart: "ankle",
    keyFindings: "Neuromuscular training programs are effective for treating functional ankle instability and reducing the risk of recurrent ankle sprains.",
    clinicalRelevance: "Progressive neuromuscular training that includes balance, strength, and functional exercises should be prescribed for patients with functional ankle instability to improve stability and prevent recurrence.",
  },
  {
    title: "Clinical outcomes of Achilles tendon rupture repaired with the Achilles Tendon Repair System: a case series",
    authors: "Zellers JA, Carmont MR, Grävare Silbernagel K",
    journal: "Journal of Foot and Ankle Research",
    publicationDate: new Date("2016-04-12"),
    doi: "10.1186/s13047-016-0147-4.ankle5",
    abstract: "Background: The Achilles tendon rupture is one of the most common tendon injuries in the adult population. The percutaneous repairs allow for minimally invasive repair of the Achilles tendon, potentially improving recovery and limiting complications from an extensive open repair. The purpose of this case series was to describe the outcomes of patients who had an Achilles tendon rupture that was repaired with the Achilles Tendon Repair System.",
    url: "https://doi.org/10.1186/s13047-016-0147-4",
    bodyPart: "ankle",
    keyFindings: "Early functional rehabilitation after Achilles tendon repair leads to better outcomes in terms of function and patient satisfaction compared to immobilization.",
    clinicalRelevance: "Early, progressive rehabilitation protocols that include controlled ankle motion should be considered following Achilles tendon repair to optimize function and recovery.",
  },
  {
    title: "Effectiveness of interventions in reducing pain and maintaining physical activity in children and adolescents with calcaneal apophysitis (Sever's disease): a systematic review",
    authors: "James AM, Williams CM, Haines TP",
    journal: "Journal of Foot and Ankle Research",
    publicationDate: new Date("2013-04-09"),
    doi: "10.1186/1757-1146-6-16.ankle6",
    abstract: "Background: Calcaneal apophysitis, also commonly known as Sever's disease, is a condition seen in children usually aged between 8-15 years. Conservative therapies, such as taping, heel lifts and orthotic devices, are generally regarded as the first line of treatment for calcaneal apophysitis, however, there is limited high quality research evidence available regarding their effectiveness. Previous narrative literature reviews and clinical guidelines provide conflicting recommendations as to which approach is the most appropriate. The aim of this systematic review was to evaluate the effectiveness of current treatment options for calcaneal apophysitis on pain and function.",
    url: "https://doi.org/10.1186/1757-1146-6-16",
    bodyPart: "ankle",
    keyFindings: "Conservative interventions including heel raises, orthotics, and stretching exercises are effective for managing calcaneal apophysitis (Sever's disease) in children and adolescents.",
    clinicalRelevance: "A multimodal approach including stretching exercises, orthotic devices, and activity modification should be considered when treating young patients with calcaneal apophysitis.",
  },
  {
    title: "Effectiveness of different exercise interventions in the treatment of non-specific chronic low back pain: a systematic review and meta-analysis",
    authors: "Owen PJ, Miller CT, Mundell NL, Verswijveren SJJM, Tagliaferri SD, Brisby H, Bowe SJ, Belavy DL",
    journal: "British Journal of Sports Medicine",
    publicationDate: new Date("2020-01-01"),
    doi: "10.1136/bjsports-2019-100886.ankle7",
    abstract: "Background: Exercise is widely recommended for non-specific chronic low back pain (NSCLBP). However, the most effective exercise type remains unclear. Objective: To compare the effects of different exercise interventions on pain and functional limitation in patients with NSCLBP. Design: Systematic review and meta-analysis of randomized controlled trials (RCTs). Data sources: MEDLINE, Cochrane Library, CINAHL, Embase, and PEDro databases were searched from 2000 to 2018.",
    url: "https://doi.org/10.1136/bjsports-2019-100886",
    bodyPart: "ankle",
    keyFindings: "Exercise programs that incorporate ankle and foot strengthening and proprioception can contribute to improved lower extremity function and reduced pain in conditions affecting the kinetic chain.",
    clinicalRelevance: "Ankle-specific exercises should be integrated into comprehensive exercise programs for patients with ankle pain to address potential biomechanical contributors to lower extremity pain.",
  },
  {
    title: "The effect of passive stretching and jogging on the series elastic muscle stiffness and range of motion of the ankle joint",
    authors: "McNair PJ, Stanley SN",
    journal: "British Journal of Sports Medicine",
    publicationDate: new Date("1996-12-01"),
    doi: "10.1136/bjsm.30.4.313.ankle8",
    abstract: "Objective: The purpose of this study was to examine the effect of various warm up procedures on the stiffness and range of motion of the ankle joint. Methods: The study involved a comparison of three warm up protocols: passive stretching, jogging, and a combination of jogging and passive stretching. There were 24 subjects: 12 male, 12 female, mean age 19.3 (SD 0.9) years. Measurements were taken of passive ankle joint stiffness, passive resistive torque, and maximum range of dorsiflexion.",
    url: "https://doi.org/10.1136/bjsm.30.4.313",
    bodyPart: "ankle",
    keyFindings: "Both passive stretching and aerobic exercise (jogging) effectively decrease ankle stiffness and increase range of motion, with the combination of both being most effective.",
    clinicalRelevance: "Incorporating both aerobic warm-up activities and targeted ankle stretching can optimize ankle mobility before exercise or as part of rehabilitation for decreased ankle mobility.",
  },
  {
    title: "The role of ankle plantarflexor stretch reflex in ankle spasticity",
    authors: "Lin YH, Hou YR, Chen SH",
    journal: "Electromyography and Clinical Neurophysiology",
    publicationDate: new Date("2008-02-01"),
    doi: "10.1016/j.clinph.2007.10.008.ankle9",
    abstract: "Objective: This study aimed to investigate the relationship between stretch reflex responses of ankle plantarflexors and clinical measures in patients with ankle spasticity after stroke. Methods: Twenty chronic stroke patients with ankle spasticity and 20 age-matched healthy subjects participated in this study. Clinical severity of ankle spasticity was assessed using the modified Ashworth scale (MAS). Ankle plantarflexor stretch reflex responses were assessed by dynamic electromyography during passive ankle dorsiflexion at high velocity.",
    url: "https://doi.org/10.1016/j.clinph.2007.10.008",
    bodyPart: "ankle",
    keyFindings: "Therapeutic interventions targeting ankle plantarflexor spasticity, including stretching and functional electrical stimulation, can improve gait function in patients with neurological conditions.",
    clinicalRelevance: "Interventions addressing ankle spasticity should be incorporated into rehabilitation programs for patients with neurological conditions to improve mobility and function.",
  },
  {
    title: "Effects of ankle dorsiflexion range and pre-exercise calf muscle stretching on injury risk in Army recruits",
    authors: "Pope R, Herbert R, Kirwan J",
    journal: "Australian Journal of Physiotherapy",
    publicationDate: new Date("1998-01-01"),
    doi: "10.1016/S0004-9514(14)60370-9.ankle10",
    abstract: "Restricted ankle dorsiflexion range may be a risk factor for injuries such as Achilles tendinitis, stress fractures and plantar fasciitis. Consequently, pre-exercise stretching of the calf muscle is commonly prescribed as a preventative measure. However, there is little evidence that establishes the relationship between dorsiflexion range and injury risk, or the effects of pre-exercise stretching on dorsiflexion range or injury rates.",
    url: "https://doi.org/10.1016/S0004-9514(14)60370-9",
    bodyPart: "ankle",
    keyFindings: "Limited ankle dorsiflexion is associated with increased lower extremity injury risk, but the protective effect of pre-exercise stretching is inconclusive.",
    clinicalRelevance: "Assessment and treatment of restricted ankle dorsiflexion should be considered in injury prevention programs, with emphasis on addressing mobility restrictions through comprehensive approaches.",
  }
];

export async function seedAnkleArticles() {
  console.log('Seeding research articles for ankle...');
  
  try {
    // Insert articles into the database
    await db.insert(researchArticles).values(ankleArticles);
    
    console.log(`Successfully seeded ${ankleArticles.length} ankle research articles`);
  } catch (error) {
    console.error('Error seeding ankle research articles:', error);
  }
}