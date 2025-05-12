/**
 * Script to generate 10 new research articles daily for each body part
 * This script uses OpenAI API to generate realistic research article data
 */
import { db } from "../db";
import { researchArticles, type InsertResearchArticle, bodyPartEnum } from "@shared/schema";
import OpenAI from "openai";
import { storage } from "../storage";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Generate a random date within the last 3 years
function getRecentRandomDate(): Date {
  const today = new Date();
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(today.getFullYear() - 3);
  
  return new Date(threeYearsAgo.getTime() + Math.random() * (today.getTime() - threeYearsAgo.getTime()));
}

// Function to generate a realistic research article for a specific body part
async function generateResearchArticle(bodyPart: string): Promise<InsertResearchArticle> {
  try {
    // Use OpenAI to generate article details
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a medical research specialist focused on physiotherapy. Create a realistic research article about ${bodyPart} treatment, rehabilitation, or biomechanics. This should represent the latest research in the field.`
        },
        {
          role: "user",
          content: `Generate a realistic physiotherapy research article about the ${bodyPart}. Include title, authors (3-5 names with credentials), journal name, DOI, abstract (100-150 words), URL, key findings (1-2 sentences), and clinical relevance (1-2 sentences). The article should appear to be from a respected peer-reviewed journal and represent recent research. Make the DOI and URL realistic but fictional.`
        }
      ],
      response_format: { type: "json_object" },
    });

    // Parse the response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const articleData = JSON.parse(content);
    
    // Format the article data
    return {
      title: articleData.title,
      authors: articleData.authors,
      journal: articleData.journal,
      publicationDate: getRecentRandomDate(),
      doi: articleData.doi,
      abstract: articleData.abstract,
      url: articleData.url,
      bodyPart: bodyPart,
      keyFindings: articleData.keyFindings,
      clinicalRelevance: articleData.clinicalRelevance,
    };
  } catch (error) {
    console.error(`Error generating article for ${bodyPart}:`, error);
    
    // Fallback: Create a generic article if OpenAI fails
    return createGenericArticle(bodyPart);
  }
}

// Fallback function to create generic articles without AI
function createGenericArticle(bodyPart: string): InsertResearchArticle {
  const today = new Date();
  const randomId = Math.floor(Math.random() * 10000);
  
  return {
    title: `Recent advances in ${bodyPart} rehabilitation techniques: A systematic review`,
    authors: "Smith JR, Johnson KL, Williams AB, Miller CD",
    journal: "Journal of Physiotherapy Research",
    publicationDate: getRecentRandomDate(),
    doi: `10.1111/jpr.${randomId}`,
    abstract: `This systematic review examined recent evidence for rehabilitation approaches for ${bodyPart} conditions. The analysis included 24 randomized controlled trials published between 2020-2023. Results showed moderate to strong evidence supporting multimodal treatments combining manual therapy, therapeutic exercise, and patient education. Further research is needed to determine optimal treatment parameters and long-term outcomes.`,
    url: `https://doi.org/10.1111/jpr.${randomId}`,
    bodyPart: bodyPart,
    keyFindings: `Multimodal approaches show superior outcomes for ${bodyPart} rehabilitation compared to single-modality interventions.`,
    clinicalRelevance: `Clinicians should consider incorporating combined treatment approaches for optimal ${bodyPart} rehabilitation outcomes.`,
  };
}

// Main function to generate new articles
export async function generateDailyArticles(): Promise<void> {
  console.log("Starting daily research article generation...");
  
  // Get all body parts from the enum
  const bodyParts = Object.values(bodyPartEnum.enumValues);
  const articlesCreated: InsertResearchArticle[] = [];
  
  // Generate 10 articles for each body part
  for (const bodyPart of bodyParts) {
    console.log(`Generating articles for ${bodyPart}...`);
    
    // If using OpenAI, generate articles sequentially to avoid rate limits
    // Otherwise, we could use Promise.all for parallel processing
    for (let i = 0; i < 10; i++) {
      try {
        let article: InsertResearchArticle;
        
        if (process.env.OPENAI_API_KEY) {
          // Use OpenAI if available
          article = await generateResearchArticle(bodyPart);
        } else {
          // Use generic fallback if OpenAI not available
          article = createGenericArticle(bodyPart);
        }
        
        articlesCreated.push(article);
        
        // Add a small delay to avoid hitting API rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error generating article #${i+1} for ${bodyPart}:`, error);
      }
    }
  }
  
  // Insert all generated articles into the database
  if (articlesCreated.length > 0) {
    try {
      // Use storage interface to create articles
      for (const article of articlesCreated) {
        await storage.createResearchArticle(article);
      }
      console.log(`Successfully added ${articlesCreated.length} new research articles`);
    } catch (error) {
      console.error("Error inserting generated articles:", error);
    }
  } else {
    console.log("No articles were generated");
  }
}

// Optional: Function to clean up old articles to prevent database bloat
export async function removeOldArticles(daysToKeep: number = 30): Promise<void> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    // Get count of articles before deletion (for logging)
    const beforeCount = await db.select({ count: db.fn.count() }).from(researchArticles);
    
    // Delete articles older than the cutoff date
    // Note: In a production system, you might want to archive rather than delete
    await db.delete(researchArticles)
      .where("createdAt", "<", cutoffDate);
    
    // Get count after deletion
    const afterCount = await db.select({ count: db.fn.count() }).from(researchArticles);
    
    console.log(`Removed ${parseInt(beforeCount[0].count as string) - parseInt(afterCount[0].count as string)} old research articles`);
  } catch (error) {
    console.error("Error removing old articles:", error);
  }
}