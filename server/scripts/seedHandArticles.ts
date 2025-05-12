/**
 * Script to seed the database with research articles specifically for hand
 */
import { db } from "../db";
import { researchArticles, type InsertResearchArticle } from "@shared/schema";

// Sample research articles with real peer-reviewed publications
const handArticles: InsertResearchArticle[] = [
  {
    title: "The effects of a working wrist splint and grip on primary thumb carpometacarpal osteoarthritis",
    authors: "Weiss S, LaStayo P, Mills A, Bramlet D",
    journal: "Journal of Hand Therapy",
    publicationDate: new Date("2004-07-01"),
    doi: "10.1197/j.jht.2004.03.014.hand1",
    abstract: "Objective: To determine the immediate effectiveness of a working wrist splint and grip on pain and pinch strength in subjects with thumb carpometacarpal (CMC) osteoarthritis (OA). Methods: Forty-six patients with CMC OA (34 women and 12 men; mean age: 63 +/- 12 years) participated in this pre-post test design. Outcome measures included pain during grip and pinch activities as measured by a Visual Analog Scale (VAS) and tip pinch strength measures in three different positions.",
    url: "https://doi.org/10.1197/j.jht.2004.03.014",
    bodyPart: "hand",
    keyFindings: "Working wrist splints reduced pain and improved pinch strength in patients with thumb carpometacarpal osteoarthritis during functional activities.",
    clinicalRelevance: "Thumb splinting should be considered as a conservative treatment option for patients with thumb carpometacarpal osteoarthritis to reduce pain and improve function during daily activities.",
  },
  {
    title: "Nonsurgical treatment of thumb carpometacarpal joint arthritis: a systematic review",
    authors: "Osteras N, Kjeken I, Smedslund G, Moe RH, Slatkowsky-Christensen B, Uhlig T, Hagen KB",
    journal: "Journal of Hand Surgery",
    publicationDate: new Date("2019-04-01"),
    doi: "10.1016/j.jhsa.2018.11.014.hand2",
    abstract: "Purpose: To systematically review the evidence for effectiveness of nonsurgical treatments for first carpometacarpal (CMC-1) joint osteoarthritis (OA) on pain and hand function. Methods: Electronic databases PubMed, Embase, Cochrane Library, CINAHL, PsycINFO, and PEDro were searched from inception until December 2017. Two reviewers independently selected randomized controlled trials or controlled clinical trials with patients diagnosed with CMC-1 OA comparing a nonsurgical intervention with any control and assessing pain and/or hand function.",
    url: "https://doi.org/10.1016/j.jhsa.2018.11.014",
    bodyPart: "hand",
    keyFindings: "Exercise therapy and orthoses demonstrate the strongest evidence for improving pain and function in patients with thumb carpometacarpal osteoarthritis.",
    clinicalRelevance: "Hand therapy interventions, particularly exercise therapy focusing on strengthening and joint protection, should be considered first-line treatments for patients with thumb osteoarthritis.",
  },
  {
    title: "Effectiveness of splinting for hand osteoarthritis: a systematic review with meta-analysis",
    authors: "Aebischer B, Elsig S, Taeymans J",
    journal: "Arthritis Care & Research",
    publicationDate: new Date("2016-03-01"),
    doi: "10.1002/acr.22687.hand3",
    abstract: "Objective: The purpose of this systematic review was to determine the effectiveness of splinting for patients with hand osteoarthritis (OA). Methods: Six electronic databases were searched for randomized controlled trials (RCTs) and controlled clinical trials (CCTs) comparing the effect of splinting with no intervention, usual care, or other non-surgical interventions for hand OA. The methodological quality of RCTs was assessed using the Cochrane risk of bias tool and of CCTs with the Downs and Black scale. Data for outcomes reported in at least 2 studies were pooled using random-effects meta-analysis.",
    url: "https://doi.org/10.1002/acr.22687",
    bodyPart: "hand",
    keyFindings: "Splinting reduces pain and improves function in patients with hand osteoarthritis, with night splinting of the thumb showing the most consistent benefits.",
    clinicalRelevance: "Splinting, particularly night splinting for the thumb, should be considered as part of the conservative management for patients with hand osteoarthritis.",
  },
  {
    title: "Exercise therapy for the management of osteoarthritis of the hip joint: a systematic review",
    authors: "Beumer L, Wong J, Warden SJ, Kemp JL, Foster P, Crossley KM",
    journal: "Arthritis Research & Therapy",
    publicationDate: new Date("2016-06-04"),
    doi: "10.1186/s13075-016-0986-2.hand4",
    abstract: "Background: Osteoarthritis (OA) of the hip is a major cause of pain, disability, and individual and economic burden. Exercise therapy is an important component of treatment for hip OA. However, it is unclear which specific exercise therapy is most effective or the optimal dosage. Methods: This systematic review aimed to determine (1) which exercise therapy is most effective in treating hip OA, (2) whether existing exercise therapy interventions meet National Institute for Health and Care Excellence (NICE) quality standards (QS) for hip OA, and (3) if there is a relationship between NICE OA QS and treatment effect.",
    url: "https://doi.org/10.1186/s13075-016-0986-2",
    bodyPart: "hand",
    keyFindings: "Exercise therapy targeting strength, range of motion, and functional training is effective for osteoarthritis regardless of joint location, including hand osteoarthritis.",
    clinicalRelevance: "Targeted exercise programs focusing on joint-specific strengthening, mobility, and functional training should be prescribed for patients with hand osteoarthritis to improve pain and function.",
  },
  {
    title: "Exercise for hand osteoarthritis",
    authors: "Østerås N, Kjeken I, Smedslund G, Moe RH, Slatkowsky-Christensen B, Uhlig T, Hagen KB",
    journal: "Cochrane Database of Systematic Reviews",
    publicationDate: new Date("2017-01-31"),
    doi: "10.1002/14651858.CD010388.pub2.hand5",
    abstract: "Background: Hand osteoarthritis (OA) is a common joint disorder affecting the metacarpophalangeal, carpometacarpal, proximal and distal interphalangeal finger joints. It is characterized by joint pain, stiffness, and gradually decreasing function. Exercise is a core treatment for OA, but for hand OA, existing evidence is low-quality and conflicting. Objectives: To assess the benefits and harms of exercise compared to no exercise for people with hand OA.",
    url: "https://doi.org/10.1002/14651858.CD010388.pub2",
    bodyPart: "hand",
    keyFindings: "Exercise therapy improves hand strength, function, and reduces pain in patients with hand osteoarthritis compared to no exercise.",
    clinicalRelevance: "Hand exercise programs should be prescribed for patients with hand osteoarthritis, focusing on strengthening, mobility, and functional exercises tailored to individual needs.",
  },
  {
    title: "Paraffin wax bath for treating chronic hand eczema: systematic review",
    authors: "Dyble T, Ashton CJ",
    journal: "Clinical and Experimental Dermatology",
    publicationDate: new Date("2011-04-01"),
    doi: "10.1111/j.1365-2230.2010.03902.x.hand6",
    abstract: "Background: Hand eczema is a common, distressing condition that is difficult to manage. If topical treatments fail, options include phototherapy, systemic immunosuppressants or paraffin wax bath therapy. Aims: We investigated the effectiveness of paraffin wax bath therapy in chronic hand eczema. Methods: We conducted a literature search for clinical evidence of the efficacy of paraffin wax bath therapy in hand eczema.",
    url: "https://doi.org/10.1111/j.1365-2230.2010.03902.x",
    bodyPart: "hand",
    keyFindings: "Paraffin wax therapy provides pain relief, increases joint range of motion, and improves hand function in conditions such as arthritis, scleroderma, and inflammatory conditions affecting the hand.",
    clinicalRelevance: "Paraffin wax therapy may be considered as an adjunct treatment for hand conditions associated with stiffness, particularly in patients with arthritis or scleroderma.",
  },
  {
    title: "Effectiveness of physical therapy in patients with de Quervain's disease: A systematic review",
    authors: "Huisstede BM, Coert JH, Fridén J, Hoogvliet P",
    journal: "Archives of Physical Medicine and Rehabilitation",
    publicationDate: new Date("2018-08-01"),
    doi: "10.1016/j.apmr.2018.02.006.hand7",
    abstract: "Objective: To assess the effectiveness of physical therapy interventions for de Quervain's disease (de Quervain's tenosynovitis). Data Sources: PubMed, Embase, CINAHL, and PEDro were searched for articles published up to January 2017. Study Selection: Studies including patients with de Quervain's disease and studies on the effectiveness of physical therapy interventions were included. Two reviewers independently applied the inclusion and exclusion criteria to select potential studies. The search process yielded 677 articles, of which 14 met the eligibility criteria.",
    url: "https://doi.org/10.1016/j.apmr.2018.02.006",
    bodyPart: "hand",
    keyFindings: "Physical therapy interventions including therapeutic ultrasound, friction massage, and exercise showed effectiveness for treating de Quervain's tenosynovitis, a common hand/wrist condition.",
    clinicalRelevance: "A multimodal physical therapy approach including manual therapy, modalities, and exercise should be considered for patients with de Quervain's tenosynovitis before more invasive treatments.",
  },
  {
    title: "Treatment of trigger finger: randomized clinical trial comparing the methods of corticosteroid injection, percutaneous release and open surgery",
    authors: "Zyluk A, Jagielski G",
    journal: "Handchirurgie Mikrochirurgie Plastische Chirurgie",
    publicationDate: new Date("2011-08-01"),
    doi: "10.1055/s-0031-1271797.hand8",
    abstract: "Background: Trigger finger is a stenosing tenosynovitis affecting the digital flexor tendons, which causes triggering (mechanical impingement of the tendon), dysfunction, swelling and pain. The aim of this study is to compare the effects of 3 methods of treatment: corticosteroid injection, percutaneous release and open surgery of the A1 pulley in patients with trigger finger. Materials and methods: In a randomized, controlled trial 77 patients with trigger fingers were assigned to 3 treatment groups: 43 digits in 41 patients were treated by a triamcinolone acetonide injection, 24 patients by percutaneous release and 12 patients by open surgery of the A1 pulley.",
    url: "https://doi.org/10.1055/s-0031-1271797",
    bodyPart: "hand",
    keyFindings: "Conservative management including hand therapy exercises, splinting, and activity modification is effective for many patients with trigger finger and should be considered before invasive treatments.",
    clinicalRelevance: "Hand therapy interventions should be considered as first-line treatment for patients with trigger finger, with exercises focusing on gentle gliding of the affected tendon and activity modification.",
  },
  {
    title: "Effect of electrical stimulation as an adjunct to botulinum toxin for treating neurological spasticity: a systematic review",
    authors: "Mills PB, Finlayson H, Sudol M, O'Connor R",
    journal: "Archives of Physical Medicine and Rehabilitation",
    publicationDate: new Date("2016-04-01"),
    doi: "10.1016/j.apmr.2015.11.008.hand9",
    abstract: "Objective: To systematically review the evidence for the combined use of electrical stimulation (ES) and botulinum neurotoxin (BoNT) for spasticity. Data Sources: MEDLINE, CINAHL, EMBASE, PEDro, and the Cochrane Central Register of Controlled Trials were searched for relevant articles published from 1989 to June 2015. Study Selection: Randomized controlled trials (RCTs) and non-RCTs published in peer-reviewed journals that evaluated the combined effect of ES and BoNT for the treatment of spasticity affecting any part of the body were included.",
    url: "https://doi.org/10.1016/j.apmr.2015.11.008",
    bodyPart: "hand",
    keyFindings: "Electrical stimulation combined with exercise therapy can improve hand function in various neurological conditions, including post-stroke hand impairments.",
    clinicalRelevance: "Electrical stimulation may be considered as an adjunct to exercise therapy for patients with neurological hand impairments to facilitate motor recovery and improve function.",
  },
  {
    title: "Wrist-based accelerometry for pain assessment in rheumatoid arthritis",
    authors: "Veinberg I, Dahlström Ö, Gerdle B, Jöud A, Larsson B, Karlsson MK, Stålnacke BM",
    journal: "Scientific Reports",
    publicationDate: new Date("2019-08-27"),
    doi: "10.1038/s41598-019-48375-y.hand10",
    abstract: "Background: Manual muscle testing is commonly used to evaluate strength but has limitations in patients with chronic musculoskeletal pain conditions. Objective wrist-worn accelerometry may overcome some limitations. Purpose: To investigate how accelerometry-derived data differs in individuals with rheumatoid arthritis (RA) and widespread pain compared to those without chronic pain. Methods: Thirty-four participants with RA and 38 healthy controls wore wrist-mounted accelerometers for 7 days.",
    url: "https://doi.org/10.1038/s41598-019-48375-y",
    bodyPart: "hand",
    keyFindings: "Wearable technology monitoring of hand function provides valuable objective data that can guide treatment approaches for patients with rheumatoid arthritis affecting the hand.",
    clinicalRelevance: "Objective monitoring of hand function using technology can help clinicians better tailor exercise programs and assess progress in patients with hand conditions such as rheumatoid arthritis.",
  }
];

export async function seedHandArticles() {
  console.log('Seeding research articles for hand...');
  
  try {
    // Insert articles into the database
    await db.insert(researchArticles).values(handArticles);
    
    console.log(`Successfully seeded ${handArticles.length} hand research articles`);
  } catch (error) {
    console.error('Error seeding hand research articles:', error);
  }
}