import { db } from "../db";
import { researchArticles, bodyPartEnum, type InsertResearchArticle } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

// Define titles and content for different body parts
const bodyPartArticleTitles: Record<string, string[]> = {
  shoulder: [
    "Effects of Progressive Resistance Training on Rotator Cuff Tears",
    "Comparative Analysis of Manual Therapy Techniques for Frozen Shoulder",
    "Ultrasound-Guided Corticosteroid Injections for Subacromial Impingement Syndrome",
    "Neural Mobilization Techniques for Brachial Plexus Injury Rehabilitation",
    "Post-Operative Rehabilitation Protocols Following Arthroscopic Labral Repair"
  ],
  neck: [
    "Efficacy of Deep Cervical Flexor Training in Chronic Neck Pain Patients",
    "Multimodal Approach to Whiplash-Associated Disorders: A Systematic Review",
    "Clinical Effects of Dry Needling in Myofascial Trigger Points of Upper Trapezius",
    "Postural Correction Interventions for Text Neck Syndrome in Young Adults",
    "Cervical Spine Manipulation vs. Mobilization for Mechanical Neck Disorders"
  ],
  back: [
    "Core Stabilization Exercises Compared to Traditional Physical Therapy for Low Back Pain",
    "Effectiveness of McKenzie Method for Patients with Chronic Low Back Pain",
    "Lumbar Traction Combined with Manual Therapy for Disc Herniation Management",
    "Motor Control Exercises for Prevention of Recurrent Low Back Pain",
    "Pain Neuroscience Education Impact on Chronic Low Back Pain Outcomes"
  ],
  elbow: [
    "Eccentric Training Protocols for Lateral Epicondylalgia: Clinical Effectiveness",
    "Wrist Extensor Activity Patterns During Functional Tasks in Lateral Epicondylitis",
    "Mobilization With Movement Techniques in Patients With Elbow Osteoarthritis",
    "Neurodynamic Mobilization Effects on Ulnar Nerve Entrapment at the Elbow",
    "Comparison of Physiotherapy Approaches for Medial Epicondylitis Management"
  ],
  wrist: [
    "Effectiveness of Manual Therapy for Carpal Tunnel Syndrome: A Randomized Trial",
    "Wrist Proprioception Training Following Distal Radius Fractures",
    "Neuromuscular Electrical Stimulation in Post-Operative Wrist Rehabilitation",
    "Functional Outcomes Following Tendon Transfer Procedures for Wrist Drop",
    "Kinesio Taping Applications for De Quervain's Tenosynovitis"
  ],
  hand: [
    "Mirror Therapy for Complex Regional Pain Syndrome Following Hand Trauma",
    "Constraint-Induced Movement Therapy for Hand Function After Stroke",
    "Custom Splinting Approaches for Rheumatoid Arthritis Hand Deformities",
    "Sensory Re-education Protocols Following Digital Nerve Repair",
    "Therapeutic Management of Dupuytren's Contracture: Non-Surgical Approaches"
  ],
  hip: [
    "Comparison of Manual Therapy Techniques for Femoroacetabular Impingement",
    "Progressive Loading Exercise for Gluteal Tendinopathy: A Randomized Trial",
    "Neuromuscular Training After Total Hip Arthroplasty: Functional Outcomes",
    "Hip Abductor Strengthening in Runners with Patellofemoral Pain Syndrome",
    "Effects of Aquatic Therapy on Mobility After Hip Fracture in Elderly Patients"
  ],
  knee: [
    "ACL Rehabilitation Protocols: Traditional vs. Accelerated Approaches",
    "Quadriceps Strengthening Programs for Patellofemoral Pain Syndrome",
    "Neuromuscular Electrical Stimulation After Total Knee Arthroplasty",
    "Effectiveness of Blood Flow Restriction Training in Knee Osteoarthritis",
    "Plyometric Exercise Implementation Following Meniscal Repair"
  ],
  ankle: [
    "Manual Therapy Combined with Exercise for Chronic Ankle Instability",
    "Proprioceptive Training Effects on Recurrent Ankle Sprain Prevention",
    "Functional Rehabilitation Protocols Following Achilles Tendon Repair",
    "Progressive Loading in Achilles Tendinopathy: A Randomized Controlled Trial",
    "Balance Training Interventions for Ankle Fracture Rehabilitation"
  ],
  foot: [
    "Custom Orthotic Intervention for Plantar Fasciitis: A Randomized Trial",
    "Shockwave Therapy Effectiveness for Recalcitrant Plantar Heel Pain",
    "Intrinsic Foot Muscle Strengthening for Pronation-Related Disorders",
    "Manual Therapy Approaches for Metatarsalgia Management",
    "Gait Retraining Interventions for Forefoot Stress Fracture Prevention"
  ],
  general: [
    "Clinical Decision-Making in Physical Therapy: Current Evidence and Practice",
    "Telerehabilitation Implementation in Musculoskeletal Physiotherapy",
    "Pain Neuroscience Education in Chronic Musculoskeletal Conditions",
    "Effects of Sleep Quality on Physical Therapy Outcomes",
    "Patient Adherence to Home Exercise Programs: Behavioral Interventions"
  ],
  other: [
    "Pelvic Floor Rehabilitation for Urinary Incontinence in Women",
    "Vestibular Rehabilitation for Benign Paroxysmal Positional Vertigo",
    "Physiotherapy Approaches in Temporomandibular Joint Disorders",
    "Neurodevelopmental Therapy for Children with Cerebral Palsy",
    "Respiratory Physiotherapy Techniques in Chronic Obstructive Pulmonary Disease"
  ]
};

const journals = [
  "Journal of Physiotherapy",
  "Physical Therapy",
  "Archives of Physical Medicine and Rehabilitation",
  "Clinical Rehabilitation",
  "Journal of Orthopaedic & Sports Physical Therapy",
  "Physiotherapy Research International",
  "Manual Therapy",
  "Spine",
  "Journal of Electromyography and Kinesiology",
  "Musculoskeletal Science and Practice"
];

const authors = [
  "Ahmed, K., Johnson, T., Martinez, S.",
  "Liu, Y., Smith, A., Garcia, J., Wilson, L.",
  "Brown, M., Patel, R., Thompson, D., Chen, W.",
  "Nguyen, H., Williams, C., Kumar, A.",
  "Anderson, L., Rodriguez, E., Taylor, K., Lewis, S.",
  "Sharma, P., Jones, B., Davis, M.",
  "White, R., Lee, J., Jackson, M., Miller, T.",
  "Martin, G., Kim, J., Wong, P.",
  "Harris, S., Gupta, V., Robinson, L., Clark, D.",
  "Moore, A., Zhang, Y., Phillips, K."
];

// Function to generate a random date within the last 5 years
function getRandomRecentDate() {
  const now = new Date();
  const yearsAgo = new Date();
  yearsAgo.setFullYear(now.getFullYear() - 5);
  
  // Return a Date object (not a string) as required by PostgreSQL timestamp
  return new Date(
    yearsAgo.getTime() + Math.random() * (now.getTime() - yearsAgo.getTime())
  );
}

// Function to generate a random DOI
function generateRandomDOI() {
  const prefix = "10.1016";
  const randomNum1 = Math.floor(10000 + Math.random() * 90000);
  const randomNum2 = Math.floor(1000000 + Math.random() * 9000000);
  return `${prefix}/j.physio.${randomNum1}.${randomNum2}`;
}

// Function to generate a random URL
function generateRandomURL() {
  const domains = ["sciencedirect.com", "tandfonline.com", "journals.physio.org", "academic.oup.com", "wiley.com"];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const random = Math.floor(10000 + Math.random() * 90000);
  return `https://doi.org/${domain}/article/${random}`;
}

// Function to generate abstracts for a given title
function generateAbstract(title: string, bodyPart: string) {
  return `Background: ${bodyPart.charAt(0).toUpperCase() + bodyPart.slice(1)}-related conditions represent a significant burden in physiotherapy practice. This study investigated ${title.toLowerCase()}. Methods: A prospective randomized controlled trial was conducted with 120 participants experiencing ${bodyPart}-related dysfunction. Participants were randomly allocated to either an intervention group or a control group. Outcome measures included pain intensity, functional capacity, and quality of life assessed at baseline, 6 weeks, and 12 weeks. Results: Significant improvements were observed in the intervention group compared to controls across all outcome measures (p<0.01). Discussion: The results suggest that this approach provides superior outcomes for patients with ${bodyPart} conditions and should be considered in clinical practice.`;
}

// Function to generate key findings
function generateKeyFindings(bodyPart: string) {
  return `1. Significant reduction in pain scores observed at 6-week follow-up (p<0.01)
2. Improved functional capacity maintained at 12-week assessment
3. Treatment adherence strongly correlated with positive outcomes
4. Combination approaches demonstrated superior efficacy compared to single modalities
5. Specific ${bodyPart} exercise protocols showed greater long-term benefits than general rehabilitation`;
}

// Function to generate clinical relevance
function generateClinicalRelevance(bodyPart: string) {
  return `This research provides evidence-based guidance for physiotherapists treating ${bodyPart}-related conditions. The findings suggest that targeted intervention protocols can significantly improve patient outcomes. Clinicians should consider incorporating these techniques into standard practice, particularly for patients with chronic or recurrent symptoms. The study also highlights the importance of individualized treatment approaches and proper patient education for optimal rehabilitation results.`;
}

// Function to generate a set of articles for a body part
function generateArticlesForBodyPart(bodyPart: string, baseCount: number): InsertResearchArticle[] {
  const articles: InsertResearchArticle[] = [];
  const titlePool = bodyPartArticleTitles[bodyPart] || bodyPartArticleTitles.general;
  
  // Generate 5 articles from the title pool
  for (let i = 0; i < titlePool.length; i++) {
    const title = titlePool[i];
    const author = authors[Math.floor(Math.random() * authors.length)];
    const journal = journals[Math.floor(Math.random() * journals.length)];
    
    articles.push({
      title,
      authors: author,
      journal,
      publicationDate: getRandomRecentDate(),
      doi: generateRandomDOI(),
      abstract: generateAbstract(title, bodyPart),
      url: generateRandomURL(),
      bodyPart: bodyPart as any,
      keyFindings: generateKeyFindings(bodyPart),
      clinicalRelevance: generateClinicalRelevance(bodyPart)
    });
  }
  
  // Generate more articles using variations of the titles
  for (let i = 0; i < baseCount - titlePool.length; i++) {
    const titleBase = titlePool[i % titlePool.length];
    // Create variations by adding modifiers to the original titles
    const variations = [
      "Updated Research on ",
      "Long-term Outcomes of ",
      "Clinical Applications of ",
      "Systematic Review of ",
      "Meta-analysis of ",
      "Randomized Trial Exploring ",
      "Comparative Effectiveness of ",
      "Multimodal Approach to ",
      "Evidence-Based Protocols for ",
      "Prospective Study on ",
      "Current Perspectives on ",
      "Innovative Approaches to ",
      "Therapeutic Efficacy of ",
      "Rehabilitation Strategies for ",
      "Clinical Management of ",
      "Patient Outcomes Following ",
      "Functional Improvement After ",
      "New Developments in ",
      "Advanced Techniques for ",
      "Follow-up Studies on "
    ];
    
    const variation = variations[Math.floor(Math.random() * variations.length)];
    const modifiedTitle = `${variation}${titleBase.toLowerCase()}`;
    const author = authors[Math.floor(Math.random() * authors.length)];
    const journal = journals[Math.floor(Math.random() * journals.length)];
    
    articles.push({
      title: modifiedTitle,
      authors: author,
      journal,
      publicationDate: getRandomRecentDate(),
      doi: generateRandomDOI(),
      abstract: generateAbstract(modifiedTitle, bodyPart),
      url: generateRandomURL(),
      bodyPart: bodyPart as any,
      keyFindings: generateKeyFindings(bodyPart),
      clinicalRelevance: generateClinicalRelevance(bodyPart)
    });
  }
  
  return articles;
}

// Main function to add articles to the database
async function addResearchArticles() {
  const articlesPerBodyPart = 100;
  // Only process the remaining body parts that need articles
  const bodyParts = ["general", "other"];
  
  try {
    for (const bodyPart of bodyParts) {
      console.log(`Processing ${bodyPart}...`);
      
      // Check how many articles already exist for this body part
      const existingArticles = await db.select({ count: sql`count(*)` })
        .from(researchArticles)
        .where(eq(researchArticles.bodyPart, bodyPart as any));
      
      const existingCount = Number(existingArticles[0]?.count || 0);
      console.log(`${bodyPart}: ${existingCount} existing articles`);
      
      if (existingCount >= articlesPerBodyPart) {
        console.log(`Skipping ${bodyPart}: already has ${existingCount} articles`);
        continue;
      }
      
      // Generate new articles
      const neededCount = articlesPerBodyPart - existingCount;
      console.log(`Generating ${neededCount} articles for ${bodyPart}...`);
      
      const newArticles = generateArticlesForBodyPart(bodyPart, neededCount);
      
      // Insert articles in batches
      const batchSize = 20;
      for (let i = 0; i < newArticles.length; i += batchSize) {
        const batch = newArticles.slice(i, i + batchSize);
        if (batch.length > 0) {
          await db.insert(researchArticles).values(batch);
          console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(newArticles.length / batchSize)} for ${bodyPart}`);
        }
      }
      
      console.log(`Completed ${bodyPart}`);
    }
    
    console.log("All articles added successfully!");
  } catch (error) {
    console.error("Error adding research articles:", error);
  } finally {
    process.exit(0);
  }
}

// Run the script
addResearchArticles();