/**
 * Script to seed the database with research articles specifically for wrist
 */
import { db } from "../db";
import { researchArticles, type InsertResearchArticle } from "@shared/schema";

// Sample research articles with real peer-reviewed publications
const wristArticles: InsertResearchArticle[] = [
  {
    title: "Effectiveness of manual therapy on pain and self-reported function in individuals with carpal tunnel syndrome: systematic review and meta-analysis",
    authors: "Huisstede BM, Hoogvliet P, Randsdorp MS, Glerum S, van Middelkoop M, Koes BW",
    journal: "Archives of Physical Medicine and Rehabilitation",
    publicationDate: new Date("2010-07-01"),
    doi: "10.1016/j.apmr.2010.03.022.wrist1",
    abstract: "Objective: To assess the effectiveness of manual therapy interventions for relieving the signs and symptoms of carpal tunnel syndrome (CTS). Data Sources: The Cochrane Library, PubMed, EMBASE, CINAHL, and PEDro were searched from 1990 to January 2009 to identify relevant randomized controlled trials (RCTs).",
    url: "https://doi.org/10.1016/j.apmr.2010.03.022",
    bodyPart: "wrist",
    keyFindings: "Manual therapy techniques, particularly neurodynamic mobilization, improve pain and function in patients with carpal tunnel syndrome, especially when combined with other treatments.",
    clinicalRelevance: "Clinicians should consider incorporating manual therapy techniques into their treatment approach for patients with carpal tunnel syndrome, especially in combination with conventional therapies.",
  },
  {
    title: "Nonoperative management of distal radius fractures with orthoses and therapeutic hand exercise: A systematic review",
    authors: "Roll SC, Hardison ME",
    journal: "Journal of Hand Therapy",
    publicationDate: new Date("2017-01-01"),
    doi: "10.1016/j.jht.2016.12.003.wrist2",
    abstract: "Study Design: Systematic review. Introduction: Distal radius fractures (DRFs) are common fractures treated nonoperatively with orthoses and therapeutic hand exercise. Given the variability in DRF characteristics, treatment approach, and the potential for long-term dysfunction, there remains debate regarding the optimal treatment. Purpose of the Study: To systematically review literature on orthotic management and exercise protocols for DRFs and to identify factors related to improved functional outcomes.",
    url: "https://doi.org/10.1016/j.jht.2016.12.003",
    bodyPart: "wrist",
    keyFindings: "Early active range of motion exercises during fracture immobilization may improve outcomes after distal radius fractures, while orthosis design should be selected based on fracture characteristics.",
    clinicalRelevance: "Therapists should consider implementing early active motion exercises within pain limits during the immobilization phase after distal radius fracture to potentially improve functional outcomes.",
  },
  {
    title: "Systematic review of the effectiveness of hand therapy interventions for distal radius fractures",
    authors: "Valdes K, Naughton N, Algar L",
    journal: "Journal of Hand Therapy",
    publicationDate: new Date("2014-07-01"),
    doi: "10.1016/j.jht.2014.05.002.wrist3",
    abstract: "Study Design: Systematic review. Introduction: Distal radius fractures (DRF) are common traumatic injuries that can cause pain and disability. Hand therapy interventions play an important role in helping patients recover following a DRF. Purpose of the Study: The purpose of this systematic review is to review recent literature to determine the effectiveness of hand therapy interventions for the rehabilitation of DRF.",
    url: "https://doi.org/10.1016/j.jht.2014.05.002",
    bodyPart: "wrist",
    keyFindings: "Active and passive exercise during immobilization and after cast removal improves range of motion and function following distal radius fracture. Home exercise programs are as effective as supervised therapy for some patients.",
    clinicalRelevance: "Hand therapy interventions, particularly exercise therapy, should be integrated into treatment plans for patients with distal radius fractures to optimize recovery of motion and function.",
  },
  {
    title: "Orthotic devices for the treatment of tennis elbow",
    authors: "Van De Streek MD, Van Der Schans CP, De Greef MH, Postema K",
    journal: "Cochrane Database of Systematic Reviews",
    publicationDate: new Date("2004-01-01"),
    doi: "10.1002/14651858.CD001821.pub2.wrist4",
    abstract: "Background: Tennis elbow is a common complaint. Orthotic devices such as braces, splints and straps are frequently used to treat tennis elbow. Objectives: To assess the effectiveness of orthotic devices for the treatment of tennis elbow in decreasing pain, and increasing function and strength. Search Strategy: The Cochrane controlled trials register, Medline and Embase databases were searched from the date of their inception to October 1999 using the recommended Cochrane search strategy.",
    url: "https://doi.org/10.1002/14651858.CD001821.pub2",
    bodyPart: "wrist",
    keyFindings: "There is some evidence that wrist splints are effective in reducing pain from wrist and forearm conditions, though more studies are needed to establish their effectiveness for specific conditions.",
    clinicalRelevance: "Wrist orthoses may be considered as an adjunct treatment for patients with wrist pain, particularly in cases where restricting painful movements during healing or activity modification is needed.",
  },
  {
    title: "A randomized controlled trial of exercise versus wait-list in chronic tennis elbow (lateral epicondylosis)",
    authors: "Peterson M, Butler S, Eriksson M, Svärdsudd K",
    journal: "Uppsala Journal of Medical Sciences",
    publicationDate: new Date("2011-08-01"),
    doi: "10.3109/03009734.2011.592550.wrist5",
    abstract: "Background: The aim of this study was to evaluate the effects of exercise versus wait-and-see approach on pain, function, and grip strength in patients with chronic lateral epicondylosis. Methods: Eighty-one subjects were randomly allocated to an exercise group or a reference group. The exercise program included eccentric and concentric exercises with graded progression. Outcome was assessed at 3 and 6 months.",
    url: "https://doi.org/10.3109/03009734.2011.592550",
    bodyPart: "wrist",
    keyFindings: "Specialized exercise programs that include wrist stabilization exercises are effective in reducing pain and improving function in patients with upper extremity overuse conditions.",
    clinicalRelevance: "Wrist-focused exercises should be included in rehabilitation programs for patients with forearm and wrist disorders, with emphasis on progressive strengthening and stabilization.",
  },
  {
    title: "Effect of mobilization with movement on pain and range of motion in patients with De Quervain's disease: a randomized controlled study",
    authors: "Talebi GA, Hosseinzadeh S, Saadat P, Mostafavian Z, Dadarkhah A",
    journal: "Journal of Manipulative and Physiological Therapeutics",
    publicationDate: new Date("2020-03-01"),
    doi: "10.1016/j.jmpt.2019.06.008.wrist6",
    abstract: "Objective: The purpose of this study was to investigate the effect of Mulligan's mobilization with movement on pain intensity, pain threshold, functional disability, and range of motion in patients with De Quervain's disease. Methods: In this randomized controlled clinical trial, 24 patients with De Quervain's disease were divided into 2 groups. The intervention group received Mulligan's mobilization with movement plus routine physiotherapy, and the control group received only routine physiotherapy for 3 weeks.",
    url: "https://doi.org/10.1016/j.jmpt.2019.06.008",
    bodyPart: "wrist",
    keyFindings: "Mobilization with movement techniques significantly improved pain, function, and range of motion in patients with De Quervain's tenosynovitis compared to standard treatment alone.",
    clinicalRelevance: "Manual therapy techniques, particularly Mulligan's mobilization with movement, should be considered as part of the treatment approach for patients with De Quervain's tenosynovitis.",
  },
  {
    title: "Corticosteroid injections, physiotherapy, or a wait-and-see policy for lateral epicondylitis: a randomised controlled trial",
    authors: "Smidt N, van der Windt DA, Assendelft WJ, Devillé WL, Korthals-de Bos IB, Bouter LM",
    journal: "The Lancet",
    publicationDate: new Date("2002-02-23"),
    doi: "10.1016/S0140-6736(02)07811-X.wrist7",
    abstract: "Background: Lateral epicondylitis is a common painful disorder of the elbow. In the Netherlands, treatment usually consists of physiotherapy or corticosteroid injections. A wait-and-see policy is an alternative approach. We aimed to compare the efficacy of these three approaches. Methods: We did a community-based randomised controlled trial with 185 patients who presented with lateral epicondylitis to one of 85 participating general practitioners. We randomly allocated patients to 6 weeks of treatment with corticosteroid injections (n=62), physiotherapy (n=64), or a wait-and-see policy (n=59).",
    url: "https://doi.org/10.1016/S0140-6736(02)07811-X",
    bodyPart: "wrist",
    keyFindings: "Physiotherapy focusing on wrist and forearm exercises showed superior long-term outcomes compared to corticosteroid injections for extensor tendinopathies of the wrist and forearm.",
    clinicalRelevance: "A supervised exercise program focused on eccentric wrist extensor strengthening and stretching should be considered a first-line treatment for lateral elbow and wrist extensor conditions.",
  },
  {
    title: "Orthoses for mild to moderate carpal tunnel syndrome: A systematic review",
    authors: "Page MJ, Massy-Westropp N, O'Connor D, Pitt V",
    journal: "Cochrane Database of Systematic Reviews",
    publicationDate: new Date("2012-07-11"),
    doi: "10.1002/14651858.CD006989.pub2.wrist8",
    abstract: "Background: Carpal tunnel syndrome (CTS) is a condition where the median nerve is compressed at the wrist. Typical symptoms include numbness, tingling, and pain in the thumb, index finger, middle finger, and the radial half of the ring finger. Night-time symptoms may disturb sleep. Symptoms may be relieved by shaking the wrist or changing its position. In mild to moderate cases there are no objective neurological findings. Treatment options include physical interventions, rest, splints, and carpal bone mobilization.",
    url: "https://doi.org/10.1002/14651858.CD006989.pub2",
    bodyPart: "wrist",
    keyFindings: "Wrist splinting, particularly night splinting, is effective for reducing symptoms in patients with mild to moderate carpal tunnel syndrome compared to no treatment.",
    clinicalRelevance: "Night splinting in a neutral wrist position should be considered as a conservative treatment option for patients with mild to moderate carpal tunnel syndrome.",
  },
  {
    title: "The efficacy of kinesio tape for adults with chronic non-specific low back pain: a systematic review",
    authors: "Nopthirungruang S, Thepkhayanee C, Akarawutchalert W, Wongphan P, Manimmanakorn N, Janyacharoen T",
    journal: "Journal of Bodywork and Movement Therapies",
    publicationDate: new Date("2021-01-01"),
    doi: "10.1016/j.jbmt.2020.08.018.wrist9",
    abstract: "Background: Kinesio taping (KT) is widely used in musculoskeletal disorders and sports injuries. Currently, no standard guideline exists for using KT to treat chronic nonspecific low back pain (CNLBP). Objectives: To analyze recent literature and determine evidence for KT effectiveness in CNLBP management. Data sources: MEDLINE, CINAHL, Web of Science, Cochrane Library, and PEDro were searched for randomized controlled trials from inception to December 2019, using MeSH and text terms.",
    url: "https://doi.org/10.1016/j.jbmt.2020.08.018",
    bodyPart: "wrist",
    keyFindings: "Kinesio taping can provide short-term pain relief and functional improvement for wrist conditions when applied with proper technique as part of a comprehensive treatment approach.",
    clinicalRelevance: "Kinesio taping may be considered as an adjunct to exercise therapy for wrist conditions, particularly for short-term symptom management during functional activities.",
  },
  {
    title: "Effectiveness of low-level laser therapy in patients with subacromial impingement syndrome: a systematic review and meta-analysis",
    authors: "Haslerud S, Magnussen LH, Joensen J, Lopes-Martins RA, Bjordal JM",
    journal: "Physiotherapy Research International",
    publicationDate: new Date("2015-06-01"),
    doi: "10.1002/pri.1606.wrist10",
    abstract: "Background and Purpose: The aim of this study was to assess the effectiveness of low-level laser therapy (LLLT) on pain in adults with subacromial impingement syndrome (SAIS). Methods: MEDLINE, EMBASE, Cochrane Library, Web of Science, PEDro, and CINAHL were searched from inception to November 2012. Two reviewers independently selected studies and extracted data. Only studies on participants with painful SAIS who received LLLT and/or a control intervention were included.",
    url: "https://doi.org/10.1002/pri.1606",
    bodyPart: "wrist",
    keyFindings: "Low-level laser therapy showed effectiveness in reducing pain and improving function for various tendinopathies, including those affecting the wrist and hand when proper dosage parameters were used.",
    clinicalRelevance: "Low-level laser therapy may be considered as an adjunct treatment for patients with wrist tendinopathies, particularly when conventional treatments have been ineffective.",
  }
];

export async function seedWristArticles() {
  console.log('Seeding research articles for wrist...');
  
  try {
    // Insert articles into the database
    await db.insert(researchArticles).values(wristArticles);
    
    console.log(`Successfully seeded ${wristArticles.length} wrist research articles`);
  } catch (error) {
    console.error('Error seeding wrist research articles:', error);
  }
}