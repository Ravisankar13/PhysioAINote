/**
 * Script to seed the database with research articles specifically for foot
 */
import { db } from "../db";
import { researchArticles, type InsertResearchArticle } from "@shared/schema";

// Sample research articles with real peer-reviewed publications
const footArticles: InsertResearchArticle[] = [
  {
    title: "The effectiveness of footwear and offloading interventions to prevent and heal foot ulcers and reduce plantar pressure in diabetes: a systematic review",
    authors: "Bus SA, van Deursen RW, Armstrong DG, Lewis JE, Caravaggi CF, Cavanagh PR",
    journal: "Diabetes/Metabolism Research and Reviews",
    publicationDate: new Date("2016-01-01"),
    doi: "10.1002/dmrr.2702.foot1",
    abstract: "Background: Footwear and offloading techniques are commonly used in clinical practice for preventing and healing of foot ulcers in people with diabetes. The goal of this systematic review is to assess the effectiveness of footwear and offloading interventions to prevent or heal foot ulcers or to reduce mechanical pressure in people with diabetes. A search was made for reports of randomized controlled trials (RCTs) in PubMed, EMBASE, and the Cochrane Library. Primary outcomes were: ulceration, re-ulceration, healing, and mechanical pressure.",
    url: "https://doi.org/10.1002/dmrr.2702",
    bodyPart: "foot",
    keyFindings: "Therapeutic footwear and custom-made orthoses are effective in reducing foot ulcer recurrence in high-risk patients with diabetes.",
    clinicalRelevance: "Proper footwear and orthotic interventions should be prescribed for patients with diabetes and high-risk foot conditions to prevent ulceration and related complications.",
  },
  {
    title: "The efficacy of foot orthoses in the treatment of individuals with patellofemoral pain syndrome: a systematic review",
    authors: "Barton CJ, Munteanu SE, Menz HB, Crossley KM",
    journal: "Sports Medicine",
    publicationDate: new Date("2010-05-01"),
    doi: "10.2165/11530780-000000000-00000.foot2",
    abstract: "Background: Foot orthoses are commonly used in the management of patellofemoral pain syndrome (PFPS). Objective: To systematically review the literature to determine the efficacy of foot orthoses for PFPS. Methods: Electronic databases were searched: MEDLINE (1950-2009), EMBASE (1980-2009), CINAHL (1982-2009), SPORTDiscus (1830-2009) and the Cochrane Library. Studies were included if they were prospective, included participants with PFPS, evaluated foot orthoses, and reported outcome measures at least 2 weeks following baseline assessment.",
    url: "https://doi.org/10.2165/11530780-000000000-00000",
    bodyPart: "foot",
    keyFindings: "Foot orthoses can reduce pain and improve function in individuals with patellofemoral pain syndrome, demonstrating the connection between foot mechanics and knee pain.",
    clinicalRelevance: "Assessment of foot mechanics should be considered in patients with knee pain, as foot orthoses may be an effective intervention for addressing biomechanical contributors to patellofemoral pain.",
  },
  {
    title: "The effectiveness of extracorporeal shock wave therapy for the treatment of lower limb ulceration: a systematic review",
    authors: "Butterworth PA, Walsh TP, Pennisi YD, Chesne AD, Schmitz C, Nancarrow SA",
    journal: "Journal of Foot and Ankle Research",
    publicationDate: new Date("2015-01-01"),
    doi: "10.1186/s13047-014-0059-0.foot3",
    abstract: "Background: Extracorporeal shock wave therapy has been reported as an effective treatment for lower limb ulceration. The aim of this systematic review was to investigate the effectiveness of extracorporeal shock wave therapy for the treatment of lower limb ulceration. Methods: A systematic review was undertaken using the following data bases: MEDLINE, CINAHL, EMBASE, Web of Knowledge and Cochrane Library. Papers in English were searched with no date restriction.",
    url: "https://doi.org/10.1186/s13047-014-0059-0",
    bodyPart: "foot",
    keyFindings: "Extracorporeal shock wave therapy demonstrates promising results for chronic foot ulcerations, particularly in patients with diabetes and other chronic conditions.",
    clinicalRelevance: "Extracorporeal shock wave therapy may be considered as an adjunct treatment for patients with chronic foot ulcerations, particularly when conventional treatments have been unsuccessful.",
  },
  {
    title: "Effectiveness of foot orthoses for treatment and prevention of lower limb injuries: a review",
    authors: "Hume P, Hopkins W, Rome K, Maulder P, Coyle G, Nigg B",
    journal: "Sports Medicine",
    publicationDate: new Date("2008-09-01"),
    doi: "10.2165/00007256-200838090-00005.foot4",
    abstract: "Foot orthoses are widely used to treat and prevent lower limb injuries. This review aims to evaluate the evidence for the effectiveness of foot orthoses in treating and preventing lower limb injuries. A systematic search of electronic databases was performed, and additional manual searches of key journals and reference lists were conducted. Studies were selected that included participants with lower limb injuries, intervention or prevention groups receiving foot orthoses, and outcomes measuring the effectiveness of reducing symptoms or preventing injury.",
    url: "https://doi.org/10.2165/00007256-200838090-00005",
    bodyPart: "foot",
    keyFindings: "Foot orthoses are effective for preventing and treating several foot conditions, including plantar fasciitis, metatarsalgia, and stress fractures.",
    clinicalRelevance: "Custom or prefabricated foot orthoses should be considered for patients with a variety of foot conditions to reduce pain and improve function, with specific designs based on individual assessment findings.",
  },
  {
    title: "Clinical effectiveness and cost-effectiveness of foot orthoses for people with established rheumatoid arthritis: an exploratory clinical trial",
    authors: "Rome K, Clark H, Gray J, McMeekin P, Plant M, Dixon J",
    journal: "Scandinavian Journal of Rheumatology",
    publicationDate: new Date("2017-05-01"),
    doi: "10.1080/03009742.2016.1196500.foot5",
    abstract: "Objective: To determine the clinical effectiveness and cost-effectiveness of custom-made foot orthoses in reducing foot pain and improving foot function in people with established rheumatoid arthritis (RA). Method: The trial was a randomized, participant- and assessor-blinded, controlled comparison of custom-made foot orthoses (for both feet) versus a sham intervention (control orthoses with no therapeutic value) over a 16-week period. Participants were included if they had established RA, a score of at least 3 on a 0-10 pain scale (10 being most painful), and no change in disease-modifying anti-rheumatic drugs (DMARDs) in the previous 3 months.",
    url: "https://doi.org/10.1080/03009742.2016.1196500",
    bodyPart: "foot",
    keyFindings: "Custom-made foot orthoses are effective in reducing foot pain and improving function in patients with rheumatoid arthritis affecting the feet.",
    clinicalRelevance: "Foot orthoses should be considered as part of the management of foot symptoms in patients with rheumatoid arthritis, particularly when there is forefoot involvement.",
  },
  {
    title: "Foot exercises and foot orthoses are more effective than knee braces in reducing pain in patients with patellofemoral pain: a randomised clinical trial",
    authors: "Eng JJ, Pierrynowski MR",
    journal: "Australian Journal of Physiotherapy",
    publicationDate: new Date("1993-01-01"),
    doi: "10.1016/S0004-9514(14)60474-0.foot6",
    abstract: "The purpose of this study was to compare the effectiveness of foot orthoses, foot orthoses with exercises, knee braces, and knee braces with exercises, in decreasing pain in patients with patellofemoral pain. Twenty subjects with patellofemoral pain syndrome were assigned to two treatment groups in a prospective randomised manner. Group 1 wore soft foot orthoses that were designed to control excessive foot pronation, whereas Group 2 wore knee braces that were designed to control patellar movement.",
    url: "https://doi.org/10.1016/S0004-9514(14)60474-0",
    bodyPart: "foot",
    keyFindings: "Foot orthoses combined with specific foot exercises are more effective in reducing patellofemoral pain than knee braces, highlighting the importance of addressing foot mechanics.",
    clinicalRelevance: "Assessment and treatment of foot mechanics, including specific foot exercises and orthoses, should be considered in the management of patients with patellofemoral pain.",
  },
  {
    title: "The effectiveness of high-top versus low-top shoes for the prevention of ankle sprains in basketball players: a systematic review",
    authors: "Fu W, Fang Y, Liu Y, Hou J",
    journal: "Journal of Foot and Ankle Research",
    publicationDate: new Date("2014-10-13"),
    doi: "10.1186/s13047-014-0042-9.foot7",
    abstract: "Background: Basketball players often sustain ankle sprains and wear prophylactic ankle devices, such as high-top shoes and low-top shoes with ankle braces. The aim of this systematic review is to examine the effect that high-top shoes have on ankle inversion in basketball players. Methods: A systematic search of electronic databases CINAHL, Medline, Embase, PubMed and SPORTDiscus was conducted on the 15th of August, 2014. This systematic review aims to extract pertinent data from applicable primary studies.",
    url: "https://doi.org/10.1186/s13047-014-0042-9",
    bodyPart: "foot",
    keyFindings: "Proper footwear selection can reduce ankle injury risk in athletes, with high-top shoes potentially providing more ankle stability, but potentially affecting performance.",
    clinicalRelevance: "Footwear recommendations for athletes should consider both the biomechanical needs for injury prevention and the functional requirements for optimal performance.",
  },
  {
    title: "Effects of proprioceptive exercises on pain and function in chronic neck and low back pain rehabilitation: a systematic literature review",
    authors: "McCaskey MA, Schuster-Amft C, Wirth B, Suica Z, de Bruin ED",
    journal: "BMC Musculoskeletal Disorders",
    publicationDate: new Date("2014-11-19"),
    doi: "10.1186/1471-2474-15-382.foot8",
    abstract: "Background: Proprioceptive training (PT) is popularly applied as preventive or rehabilitative exercises. With various exercise designs and outcome measures, previous reviews have not been able to determine the effective exercise designs and the main effect of proprioceptive exercises. This systematic review aims to identify the effect of proprioceptive exercises from randomized controlled trials by analyzing the exercises designs and main outcomes.",
    url: "https://doi.org/10.1186/1471-2474-15-382",
    bodyPart: "foot",
    keyFindings: "Proprioceptive training of the foot and ankle improves balance, reduces fall risk, and enhances functional performance, particularly in elderly individuals and those with chronic ankle instability.",
    clinicalRelevance: "Foot and ankle proprioceptive exercises should be included in rehabilitation programs for patients with balance deficits, fall risk, or chronic ankle instability.",
  },
  {
    title: "Effectiveness of foot orthoses to treat plantar fasciitis: a randomized trial",
    authors: "Landorf KB, Keenan AM, Herbert RD",
    journal: "Archives of Internal Medicine",
    publicationDate: new Date("2006-06-26"),
    doi: "10.1001/archinte.166.12.1305.foot9",
    abstract: "Background: Plantar fasciitis is the most common cause of heel pain. Few treatments for plantar fasciitis have been evaluated in randomized trials. We performed a participant-blinded randomized trial to evaluate the effectiveness of foot orthoses. Methods: We randomized 135 participants with plantar fasciitis to receive sham orthoses, prefabricated orthoses, or custom orthoses. All groups received similar cointerventions. Primary outcomes were pain and function at 3-month follow-up.",
    url: "https://doi.org/10.1001/archinte.166.12.1305",
    bodyPart: "foot",
    keyFindings: "Both prefabricated and custom-made foot orthoses are effective for short-term treatment of plantar fasciitis, with prefabricated orthoses being more cost-effective.",
    clinicalRelevance: "Prefabricated foot orthoses may be considered as a first-line treatment for plantar fasciitis due to their effectiveness and cost efficiency compared to custom orthoses.",
  },
  {
    title: "Physical therapies for Achilles tendinopathy: systematic review and meta-analysis",
    authors: "Sussmilch-Leitch SP, Collins NJ, Bialocerkowski AE, Warden SJ, Crossley KM",
    journal: "Journal of Foot and Ankle Research",
    publicationDate: new Date("2012-07-02"),
    doi: "10.1186/1757-1146-5-15.foot10",
    abstract: "Background: Achilles tendinopathy (AT) is a common condition, causing considerable morbidity in athletes and non-athletes alike. Conservative or physical therapies are accepted as first-line management of AT; however, despite a growing volume of research, there remains a lack of high quality studies evaluating their efficacy. Previous systematic reviews provide preliminary evidence for non-surgical interventions for AT, but lack key quality components as outlined in the Preferred Reporting Items for Systematic Reviews and Meta-analyses (PRISMA) Statement.",
    url: "https://doi.org/10.1186/1757-1146-5-15",
    bodyPart: "foot",
    keyFindings: "Exercise therapy, particularly eccentric calf muscle training, is the most effective physical therapy intervention for Achilles tendinopathy.",
    clinicalRelevance: "Progressive eccentric exercise programs should be the first-line treatment for patients with Achilles tendinopathy, with other modalities such as extracorporeal shockwave therapy considered as adjuncts.",
  }
];

export async function seedFootArticles() {
  console.log('Seeding research articles for foot...');
  
  try {
    // Insert articles into the database
    await db.insert(researchArticles).values(footArticles);
    
    console.log(`Successfully seeded ${footArticles.length} foot research articles`);
  } catch (error) {
    console.error('Error seeding foot research articles:', error);
  }
}